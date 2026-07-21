import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

const istanbulDistricts = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Eyüp', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy',
  'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe',
  'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli',
  'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCoords(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=tr`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CVSPower-Fleet-Manager-Geocoder/1.0'
      }
    });
    if (!response.ok) {
      console.warn(`Nominatim HTTP ${response.status} for: "${query}"`);
      return null;
    }
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.error(`Error querying Nominatim for "${query}":`, e.message);
  }
  return null;
}

function findDistrict(address) {
  if (!address) return null;
  const addrLower = address.toLowerCase();
  for (const dist of istanbulDistricts) {
    if (addrLower.includes(dist.toLowerCase())) {
      return dist;
    }
  }
  return null;
}

// Random offset to prevent pins stacking on each other
function addJitter(lat, lng) {
  const latOffset = (Math.random() * 0.016 - 0.008); // slightly wider spread so they are all distinct and clickable
  const lngOffset = (Math.random() * 0.016 - 0.008);
  return { lat: lat + latOffset, lng: lng + lngOffset };
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://cvsuser:Cvspower123@localhost/cvspower';
  console.log('Connecting to database:', databaseUrl);

  const pool = new Pool({ connectionString: databaseUrl });

  const res = await pool.query('SELECT id, serial_number, address, region, latitude, longitude FROM generators ORDER BY id');
  const generators = res.rows;
  console.log(`Found ${generators.length} generators to geocode.\n`);

  let successFull = 0;
  let successDistrict = 0;
  let successFallback = 0;

  for (const gen of generators) {
    console.log(`--------------------------------------------------`);
    console.log(`[${gen.serial_number}] Address: ${gen.address || '(empty)'} | Region: ${gen.region || '(none)'}`);

    let coords = null;
    let source = '';

    // Step 1: Try full address if present
    if (gen.address && gen.address.trim().length > 3) {
      const fullQuery = `${gen.address}, İstanbul, Turkey`;
      coords = await fetchCoords(fullQuery);
      await sleep(1300);
      if (coords) {
        source = 'full_address';
      }
    }

    // Step 2: Fallback to district-level search
    if (!coords && gen.address) {
      const district = findDistrict(gen.address);
      if (district) {
        const distQuery = `${district}, İstanbul, Turkey`;
        console.log(`  → Full address failed. Trying district: "${distQuery}"`);
        coords = await fetchCoords(distQuery);
        await sleep(1300);
        if (coords) {
          source = `district:${district}`;
        }
      }
    }

    // Step 3: Fallback to region center so they show up on the map (instead of setting NULL)
    if (!coords) {
      const isEurope = gen.region === 'Avrupa';
      // Place European generators near Sisli/Besiktas, Anatolian near Atasehir/Kadikoy
      coords = isEurope ? { lat: 41.04, lng: 28.99 } : { lat: 40.98, lng: 29.11 };
      source = 'default_fallback';
      console.log(`  ⚠ Could not resolve coordinates. Placing at region center (${isEurope ? 'Avrupa' : 'Anadolu'}).`);
    }

    // Add jitter offset so they are all distinct and clickable
    const jittered = addJitter(coords.lat, coords.lng);

    console.log(`  ✓ [${source}] → lat=${jittered.lat.toFixed(6)}, lng=${jittered.lng.toFixed(6)}`);
    await pool.query(
      'UPDATE generators SET latitude = $1, longitude = $2 WHERE id = $3',
      [jittered.lat, jittered.lng, gen.id]
    );

    if (source === 'full_address') successFull++;
    else if (source.startsWith('district')) successDistrict++;
    else successFallback++;
  }

  console.log(`\n==================================================`);
  console.log(`Geocoding complete:`);
  console.log(`  ✓ Full address resolved : ${successFull}`);
  console.log(`  ✓ District-level        : ${successDistrict}`);
  console.log(`  ✓ Region center fallback: ${successFallback}`);
  console.log(`  Total                   : ${generators.length}`);

  await pool.end();
}

run().catch(console.error);
