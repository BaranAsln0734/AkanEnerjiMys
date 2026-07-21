import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://cvsuser:Cvspower123@localhost/cvspower';
  console.log('Starting migration to:', databaseUrl);

  const sqliteDb = await open({
    filename: path.resolve(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  const pgPool = new Pool({ connectionString: databaseUrl });

  // Disable triggers/foreign keys during migration
  await pgPool.query("SET session_replication_role = 'replica';");

  const tables = [
    'users',
    'customers',
    'generators',
    'parts',
    'fault_codes',
    'technicians',
    'appointments',
    'generator_faults',
    'contracts',
    'telemetry',
    'notifications',
    'service_records',
    'service_parts',
    'quotes',
    'quote_items'
  ];

  for (const table of tables) {
    console.log(`Migrating table: ${table}`);

    // Check if table exists in SQLite
    let rows = [];
    try {
      rows = await sqliteDb.all(`SELECT * FROM ${table}`);
    } catch (e) {
      console.warn(`Table ${table} does not exist in SQLite, skipping.`);
      continue;
    }

    if (rows.length === 0) {
      console.log(`Table ${table} is empty in SQLite.`);
      continue;
    }

    // Truncate PostgreSQL table
    try {
      await pgPool.query(`TRUNCATE TABLE ${table} CASCADE`);
    } catch (e) {
      console.warn(`Could not truncate table ${table}: ${e.message}`);
    }

    // Get column names
    const columns = Object.keys(rows[0]);
    const colsStr = columns.join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `INSERT INTO ${table} (${colsStr}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columns.map(col => {
        let val = row[col];
        
        // Clean values: SQLite empty strings in numeric columns should be NULL
        if (val === '') {
          const numCols = [
            'customer_id', 'generator_id', 'user_id', 'assistant_technician_id',
            'fault_id', 'contract_id', 'service_record_id', 'part_id',
            'fault_code_id', 'quote_id', 'quantity', 'stock_quantity',
            'critical_level', 'price', 'unit_price', 'discount_percent',
            'vat_percent', 'total_price', 'subtotal', 'discount', 'vat',
            'grand_total', 'service_fee', 'total_cost', 'latitude', 'longitude',
            'oil_pressure', 'temperature', 'voltage', 'runtime_hours',
            'fuel_level', 'last_fuel_level', 'last_runtime_hours', 'battery_qty',
            'air_filter_qty', 'fuel_filter_qty', 'fuel_pre_filter_qty', 'chassis_filter_qty',
            'water_filter_qty', 'centrifugal_filter_qty', 'has_canopy', 'purchase_price',
            'warranty_end_date', 'installation_date', 'next_maintenance_date',
            'service_date', 'appointment_date', 'fault_date', 'start_date', 'end_date',
            'quote_date', 'valid_until'
          ];
          const isNumericOrDate = numCols.includes(col) || 
                                  col.endsWith('_qty') || 
                                  col.endsWith('_id') || 
                                  col.includes('capacity') ||
                                  col.includes('hours');
          if (isNumericOrDate) {
            val = null;
          }
        }
        return val;
      });

      await pgPool.query(insertQuery, values);
    }

    console.log(`Successfully migrated ${rows.length} rows for ${table}`);

    // Reset primary key sequence
    try {
      await pgPool.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          coalesce(max(id), 1),
          max(id) IS NOT null
        ) FROM ${table}
      `);
    } catch (e) {
      console.warn(`Could not reset sequence for table ${table}:`, e.message);
    }
  }

  // Re-enable triggers/foreign keys
  await pgPool.query("SET session_replication_role = 'origin';");
  console.log('Migration completed successfully!');

  await sqliteDb.close();
  await pgPool.end();
}

migrate().catch(console.error);
