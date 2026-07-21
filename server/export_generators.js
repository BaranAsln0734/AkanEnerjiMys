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
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://cvsuser:Cvspower123@localhost/cvspower';
  console.log('Connecting to database:', databaseUrl);
  
  const pool = new Pool({ connectionString: databaseUrl });
  
  const query = `
    SELECT g.id, g.serial_number, g.brand, g.model, c.name as customer_name, g.address, g.region, g.latitude, g.longitude 
    FROM generators g
    LEFT JOIN customers c ON g.customer_id = c.id
    ORDER BY g.id
  `;
  
  const res = await pool.query(query);
  const generators = res.rows;
  
  let mdContent = `# CVSPower Jeneratör Koordinat Listesi\n\n`;
  mdContent += `Aşağıdaki tabloda enlem ve boylam sütunlarını doldurunuz. Değerleri girdikten sonra bu dosyayı kaydedip bana geri atabilirsiniz.\n\n`;
  mdContent += `| ID | Seri No | Marka / Model | Müşteri | Bölge | Adres | Enlem (Latitude) | Boylam (Longitude) |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  
  for (const g of generators) {
    const cleanAddress = (g.address || '').replace(/\r?\n|\r/g, ' ').replace(/\|/g, '-');
    const cleanCustomer = (g.customer_name || '').replace(/\|/g, '-');
    const lat = g.latitude !== null && g.latitude !== undefined ? g.latitude : '';
    const lng = g.longitude !== null && g.longitude !== undefined ? g.longitude : '';
    
    mdContent += `| ${g.id} | ${g.serial_number} | ${g.brand || ''} ${g.model || ''} | ${cleanCustomer} | ${g.region || ''} | ${cleanAddress} | ${lat} | ${lng} |\n`;
  }
  
  const outputPath = path.join(__dirname, '..', 'jeneratorler_koordinat.md');
  fs.writeFileSync(outputPath, mdContent, 'utf8');
  console.log(`Markdown list successfully exported to: ${outputPath}`);
  
  await pool.end();
}

run().catch(console.error);
