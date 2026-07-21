import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { initDb, getDb, getRandomLandCoordinates } from './db.js';
import crypto from 'node:crypto';
import { z } from 'zod';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { 
  authMiddleware, 
  adminOnly, 
  generateToken, 
  comparePassword, 
  hashPassword,
  loginSchema,
  registerSchema 
} from './auth.js';
import {
  customerSchema,
  generatorSchema,
  partSchema,
  faultRegistrationSchema,
  contractSchema,
  serviceRecordSchema,
  technicianSchema
} from './schemas.js';

dotenv.config();

const TRACCAR_URL = process.env.TRACCAR_URL || 'http://78.188.8.207:8082';
const TRACCAR_TOKEN = process.env.TRACCAR_TOKEN || '';

const app = express();
const port = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Rate limiter for auth endpoints (max 10 login attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Helper for async routes to catch errors
const asyncHandler = (fn: (req: any, res: any, next: any) => Promise<any> | any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Initialize Database
initDb().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Failed to initialize database', err);
});

// --- Public Routes (No Auth Required) ---
app.get('/api/public/generators/:hash', asyncHandler(async (req: any, res: any) => {
  const { hash } = req.params;
  const db = getDb();
  
  const generator = await db.get('SELECT id, serial_number, model, brand, location, installation_date, next_maintenance_date, warranty_status, warranty_end_date FROM generators WHERE qr_code_hash = ?', hash);
  
  if (!generator) {
    return res.status(404).json({ error: 'Ekipman bulunamadı.' });
  }

  const customer = await db.get('SELECT name FROM customers WHERE id = (SELECT customer_id FROM generators WHERE id = ?)', generator.id);
  const records = await db.all('SELECT service_date, description, start_time, end_time FROM service_records WHERE generator_id = ? ORDER BY service_date DESC', generator.id);
  
  res.json({ ...generator, customer_name: customer?.name, records });
}));

// --- Auth Routes ---
// ... rest of auth routes

app.post('/api/auth/login', authLimiter, asyncHandler(async (req, res) => {
  console.log('Login attempt for:', req.body.username);
  const { username, password } = loginSchema.parse(req.body);
  const db = getDb();
  const user = await db.get('SELECT * FROM users WHERE username = ?', username);

  if (!user) {
    console.log('User not found:', username);
    return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
  }

  const isPasswordValid = await comparePassword(password, user.password);
  console.log('Password valid:', isPasswordValid);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
  }

  const token = generateToken({ id: user.id, username: user.username, role: user.role, customer_id: user.customer_id });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, customer_id: user.customer_id } });
}));

app.post('/api/auth/register', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { username, password, role, name } = registerSchema.parse(req.body);
  const hashedPassword = await hashPassword(password);
  const db = getDb();
  
  const result = await db.run(
    'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, role, name]
  );
  res.json({ id: result.lastID, success: true });
}));

// --- Protected API Routes ---

// Customers
app.get('/api/customers', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  const customers = await db.all('SELECT * FROM customers');
  res.json(customers);
}));

app.get('/api/customers/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  const customer = await db.get('SELECT * FROM customers WHERE id = ?', id);
  if (!customer) {
    return res.status(404).json({ error: 'Müşteri bulunamadı' });
  }

  const generators = await db.all(`
    SELECT * FROM generators 
    WHERE customer_id = ?
  `, id);
  
  const contracts = await db.all('SELECT * FROM contracts WHERE customer_id = ? ORDER BY end_date DESC', id);
  const userAccount = await db.get("SELECT id, username, name FROM users WHERE customer_id = ? AND role = 'customer'", id);
  
  res.json({ ...customer, generators, contracts, user_account: userAccount || null });
}));

app.post('/api/customers', authMiddleware, asyncHandler(async (req, res) => {
  const data = customerSchema.parse(req.body);
  const db = getDb();
  const result = await db.run(
    'INSERT INTO customers (name, email, phone, address, customer_type, category, tax_id, tax_office, authorized_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.email, data.phone, data.address, data.customer_type, data.category, data.tax_id, data.tax_office, data.authorized_person]
  );
  res.json({ id: result.lastID });
}));

app.put('/api/customers/:id', authMiddleware, asyncHandler(async (req, res) => {
  const data = customerSchema.parse(req.body);
  const { id } = req.params;
  const db = getDb();
  await db.run(
    'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, customer_type = ?, category = ?, tax_id = ?, tax_office = ?, authorized_person = ? WHERE id = ?',
    [data.name, data.email, data.phone, data.address, data.customer_type, data.category, data.tax_id, data.tax_office, data.authorized_person, id]
  );
  res.json({ success: true });
}));

app.delete('/api/customers/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  // Cascade: delete related service_parts, service_records, generator_faults, appointments, generators, contracts
  const customerGenerators = await db.all('SELECT id FROM generators WHERE customer_id = ?', id);
  for (const gen of customerGenerators) {
    const records = await db.all('SELECT id FROM service_records WHERE generator_id = ?', gen.id);
    for (const record of records) {
      await db.run('DELETE FROM service_parts WHERE service_record_id = ?', record.id);
    }
    await db.run('DELETE FROM service_records WHERE generator_id = ?', gen.id);
    await db.run('DELETE FROM generator_faults WHERE generator_id = ?', gen.id);
    await db.run('DELETE FROM appointments WHERE generator_id = ?', gen.id);
    await db.run('DELETE FROM telemetry WHERE generator_id = ?', gen.id);
  }
  await db.run('DELETE FROM generators WHERE customer_id = ?', id);
  await db.run('DELETE FROM contracts WHERE customer_id = ?', id);
  await db.run('DELETE FROM customers WHERE id = ?', id);
  res.json({ success: true });
}));

// Contracts
app.get('/api/contracts', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  let query = `
    SELECT cn.*, c.name as customer_name 
    FROM contracts cn
    JOIN customers c ON cn.customer_id = c.id
  `;
  const params: any[] = [];
  if (req.user.role === 'customer') {
    query += ' WHERE cn.customer_id = ?';
    params.push(req.user.customer_id);
  }
  const contracts = await db.all(query, params);
  res.json(contracts);
}));

app.post('/api/contracts', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const data = contractSchema.parse(req.body);
  const db = getDb();
  const result = await db.run(
    'INSERT INTO contracts (customer_id, start_date, end_date, contract_type, price, status, notes, contract_period, maintenance_months, general_maintenance_month, maintenance_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.customer_id, data.start_date, data.end_date, data.contract_type, data.price, data.status, data.notes, data.contract_period, data.maintenance_months, data.general_maintenance_month, data.maintenance_year]
  );
  res.json({ id: result.lastID });
}));

