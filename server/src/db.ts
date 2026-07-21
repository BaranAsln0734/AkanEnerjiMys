import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './auth.js';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbInterface {
  all(sql: string, params?: any): Promise<any[]>;
  get(sql: string, params?: any): Promise<any | undefined>;
  run(sql: string, params?: any): Promise<{ lastID?: number; changes?: number }>;
  exec(sql: string): Promise<void>;
}

function convertSqlPlaceholders(sql: string): string {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

class PostgresDbWrapper implements DbInterface {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async all(sql: string, params: any = []): Promise<any[]> {
    const pgSql = convertSqlPlaceholders(sql);
    const arrParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    const cleanParams = arrParams.map(val => val === '' ? null : val);
    const res = await this.pool.query(pgSql, cleanParams);
    return res.rows;
  }

  async get(sql: string, params: any = []): Promise<any | undefined> {
    const pgSql = convertSqlPlaceholders(sql);
    const arrParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    const cleanParams = arrParams.map(val => val === '' ? null : val);
    const res = await this.pool.query(pgSql, cleanParams);
    return res.rows[0];
  }

  async run(sql: string, params: any = []): Promise<{ lastID?: number; changes?: number }> {
    let pgSql = convertSqlPlaceholders(sql);
    const isInsert = /^\s*insert\s+into/i.test(pgSql);
    const hasReturning = /returning/i.test(pgSql);
    if (isInsert && !hasReturning) {
      pgSql += ' RETURNING id';
    }
    const arrParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    const cleanParams = arrParams.map(val => val === '' ? null : val);
    const res = await this.pool.query(pgSql, cleanParams);
    const lastID = res.rows[0]?.id || null;
    const changes = res.rowCount || 0;
    return { lastID, changes };
  }

  async exec(sql: string): Promise<void> {
    let pgSql = sql
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      .replace(/PRAGMA foreign_keys = ON;/gi, '');
    await this.pool.query(pgSql);
  }
}

class SqliteDbWrapper implements DbInterface {
  private innerDb: any;

  constructor(innerDb: any) {
    this.innerDb = innerDb;
  }

  all(sql: string, params: any = []): Promise<any[]> {
    const arrParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    return this.innerDb.all(sql, arrParams);
  }

  get(sql: string, params: any = []): Promise<any | undefined> {
    const arrParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    return this.innerDb.get(sql, arrParams);
  }

  async run(sql: string, params: any = []): Promise<{ lastID?: number; changes?: number }> {
    const arrParams = Array.isArray(params) ? params : (params !== undefined ? [params] : []);
    const res = await this.innerDb.run(sql, arrParams);
    return { lastID: res.lastID, changes: res.changes };
  }

  exec(sql: string): Promise<void> {
    return this.innerDb.exec(sql);
  }
}

export const europeLandCoords = [
  { lat: 41.0122, lng: 28.9603 }, // Fatih
  { lat: 41.0422, lng: 29.0083 }, // Beşiktaş
  { lat: 41.0602, lng: 28.9877 }, // Şişli
  { lat: 41.0812, lng: 28.9732 }, // Kağıthane
  { lat: 41.0370, lng: 28.9764 }, // Beyoğlu
  { lat: 41.1115, lng: 29.0205 }, // Sarıyer
  { lat: 40.9881, lng: 28.8962 }, // Zeytinburnu
  { lat: 40.9850, lng: 28.8244 }, // Bakırköy
  { lat: 41.0003, lng: 28.8638 }, // Bahçelievler
  { lat: 41.0339, lng: 28.8579 }, // Bağcılar
  { lat: 41.0343, lng: 28.6801 }, // Esenyurt
  { lat: 41.0114, lng: 28.6419 }, // Beylikdüzü
  { lat: 41.0969, lng: 28.7909 }, // Başakşehir
  { lat: 41.0478, lng: 28.9327 }, // Eyüpsultan
  { lat: 41.0592, lng: 28.9142 }, // Gaziosmanpaşa
  { lat: 41.0349, lng: 28.9118 }, // Bayrampaşa
  { lat: 40.9901, lng: 28.7183 }  // Avcılar
];

export const anadoluLandCoords = [
  { lat: 40.9910, lng: 29.0254 }, // Kadıköy
  { lat: 41.0267, lng: 29.0152 }, // Üsküdar
  { lat: 40.9847, lng: 29.1064 }, // Ataşehir
  { lat: 40.9448, lng: 29.1311 }, // Maltepe
  { lat: 40.8986, lng: 29.1856 }, // Kartal
  { lat: 40.8969, lng: 29.2346 }, // Pendik
  { lat: 40.8263, lng: 29.3033 }, // Tuzla
  { lat: 41.0252, lng: 29.1171 }, // Ümraniye
  { lat: 41.1167, lng: 29.0974 }, // Beykoz
  { lat: 41.0315, lng: 29.1764 }, // Çekmeköy
  { lat: 40.9902, lng: 29.2312 }, // Sancaktepe
  { lat: 40.9657, lng: 29.2625 }  // Sultanbeyli
];

export const isLatLngInSea = (lat: number, lng: number, region: string) => {
  const isEurope = region === 'Avrupa';
  if (isEurope) {
    return lat < 40.985;
  } else {
    const seaLimit = 41.02 - (lng - 29.0) * 0.65;
    return lat < seaLimit;
  }
};

export const getRandomLandCoordinates = (region: string) => {
  const coordsList = region === 'Avrupa' ? europeLandCoords : anadoluLandCoords;
  const base = coordsList[Math.floor(Math.random() * coordsList.length)] || { lat: 41.0082, lng: 28.9784 };
  const latOffset = (Math.random() * 0.006 - 0.003);
  const lngOffset = (Math.random() * 0.008 - 0.004);
  return {
    latitude: base.lat + latOffset,
    longitude: base.lng + lngOffset
  };
};

let db: DbInterface;

export async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    console.log('Connecting to PostgreSQL database via pool...');
    db = new PostgresDbWrapper(databaseUrl);
  } else {
    console.log('Connecting to SQLite database...');
    const sqliteDb = await open({
      filename: path.join(__dirname, '../database.sqlite'),
      driver: sqlite3.Database
    });
    // Enable foreign key enforcement (SQLite disables it by default)
    await sqliteDb.run('PRAGMA foreign_keys = ON;');
    db = new SqliteDbWrapper(sqliteDb);
  }

  // Base Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS generators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      serial_number TEXT NOT NULL UNIQUE,
      model TEXT,
      installation_date TEXT,
      next_maintenance_date TEXT,
      qr_code_hash TEXT UNIQUE,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS service_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generator_id INTEGER,
      service_date TEXT,
      description TEXT,
      technician_signature_url TEXT,
      customer_signature_url TEXT,
      pdf_report_url TEXT,
      FOREIGN KEY (generator_id) REFERENCES generators(id)
    );

    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      part_number TEXT UNIQUE,
      stock_quantity INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'Adet'
    );

    CREATE TABLE IF NOT EXISTS service_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_record_id INTEGER,
      part_id INTEGER,
      quantity INTEGER,
      FOREIGN KEY (service_record_id) REFERENCES service_records(id),
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS fault_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      description TEXT,
      solution TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'technician', -- 'admin' or 'technician'
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      specialty TEXT,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generator_id INTEGER,
      technician_id INTEGER,
      appointment_date TEXT,
      status TEXT DEFAULT 'Beklemede',
      notes TEXT,
      FOREIGN KEY (generator_id) REFERENCES generators(id),
      FOREIGN KEY (technician_id) REFERENCES technicians(id)
    );

    CREATE TABLE IF NOT EXISTS generator_faults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generator_id INTEGER,
      fault_code_id INTEGER,
      fault_date TEXT,
      status TEXT DEFAULT 'Açık', -- 'Açık', 'Çözüldü'
      notes TEXT,
      FOREIGN KEY (generator_id) REFERENCES generators(id),
      FOREIGN KEY (fault_code_id) REFERENCES fault_codes(id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      start_date TEXT,
      end_date TEXT,
      contract_type TEXT, -- 'Yıllık', '6 Aylık', 'Özel'
      price REAL,
      status TEXT DEFAULT 'Aktif', -- 'Aktif', 'Süresi Doldu', 'İptal'
      notes TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generator_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      oil_pressure REAL,
      temperature REAL,
      voltage REAL,
      runtime_hours REAL,
      fuel_level INTEGER,
      FOREIGN KEY (generator_id) REFERENCES generators(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration Helper: Add columns safely
  const addColumnIfNotExists = async (table: string, column: string, type: string) => {
    const isPostgres = !!process.env.DATABASE_URL;
    if (isPostgres) {
      const columnCheck = await db.all(
        `SELECT column_name FROM information_schema.columns WHERE table_name = ? AND column_name = ?`,
        [table.toLowerCase(), column.toLowerCase()]
      );
      if (columnCheck.length === 0) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    } else {
      const tableInfo = await db.all(`PRAGMA table_info(${table})`);
      if (!tableInfo.find(c => c.name === column)) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    }
  };

  await addColumnIfNotExists('parts', 'unit_price', 'REAL DEFAULT 0');
  await addColumnIfNotExists('parts', 'critical_level', 'INTEGER DEFAULT 5');
  await addColumnIfNotExists('service_records', 'service_fee', 'REAL DEFAULT 0');
  await addColumnIfNotExists('service_records', 'total_cost', 'REAL DEFAULT 0');
  await addColumnIfNotExists('service_records', 'checklist_json', 'TEXT');
  await addColumnIfNotExists('service_records', 'photo_before_url', 'TEXT');
  await addColumnIfNotExists('service_records', 'photo_after_url', 'TEXT');
  await addColumnIfNotExists('generators', 'warranty_end_date', 'TEXT');
  await addColumnIfNotExists('generators', 'last_runtime_hours', 'REAL DEFAULT 0');
  await addColumnIfNotExists('generators', 'last_fuel_level', 'INTEGER DEFAULT 100');
  await addColumnIfNotExists('generators', 'contract_id', 'INTEGER');
  await addColumnIfNotExists('generators', 'purchase_price', 'REAL DEFAULT 0');
  await addColumnIfNotExists('users', 'customer_id', 'INTEGER');

  // Customer detailed fields
  await addColumnIfNotExists('customers', 'customer_type', 'TEXT'); // Tüzel / Gerçek
  await addColumnIfNotExists('customers', 'category', 'TEXT');      // Özel / Kamu
  await addColumnIfNotExists('customers', 'tax_id', 'TEXT');
  await addColumnIfNotExists('customers', 'tax_office', 'TEXT');
  await addColumnIfNotExists('customers', 'authorized_person', 'TEXT');

  // Generator detailed fields
  await addColumnIfNotExists('generators', 'brand', 'TEXT');
  await addColumnIfNotExists('generators', 'kva', 'TEXT');
  await addColumnIfNotExists('generators', 'engine_model', 'TEXT');
  await addColumnIfNotExists('generators', 'engine_serial_number', 'TEXT');
  await addColumnIfNotExists('generators', 'alternator_model', 'TEXT');
  await addColumnIfNotExists('generators', 'alternator_serial_number', 'TEXT');
  await addColumnIfNotExists('generators', 'control_panel_type', 'TEXT');
  await addColumnIfNotExists('generators', 'control_device', 'TEXT');
  await addColumnIfNotExists('generators', 'breaker_type', 'TEXT');
  await addColumnIfNotExists('generators', 'breaker_current', 'TEXT');
  await addColumnIfNotExists('generators', 'transfer_panel_type', 'TEXT');
  await addColumnIfNotExists('generators', 'has_canopy', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('generators', 'location', 'TEXT');
  await addColumnIfNotExists('generators', 'region', 'TEXT'); // Avrupa / Anadolu
  await addColumnIfNotExists('generators', 'address', 'TEXT'); // Full address for map orientation
  await addColumnIfNotExists('generators', 'latitude', 'REAL');
  await addColumnIfNotExists('generators', 'longitude', 'REAL');
  await addColumnIfNotExists('technicians', 'latitude', 'REAL');
  await addColumnIfNotExists('technicians', 'longitude', 'REAL');
  await addColumnIfNotExists('technicians', 'last_location_update', 'TEXT');
  await addColumnIfNotExists('generators', 'contract_status', 'TEXT DEFAULT "Yok"'); // Var / Yok

  // New Capacity & Filter fields
  await addColumnIfNotExists('generators', 'oil_capacity', 'TEXT');
  await addColumnIfNotExists('generators', 'antifreeze_capacity', 'TEXT');
  await addColumnIfNotExists('generators', 'air_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'air_filter_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'fuel_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'fuel_filter_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'fuel_pre_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'fuel_pre_filter_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'chassis_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'chassis_filter_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'oil_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'oil_filter_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'bypass_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'bypass_filter_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'turbo_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'water_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'water_filter_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'centrifugal_filter_code', 'TEXT');
  await addColumnIfNotExists('generators', 'centrifugal_filter_qty', 'INTEGER');
  
  // New Fields
  await addColumnIfNotExists('generators', 'warranty_status', 'TEXT DEFAULT "Var"');
  await addColumnIfNotExists('generators', 'runtime_hours', 'TEXT');
  
  // Battery & Rectifier
  await addColumnIfNotExists('generators', 'battery_amperage', 'TEXT');
  await addColumnIfNotExists('generators', 'battery_qty', 'INTEGER');
  await addColumnIfNotExists('generators', 'charger_voltage', 'TEXT');
  await addColumnIfNotExists('generators', 'charger_amperage', 'TEXT');
  await addColumnIfNotExists('generators', 'traccar_id', 'TEXT');
  await addColumnIfNotExists('appointments', 'assistant_technician_id', 'INTEGER');
  await addColumnIfNotExists('appointments', 'fault_id', 'INTEGER');
  await addColumnIfNotExists('technicians', 'user_id', 'INTEGER');
  await addColumnIfNotExists('contracts', 'contract_period', 'TEXT');
  await addColumnIfNotExists('contracts', 'maintenance_months', 'TEXT'); // Comma-separated months
  await addColumnIfNotExists('contracts', 'general_maintenance_month', 'TEXT'); // Single month
  await addColumnIfNotExists('service_records', 'start_time', 'TEXT');
  await addColumnIfNotExists('service_records', 'end_time', 'TEXT');

  // Quotes and Quote Items Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      quote_date TEXT NOT NULL,
      valid_until TEXT,
      quote_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Taslak',
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      vat REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'Adet',
      unit_price REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      vat_percent REAL NOT NULL DEFAULT 20,
      total_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );
  `);

  // Seed fault codes
  const count = await db.get('SELECT COUNT(*) as count FROM fault_codes');
  if (Number(count.count) === 0) {
    await db.run('INSERT INTO fault_codes (code, description, solution) VALUES (?, ?, ?)', 
      ['AL 01', 'Düşük Yağ Basıncı', 'Yağ seviyesini kontrol edin, sızıntı varsa giderin, sensörü kontrol edin.']);
    await db.run('INSERT INTO fault_codes (code, description, solution) VALUES (?, ?, ?)', 
      ['AL 02', 'Yüksek Hararet', 'Radyatör suyunu ve fan kayışını kontrol edin.']);
    await db.run('INSERT INTO fault_codes (code, description, solution) VALUES (?, ?, ?)', 
      ['AL 03', 'Şarj Arızası', 'V-Kayışı ve alternatör bağlantılarını kontrol edin.']);
  }

  // Seed technicians and their user accounts
  const techCount = await db.get('SELECT COUNT(*) as count FROM technicians');
  if (Number(techCount.count) === 0) {
    const techs = [
      { name: 'Ahmet Yılmaz', username: 'ahmet', role: 'technician' },
      { name: 'Mehmet Demir', username: 'mehmet', role: 'technician' },
      { name: 'Hüseyin Kaya', username: 'huseyin', role: 'technician' }
    ];

    for (const t of techs) {
      const hashedPassword = await hashPassword(process.env.SEED_TECHNICIAN_PASSWORD || '123456');
      const userResult = await db.run(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        [t.username, hashedPassword, t.role, t.name]
      );
      await db.run(
        'INSERT INTO technicians (name, phone, specialty, user_id) VALUES (?, ?, ?, ?)',
        [t.name, '0500 000 00 00', 'Genel Bakım', userResult.lastID]
      );
    }
    console.log('Default technicians created: ahmet, mehmet, huseyin / 123456');
  }

  // Seed default admin
  const userCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
  if (Number(userCount.count) === 0) {
    const hashedPassword = await hashPassword(process.env.SEED_ADMIN_PASSWORD || 'admin123');
    await db.run(
      'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
      ['admin', hashedPassword, 'admin', 'System Administrator']
    );
    console.log('Default admin user created: admin / admin123');
  }

    return db;
}

export function getDb() {
  return db;
}
