const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const extractDir = path.join(__dirname, 'extracted');
const dbPath = path.join(__dirname, 'database.sqlite');

async function run() {
  console.log('--- CUSTOMER IMPORT PROCESS STARTED ---');

  // 1. Connect to SQLite Database
  let db;
  let dbCustomers = [];
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    dbCustomers = await db.all('SELECT name, tax_id FROM customers');
    console.log(`Database loaded: ${dbCustomers.length} existing customers found.`);
  } catch (err) {
    console.error('Error connecting to database:', err);
    return;
  }

  // Build sets for quick duplication check
  const existingTaxIds = new Set(dbCustomers.map(c => String(c.tax_id || '').trim()).filter(Boolean));
  const existingNames = new Set(dbCustomers.map(c => String(c.name || '').trim().toLowerCase()).filter(Boolean));

  // 2. Load shared strings from Excel
  const sharedStringsPath = path.join(extractDir, 'xl', 'sharedStrings.xml');
  let sharedStrings = [];
  if (fs.existsSync(sharedStringsPath)) {
    const content = fs.readFileSync(sharedStringsPath, 'utf8');
    const decodeEntities = (str) => str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const siMatches = content.match(/<si[^>]*>([\s\S]*?)<\/si>/g);
    if (siMatches) {
      sharedStrings = siMatches.map(si => {
        const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g);
        if (tMatches) {
          return tMatches.map(t => {
            const match = t.match(/<t[^>]*>([\s\S]*?)<\/t>/);
            return match ? decodeEntities(match[1]) : '';
          }).join('');
        }
        return '';
      });
    }
  }

  // 3. Load sheet1.xml
  const sheet1Path = path.join(extractDir, 'xl', 'worksheets', 'sheet1.xml');
  if (!fs.existsSync(sheet1Path)) {
    console.error('sheet1.xml not found.');
    await db.close();
    return;
  }

  const content = fs.readFileSync(sheet1Path, 'utf8');
  const rows = [];
  const rowMatches = content.match(/<row[^>]*>([\s\S]*?)<\/row>/g);
  
  if (rowMatches) {
    for (let rMatch of rowMatches) {
      const rowNumMatch = rMatch.match(/<row[^>]+r="(\d+)"/);
      const rowNum = rowNumMatch ? parseInt(rowNumMatch[1]) : null;
      const cols = {};
      const cellMatches = rMatch.match(/<c[^>]*>([\s\S]*?)<\/c>/g);
      if (cellMatches) {
        for (let cMatch of cellMatches) {
          const refMatch = cMatch.match(/r="([A-Z]+)(\d+)"/);
          if (refMatch) {
            const colLetter = refMatch[1];
            const typeMatch = cMatch.match(/t="([^"]+)"/);
            const isShared = typeMatch && typeMatch[1] === 's';
            const valMatch = cMatch.match(/<v>([^<]+)<\/v>/);
            if (valMatch) {
              const val = valMatch[1];
              cols[colLetter] = isShared ? (sharedStrings[parseInt(val)] || val) : val;
            }
          }
        }
      }
      if (rowNum !== null) rows.push({ rowNum, cols });
    }
  }

  const dataRows = rows.slice(1);
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;

  console.log(`Processing ${dataRows.length} rows from Excel...`);

  // Begin database transaction for speed and safety
  await db.run('BEGIN TRANSACTION');

  try {
    for (let r of dataRows) {
      const name = String(r.cols.A || '').trim();
      const taxId = String(r.cols.J || '').trim();
      
      if (!name) continue;
      totalProcessed++;

      // Check duplication
      const hasDuplicateTaxId = taxId && existingTaxIds.has(taxId);
      const hasDuplicateName = existingNames.has(name.toLowerCase());

      if (hasDuplicateTaxId || hasDuplicateName) {
        totalDuplicates++;
        continue;
      }

      // Format fields
      const email = r.cols.B ? String(r.cols.B).trim() : null;
      const phone = r.cols.G ? String(r.cols.G).trim() : null;
      
      // Combine address components
      const addressParts = [];
      if (r.cols.D) addressParts.push(String(r.cols.D).trim());
      if (r.cols.F) addressParts.push(String(r.cols.F).trim());
      if (r.cols.E) addressParts.push(String(r.cols.E).trim());
      const address = addressParts.join(', ').replace(/,\s*$/, '');

      const taxOffice = r.cols.I ? String(r.cols.I).trim() : null;

      // Auto-classify Customer Type
      let customerType = 'Tüzel';
      if (taxId) {
        if (taxId.length === 11) {
          customerType = 'Gerçek';
        }
      }

      // Auto-classify Category
      let category = 'Özel';
      const nameUpper = name.toUpperCase();
      if (
        nameUpper.includes('HASTANESİ') || 
        nameUpper.includes('HASTANELERİ') ||
        nameUpper.includes('MÜDÜRLÜĞÜ') || 
        nameUpper.includes('REKTÖRLÜĞÜ') || 
        nameUpper.includes('ÜNİVERSİTESİ') || 
        nameUpper.includes('BELEDİYE') || 
        nameUpper.includes('BELEDİYESİ') || 
        nameUpper.includes('BAKANLIĞI') || 
        nameUpper.includes('İ.Ü.C') || 
        nameUpper.includes('OKULU') || 
        nameUpper.includes('DEKANLIĞI')
      ) {
        category = 'Kamu';
      }

      // Insert new customer
      await db.run(
        `INSERT INTO customers (name, email, phone, address, customer_type, category, tax_id, tax_office)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, address, customerType, category, taxId || null, taxOffice]
      );

      // Add to set to prevent double entries within the Excel sheet itself
      if (taxId) existingTaxIds.add(taxId);
      existingNames.add(name.toLowerCase());
      
      totalInserted++;
    }

    await db.run('COMMIT');
    console.log('--- IMPORT COMPLETED SUCCESSFULLY ---');
    console.log(`Total Rows Analyzed: ${dataRows.length}`);
    console.log(`Valid Records Processed: ${totalProcessed}`);
    console.log(`Duplicate Records Skipped: ${totalDuplicates}`);
    console.log(`New Customers Successfully Registered: ${totalInserted}`);

  } catch (insertError) {
    await db.run('ROLLBACK');
    console.error('Error inserting records, rolled back changes:', insertError);
  } finally {
    await db.close();
  }
}

run();