app.put('/api/contracts/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const data = contractSchema.parse(req.body);
  const { id } = req.params;
  const db = getDb();
  await db.run(
    'UPDATE contracts SET customer_id = ?, start_date = ?, end_date = ?, contract_type = ?, price = ?, status = ?, notes = ?, contract_period = ?, maintenance_months = ?, general_maintenance_month = ?, maintenance_year = ? WHERE id = ?',
    [data.customer_id, data.start_date, data.end_date, data.contract_type, data.price, data.status, data.notes, data.contract_period, data.maintenance_months, data.general_maintenance_month, data.maintenance_year, id]
  );
  res.json({ success: true });
}));

app.delete('/api/contracts/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  // Update generators linked to this contract to remove contract association and set contract_status to 'Yok'
  await db.run("UPDATE generators SET contract_id = NULL, contract_status = 'Yok' WHERE contract_id = ?", id);
  await db.run('DELETE FROM contracts WHERE id = ?', id);
  res.json({ success: true });
}));

// Generators
app.delete('/api/generators/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  // Cleanup related data
  await db.run('DELETE FROM telemetry WHERE generator_id = ?', id);
  await db.run('DELETE FROM generator_faults WHERE generator_id = ?', id);
  
  const records = await db.all('SELECT id FROM service_records WHERE generator_id = ?', id);
  for (const record of records) {
    await db.run('DELETE FROM service_parts WHERE service_record_id = ?', record.id);
  }
  await db.run('DELETE FROM service_records WHERE generator_id = ?', id);
  await db.run('DELETE FROM appointments WHERE generator_id = ?', id);
  
  await db.run('DELETE FROM generators WHERE id = ?', id);
  res.json({ success: true });
}));

app.get('/api/generators', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  // Now using generator's own contract_status
  let query = `
    SELECT g.*, c.name as customer_name
    FROM generators g 
    LEFT JOIN customers c ON g.customer_id = c.id
  `;
  
  const params: any[] = [];
  if (req.user.role === 'customer') {
    query += ' WHERE g.customer_id = ?';
    params.push(req.user.customer_id);
  }
  
  const generators = await db.all(query, params);
  res.json(generators);
}));

app.get('/api/generators/:idOrHash', authMiddleware, asyncHandler(async (req, res) => {
    const { idOrHash } = req.params;
    const db = getDb();
    let generator;
    if (isNaN(Number(idOrHash))) {
        generator = await db.get('SELECT * FROM generators WHERE qr_code_hash = ?', idOrHash);
    } else {
        generator = await db.get('SELECT * FROM generators WHERE id = ?', idOrHash);
    }
    
    if (generator) {
        // Customer security check
        if (req.user.role === 'customer' && generator.customer_id !== req.user.customer_id) {
          return res.status(403).json({ error: 'Bu ekipmana erişim yetkiniz yok.' });
        }

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', generator.customer_id);
        const records = await db.all('SELECT * FROM service_records WHERE generator_id = ? ORDER BY service_date DESC', generator.id);
        const faults = await db.all(`
          SELECT gf.*, fc.code, fc.description 
          FROM generator_faults gf
          LEFT JOIN fault_codes fc ON gf.fault_code_id = fc.id
          WHERE gf.generator_id = ?
          ORDER BY gf.fault_date DESC
        `, generator.id);
        res.json({ ...generator, customer, records, faults });
    } else {
        res.status(404).json({ error: 'Generator not found' });
    }
}));

// Generator Faults
app.get('/api/generator-faults', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  let query = `
    SELECT gf.*, g.serial_number, c.name as customer_name
    FROM generator_faults gf
    JOIN generators g ON gf.generator_id = g.id
    JOIN customers c ON g.customer_id = c.id
  `;
  const params: any[] = [];
  if (req.user.role === 'customer') {
    query += ' WHERE g.customer_id = ?';
    params.push(req.user.customer_id);
  }
  query += ' ORDER BY gf.fault_date DESC';
  
  const faults = await db.all(query, params);
  res.json(faults);
}));

app.post('/api/generator-faults', authMiddleware, asyncHandler(async (req, res) => {
  const data = faultRegistrationSchema.parse(req.body);
  const db = getDb();
  
  // Security check for customers
  if (req.user.role === 'customer') {
    const generator = await db.get('SELECT customer_id FROM generators WHERE id = ?', data.generator_id);
    if (!generator || generator.customer_id !== req.user.customer_id) {
      return res.status(403).json({ error: 'Bu ekipman için arıza kaydı oluşturma yetkiniz yok.' });
    }
  }

  const result = await db.run(
    'INSERT INTO generator_faults (generator_id, fault_code_id, fault_date, status, notes) VALUES (?, ?, ?, ?, ?)',
    [data.generator_id, data.fault_code_id, data.fault_date, data.status, data.notes]
  );
  res.json({ id: result.lastID });
}));

app.put('/api/generator-faults/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const { id } = req.params;
  const db = getDb();
  await db.run(
    'UPDATE generator_faults SET status = ?, notes = ? WHERE id = ?',
    [status, notes, id]
  );
  res.json({ success: true });
}));

async function geocodeAddress(address: string, region: string): Promise<{ latitude: number, longitude: number }> {
  const istanbulDistricts = [
    'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 
    'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 
    'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 
    'Eyüpsultan', 'Eyüp', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 
    'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 
    'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 
    'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'
  ];

  async function fetchCoords(query: string) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'AkanEnerji-Fleet-Manager-Geocoder/1.0' }
      });
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon)
          };
        }
      }
    } catch (e) {
      console.error(`Geocoding error for query "${query}":`, e);
    }
    return null;
  }

  // 1. Try full address
  if (address && address.trim()) {
    const coords = await fetchCoords(address);
    if (coords) return coords;
  }

  // 2. Try matching district
  if (address) {
    const addrLower = address.toLowerCase();
    const district = istanbulDistricts.find(dist => addrLower.includes(dist.toLowerCase()));
    if (district) {
      const coords = await fetchCoords(`${district}, İstanbul, Turkey`);
      if (coords) return coords;
    }
  }

  // 3. Fallback to region center
  const query = region === 'Avrupa' ? 'Şişli, İstanbul, Turkey' : 'Ataşehir, İstanbul, Turkey';
  const coords = await fetchCoords(query);
  if (coords) return coords;

  // 4. Absolute fallback
  return { latitude: 41.0082, longitude: 28.9784 };
}

