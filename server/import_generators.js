import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

async function run() {
  const mdPath = path.join(__dirname, '..', 'jeneratorler_koordinat.md');
  if (!fs.existsSync(mdPath)) {
    console.error(`Error: File not found at ${mdPath}`);
    return;
  }
  
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');
  
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://cvsuser:Cvspower123@localhost/cvspower';
  console.log('Connecting to database:', databaseUrl);
  
  const pool = new Pool({ connectionString: databaseUrl });
  
  let updateCount = 0;
  
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const parts = line.split('|').map(p => p.trim());
    
    // Skip header and separator lines
    if (parts[1] === 'ID' || parts[1] === ':---' || parts[1] === '' || !parts[1]) continue;
    
    const id = parseInt(parts[1]);
    const region = parts[5];
    const address = parts[6];
    const latStr = parts[7];
    const lngStr = parts[8];
    
    if (isNaN(id)) continue;
    
    const lat = latStr !== '' ? parseFloat(latStr) : null;
    const lng = lngStr !== '' ? parseFloat(lngStr) : null;
    
    // Update all corrected fields: region, address, latitude, and longitude
    await pool.query(
      'UPDATE generators SET region = $1, address = $2, latitude = $3, longitude = $4 WHERE id = $5',
      [region || null, address || null, lat, lng, id]
    );
    updateCount++;
  }
  
  console.log(`Successfully updated coordinates and addresses for ${updateCount} generators.`);
  await pool.end();
}

run().catch(console.error);
