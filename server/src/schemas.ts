import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçersiz e-posta adresi").optional().or(z.literal('')),
  phone: z.string().min(10, "Telefon numarası en az 10 karakter olmalıdır"),
  address: z.string().min(5, "Adres en az 5 karakter olmalıdır"),
  customer_type: z.enum(['Tüzel Kişi', 'Gerçek Kişi']).default('Tüzel Kişi'),
  category: z.enum(['Özel', 'Kamu']).default('Özel'),
  tax_id: z.string().optional(),
  tax_office: z.string().optional(),
  authorized_person: z.string().optional()
});

export const generatorSchema = z.object({
  customer_id: z.coerce.number(),
  serial_number: z.string().min(3, "Seri numarası gereklidir"),
  model: z.string().min(2, "Model gereklidir"),
  installation_date: z.string(),
  next_maintenance_date: z.string(),
  warranty_status: z.enum(['Var', 'Yok']).default('Var'),
  warranty_end_date: z.string().optional(),
  runtime_hours: z.string().optional(),
  brand: z.string().optional(),
  kva: z.string().optional(),
  engine_model: z.string().optional(),
  engine_serial_number: z.string().optional(),
  alternator_model: z.string().optional(),
  alternator_serial_number: z.string().optional(),
  control_panel_type: z.enum(['Otomatik', 'Manuel', 'Marşlı', '']).optional(),
  control_device: z.string().optional(),
  breaker_type: z.enum(['K Otomat', 'Kompakt Şalter', 'Motorlu Şalter', 'Yok', '']).optional(),
  breaker_current: z.string().optional(),
  transfer_panel_type: z.enum(['Kontaktör', 'ATS', 'Motorlu Şalter', '']).optional(),
  has_canopy: z.coerce.number().optional().default(0), // 1 for Var, 0 for Yok
  location: z.string().optional(),
  region: z.enum(['Avrupa', 'Anadolu', '']).optional(),
  address: z.string().optional(),
  contract_status: z.enum(['Var', 'Yok']).default('Yok'),
  traccar_id: z.string().optional(),
  
  // New Fields
  oil_capacity: z.string().optional(),
  antifreeze_capacity: z.string().optional(),
  air_filter_code: z.string().optional(),
  air_filter_qty: z.string().optional(),
  fuel_filter_code: z.string().optional(),
  fuel_filter_qty: z.string().optional(),
  fuel_pre_filter_code: z.string().optional(),
  fuel_pre_filter_qty: z.string().optional(),
  chassis_filter_code: z.string().optional(),
  chassis_filter_qty: z.string().optional(),
  oil_filter_code: z.string().optional(),
  oil_filter_qty: z.string().optional(),
  bypass_filter_code: z.string().optional(),
  bypass_filter_qty: z.string().optional(),
  turbo_filter_code: z.string().optional(),
  water_filter_code: z.string().optional(),
  water_filter_qty: z.string().optional(),
  centrifugal_filter_code: z.string().optional(),
  centrifugal_filter_qty: z.string().optional(),
  
  battery_amperage: z.string().optional(),
  battery_qty: z.string().optional(),
  charger_voltage: z.enum(['12v', '24v', '']).optional(),
  charger_amperage: z.enum(['5A', '10A', '']).optional(),
  latitude: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().optional()),
  longitude: z.preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().optional())
});

export const partSchema = z.object({
  name: z.string().min(2, "Parça ismi gereklidir"),
  part_number: z.string().min(2, "Parça numarası gereklidir"),
  stock_quantity: z.coerce.number().min(0),
  critical_level: z.coerce.number().min(0).default(5),
  unit: z.string().default('Adet'),
  unit_price: z.coerce.number().min(0),
});

export const serviceRecordSchema = z.object({
  generator_id: z.coerce.number(),
  service_date: z.string(),
  description: z.string(),
  technician_signature: z.string(),
  customer_signature: z.string(),
  next_maintenance_date: z.string(),
  used_parts: z.array(z.object({
    id: z.coerce.number(),
    quantity: z.coerce.number().min(1)
  })).optional(),
  service_fee: z.coerce.number().min(0),
  checklist_json: z.string().optional().nullable(),
  photo_before: z.string().optional().nullable(),
  photo_after: z.string().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable()
});

export const faultRegistrationSchema = z.object({
  generator_id: z.coerce.number(),
  fault_code_id: z.coerce.number().optional().nullable(),
  fault_date: z.string(),
  status: z.enum(['Açık', 'Çözüldü']).default('Açık'),
  notes: z.string().optional()
});

export const contractSchema = z.object({
  customer_id: z.coerce.number(),
  start_date: z.string(),
  end_date: z.string(),
  contract_type: z.enum(['Yıllık', '6 Aylık', 'Özel']),
  contract_period: z.enum(['1 Ay', '2 Ay', '3 Ay', '4 Ay', '6 Ay', '']).optional(),
  maintenance_months: z.string().optional(), // Store as "Jan,Feb,Mar"
  general_maintenance_month: z.string().optional(),
  maintenance_year: z.coerce.number().optional(),
  price: z.coerce.number().min(0),
  status: z.enum(['Aktif', 'Süresi Doldu', 'İptal']).default('Aktif'),
  notes: z.string().optional()
});

export const technicianSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  phone: z.string().optional().or(z.literal('')),
  specialty: z.string().optional().or(z.literal('')),
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır").optional().or(z.literal('')),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır").optional().or(z.literal(''))
});