app.post('/api/generators', authMiddleware, asyncHandler(async (req, res) => {
  const data = generatorSchema.parse(req.body);
  const qr_code_hash = crypto.randomBytes(8).toString('hex');
  const db = getDb();
  
  const result = await db.run(
    `INSERT INTO generators (
      customer_id, serial_number, model, installation_date, next_maintenance_date, 
      qr_code_hash, warranty_status, warranty_end_date, runtime_hours, last_runtime_hours, last_fuel_level,
      brand, kva, engine_model, engine_serial_number, alternator_model, alternator_serial_number,
      control_panel_type, control_device, breaker_type, breaker_current, transfer_panel_type, has_canopy, location, region, address,
      contract_status,
      oil_capacity, antifreeze_capacity, air_filter_code, air_filter_qty, fuel_filter_code, fuel_filter_qty,
      fuel_pre_filter_code, fuel_pre_filter_qty, chassis_filter_code, chassis_filter_qty, oil_filter_code, oil_filter_qty,
      bypass_filter_code, bypass_filter_qty, turbo_filter_code, water_filter_code, water_filter_qty, centrifugal_filter_code, centrifugal_filter_qty,
      battery_amperage, battery_qty, charger_voltage, charger_amperage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customer_id, data.serial_number, data.model, data.installation_date, data.next_maintenance_date, 
      qr_code_hash, data.warranty_status, data.warranty_end_date, data.runtime_hours, 0, 100,
      data.brand, data.kva, data.engine_model, data.engine_serial_number, data.alternator_model, data.alternator_serial_number,
      data.control_panel_type, data.control_device, data.breaker_type, data.breaker_current, data.transfer_panel_type, data.has_canopy, data.location, data.region, data.address,
      data.contract_status,
      data.oil_capacity, data.antifreeze_capacity, data.air_filter_code, data.air_filter_qty, data.fuel_filter_code, data.fuel_filter_qty,
      data.fuel_pre_filter_code, data.fuel_pre_filter_qty, data.chassis_filter_code, data.chassis_filter_qty, data.oil_filter_code, data.oil_filter_qty,
      data.bypass_filter_code, data.bypass_filter_qty, data.turbo_filter_code, data.water_filter_code, data.water_filter_qty, data.centrifugal_filter_code, data.centrifugal_filter_qty,
      data.battery_amperage, data.battery_qty, data.charger_voltage, data.charger_amperage
    ]
  );
  const generator_id = result.lastID;
  let lat = (data as any).latitude;
  let lng = (data as any).longitude;
  
  if (lat === undefined || lng === undefined || lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    try {
      const coords = await geocodeAddress(data.address || '', data.region || 'Anadolu');
      const latOffset = (Math.random() * 0.004 - 0.002);
      const lngOffset = (Math.random() * 0.004 - 0.002);
      lat = coords.latitude + latOffset;
      lng = coords.longitude + lngOffset;
    } catch (e) {
      const coords = getRandomLandCoordinates(data.region || 'Anadolu');
      lat = coords.latitude;
      lng = coords.longitude;
    }
  }
  await db.run('UPDATE generators SET latitude = ?, longitude = ? WHERE id = ?', [lat, lng, generator_id]);
  
  res.json({ id: generator_id, qr_code_hash });
}));

app.put('/api/generators/:id', authMiddleware, asyncHandler(async (req, res) => {
    const data = generatorSchema.parse(req.body);
    const { id } = req.params;
    const db = getDb();
    await db.run(
      `UPDATE generators SET 
        customer_id = ?, serial_number = ?, model = ?, installation_date = ?, next_maintenance_date = ?, 
        warranty_status = ?, warranty_end_date = ?, runtime_hours = ?, brand = ?, kva = ?, engine_model = ?, engine_serial_number = ?,
        alternator_model = ?, alternator_serial_number = ?, control_panel_type = ?, control_device = ?, 
        breaker_type = ?, breaker_current = ?, transfer_panel_type = ?, has_canopy = ?, location = ?, region = ?, address = ?,
        contract_status = ?,
        oil_capacity = ?, antifreeze_capacity = ?, air_filter_code = ?, air_filter_qty = ?, fuel_filter_code = ?, fuel_filter_qty = ?,
        fuel_pre_filter_code = ?, fuel_pre_filter_qty = ?, chassis_filter_code = ?, chassis_filter_qty = ?, oil_filter_code = ?, oil_filter_qty = ?,
        bypass_filter_code = ?, bypass_filter_qty = ?, turbo_filter_code = ?, water_filter_code = ?, water_filter_qty = ?, centrifugal_filter_code = ?, centrifugal_filter_qty = ?,
        battery_amperage = ?, battery_qty = ?, charger_voltage = ?, charger_amperage = ?
       WHERE id = ?`,
      [
        data.customer_id, data.serial_number, data.model, data.installation_date, data.next_maintenance_date, 
        data.warranty_status, data.warranty_end_date, data.runtime_hours, data.brand, data.kva, data.engine_model, data.engine_serial_number,
        data.alternator_model, data.alternator_serial_number, data.control_panel_type, data.control_device,
        data.breaker_type, data.breaker_current, data.transfer_panel_type, data.has_canopy, data.location, data.region, data.address,
        data.contract_status,
        data.oil_capacity, data.antifreeze_capacity, data.air_filter_code, data.air_filter_qty, data.fuel_filter_code, data.fuel_filter_qty,
        data.fuel_pre_filter_code, data.fuel_pre_filter_qty, data.chassis_filter_code, data.chassis_filter_qty, data.oil_filter_code, data.oil_filter_qty,
        data.bypass_filter_code, data.bypass_filter_qty, data.turbo_filter_code, data.water_filter_code, data.water_filter_qty, data.centrifugal_filter_code, data.centrifugal_filter_qty,
        data.battery_amperage, data.battery_qty, data.charger_voltage, data.charger_amperage, id
      ]
    );

    const lat = (data as any).latitude;
    const lng = (data as any).longitude;

    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      await db.run('UPDATE generators SET latitude = ?, longitude = ? WHERE id = ?', [lat, lng, id]);
    } else {
      // Re-geocode address on update if provided
      try {
        const coords = await geocodeAddress(data.address || '', data.region || 'Anadolu');
        const latOffset = (Math.random() * 0.004 - 0.002);
        const lngOffset = (Math.random() * 0.004 - 0.002);
        await db.run('UPDATE generators SET latitude = ?, longitude = ? WHERE id = ?', [coords.latitude + latOffset, coords.longitude + lngOffset, id]);
      } catch (e) {
        console.error('Error re-geocoding updated generator address:', e);
      }
    }

    res.json({ success: true });
}));

// Service Records
app.get('/api/service-records', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  let query = `
    SELECT sr.*, g.serial_number, g.brand, g.model
    FROM service_records sr
    JOIN generators g ON sr.generator_id = g.id
  `;
  const params: any[] = [];
  if (req.user.role === 'customer') {
    query += ' WHERE g.customer_id = ?';
    params.push(req.user.customer_id);
  }
  query += ' ORDER BY sr.service_date DESC';
  const records = await db.all(query, params);
  res.json(records);
}));

app.post('/api/service-records', authMiddleware, asyncHandler(async (req, res) => {
  const data = serviceRecordSchema.parse(req.body);
  const db = getDb();
  
  let total_cost = 0;
  
  // Calculate parts cost first
  if (data.used_parts && Array.isArray(data.used_parts)) {
    for (const part of data.used_parts) {
      const partData = await db.get('SELECT unit_price FROM parts WHERE id = ?', part.id);
      total_cost += (partData?.unit_price || 0) * part.quantity;
    }
  }

  const result = await db.run(
    'INSERT INTO service_records (generator_id, service_date, description, technician_signature_url, customer_signature_url, service_fee, total_cost, checklist_json, photo_before_url, photo_after_url, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.generator_id, data.service_date, data.description, data.technician_signature, data.customer_signature, data.service_fee || 0, total_cost, data.checklist_json || null, data.photo_before || null, data.photo_after || null, data.start_time || null, data.end_time || null]
  );

  const service_record_id = result.lastID;

  // Handle used parts & stock reduction
  if (data.used_parts && Array.isArray(data.used_parts)) {
    for (const part of data.used_parts) {
      await db.run(
        'INSERT INTO service_parts (service_record_id, part_id, quantity) VALUES (?, ?, ?)',
        [service_record_id, part.id, part.quantity]
      );
      await db.run(
        'UPDATE parts SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [part.quantity, part.id]
      );
    }
  }

  // Update next maintenance date
  if (data.next_maintenance_date) {
    await db.run('UPDATE generators SET next_maintenance_date = ? WHERE id = ?', [data.next_maintenance_date, data.generator_id]);
  }

  // Update generator runtime hours if provided in checklist_json measurements
  if (data.checklist_json) {
    try {
      const parsed = JSON.parse(data.checklist_json);
      const runtime_hours = parsed.measurements?.runtime_hours;
      if (runtime_hours) {
        await db.run('UPDATE generators SET runtime_hours = ? WHERE id = ?', [runtime_hours, data.generator_id]);
      }
    } catch (e) {
      console.error('Error parsing checklist_json for runtime_hours update:', e);
    }
  }

  // Auto-complete active appointments for this generator
  await db.run('UPDATE appointments SET status = "Tamamlandı" WHERE generator_id = ? AND status != "Tamamlandı" AND status != "İptal"', [data.generator_id]);

  res.json({ id: service_record_id, total_cost });
}));

// Parts / Inventory
app.get('/api/parts', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  const parts = await db.all('SELECT * FROM parts');
  res.json(parts);
}));

app.post('/api/parts', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const data = partSchema.parse(req.body);
  const db = getDb();
  
  const result = await db.run(
    'INSERT INTO parts (name, part_number, stock_quantity, unit, unit_price, critical_level) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.part_number, data.stock_quantity, data.unit, data.unit_price, data.critical_level]
  );
  res.json({ id: result.lastID });
}));

app.put('/api/parts/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const data = partSchema.parse(req.body);
  const { id } = req.params;
  const db = getDb();
  await db.run(
    'UPDATE parts SET name = ?, part_number = ?, stock_quantity = ?, unit = ?, unit_price = ?, critical_level = ? WHERE id = ?',
    [data.name, data.part_number, data.stock_quantity, data.unit, data.unit_price, data.critical_level, id]
  );
  res.json({ success: true });
}));

// Quick stock adjustment: add or subtract quantity
app.patch('/api/parts/:id/stock', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adjustment } = req.body; // adjustment: positive = add, negative = subtract
  if (typeof adjustment !== 'number') {
    return res.status(400).json({ error: 'adjustment sayısal olmalıdır.' });
  }
  const db = getDb();
  const part = await db.get('SELECT * FROM parts WHERE id = ?', id);
  if (!part) return res.status(404).json({ error: 'Parça bulunamadı.' });
  const newQty = part.stock_quantity + adjustment;
  if (newQty < 0) {
    return res.status(400).json({ error: `Stok yetersiz. Mevcut: ${part.stock_quantity} ${part.unit}` });
  }
  await db.run('UPDATE parts SET stock_quantity = ? WHERE id = ?', [newQty, id]);
  res.json({ success: true, new_quantity: newQty, part_name: part.name });
}));

app.get('/api/inventory/forecast', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const db = getDb();
  
  const months = parseInt(req.query.months as string) || 1;
  const daysLimit = months * 30;
  
  // Select generators with active contracts to calculate actual stock needs
  const generators = await db.all("SELECT * FROM generators WHERE contract_status = 'Var'");
  
  let totalMaintenanceCount = 0;
  
  // Track which generators are due and how many times they will need maintenance in the forecast period
  const dueGenerators: { generator: any; count: number }[] = [];
  
  generators.forEach(g => {
    // If no maintenance date is scheduled, do not assume it is due today
    if (!g.next_maintenance_date || g.next_maintenance_date.trim() === '') {
      return;
    }

    const parts = g.next_maintenance_date.split('T')[0].split('-');
    if (parts.length !== 3) return;
    
    // Parse as local time to avoid boundary timezone shifts
    const nextDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(nextDate.getTime())) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = nextDate.getTime() - today.getTime();
    let daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) daysLeft = 0; // Overdue is treated as due today
    
    if (daysLeft <= daysLimit) {
      const count = 1 + Math.floor((daysLimit - daysLeft) / 180);
      totalMaintenanceCount += count;
      dueGenerators.push({ generator: g, count });
    }
  });

  const parts = await db.all('SELECT * FROM parts');
  
  const forecast = parts.map(p => {
    let needed = 0;
    const partNameLower = (p.name || '').toLowerCase();
    const partNumberClean = (p.part_number || '').trim().toLowerCase();
    
    // Normalize part number by stripping all non-alphanumeric chars (prevents space/dash mismatch)
    const normPartNum = partNumberClean.replace(/[^a-zA-Z0-9]/g, '');
    
    dueGenerators.forEach(({ generator: g, count }) => {
      // 1. Oil calculation: Match motor-specific oils (motor yağı, 15w40, 10w40) and avoid hydraulic/gear oils or spays
      const isEngineOil = (partNameLower.includes('yağ') || partNameLower.includes('yag')) && 
                          !partNameLower.includes('filtre') && 
                          (partNameLower.includes('motor') || partNameLower.includes('15w40') || partNameLower.includes('10w40'));
                          
      if (isEngineOil) {
        const capacity = parseFloat(g.oil_capacity) || 0;
        needed += capacity * count;
      }
      // 2. Antifreeze calculation
      else if (partNameLower.includes('antifriz')) {
        const capacity = parseFloat(g.antifreeze_capacity) || 0;
        needed += capacity * count;
      }
      // 3. Filter and spare parts calculation: match by normalized alphanumeric part number
      else if (normPartNum) {
        const filterFields = [
          { code: g.air_filter_code, qty: g.air_filter_qty },
          { code: g.fuel_filter_code, qty: g.fuel_filter_qty },
          { code: g.fuel_pre_filter_code, qty: g.fuel_pre_filter_qty },
          { code: g.chassis_filter_code, qty: g.chassis_filter_qty },
          { code: g.oil_filter_code, qty: g.oil_filter_qty },
          { code: g.bypass_filter_code, qty: g.bypass_filter_qty },
          { code: g.turbo_filter_code, qty: 1 },
          { code: g.water_filter_code, qty: g.water_filter_qty },
          { code: g.centrifugal_filter_code, qty: g.centrifugal_filter_qty }
        ];
        
        filterFields.forEach(f => {
          if (f.code) {
            const normGenCode = f.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            if (normGenCode === normPartNum) {
              const qty = f.qty !== null && f.qty !== undefined && f.qty !== '' ? (parseFloat(String(f.qty)) || 0) : 0;
              if (qty > 0) {
                needed += qty * count;
              }
            }
          }
        });
      }
    });
    
    // Round to 1 decimal place for cleaner look
    needed = Math.round(needed * 10) / 10;
    
    return {
      ...p,
      needed,
      shortage: Math.max(0, needed - p.stock_quantity)
    };
  }).filter(p => p.needed > 0);

  res.json({ maintenanceCount: totalMaintenanceCount, forecast });
}));

// Fault Codes
app.get('/api/fault-codes', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  const codes = await db.all('SELECT * FROM fault_codes');
  res.json(codes);
}));

// Technicians CRUD
app.get('/api/technicians', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  const techs = await db.all(`
    SELECT t.*, u.username 
    FROM technicians t
    LEFT JOIN users u ON t.user_id = u.id
  `);
  res.json(techs);
}));

app.post('/api/technicians/location', authMiddleware, asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const db = getDb();
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Geçersiz koordinatlar' });
  }

  const tech = await db.get('SELECT id FROM technicians WHERE user_id = ?', req.user.id);
  if (!tech) {
    return res.status(404).json({ error: 'Kullanıcıya ait teknisyen kaydı bulunamadı' });
  }

  const timestampStr = new Date().toISOString();
  await db.run(
    'UPDATE technicians SET latitude = ?, longitude = ?, last_location_update = ? WHERE id = ?',
    [latitude, longitude, timestampStr, tech.id]
  );

  res.json({ success: true, last_location_update: timestampStr });
}));

app.get('/api/technicians/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  const technician = await db.get('SELECT * FROM technicians WHERE id = ?', id);
  if (!technician) {
    return res.status(404).json({ error: 'Personel bulunamadı' });
  }

  const appointments = await db.all(`
    SELECT a.*, g.serial_number, g.brand, g.model, c.name as customer_name, c.address as customer_address
    FROM appointments a
    JOIN generators g ON a.generator_id = g.id
    JOIN customers c ON g.customer_id = c.id
    WHERE a.technician_id = ?
    ORDER BY a.appointment_date DESC
  `, id);
  
  res.json({ ...technician, appointments });
}));

app.post('/api/technicians', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const data = technicianSchema.parse(req.body);
  const db = getDb();
  
  let user_id = null;
  if (data.username && data.password) {
    const hashedPassword = await hashPassword(data.password);
    const userResult = await db.run(
      'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
      [data.username, hashedPassword, 'technician', data.name]
    );
    user_id = userResult.lastID;
  }

  const result = await db.run(
    'INSERT INTO technicians (name, phone, specialty, user_id) VALUES (?, ?, ?, ?)',
    [data.name, data.phone, data.specialty, user_id]
  );
  res.json({ id: result.lastID });
}));

app.put('/api/technicians/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const data = technicianSchema.parse(req.body);
  const { id } = req.params;
  const db = getDb();
  
  await db.run(
    'UPDATE technicians SET name = ?, phone = ?, specialty = ? WHERE id = ?',
    [data.name, data.phone, data.specialty, id]
  );
  
  const tech = await db.get('SELECT user_id FROM technicians WHERE id = ?', id);
  if (tech?.user_id && data.username) {
    await db.run('UPDATE users SET username = ?, name = ? WHERE id = ?', [data.username, data.name, tech.user_id]);
    if (data.password) {
      const hashedPassword = await hashPassword(data.password);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, tech.user_id]);
    }
  }

  res.json({ success: true });
}));

app.delete('/api/technicians/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  const tech = await db.get('SELECT user_id FROM technicians WHERE id = ?', id);
  if (tech?.user_id) {
    await db.run('DELETE FROM users WHERE id = ?', tech.user_id);
  }
  
  await db.run('DELETE FROM technicians WHERE id = ?', id);
  res.json({ success: true });
}));

// Appointments
app.get('/api/appointments', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  let query = `
    SELECT a.*, g.serial_number, g.address as generator_address, c.name as customer_name, c.address as customer_address, 
           t.name as technician_name, t2.name as assistant_name
    FROM appointments a
    JOIN generators g ON a.generator_id = g.id
    JOIN customers c ON g.customer_id = c.id
    JOIN technicians t ON a.technician_id = t.id
    LEFT JOIN technicians t2 ON a.assistant_technician_id = t2.id
  `;
  
  const params: any[] = [];
  if (req.user.role === 'technician') {
    // Find the technician record for this user
    const tech = await db.get('SELECT id FROM technicians WHERE user_id = ?', req.user.id);
    if (tech) {
      query += ' WHERE a.technician_id = ? OR a.assistant_technician_id = ?';
      params.push(tech.id, tech.id);
    } else {
      return res.json([]); // No tech record found for this user
    }
  } else if (req.user.role === 'customer') {
    query += ' WHERE g.customer_id = ?';
    params.push(req.user.customer_id);
  }

  const appointments = await db.all(query, params);
  res.json(appointments);
}));

app.put('/api/appointments/:id/status', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = getDb();
  
  // Get details before updating to know names
  const appDetails = await db.get(`
    SELECT a.appointment_date, g.serial_number, c.name as customer_name, t.name as tech_name
    FROM appointments a
    JOIN generators g ON a.generator_id = g.id
    JOIN customers c ON g.customer_id = c.id
    JOIN technicians t ON a.technician_id = t.id
    WHERE a.id = ?
  `, id);

  await db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
  
  // If completed, check if there's an associated fault to close
  if (status === 'Tamamlandı') {
    const appointment = await db.get('SELECT fault_id FROM appointments WHERE id = ?', id);
    if (appointment?.fault_id) {
      await db.run("UPDATE generator_faults SET status = 'Çözüldü' WHERE id = ?", appointment.fault_id);
    }
  }

  // Notify admins when status is updated to 'İşlemde' or 'Tamamlandı'
  if (appDetails && (status === 'İşlemde' || status === 'Tamamlandı')) {
    try {
      const admins = await db.all("SELECT id FROM users WHERE role = 'admin'");
      const title = status === 'Tamamlandı' ? 'Servis Tamamlandı' : 'Servis Başladı';
      const message = status === 'Tamamlandı' 
        ? `${appDetails.tech_name} teknisyeni, ${appDetails.customer_name} firması servis kaydını tamamladı.`
        : `${appDetails.tech_name} teknisyeni, ${appDetails.customer_name} firması servis kaydı için yola çıktı / işi başlattı.`;

      for (const admin of admins) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
          [admin.id, title, message]
        );
      }
    } catch (error) {
      console.error('Error generating status update notifications:', error);
    }
  }
  
  res.json({ success: true });
}));

app.put('/api/appointments/:id', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { technician_id, assistant_technician_id, appointment_date, notes } = req.body;
  const db = getDb();
  await db.run(
    'UPDATE appointments SET technician_id = ?, assistant_technician_id = ?, appointment_date = ?, notes = ? WHERE id = ?',
    [technician_id, assistant_technician_id || null, appointment_date, notes, id]
  );

  // Send notifications for reassignment
  try {
    const appInfo = await db.get(
      'SELECT g.id as generator_id, g.serial_number, c.name as customer_name FROM appointments a JOIN generators g ON a.generator_id = g.id JOIN customers c ON g.customer_id = c.id WHERE a.id = ?',
      [id]
    );
    
    const tech = await db.get('SELECT user_id FROM technicians WHERE id = ?', [technician_id]);
    if (tech?.user_id && appInfo) {
      await db.run(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [
          tech.user_id,
          'Görev Güncellendi / Atandı',
          `${appInfo.customer_name} firmasına ait ${appointment_date} tarihli servis görevi size yönlendirildi.`
        ]
      );
    }

    if (assistant_technician_id) {
      const assistant = await db.get('SELECT user_id FROM technicians WHERE id = ?', [assistant_technician_id]);
      if (assistant?.user_id && appInfo) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
          [
            assistant.user_id,
            'Görev Güncellendi / Atandı (Ekip)',
            `${appInfo.customer_name} firmasına ait ${appointment_date} tarihli servis görevi size yönlendirildi.`
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error generating reassignment notifications:', error);
  }

  res.json({ success: true });
}));

app.post('/api/appointments', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const { generator_id, technician_id, assistant_technician_id, fault_id, appointment_date, notes } = req.body;
  const db = getDb();
  const result = await db.run(
    'INSERT INTO appointments (generator_id, technician_id, assistant_technician_id, fault_id, appointment_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [generator_id, technician_id, assistant_technician_id || null, fault_id || null, appointment_date, notes]
  );

  // Generate notification for primary technician
  try {
    const generator = await db.get(
      'SELECT g.serial_number, c.name as customer_name FROM generators g JOIN customers c ON g.customer_id = c.id WHERE g.id = ?',
      [generator_id]
    );
    const tech = await db.get('SELECT user_id FROM technicians WHERE id = ?', [technician_id]);
    
    if (tech?.user_id && generator) {
      await db.run(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [
          tech.user_id,
          'Yeni Görev Atandı',
          `${generator.customer_name} firması için ${appointment_date} tarihli bir servis görevi atandı.`
        ]
      );
    }

    if (assistant_technician_id) {
      const assistant = await db.get('SELECT user_id FROM technicians WHERE id = ?', [assistant_technician_id]);
      if (assistant?.user_id && generator) {
        await db.run(
          'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
          [
            assistant.user_id,
            'Yeni Görev Atandı (Ekip)',
            `${generator.customer_name} firması için ${appointment_date} tarihli bir ekip görevi atandı.`
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error generating assignment notifications:', error);
  }

  res.json({ id: result.lastID });
}));

app.delete('/api/appointments/:id', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const db = getDb();
  await db.run('DELETE FROM appointments WHERE id = ?', id);
  res.json({ success: true });
}));

// --- Notification System ---
app.get('/api/notifications', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const db = getDb();
  const notifications = await db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(notifications);
}));

app.put('/api/notifications/read-all', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const db = getDb();
  await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ success: true });
}));

app.put('/api/notifications/:id/read', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const db = getDb();
  await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
  res.json({ success: true });
}));

// --- Database Backup System (Admin Only) ---
const backupsDir = path.join(__dirname, '../backups');

const createBackup = async (): Promise<string> => {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
  const isPostgres = !!process.env.DATABASE_URL;
  const backupFileName = isPostgres ? `backup_${dateStr}.sql` : `backup_${dateStr}.sqlite`;
  const backupPath = path.join(backupsDir, backupFileName);

  const db = getDb();

  if (isPostgres) {
    // PostgreSQL backup using pg_dump shell command
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    await execPromise(`pg_dump "${process.env.DATABASE_URL}" -F c -b -v -f "${backupPath}"`);
  } else {
    // Safe SQLite backup using VACUUM INTO command
    await db.run('VACUUM INTO ?', [backupPath]);
  }

  // Keep only the last 10 backups to prevent disk overflow
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('backup_') && (f.endsWith('.sqlite') || f.endsWith('.sql')))
    .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 10) {
    for (let i = 10; i < files.length; i++) {
      const fileToDelete = files[i];
      if (fileToDelete) {
        fs.unlinkSync(path.join(backupsDir, fileToDelete.name));
      }
    }
  }

  return backupFileName;
};

// Automatic scheduled daily database backup
setInterval(async () => {
  try {
    console.log('Running automatic scheduled database backup...');
    const filename = await createBackup();
    console.log(`Scheduled backup created successfully: ${filename}`);
  } catch (err: any) {
    console.error('Scheduled database backup failed:', err.message);
  }
}, 24 * 60 * 60 * 1000);

app.post('/api/admin/backups/trigger', authMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  const filename = await createBackup();
  res.json({ success: true, filename });
}));

app.get('/api/admin/backups', authMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  if (!fs.existsSync(backupsDir)) {
    return res.json([]);
  }
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('backup_') && (f.endsWith('.sqlite') || f.endsWith('.sql')))
    .map(f => {
      const stats = fs.statSync(path.join(backupsDir, f));
      return {
        filename: f,
        sizeBytes: stats.size,
        createdAt: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(files);
}));

app.get('/api/admin/backups/:filename', authMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  const { filename } = req.params;
  const isValidExt = filename.endsWith('.sqlite') || filename.endsWith('.sql');
  if (filename.includes('..') || !filename.startsWith('backup_') || !isValidExt) {
    return res.status(400).json({ error: 'Geçersiz dosya adı' });
  }
  const filePath = path.join(backupsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Dosya bulunamadı' });
  }
  res.download(filePath);
}));

app.delete('/api/admin/backups/:filename', authMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  const { filename } = req.params;
  const isValidExt = filename.endsWith('.sqlite') || filename.endsWith('.sql');
  if (filename.includes('..') || !filename.startsWith('backup_') || !isValidExt) {
    return res.status(400).json({ error: 'Geçersiz dosya adı' });
  }
  const filePath = path.join(backupsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Dosya bulunamadı' });
  }
}));

app.delete('/api/admin/users/:id', authMiddleware, adminOnly, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const db = getDb();
  await db.run('DELETE FROM users WHERE id = ?', id);
  res.json({ success: true });
}));

// Quotes Endpoints
app.get('/api/quotes', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  let quotes;
  if (req.user.role === 'customer') {
    quotes = await db.all(`
      SELECT q.*, c.name as customer_name 
      FROM quotes q
      JOIN customers c ON q.customer_id = c.id
      WHERE q.customer_id = ?
      ORDER BY q.id DESC
    `, [req.user.customer_id]);
  } else {
    const { customer_id } = req.query;
    if (customer_id) {
      quotes = await db.all(`
        SELECT q.*, c.name as customer_name 
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        WHERE q.customer_id = ?
        ORDER BY q.id DESC
      `, [customer_id]);
    } else {
      quotes = await db.all(`
        SELECT q.*, c.name as customer_name 
        FROM quotes q
        JOIN customers c ON q.customer_id = c.id
        ORDER BY q.id DESC
      `);
    }
  }
  res.json(quotes);
}));

app.get('/api/quotes/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const quote = await db.get(`
    SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address, c.tax_id as customer_tax_id, c.tax_office as customer_tax_office
    FROM quotes q
    JOIN customers c ON q.customer_id = c.id
    WHERE q.id = ?
  `, id);
  if (!quote) return res.status(404).json({ error: 'Teklif bulunamadı' });

  if (req.user.role === 'customer' && quote.customer_id !== req.user.customer_id) {
    return res.status(403).json({ error: 'Bu teklife erişim yetkiniz yok.' });
  }

  const items = await db.all('SELECT * FROM quote_items WHERE quote_id = ?', id);
  res.json({ ...quote, items });
}));

app.post('/api/quotes', authMiddleware, asyncHandler(async (req, res) => {
  const db = getDb();
  const { customer_id, quote_date, valid_until, quote_type, status, notes, items } = req.body;
  
  const year = new Date(quote_date || new Date()).getFullYear();
  const countRow = await db.get("SELECT COUNT(*) as count FROM quotes WHERE quote_date LIKE ?", `${year}%`);
  const nextNum = (countRow.count + 1).toString().padStart(4, '0');
  const quote_number = `TK-${year}-${nextNum}`;
  
  let subtotal = 0;
  let discount = 0;
  let vat = 0;
  
  const processedItems = (items || []).map((item: any) => {
    const qty = parseFloat(item.quantity) || 1;
    const price = parseFloat(item.unit_price) || 0;
    const discPct = parseFloat(item.discount_percent) || 0;
    const vatPct = parseFloat(item.vat_percent) || 20;
    
    const lineTotalRaw = qty * price;
    const lineDiscount = lineTotalRaw * (discPct / 100);
    const lineTotalAfterDiscount = lineTotalRaw - lineDiscount;
    const lineVat = lineTotalAfterDiscount * (vatPct / 100);
    const lineTotalWithVat = lineTotalAfterDiscount + lineVat;
    
    subtotal += lineTotalRaw;
    discount += lineDiscount;
    vat += lineVat;
    
    return {
      description: item.description,
      quantity: qty,
      unit: item.unit || 'Adet',
      unit_price: price,
      discount_percent: discPct,
      vat_percent: vatPct,
      total_price: lineTotalWithVat
    };
  });
  
  const grand_total = subtotal - discount + vat;
  
  const result = await db.run(`
    INSERT INTO quotes (quote_number, customer_id, quote_date, valid_until, quote_type, status, subtotal, discount, vat, grand_total, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [quote_number, customer_id, quote_date, valid_until, quote_type, status || 'Taslak', subtotal, discount, vat, grand_total, notes, (req as any).user?.id]);
  
  const quoteId = result.lastID;
  
  for (const item of processedItems) {
    await db.run(`
      INSERT INTO quote_items (quote_id, description, quantity, unit, unit_price, discount_percent, vat_percent, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [quoteId, item.description, item.quantity, item.unit, item.unit_price, item.discount_percent, item.vat_percent, item.total_price]);
  }

  if (status === 'Onaylandı' && quoteId) {
    await handleQuoteStockSync(Number(quoteId), 'Taslak', 'Onaylandı');
  }
  
  res.status(201).json({ success: true, id: quoteId, quote_number });
}));

app.put('/api/quotes/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const { customer_id, quote_date, valid_until, quote_type, status, notes, items } = req.body;
  
  const existing = await db.get('SELECT * FROM quotes WHERE id = ?', id);
  if (!existing) return res.status(404).json({ error: 'Teklif bulunamadı' });
  
  let subtotal = 0;
  let discount = 0;
  let vat = 0;
  
  const processedItems = (items || []).map((item: any) => {
    const qty = parseFloat(item.quantity) || 1;
    const price = parseFloat(item.unit_price) || 0;
    const discPct = parseFloat(item.discount_percent) || 0;
    const vatPct = parseFloat(item.vat_percent) || 20;
    
    const lineTotalRaw = qty * price;
    const lineDiscount = lineTotalRaw * (discPct / 100);
    const lineTotalAfterDiscount = lineTotalRaw - lineDiscount;
    const lineVat = lineTotalAfterDiscount * (vatPct / 100);
    const lineTotalWithVat = lineTotalAfterDiscount + lineVat;
    
    subtotal += lineTotalRaw;
    discount += lineDiscount;
    vat += lineVat;
    
    return {
      description: item.description,
      quantity: qty,
      unit: item.unit || 'Adet',
      unit_price: price,
      discount_percent: discPct,
      vat_percent: vatPct,
      total_price: lineTotalWithVat
    };
  });
  
  const grand_total = subtotal - discount + vat;
  
  await db.run(`
    UPDATE quotes 
    SET customer_id = ?, quote_date = ?, valid_until = ?, quote_type = ?, status = ?, subtotal = ?, discount = ?, vat = ?, grand_total = ?, notes = ?
    WHERE id = ?
  `, [customer_id, quote_date, valid_until, quote_type, status, subtotal, discount, vat, grand_total, notes, id]);
  
  await db.run('DELETE FROM quote_items WHERE quote_id = ?', id);
  for (const item of processedItems) {
    await db.run(`
      INSERT INTO quote_items (quote_id, description, quantity, unit, unit_price, discount_percent, vat_percent, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, item.description, item.quantity, item.unit, item.unit_price, item.discount_percent, item.vat_percent, item.total_price]);
  }

  if (status && existing.status !== status) {
    await handleQuoteStockSync(Number(id), existing.status, status);
  }
  
  res.json({ success: true });
}));

const handleQuoteStockSync = async (quoteId: number, oldStatus: string, newStatus: string) => {
  if (oldStatus === newStatus) return;
  const db = getDb();

  const isBecomingApproved = newStatus === 'Onaylandı' && oldStatus !== 'Onaylandı';
  const isLeavingApproved = oldStatus === 'Onaylandı' && newStatus !== 'Onaylandı';

  if (!isBecomingApproved && !isLeavingApproved) return;

  const items = await db.all('SELECT * FROM quote_items WHERE quote_id = ?', quoteId);
  if (!items || items.length === 0) return;

  const allParts = await db.all('SELECT * FROM parts');
  if (!allParts || allParts.length === 0) return;

  for (const item of items) {
    const descLower = (item.description || '').toLowerCase().trim();
    if (!descLower) continue;

    // Match by part_number or name
    const matchedPart = allParts.find(p => {
      const partNumLower = (p.part_number || '').toLowerCase().trim();
      const nameLower = (p.name || '').toLowerCase().trim();

      if (partNumLower && descLower === partNumLower) return true;
      if (nameLower && descLower === nameLower) return true;
      if (partNumLower && descLower.includes(partNumLower)) return true;
      if (nameLower && descLower.includes(nameLower)) return true;
      return false;
    });

    if (matchedPart) {
      const qty = Number(item.quantity) || 1;
      const adjustment = isBecomingApproved ? -qty : qty;
      await db.run(
        'UPDATE parts SET stock_quantity = stock_quantity + ? WHERE id = ?',
        [adjustment, matchedPart.id]
      );
    }
  }
};

app.put('/api/quotes/:id/status', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = getDb();
  
  const existing = await db.get('SELECT status FROM quotes WHERE id = ?', id);
  if (existing) {
    await handleQuoteStockSync(Number(id), existing.status, status);
  }

  await db.run('UPDATE quotes SET status = ? WHERE id = ?', [status, id]);
  res.json({ success: true });
}));

