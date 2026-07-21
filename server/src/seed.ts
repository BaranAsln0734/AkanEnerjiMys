import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  const db = await open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });

  console.log('Seeding data...');

  // Add Customers
  await db.run('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', 
    ['Ahmet Yılmaz', 'ahmet@example.com', '0555 111 22 33', 'İstanbul, Pendik']);
  await db.run('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', 
    ['Mehmet Öz', 'mehmet@example.com', '0555 222 33 44', 'Ankara, Çankaya']);
  await db.run('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', 
    ['Ayşe Demir', 'ayse@example.com', '0555 333 44 55', 'İzmir, Bornova']);

  const today = new Date();
  
  // Helper to add days
  const addDays = (days: number) => {
    const date = new Date();
    date.setDate(today.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Add Generators
  // 1. Normal (Green) - 45 days left
  await db.run('INSERT INTO generators (customer_id, serial_number, model, installation_date, next_maintenance_date, qr_code_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [1, 'CVS-1001', 'CVS 50kVA', '2025-01-01', addDays(45), crypto.randomBytes(8).toString('hex')]);

  // 2. Warning (Yellow) - 20 days left
  await db.run('INSERT INTO generators (customer_id, serial_number, model, installation_date, next_maintenance_date, qr_code_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [2, 'CVS-2002', 'CVS 100kVA', '2024-12-15', addDays(20), crypto.randomBytes(8).toString('hex')]);

  // 3. Critical (Red) - 5 days left
  await db.run('INSERT INTO generators (customer_id, serial_number, model, installation_date, next_maintenance_date, qr_code_hash) VALUES (?, ?, ?, ?, ?, ?)',
    [3, 'CVS-3003', 'CVS 250kVA', '2024-11-20', addDays(5), crypto.randomBytes(8).toString('hex')]);

  console.log('Seeding completed.');
  await db.close();
}

seed().catch(err => console.error(err));