app.delete('/api/quotes/:id', authMiddleware, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  await db.run('DELETE FROM quotes WHERE id = ?', id);
  res.json({ success: true });
}));

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  return nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  });
};

app.post('/api/quotes/:id/send-email', authMiddleware, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { pdfBase64, recipientEmail } = req.body;
  const db = getDb();

  const quote = await db.get(`
    SELECT q.*, c.name as customer_name, c.email as customer_email
    FROM quotes q
    JOIN customers c ON q.customer_id = c.id
    WHERE q.id = ?
  `, id);

  if (!quote) {
    return res.status(404).json({ error: 'Teklif bulunamadı.' });
  }

  const targetEmail = recipientEmail || quote.customer_email;
  if (!targetEmail || !targetEmail.includes('@')) {
    return res.status(400).json({ error: 'Geçerli bir alıcı e-posta adresi bulunamadı.' });
  }

  const transporter = createTransporter();

  const base64Data = (pdfBase64 || '')
    .replace(/^data:application\/pdf;filename=.*?;\s*base64,/, '')
    .replace(/^data:application\/pdf;\s*base64,/, '')
    .replace(/^data:.*?;base64,/, '');

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Akan Enerji Teklif Departmanı" <${process.env.SMTP_USER || 'info@akanenerji.com'}>`,
    to: targetEmail,
    subject: `Akan Enerji - Teklif Belgesi (#${quote.quote_number})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-bottom: 10px;">Akan Enerji Teklif Belgesi</h2>
        <p>Sayın <strong>${quote.customer_name}</strong>,</p>
        <p>Talebiniz doğrultusunda hazırlanan <strong>#${quote.quote_number}</strong> numaralı teklif belgesi ekte PDF olarak bilgilerinize sunulmuştur.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 5px 0;"><strong>Teklif Numarası:</strong> ${quote.quote_number}</p>
          <p style="margin: 5px 0;"><strong>Teklif Türü:</strong> ${quote.quote_type || 'Genel Teklif'}</p>
          <p style="margin: 5px 0;"><strong>Genel Toplam:</strong> ${Number(quote.grand_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Sorularınız ve onayınız için bu e-postaya yanıt verebilir veya bizimle iletişime geçebilirsiniz.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">Akan Enerji Jeneratör & Enerji Sistemleri</p>
      </div>
    `,
    attachments: base64Data ? [
      {
        filename: `Teklif_${quote.quote_number}.pdf`,
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'application/pdf'
      }
    ] : []
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err: any) {
    console.error('Mail sending error:', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT') {
      return res.status(500).json({ error: 'E-posta sunucusu (SMTP) yapılandırılmamış. Lütfen sunucu .env dosyasına SMTP_HOST ve SMTP_USER bilgilerini girin.' });
    }
    throw err;
  }

  if (quote.status === 'Taslak') {
    await db.run('UPDATE quotes SET status = "Gönderildi" WHERE id = ?', id);
  }

  res.json({ success: true, message: `Teklif PDF'i ${targetEmail} adresine e-posta ile gönderildi.` });
}));

// Centralized Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error occurred:', err);

  if (err instanceof z.ZodError) {
    return res.status(400).json({ 
      error: 'Doğrulama hatası', 
      details: err.issues ? err.issues.map((e: any) => ({ path: e.path, message: e.message })) : []
    });
  }

  res.status(err.status || 500).json({ 
    error: err.message || 'Bir iç sunucu hatası oluştu',
    message: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
