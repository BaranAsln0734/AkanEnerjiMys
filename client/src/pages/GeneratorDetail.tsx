import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import SignatureCanvas from 'react-signature-canvas';
import { Check, ClipboardCheck, Trash2, Save, Printer, Plus, Minus, ArrowLeft, DollarSign, AlertCircle, Battery, Droplets, Wind, Zap, Calendar, FileText, X, Settings, Camera, Receipt, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateServicePDF, generateServiceThermalPDF } from '../utils/pdfGenerator';
import { sendToRawBTPrinter } from '../utils/rawbtPrinter';
import { queueOfflineService } from '../utils/offlineQueue';

interface GeneratorDetail {
  id: number;
  customer_id: number;
  customer: { id: number; name: string; phone: string; address: string; email?: string; tax_id?: string; tax_office?: string };
  serial_number: string;
  model: string;
  installation_date: string;
  next_maintenance_date: string;
  qr_code_hash: string;
  brand: string;
  kva: string;
  engine_model: string;
  engine_serial_number: string;
  alternator_model: string;
  alternator_serial_number: string;
  control_panel_type: string;
  control_device: string;
  breaker_type: string;
  breaker_current: string;
  transfer_panel_type: string;
  has_canopy: number;
  location: string;
  region?: string;
  address?: string;
  contract_status?: string;
  warranty_status?: string;
  warranty_end_date?: string;
  runtime_hours: string;
  oil_capacity: string;
  antifreeze_capacity: string;
  air_filter_code: string;
  air_filter_qty: number;
  fuel_filter_code: string;
  fuel_filter_qty: number;
  fuel_pre_filter_code: string;
  fuel_pre_filter_qty: number;
  chassis_filter_code: string;
  chassis_filter_qty: number;
  oil_filter_code: string;
  oil_filter_qty: number;
  bypass_filter_code: string;
  bypass_filter_qty: number;
  turbo_filter_code: string;
  water_filter_code: string;
  water_filter_qty: number;
  centrifugal_filter_code: string;
  centrifugal_filter_qty: number;
  battery_amperage: string;
  battery_qty: number;
  charger_voltage: string;
  charger_amperage: string;
  records: any[];
  faults: any[];
  latitude?: number | null;
  longitude?: number | null;
}

const SOL_KONTROLLER = [
  "Yağ Seviyesi",
  "Su Seviyesi ve Katkılar",
  "Yakıt Seviyesi",
  "Turbo Kontrolü",
  "Kutup Başları ve Kabloları",
  "Kayış Gerginlikleri",
  "Alternatör Kontrolü",
  "Radyatör Kontrolü",
  "Egzoz Sistemi",
  "Havalandırma Sistemi"
];

const SAG_KONTROLLER = [
  "Blok Su Isıtıcı ve Hortumları",
  "Sirkülasyon ve Devirdaim Kontrolü",
  "Filtrelerin Kontrolü",
  "Marş Motoru Kontrolü",
  "Güç ve Kumanda Devresi Kontrolü",
  "Pompa - Enjektör - Yakıt Yolu - Solenoid",
  "Kontrol Panosu",
  "Kontrol Cihazı",
  "Göstergeler",
  "Transfer Panosu"
];

const CHECKLIST_ITEMS = [...SOL_KONTROLLER, ...SAG_KONTROLLER];

const GeneratorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState<GeneratorDetail | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);

  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isTechnician = currentUser?.role === 'technician';

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [serviceData, setServiceData] = useState({ description: '', next_maintenance_date: '', service_fee: 0, start_time: '', end_time: '' });
  const [planData, setPlanData] = useState({ reason: '', date: new Date().toISOString().split('T')[0] });
  const [checklist, setChecklist] = useState<Record<string, 'ok' | 'comment' | 'na'>>({});
  const [measurements, setMeasurements] = useState({
    battery_group: '',
    battery_qty: '',
    charger_alternator: '',
    charger_device: '',
    grounding: '',
    coolant_temp: '',
    oil_pressure: '',
    frequency: '',
    voltage_u: '',
    current_u: '',
    voltage_v: '',
    current_v: '',
    voltage_w: '',
    current_w: '',
    fuel_level_text: '',
    runtime_hours: ''
  });
  
  const [allParts, setAllParts] = useState<any[]>([]);
  const [usedParts, setUsedParts] = useState<any[]>([]);
  const [customerAuthorizedName, setCustomerAuthorizedName] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('basic');
  const [customers, setCustomers] = useState<any[]>([]);
  const [editFormData, setEditFormData] = useState<any>({
    customer_id: '',
    serial_number: '',
    model: '',
    installation_date: '',
    next_maintenance_date: '',
    warranty_status: 'Var',
    warranty_end_date: '',
    runtime_hours: '',
    brand: '',
    kva: '',
    engine_model: '',
    engine_serial_number: '',
    alternator_model: '',
    alternator_serial_number: '',
    control_panel_type: '',
    control_device: '',
    breaker_type: '',
    breaker_current: '',
    transfer_panel_type: '',
    has_canopy: 0,
    location: '',
    region: '',
    address: '',
    contract_status: 'Yok',
    oil_capacity: '',
    antifreeze_capacity: '',
    air_filter_code: '',
    air_filter_qty: '',
    fuel_filter_code: '',
    fuel_filter_qty: '',
    fuel_pre_filter_code: '',
    fuel_pre_filter_qty: '',
    chassis_filter_code: '',
    chassis_filter_qty: '',
    oil_filter_code: '',
    oil_filter_qty: '',
    bypass_filter_code: '',
    bypass_filter_qty: '',
    turbo_filter_code: '',
    water_filter_code: '',
    water_filter_qty: '',
    centrifugal_filter_code: '',
    centrifugal_filter_qty: '',
    battery_amperage: '',
    battery_qty: '',
    charger_voltage: '12v',
    charger_amperage: '5A',
    latitude: '',
    longitude: ''
  });
  
  const [photoBefore, setPhotoBefore] = useState<string | null>(null);
  const [photoAfter, setPhotoAfter] = useState<string | null>(null);
  
  const techSigRef = useRef<SignatureCanvas>(null);
  const custSigRef = useRef<SignatureCanvas>(null);
  const planFormRef = useRef<HTMLDivElement>(null);
  const serviceFormRef = useRef<HTMLDivElement>(null);

  const compressAndSetPhoto = (file: File, beforeOrAfter: 'before' | 'after') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        if (beforeOrAfter === 'before') {
          setPhotoBefore(compressedBase64);
        } else {
          setPhotoAfter(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const fetchParts = async () => {
    try {
      const response = await api.get('/parts');
      setAllParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchGenerator();
    fetchParts();
    api.get('/customers').then(res => setCustomers(res.data)).catch(err => console.error('Error fetching customers:', err));
  }, [id]);

  useEffect(() => {
    if (searchParams.get('startService') === 'true' && gen) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      setServiceData(prev => ({ ...prev, start_time: timeStr }));
      setShowServiceForm(true);
      setTimeout(() => {
        serviceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [searchParams, gen]);

  useEffect(() => {
    if (showPlanForm && planFormRef.current) {
      planFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showPlanForm]);

  useEffect(() => {
    if (showServiceForm && serviceFormRef.current) {
      serviceFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showServiceForm]);

  const fetchGeneratorQuotes = async (serialNumber: string) => {
    try {
      const response = await api.get('/quotes');
      const filteredQuotes = Array.isArray(response.data) ? response.data.filter((q: any) => 
        q.notes && q.notes.includes(serialNumber)
      ) : [];
      filteredQuotes.sort((a: any, b: any) => new Date(b.quote_date).getTime() - new Date(a.quote_date).getTime());
      setQuotes(filteredQuotes);
    } catch (error) {
      console.error('Error fetching generator quotes:', error);
    }
  };

  const fetchGenerator = async () => {
    try {
      const response = await api.get(`/generators/${id}`);
      setGen(response.data);
      if (response.data && response.data.serial_number) {
        fetchGeneratorQuotes(response.data.serial_number);
      }
    } catch (error) {
      console.error('Error fetching generator:', error);
    }
  };

  const handleOpenEditModal = () => {
    if (gen) {
      setEditFormData({
        customer_id: gen.customer_id,
        serial_number: gen.serial_number,
        model: gen.model || '',
        installation_date: gen.installation_date || '',
        next_maintenance_date: gen.next_maintenance_date || '',
        warranty_status: gen.warranty_status || 'Var',
        warranty_end_date: gen.warranty_end_date || '',
        runtime_hours: gen.runtime_hours || '',
        brand: gen.brand || '',
        kva: gen.kva || '',
        engine_model: gen.engine_model || '',
        engine_serial_number: gen.engine_serial_number || '',
        alternator_model: gen.alternator_model || '',
        alternator_serial_number: gen.alternator_serial_number || '',
        control_panel_type: gen.control_panel_type || '',
        control_device: gen.control_device || '',
        breaker_type: gen.breaker_type || '',
        breaker_current: gen.breaker_current || '',
        transfer_panel_type: gen.transfer_panel_type || '',
        has_canopy: gen.has_canopy || 0,
        location: gen.location || '',
        region: gen.region || '',
        address: gen.address || '',
        contract_status: gen.contract_status || 'Yok',
        oil_capacity: gen.oil_capacity || '',
        antifreeze_capacity: gen.antifreeze_capacity || '',
        air_filter_code: gen.air_filter_code || '',
        air_filter_qty: gen.air_filter_qty || '',
        fuel_filter_code: gen.fuel_filter_code || '',
        fuel_filter_qty: gen.fuel_filter_qty || '',
        fuel_pre_filter_code: gen.fuel_pre_filter_code || '',
        fuel_pre_filter_qty: gen.fuel_pre_filter_qty || '',
        chassis_filter_code: gen.chassis_filter_code || '',
        chassis_filter_qty: gen.chassis_filter_qty || '',
        oil_filter_code: gen.oil_filter_code || '',
        oil_filter_qty: gen.oil_filter_qty || '',
        bypass_filter_code: gen.bypass_filter_code || '',
        bypass_filter_qty: gen.bypass_filter_qty || '',
        turbo_filter_code: gen.turbo_filter_code || '',
        water_filter_code: gen.water_filter_code || '',
        water_filter_qty: gen.water_filter_qty || '',
        centrifugal_filter_code: gen.centrifugal_filter_code || '',
        centrifugal_filter_qty: gen.centrifugal_filter_qty || '',
        battery_amperage: gen.battery_amperage || '',
        battery_qty: gen.battery_qty || '',
        charger_voltage: gen.charger_voltage || '12v',
        charger_amperage: gen.charger_amperage || '5A',
        latitude: gen.latitude !== null && gen.latitude !== undefined ? gen.latitude : '',
        longitude: gen.longitude !== null && gen.longitude !== undefined ? gen.longitude : ''
      });
      setActiveEditTab('basic');
      setShowEditModal(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!gen) return;
      await api.put(`/generators/${gen.id}`, editFormData);
      toast.success('Jeneratör bilgileri başarıyla güncellendi.');
      setShowEditModal(false);
      fetchGenerator();
    } catch (error: any) {
      console.error('Error updating generator:', error);
      const msg = error.response?.data?.error || 'Güncelleme sırasında bir hata oluştu.';
      toast.error(msg);
    }
  };

  const handleSelectQuoteType = (type: string) => {
    if (!gen) return;
    
    const notesText = `Teklif Konusu: ${type} Teklifi\nİlgili Ekipman: ${gen.brand} ${gen.model} (Seri No: ${gen.serial_number})\n\n`;
    
    const preselectedItems: any[] = [];
    if (type === 'Genel Bakım') {
      // Helper function to normalize codes for robust comparison (Turkish char friendly, keeps letters/numbers)
      const cleanCode = (c: string) => (c || '').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '').toLocaleLowerCase('tr');

      // 1. LIQUIDS FIRST (Sıvı Kapasiteleri)
      if (gen.oil_capacity) {
        const qty = Number(gen.oil_capacity);
        const oilPart = allParts.find(p => {
          const name = (p.name || '').trim().toLocaleLowerCase('tr');
          return name === 'dizel motor yağı' || name === 'dizel motor yagi';
        }) || allParts.find(p => {
          const name = (p.name || '').toLocaleLowerCase('tr');
          return name.includes('dizel motor yağı') || name.includes('dizel motor yagi') || name.includes('motor yağı') || name.includes('motor yagi');
        });
        
        const description = oilPart 
          ? (oilPart.part_number ? `${oilPart.name} (${oilPart.part_number})` : oilPart.name)
          : `Dizel Motor Yağı`;

        preselectedItems.push({
          description: description,
          quantity: qty,
          unit: oilPart ? oilPart.unit : 'Litre',
          unit_price: oilPart ? oilPart.unit_price : 0,
          discount_percent: 0,
          vat_percent: 20,
          total_price: oilPart ? (qty * oilPart.unit_price * 1.2) : 0
        });
      }

      if (gen.antifreeze_capacity) {
        const qty = Number(gen.antifreeze_capacity);
        const antifreezePart = allParts.find(p => {
          const name = (p.name || '').trim().toLocaleLowerCase('tr');
          return name === 'antifriz' || name === 'antifiriz';
        }) || allParts.find(p => {
          const name = (p.name || '').toLocaleLowerCase('tr');
          return name.includes('antifriz') || name.includes('antifiriz');
        });

        const description = antifreezePart 
          ? (antifreezePart.part_number ? `${antifreezePart.name} (${antifreezePart.part_number})` : antifreezePart.name)
          : `Antifriz`;

        preselectedItems.push({
          description: description,
          quantity: qty,
          unit: antifreezePart ? antifreezePart.unit : 'Litre',
          unit_price: antifreezePart ? antifreezePart.unit_price : 0,
          discount_percent: 0,
          vat_percent: 20,
          total_price: antifreezePart ? (qty * antifreezePart.unit_price * 1.2) : 0
        });
      }

      // 2. FILTERS (Filtre Listesi & Diğer Filtreler)
      const filterFields = [
        { code: gen.air_filter_code, qty: gen.air_filter_qty || 1, name: 'Hava Filtresi' },
        { code: gen.fuel_filter_code, qty: gen.fuel_filter_qty || 1, name: 'Yakıt Filtresi' },
        { code: gen.fuel_pre_filter_code, qty: gen.fuel_pre_filter_qty || 1, name: 'Yakıt Ön Filtre' },
        { code: gen.chassis_filter_code, qty: gen.chassis_filter_qty || 1, name: 'Şase Filtresi' },
        { code: gen.oil_filter_code, qty: gen.oil_filter_qty || 1, name: 'Yağ Filtresi' },
        { code: gen.bypass_filter_code, qty: gen.bypass_filter_qty || 1, name: 'By-Pass Filtresi' },
        { code: gen.turbo_filter_code, qty: 1, name: 'Turbo Yağ Filtresi' },
        { code: gen.water_filter_code, qty: gen.water_filter_qty || 1, name: 'Su Filtresi' },
        { code: gen.centrifugal_filter_code, qty: gen.centrifugal_filter_qty || 1, name: 'Santrifüj Filtresi' }
      ];

      filterFields.forEach(field => {
        if (field.code) {
          // Split the code by common separators (like slash /, comma ,, semicolon ;) to support multiple alternative codes
          const subCodes = field.code.split(/[\/,;]+/).map(s => s.trim()).filter(Boolean);
          let matchedPart: any = null;

          for (const subCode of subCodes) {
            matchedPart = allParts.find(p => {
              const pNum = p.part_number || '';
              const pName = p.name || '';
              const pDesc = p.description || '';

              // 1. Direct match by part number
              if (pNum.trim().toLocaleLowerCase('tr') === subCode.toLocaleLowerCase('tr')) return true;
              if (cleanCode(pNum) === cleanCode(subCode)) return true;

              // 2. Fallback: match if name or description contains the subCode
              if (cleanCode(pName).includes(cleanCode(subCode))) return true;
              if (cleanCode(pDesc).includes(cleanCode(subCode))) return true;

              return false;
            });

            if (matchedPart) break; // Stop checking alternative codes if a match is found
          }

          preselectedItems.push({
            description: `${field.name} (${field.code})`,
            quantity: field.qty,
            unit: matchedPart ? (matchedPart.unit || 'Adet') : 'Adet',
            unit_price: matchedPart ? (matchedPart.unit_price || 0) : 0,
            discount_percent: 0,
            vat_percent: 20,
            total_price: matchedPart ? ((field.qty * (matchedPart.unit_price || 0)) * 1.2) : 0
          });
        }
      });
    }
    
    setShowQuoteModal(false);
    navigate('/quotes', {
      state: {
        openForm: true,
        preselectedCustomerId: gen.customer_id,
        quoteType: type,
        notes: notesText,
        preselectedItems: preselectedItems.length > 0 ? preselectedItems : undefined,
        returnToGeneratorId: gen.id
      }
    });
  };

  const printLabel = () => {
    if (!gen) return;
    const printWindow = window.open('', '_blank', 'width=500,height=500');
    if (!printWindow) return;
    
    const qrSvgElement = document.querySelector('.qr-container svg');
    const qrSvgHtml = qrSvgElement ? qrSvgElement.outerHTML : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Akan Enerji - Jenerator Kimlik Etiketi</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
            body { 
              font-family: 'Plus Jakarta Sans', sans-serif; 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh;
              background-color: #fff;
            }
            .label-card {
              border: 3px solid #1e3a8a;
              border-radius: 12px;
              padding: 15px;
              width: 320px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              background: #fff;
            }
            .brand-header {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 2px;
              letter-spacing: 0.5px;
            }
            .brand-header span {
              color: #e67e22;
            }
            .sub-header {
              font-size: 8px;
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 15px;
            }
            .qr-wrapper {
              margin: 15px 0;
              display: flex;
              justify-content: center;
            }
            .info-row {
              font-size: 11px;
              margin: 4px 0;
              color: #334155;
            }
            .serial-no {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              background: #f1f5f9;
              padding: 6px;
              border-radius: 6px;
              margin-top: 10px;
              border: 1px dashed #cbd5e1;
            }
            .footer-text {
              font-size: 8px;
              color: #94a3b8;
              margin-top: 12px;
            }
            @media print {
              body { background: none; }
              .label-card { border: 2px solid #000; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="brand-header">AKAN <span>ENERJI</span></div>
            <div class="sub-header">Jenerator & Guc Sistemleri</div>
            <div class="qr-wrapper">${qrSvgHtml}</div>
            <div class="info-row"><strong>Müşteri:</strong> ${gen.customer?.name || '-'}</div>
            <div class="info-row"><strong>Model:</strong> ${gen.brand || ''} ${gen.model || ''} (${gen.kva || '-'} kVA)</div>
            <div class="serial-no">SERİ NO: ${gen.serial_number}</div>
            <div class="footer-text">Müşteri Destek: 0549 621 34 60 | akanenerji.com</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = (record: any, type: 'a4' | 'thermal' | 'rawbt' = 'a4') => {
    if (!gen) return;
    let checklistObj: any = null;
    let measurementsObj: any = null;
    let customerAuthName = '';
    let techNameStr = '';
    let usedPartsList: any[] = [];
    
    if (record.checklist_json) {
      try {
        const parsed = JSON.parse(record.checklist_json);
        checklistObj = parsed.checklist;
        measurementsObj = parsed.measurements;
        customerAuthName = parsed.customer_authorized_name || '';
        techNameStr = parsed.technician_name || '';
        usedPartsList = parsed.used_parts || [];
      } catch (e) {
        console.error("Error parsing checklist_json:", e);
      }
    }
    
    const docData = {
      id: record.id,
      generator: gen,
      customer: gen.customer,
      serial_number: gen.serial_number,
      model: gen.model,
      service_date: record.service_date,
      description: record.description,
      techSig: record.technician_signature_url,
      custSig: record.customer_signature_url,
      service_fee: record.service_fee,
      total_cost: record.total_cost || 0,
      used_parts: usedPartsList,
      checklist: checklistObj,
      measurements: measurementsObj,
      customer_authorized_name: customerAuthName,
      tech_name: techNameStr
    };

    if (type === 'rawbt') {
      sendToRawBTPrinter(docData);
    } else if (type === 'thermal') {
      generateServiceThermalPDF(docData);
    } else {
      generateServicePDF(docData);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gen || !planData.reason) return;

    try {
      await api.post('/generator-faults', {
        generator_id: gen.id,
        fault_code_id: null,
        fault_date: planData.date,
        status: 'Açık',
        notes: planData.reason
      });
      setPlanData({ reason: '', date: new Date().toISOString().split('T')[0] });
      setShowPlanForm(false);
      fetchGenerator();
      toast.success('Servis kaydı planlandı ve takvime eklendi.');
    } catch (error) {
      console.error('Error planning service:', error);
      toast.error('Kayıt oluşturulamadı.');
    }
  };

  const toggleFaultStatus = async (faultId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Açık' ? 'Çözüldü' : 'Açık';
    try {
      await api.put(`/generator-faults/${faultId}`, { status: newStatus });
      fetchGenerator();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const renderChecklistItem = (item: string) => {
    const value = checklist[item] || 'ok';
    
    const setStatus = (status: 'ok' | 'comment' | 'na') => {
      setChecklist(prev => ({ ...prev, [item]: status }));
    };
    
    return (
      <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>{item}</span>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            type="button" 
            onClick={() => setStatus('ok')} 
            style={{ 
              padding: '6px 10px', 
              fontSize: '12px', 
              borderRadius: '6px', 
              border: '1px solid var(--border-color)', 
              background: value === 'ok' ? '#d1fae5' : 'var(--bg-main)', 
              color: value === 'ok' ? '#065f46' : 'var(--text-muted)',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ✓
          </button>
          <button 
            type="button" 
            onClick={() => setStatus('comment')} 
            style={{ 
              padding: '6px 10px', 
              fontSize: '12px', 
              borderRadius: '6px', 
              border: '1px solid var(--border-color)', 
              background: value === 'comment' ? '#fef3c7' : 'var(--bg-main)', 
              color: value === 'comment' ? '#92400e' : 'var(--text-muted)',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            O
          </button>
          <button 
            type="button" 
            onClick={() => setStatus('na')} 
            style={{ 
              padding: '6px 10px', 
              fontSize: '12px', 
              borderRadius: '6px', 
              border: '1px solid var(--border-color)', 
              background: value === 'na' ? '#fee2e2' : 'var(--bg-main)', 
              color: value === 'na' ? '#991b1b' : 'var(--text-muted)',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            X
          </button>
        </div>
      </div>
    );
  };

  const handleServiceSubmit = async (e: React.FormEvent, printMode: 'a4' | 'print' = 'a4') => {
    e.preventDefault();
    if (!techSigRef.current || !custSigRef.current || !gen) return;

    const techSig = techSigRef.current.toDataURL();
    const custSig = custSigRef.current.toDataURL();

    // Get currently logged-in technician name
    const storedUser = localStorage.getItem('user');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const techName = currentUser ? currentUser.name : '';

    // Ensure all checklist items have a status
    const fullChecklist: Record<string, 'ok' | 'comment' | 'na'> = {};
    CHECKLIST_ITEMS.forEach(item => {
      fullChecklist[item] = checklist[item] || 'ok';
    });

    const checklistSummary = CHECKLIST_ITEMS.map(item => {
      const status = checklist[item] || 'ok';
      const marker = status === 'ok' ? 'OK' : (status === 'comment' ? 'O' : 'X');
      return `[${marker}] ${item}`;
    }).join('\n');

    const measurementsSummary = `
Akü Grubu: ${measurements.battery_group || '-'}
Akü Adedi: ${measurements.battery_qty || '-'}
Şarj Alt.: ${measurements.charger_alternator || '-'} Vdc
Şarj Cihazı: ${measurements.charger_device || '-'} Vdc
Topraklama: ${measurements.grounding || '-'}
Hararet: ${measurements.coolant_temp || '-'} °C
Yağ Basıncı: ${measurements.oil_pressure || '-'} BAR
Frekans: ${measurements.frequency || '-'} Hz
Yakıt: ${measurements.fuel_level_text || '-'}
U Fazı: ${measurements.voltage_u || '-'}V / ${measurements.current_u || '-'}A
V Fazı: ${measurements.voltage_v || '-'}V / ${measurements.current_v || '-'}A
W Fazı: ${measurements.voltage_w || '-'}V / ${measurements.current_w || '-'}A
    `.trim();

    let fullDescription = `
KONTROL LİSTESİ:
${checklistSummary}

PARAMETRELER & ÖLÇÜMLER:
${measurementsSummary}

İşçilik: ${serviceData.service_fee} TL

EK NOTLAR:
${serviceData.description}
    `.trim();

    const totalPartsCost = usedParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);

    const endTimeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const postData = {
      generator_id: gen.id,
      service_date: new Date().toISOString().split('T')[0],
      description: fullDescription,
      technician_signature: techSig,
      customer_signature: custSig,
      next_maintenance_date: serviceData.next_maintenance_date,
      service_fee: Number(serviceData.service_fee),
      used_parts: usedParts.map(p => ({ id: p.id, quantity: p.quantity })),
      checklist_json: JSON.stringify({ 
        checklist: fullChecklist, 
        measurements, 
        customer_authorized_name: customerAuthorizedName,
        technician_name: techName,
        used_parts: usedParts,
        start_time: serviceData.start_time,
        end_time: endTimeStr
      }),
      photo_before: photoBefore,
      photo_after: photoAfter,
      start_time: serviceData.start_time || null,
      end_time: endTimeStr
    };

    try {
      if (!navigator.onLine) {
        queueOfflineService(postData);
        toast.success('İnternet bulunamadı. Servis kaydı cihaza kaydedildi ve bağlantı geldiğinde senkronize edilecektir.', { duration: 6000 });
      } else {
        await api.post('/service-records', postData);
        toast.success('Servis kaydı başarıyla oluşturuldu.');
      }

      const pdfDocData = {
        generator: gen,
        customer: gen.customer,
        serial_number: gen.serial_number,
        model: gen.model,
        service_date: new Date().toLocaleDateString('tr-TR'),
        description: serviceData.description || 'Planli Servis Tamamlandi',
        techSig: techSig,
        custSig: custSig,
        service_fee: Number(serviceData.service_fee),
        total_cost: totalPartsCost,
        used_parts: usedParts,
        checklist: fullChecklist,
        measurements,
        customer_authorized_name: customerAuthorizedName,
        tech_name: techName,
        photo_before_url: photoBefore,
        photo_after_url: photoAfter,
        start_time: serviceData.start_time,
        end_time: endTimeStr
      };

      if (printMode === 'print') {
        sendToRawBTPrinter(pdfDocData);
      } else {
        generateServicePDF(pdfDocData);
      }

      setPhotoBefore(null);
      setPhotoAfter(null);

      setShowServiceForm(false);
      setChecklist({});
      setMeasurements({
        battery_group: '',
        battery_qty: '',
        charger_alternator: '',
        charger_device: '',
        grounding: '',
        coolant_temp: '',
        oil_pressure: '',
        frequency: '',
        voltage_u: '',
        current_u: '',
        voltage_v: '',
        current_v: '',
        voltage_w: '',
        current_w: '',
        fuel_level_text: '',
        runtime_hours: ''
      });
      setServiceData({ description: '', next_maintenance_date: '', service_fee: 0, start_time: '', end_time: '' });
      setUsedParts([]);
      setCustomerAuthorizedName('');
      fetchGenerator();
    } catch (error) {
      console.error('Error saving service record, fallback to offline queue:', error);
      queueOfflineService(postData);

      const fallbackDocData = {
        generator: gen,
        customer: gen.customer,
        serial_number: gen.serial_number,
        model: gen.model,
        service_date: new Date().toLocaleDateString('tr-TR'),
        description: serviceData.description || 'Planli Servis Tamamlandi',
        techSig: techSig,
        custSig: custSig,
        service_fee: Number(serviceData.service_fee),
        total_cost: totalPartsCost,
        used_parts: usedParts,
        checklist: fullChecklist,
        measurements,
        customer_authorized_name: customerAuthorizedName,
        tech_name: techName,
        start_time: serviceData.start_time,
        end_time: endTimeStr
      };

      if (printMode === 'print') {
        sendToRawBTPrinter(fallbackDocData);
      } else {
        generateServicePDF(fallbackDocData);
      }

      setShowServiceForm(false);
      setChecklist({});
      setMeasurements({
        battery_group: '',
        battery_qty: '',
        charger_alternator: '',
        charger_device: '',
        grounding: '',
        coolant_temp: '',
        oil_pressure: '',
        frequency: '',
        voltage_u: '',
        current_u: '',
        voltage_v: '',
        current_v: '',
        voltage_w: '',
        current_w: '',
        fuel_level_text: '',
        runtime_hours: ''
      });
      setServiceData({ description: '', next_maintenance_date: '', service_fee: 0, start_time: '', end_time: '' });
      setUsedParts([]);
      setCustomerAuthorizedName('');
      toast.success('Bağlantı hatası. Servis kaydı cihazınıza kaydedildi ve internet geldiğinde senkronize edilecektir.', { duration: 6000 });
    }
  };

  if (!gen) return <div style={{ padding: '50px', textAlign: 'center' }}>Yükleniyor...</div>;

  const qrUrl = `${window.location.origin}/public/generator/${gen.qr_code_hash}`;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
         <ArrowLeft size={16}/> Geri Dön
      </button>

      <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <Link 
                to={`/customers/${gen.customer?.id || gen.customer_id}`} 
                style={{ 
                  fontSize: '24px', 
                  fontWeight: '800', 
                  color: 'var(--primary)', 
                  marginBottom: '5px', 
                  wordBreak: 'break-word', 
                  lineHeight: '1.3',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                title="Müşteri profilini görüntüle"
              >
                {gen.customer?.name} <ExternalLink size={20} />
              </Link>
              <p style={{ color: '#64748b', fontSize: '14px', wordBreak: 'break-word' }}>{gen.customer?.address}</p>
            </div>
            {currentUser?.role === 'admin' && (
              <button 
                className="btn btn-secondary" 
                onClick={handleOpenEditModal} 
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', fontWeight: 'bold' }}
              >
                <Settings size={18} /> Cihazı Yönet
              </button>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '25px' }}>
            <div className="stat-card" style={{ textAlign: 'left', padding: '20px' }}>
              <h4>Cihaz Tanımı / Seri No</h4>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {gen.brand ? `${gen.brand} ` : ''}{gen.model} / {gen.serial_number}
              </div>
            </div>
            <div className="stat-card" style={{ textAlign: 'left', padding: '20px' }}>
              <h4>kVA / Kabin</h4>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{gen.kva || '-'} / {gen.has_canopy ? 'Kabinli' : 'Açık Tip'}</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'left', padding: '20px' }}>
              <h4>Lokasyon / Çalışma Saati</h4>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{gen.location || '-'} / {gen.runtime_hours ? `${gen.runtime_hours} Saat` : '-'}</div>
            </div>
            <div className="stat-card yellow" style={{ textAlign: 'left', padding: '20px' }}>
              <h4>Planlanan Bakım</h4>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{gen.next_maintenance_date}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '25px' }}>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--primary)' }}>Motor & Alternatör</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Motor:</span> <strong>{gen.engine_model || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Motor Seri No:</span> <strong>{gen.engine_serial_number || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}><span style={{ color: '#64748b' }}>Alternatör:</span> <strong>{gen.alternator_model || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Alternatör Seri No:</span> <strong>{gen.alternator_serial_number || '-'}</strong></div>
              </div>
            </div>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--primary)' }}>Kontrol & Güç Transferi</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Kontrol Panosu:</span> <strong>{gen.control_panel_type || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Kontrol Cihazı:</span> <strong>{gen.control_device || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}><span style={{ color: '#64748b' }}>Şalter Tipi/Akımı:</span> <strong>{gen.breaker_type || '-'} {gen.breaker_current ? `(${gen.breaker_current}A)` : ''}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Transfer Panosu:</span> <strong>{gen.transfer_panel_type || '-'}</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Servis Planla & Başlat Butonları (Kartın Üzerinde) */}
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setShowPlanForm(true)} style={{ flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 18px', fontWeight: 'bold' }}>
              <Calendar size={18} /> Servis Planla
            </button>
            <button className="btn btn-primary" onClick={() => {
              const now = new Date();
              const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
              setServiceData(prev => ({ ...prev, start_time: timeStr }));
              setShowServiceForm(true);
            }} style={{ flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 18px', fontWeight: 'bold' }}>
              <ClipboardCheck size={18} /> Servis Başlat
            </button>
          </div>

          {/* Cihaz Kimlik QR Kartı */}
          <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', margin: 0 }}>
            <h3 style={{ marginBottom: '15px' }}>Cihaz Kimlik QR</h3>
            <div style={{ border: '2px solid var(--primary)', borderRadius: '12px', padding: '15px', background: '#fff', width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>AKAN <span style={{ color: 'var(--primary)' }}>ENERJİ</span></span>
              <span style={{ fontSize: '7px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Jeneratör Etiketi</span>
              <div className="qr-container" style={{ margin: '12px 0', background: '#fff' }}>
                <QRCodeSVG value={qrUrl} size={120} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e293b', background: '#f1f5f9', padding: '5px 8px', borderRadius: '6px', width: '100%', boxSizing: 'border-box', border: '1px dashed #cbd5e1' }}>S/N: {gen.serial_number}</span>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '15px' }} onClick={printLabel}>
              <Printer size={16} /> Etiketi Yazdır
            </button>
            {!isTechnician && (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '10px', background: '#f59e0b', borderColor: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
                onClick={() => setShowQuoteModal(true)}
              >
                <FileText size={16} /> Teklif Oluştur
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '30px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Droplets size={20} color="var(--primary)"/> Kapasiteler & Filtre Bilgileri</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
            <div>
              <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>SIVI KAPASİTELERİ</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <span>Motor Yağ Kapasitesi:</span> <strong>{gen.oil_capacity || '-'} L</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                  <span>Antifiriz Kapasitesi:</span> <strong>{gen.antifreeze_capacity || '-'} L</strong>
                </div>
              </div>

              <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', marginTop: '20px' }}>FİLTRE LİSTESİ</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Hava Filtresi:</span> <strong>{gen.air_filter_code || '-'} ({gen.air_filter_qty} Ad.)</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Yakıt Filtresi:</span> <strong>{gen.fuel_filter_code || '-'} ({gen.fuel_filter_qty} Ad.)</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Yakıt Ön Filtre:</span> <strong>{gen.fuel_pre_filter_code || '-'} ({gen.fuel_pre_filter_qty} Ad.)</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Şase Filtresi:</span> <strong>{gen.chassis_filter_code || '-'} ({gen.chassis_filter_qty} Ad.)</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Yağ Filtresi:</span> <strong>{gen.oil_filter_code || '-'} ({gen.oil_filter_qty} Ad.)</strong></div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>DİĞER FİLTRELER</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>By-Pass Filtresi:</span> <strong>{gen.bypass_filter_code || '-'} ({gen.bypass_filter_qty} Ad.)</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Turbo Yağ Filtresi:</span> <strong>{gen.turbo_filter_code || '-'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Su Filtresi:</span> <strong>{gen.water_filter_code || '-'} ({gen.water_filter_qty} Ad.)</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Santrifüj Filtresi:</span> <strong>{gen.centrifugal_filter_code || '-'} ({gen.centrifugal_filter_qty} Ad.)</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
           <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><Battery size={20} color="#10b981"/> Akü & Redresör</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="stat-card" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>AKÜ BİLGİSİ</div>
                <div style={{ fontSize: '20px', fontWeight: '900' }}>{gen.battery_amperage || '-'} Ah</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{gen.battery_qty} ADET</div>
              </div>
              <div className="stat-card" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>REDRESÖR (ŞARJ CİHAZI)</div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                   <div>
                     <div style={{ fontSize: '10px', color: '#94a3b8' }}>VOLTAJ</div>
                     <div style={{ fontWeight: '800' }}>{gen.charger_voltage || '-'}</div>
                   </div>
                   <div>
                     <div style={{ fontSize: '10px', color: '#94a3b8' }}>AMPER</div>
                     <div style={{ fontWeight: '800' }}>{gen.charger_amperage || '-'}</div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {showPlanForm && (
        <div className="card" ref={planFormRef} style={{ animation: 'fadeIn 0.3s ease-out', marginBottom: '30px', borderTop: '5px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Yeni Servis Planla</h3>
            <button className="btn btn-secondary" onClick={() => setShowPlanForm(false)}>İptal</button>
          </div>
          <form onSubmit={handlePlanSubmit}>
            <div className="form-group">
              <label>Planlanan Tarih</label>
              <input type="date" required value={planData.date} onChange={e => setPlanData({...planData, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Servis Nedeni / Açıklama</label>
              <textarea required rows={3} value={planData.reason} onChange={e => setPlanData({...planData, reason: e.target.value})} placeholder="Örn: Yağ kaçağı kontrolü yapılacak..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}></textarea>
            </div>
            <button type="submit" className="btn btn-primary">Kaydet ve Planlara Ekle</button>
          </form>
        </div>
      )}

      {showServiceForm && (
        <div className="card" ref={serviceFormRef} style={{ animation: 'fadeIn 0.3s ease-out', marginBottom: '30px', borderTop: '5px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Servis Raporu Oluştur</h3>
            <button className="btn btn-secondary" onClick={() => setShowServiceForm(false)}>İptal</button>
          </div>
          <form onSubmit={handleServiceSubmit}>
            {/* Yapılan Kontroller - 2 Sütun */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              <div>
                <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px', fontSize: '14px' }}>Genel Kontroller</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {SOL_KONTROLLER.map(item => renderChecklistItem(item))}
                </div>
              </div>
              <div>
                <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '10px', fontSize: '14px' }}>Motor & Kumanda</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {SAG_KONTROLLER.map(item => renderChecklistItem(item))}
                </div>
              </div>
            </div>

            {/* Parametre Değerleri */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '14px' }}>Ölçülen Parametre Değerleri</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Akü Grubu</label>
                  <input type="text" value={measurements.battery_group} onChange={e => setMeasurements({...measurements, battery_group: e.target.value})} placeholder="Örn: 12V 60Ah" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Akü Adedi</label>
                  <input type="text" value={measurements.battery_qty} onChange={e => setMeasurements({...measurements, battery_qty: e.target.value})} placeholder="Örn: 1 veya 2" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Şarj Alternatörü (Vdc)</label>
                  <input type="text" value={measurements.charger_alternator} onChange={e => setMeasurements({...measurements, charger_alternator: e.target.value})} placeholder="Örn: 13.8" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Şarj Cihazı (Vdc)</label>
                  <input type="text" value={measurements.charger_device} onChange={e => setMeasurements({...measurements, charger_device: e.target.value})} placeholder="Örn: 13.6" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Topraklama</label>
                  <input type="text" value={measurements.grounding} onChange={e => setMeasurements({...measurements, grounding: e.target.value})} placeholder="Örn: 0.8 Ohm" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Soğutma Suyu Harareti (°C)</label>
                  <input type="text" value={measurements.coolant_temp} onChange={e => setMeasurements({...measurements, coolant_temp: e.target.value})} placeholder="Örn: 75" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Motor Yağ Basıncı (BAR)</label>
                  <input type="text" value={measurements.oil_pressure} onChange={e => setMeasurements({...measurements, oil_pressure: e.target.value})} placeholder="Örn: 4.5" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Frekans (Hz)</label>
                  <input type="text" value={measurements.frequency} onChange={e => setMeasurements({...measurements, frequency: e.target.value})} placeholder="Örn: 50" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Yakıt Seviyesi</label>
                  <input type="text" value={measurements.fuel_level_text} onChange={e => setMeasurements({...measurements, fuel_level_text: e.target.value})} placeholder="Örn: %80" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Jeneratör Çalışma Saati (Saat)</label>
                  <input type="text" value={measurements.runtime_hours} onChange={e => setMeasurements({...measurements, runtime_hours: e.target.value})} placeholder="Örn: 1250 Saat" />
                </div>
              </div>
            </div>

            {/* Gerilim & Akım (Fazlar) */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '14px' }}>Gerilim & Akım Ölçümleri (U, V, W Fazları)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--primary)' }}>U Fazı</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input type="text" style={{ padding: '8px' }} value={measurements.voltage_u} onChange={e => setMeasurements({...measurements, voltage_u: e.target.value})} placeholder="Volt" />
                    <input type="text" style={{ padding: '8px' }} value={measurements.current_u} onChange={e => setMeasurements({...measurements, current_u: e.target.value})} placeholder="Amper" />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--primary)' }}>V Fazı</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input type="text" style={{ padding: '8px' }} value={measurements.voltage_v} onChange={e => setMeasurements({...measurements, voltage_v: e.target.value})} placeholder="Volt" />
                    <input type="text" style={{ padding: '8px' }} value={measurements.current_v} onChange={e => setMeasurements({...measurements, current_v: e.target.value})} placeholder="Amper" />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--primary)' }}>W Fazı</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input type="text" style={{ padding: '8px' }} value={measurements.voltage_w} onChange={e => setMeasurements({...measurements, voltage_w: e.target.value})} placeholder="Volt" />
                    <input type="text" style={{ padding: '8px' }} value={measurements.current_w} onChange={e => setMeasurements({...measurements, current_w: e.target.value})} placeholder="Amper" />
                  </div>
                </div>
              </div>
            </div>

            {/* KULLANILAN YEDEK PARÇALAR & SARF MALZEMELERİ */}
            <div className="card" style={{ marginBottom: '25px', border: '1px solid var(--border-color)', padding: '15px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: 'var(--primary)', fontSize: '14px', fontWeight: 'bold' }}>Kullanılan Yedek Parçalar & Sarf Malzemeleri</h4>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <select 
                    id="part-select"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                  >
                    <option value="" style={{ background: 'var(--bg-card)' }}>-- Parça Seçin --</option>
                    {allParts.map(p => (
                      <option key={p.id} value={p.id} style={{ background: 'var(--bg-card)' }}>{p.name} ({p.part_number}) - Stok: {p.stock_quantity} {p.unit}</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: '90px' }}>
                  <input 
                    type="number" 
                    id="part-qty" 
                    min="1" 
                    defaultValue="1" 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }} 
                  />
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    const selectEl = document.getElementById('part-select') as HTMLSelectElement;
                    const qtyEl = document.getElementById('part-qty') as HTMLInputElement;
                    if (!selectEl || !qtyEl || !selectEl.value) return;
                    
                    const partId = parseInt(selectEl.value);
                    const qty = parseInt(qtyEl.value) || 1;
                    
                    if (usedParts.some(p => p.id === partId)) {
                      toast.error('Bu parça zaten eklenmiş.');
                      return;
                    }
                    
                    const partObj = allParts.find(p => p.id === partId);
                    if (partObj) {
                      // Stock validation
                      if (qty > partObj.stock_quantity) {
                        toast.error(`Yetersiz stok! "${partObj.name}" için stokta yalnızca ${partObj.stock_quantity} ${partObj.unit} mevcut.`);
                        return;
                      }
                      if (partObj.stock_quantity === 0) {
                        toast.error(`"${partObj.name}" için stokta ürün kalmadı.`);
                        return;
                      }
                      setUsedParts([...usedParts, {
                        id: partObj.id,
                        name: partObj.name,
                        part_number: partObj.part_number,
                        quantity: qty,
                        unit_price: partObj.unit_price || 0,
                        unit: partObj.unit || 'Adet',
                        stock_quantity: partObj.stock_quantity
                      }]);
                      selectEl.value = "";
                      qtyEl.value = "1";
                    }
                  }}
                  style={{ padding: '10px 20px', borderRadius: '8px', height: '42px' }}
                >
                  Ekle
                </button>
              </div>

              {usedParts.length > 0 ? (
                <div className="table-responsive">
                  <table style={{ margin: 0, fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ color: 'var(--text-main)' }}>Parça No</th>
                        <th style={{ color: 'var(--text-main)' }}>Parça Adı</th>
                        <th style={{ color: 'var(--text-main)' }}>Miktar</th>
                        <th style={{ color: 'var(--text-main)' }}>Birim Fiyat</th>
                        <th style={{ color: 'var(--text-main)' }}>Toplam</th>
                        <th style={{ textAlign: 'right', color: 'var(--text-main)' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usedParts.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ color: 'var(--text-main)' }}>{p.part_number}</td>
                          <td style={{ color: 'var(--text-main)' }}>{p.name}</td>
                          <td style={{ color: 'var(--text-main)' }}>{p.quantity} {p.unit}</td>
                          <td style={{ color: 'var(--text-main)' }}>{p.unit_price} TL</td>
                          <td style={{ color: 'var(--text-main)' }}>{(p.quantity * p.unit_price).toLocaleString('tr-TR')} TL</td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              onClick={() => setUsedParts(usedParts.filter(x => x.id !== p.id))}
                              style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--danger)' }}
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Henüz parça eklenmedi.</div>
              )}
            </div>

            <div className="form-group">
              <label>İşçilik Ücreti (TL)</label>
              <input type="number" value={serviceData.service_fee} onChange={e => setServiceData({...serviceData, service_fee: Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>Ek Notlar / Açıklama</label>
              <textarea rows={4} value={serviceData.description} onChange={e => setServiceData({...serviceData, description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}></textarea>
            </div>
            <div className="form-group">
              <label>Sonraki Bakım Tarihi</label>
              <input type="date" value={serviceData.next_maintenance_date} onChange={e => setServiceData({...serviceData, next_maintenance_date: e.target.value})} />
            </div>

            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Müşteri Yetkilisi (Adı Soyadı)</label>
              <input 
                type="text" 
                placeholder="Örn: Ahmet Yılmaz" 
                value={customerAuthorizedName} 
                onChange={e => setCustomerAuthorizedName(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
              />
            </div>

            {/* Saha Operasyon Fotoğrafları (Öncesi - Sonrası) */}
            <div style={{ marginTop: '25px', marginBottom: '25px' }}>
              <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px', marginBottom: '15px', fontSize: '14px' }}>Bakım / Servis Fotoğrafları (Öncesi - Sonrası)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                
                {/* Servis Öncesi */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>Servis Öncesi Görüntü</label>
                  {photoBefore ? (
                    <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                      <img src={photoBefore} alt="Servis Öncesi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => setPhotoBefore(null)} 
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '160px', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s ease-in-out' }}>
                      <Camera size={32} color="#64748b" style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Kamerayı Aç / Fotoğraf Çek</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) compressAndSetPhoto(file, 'before');
                        }} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  )}
                </div>

                {/* Servis Sonrası */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>Servis Sonrası Görüntü</label>
                  {photoAfter ? (
                    <div style={{ position: 'relative', width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                      <img src={photoAfter} alt="Servis Sonrası" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => setPhotoAfter(null)} 
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '160px', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s ease-in-out' }}>
                      <Camera size={32} color="#64748b" style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Kamerayı Aç / Fotoğraf Çek</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) compressAndSetPhoto(file, 'after');
                        }} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  )}
                </div>

              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <label>Teknisyen İmzası</label>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', width: '100%' }}>
                  <SignatureCanvas ref={techSigRef} canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '150px' } }} />
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => techSigRef.current?.clear()} style={{ marginTop: '5px', fontSize: '12px', padding: '4px 8px' }}>Temizle</button>
              </div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <label>Müşteri Onayı / İmzası</label>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', width: '100%' }}>
                  <SignatureCanvas ref={custSigRef} canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '150px' } }} />
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => custSigRef.current?.clear()} style={{ marginTop: '5px', fontSize: '12px', padding: '4px 8px' }}>Temizle</button>
              </div>
            </div>
            <div style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn btn-secondary" 
                onClick={(e) => handleServiceSubmit(e, 'a4')}
                style={{ padding: '14px 24px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Save size={18} style={{ marginRight: '8px' }} /> Kaydet (A4 PDF)
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={(e) => handleServiceSubmit(e, 'print')}
                style={{
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  cursor: 'pointer'
                }}
              >
                <Printer size={18} style={{ marginRight: '8px' }} /> Kaydet & Yazdır (80mm Bluetooth)
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>Bekleyen Servis Planları</h3>
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2 }}>
                <tr>
                  <th>Tarih</th>
                  <th>Neden / Açıklama</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {gen.faults && gen.faults.filter(f => f.status === 'Açık').length > 0 ? gen.faults.filter(f => f.status === 'Açık').map(fault => (
                  <tr key={fault.id}>
                    <td>{new Date(fault.fault_date).toLocaleDateString('tr-TR')}</td>
                    <td><span style={{ fontWeight: 'bold' }}>{fault.notes}</span></td>
                    <td><span className="status-badge status-blue">BEKLİYOR</span></td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => toggleFaultStatus(fault.id, fault.status)}>Tamamlandı İşaretle</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Planlanmış servis bulunmuyor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '800' }}>Cihaz Servis Geçmişi</h3>
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2 }}>
                <tr>
                  <th style={{ width: '120px' }}>Tarih</th>
                  <th>İşlem Özeti</th>
                  <th style={{ width: '100px' }}>Tip / PDF</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const combinedHistory = [
                    ...gen.records.map(r => ({ ...r, type: 'record' })),
                    ...(gen.faults || []).filter(f => f.status === 'Çözüldü').map(f => ({
                      id: `f-${f.id}`,
                      service_date: f.fault_date,
                      description: f.notes || 'Planlı Servis Tamamlandı',
                      type: 'fault'
                    }))
                  ].sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());

                  return combinedHistory.length > 0 ? combinedHistory.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '800' }}>{new Date(item.service_date).toLocaleDateString('tr-TR')}</td>
                      <td style={{ fontSize: '12px' }}>
                        {item.type === 'fault' && <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>[ÖZEL SERVİS] </span>}
                        {item.description.substring(0, 100)}...
                      </td>
                      <td>
                        {item.type === 'record' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                              onClick={() => handleDownloadPDF(item, 'a4')}
                              title="A4 PDF Rapor İndir"
                            >
                              <FileText size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }} 
                              onClick={() => handleDownloadPDF(item, 'thermal')}
                              title="80mm Termal PDF İndir"
                            >
                              <Receipt size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#059669', borderColor: '#059669', color: '#fff' }} 
                              onClick={() => handleDownloadPDF(item, 'rawbt')}
                              title="Milestone Bluetooth Yazıcıya Gönder (RawBT)"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Manuel Onay</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Henüz servis kaydı yok.</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!isTechnician && (
        <div className="card" style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>Yapılan Teklifler</h3>
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2 }}>
                <tr>
                  <th>Tarih</th>
                  <th>Teklif No / Türü</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {quotes.length > 0 ? quotes.map(q => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: '800' }}>{new Date(q.quote_date).toLocaleDateString('tr-TR')}</td>
                    <td>
                      <span 
                        style={{ fontWeight: 'bold', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => navigate(`/quotes/${q.id}`)}
                      >
                        {q.quote_number}
                      </span>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{q.quote_type}</div>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{q.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</td>
                    <td>
                      <span className={`status-badge ${
                        q.status === 'Onaylandı' ? 'status-green' :
                        q.status === 'Reddedildi' ? 'status-red' :
                        q.status === 'Gönderildi' ? 'status-blue' : 'status-yellow'
                      }`}>{q.status}</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Bu cihaza henüz teklif yapılmamış.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Generator Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9998, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card-solid)', borderRadius: '20px',
            padding: '32px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)',
            animation: 'scaleUp 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="var(--primary)" /> Ekipman Bilgilerini Düzenle
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <button 
                className={`btn ${activeEditTab === 'basic' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setActiveEditTab('basic')}
                type="button"
              >
                Temel Bilgiler
              </button>
              <button 
                className={`btn ${activeEditTab === 'technical' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setActiveEditTab('technical')}
                type="button"
              >
                Motor & Alternatör & Şalter
              </button>
              <button 
                className={`btn ${activeEditTab === 'filters' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setActiveEditTab('filters')}
                type="button"
              >
                Kapasite, Filtre & Akü
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              {activeEditTab === 'basic' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label>Müşteri Seçin</label>
                    <select 
                      required 
                      value={editFormData.customer_id} 
                      onChange={e => setEditFormData({...editFormData, customer_id: Number(e.target.value)})}
                    >
                      <option value="">Seçiniz...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '5px' }}>Sözleşme Durumu</label>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="radio" name="contract" checked={editFormData.contract_status === 'Var'} onChange={() => setEditFormData({...editFormData, contract_status: 'Var'})} /> Var
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="radio" name="contract" checked={editFormData.contract_status === 'Yok'} onChange={() => setEditFormData({...editFormData, contract_status: 'Yok'})} /> Yok
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Bölge</label>
                    <select 
                      value={editFormData.region} 
                      onChange={e => setEditFormData({...editFormData, region: e.target.value})}
                    >
                      <option value="">Seçiniz...</option>
                      <option value="Avrupa">Avrupa Yakası</option>
                      <option value="Anadolu">Anadolu Yakası</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Jeneratör Lokasyonu (Etiket)</label>
                    <input type="text" placeholder="Örn: Merkez Bina, Şube 1..." value={editFormData.location} onChange={e => setEditFormData({...editFormData, location: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Tam Adres (Harita İçin)</label>
                    <input type="text" placeholder="Mahalle, Sokak, No, İlçe/İl..." value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Enlem (Latitude - Boş bırakılırsa adresten çözümlenir)</label>
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Örn: 41.012345" 
                      value={editFormData.latitude} 
                      onChange={e => setEditFormData({...editFormData, latitude: e.target.value === '' ? '' : Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Boylam (Longitude - Boş bırakılırsa adresten çözümlenir)</label>
                    <input 
                      type="number" 
                      step="any" 
                      placeholder="Örn: 28.976543" 
                      value={editFormData.longitude} 
                      onChange={e => setEditFormData({...editFormData, longitude: e.target.value === '' ? '' : Number(e.target.value)})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Çalışma Saati</label>
                    <input type="text" placeholder="Örn: 1200 Saat" value={editFormData.runtime_hours} onChange={e => setEditFormData({...editFormData, runtime_hours: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Marka</label>
                    <input type="text" value={editFormData.brand} onChange={e => setEditFormData({...editFormData, brand: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <input type="text" placeholder="Örn: AKN-50" required value={editFormData.model} onChange={e => setEditFormData({...editFormData, model: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Seri Numarası</label>
                    <input type="text" required placeholder="AKN-XXXXX" value={editFormData.serial_number} onChange={e => setEditFormData({...editFormData, serial_number: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Güç (kVA)</label>
                    <input type="text" placeholder="Örn: 150 kVA" value={editFormData.kva} onChange={e => setEditFormData({...editFormData, kva: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Kabin Durumu</label>
                    <select value={editFormData.has_canopy} onChange={e => setEditFormData({...editFormData, has_canopy: Number(e.target.value)})}>
                      <option value="1">Kabinli</option>
                      <option value="0">Açık Tip</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '5px' }}>Garanti Durumu</label>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="radio" name="warranty" checked={editFormData.warranty_status === 'Var'} onChange={() => setEditFormData({...editFormData, warranty_status: 'Var'})} /> Var
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="radio" name="warranty" checked={editFormData.warranty_status === 'Yok'} onChange={() => setEditFormData({...editFormData, warranty_status: 'Yok'})} /> Yok
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Garanti Bitiş Tarihi</label>
                    <input type="date" value={editFormData.warranty_end_date} onChange={e => setEditFormData({...editFormData, warranty_end_date: e.target.value})} />
                  </div>
                </div>
              )}

              {activeEditTab === 'technical' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label>Motor Marka/Model</label>
                    <input type="text" placeholder="Örn: Perkins 1104C" value={editFormData.engine_model} onChange={e => setEditFormData({...editFormData, engine_model: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Motor Seri Numarası</label>
                    <input type="text" placeholder="Motor Seri No" value={editFormData.engine_serial_number} onChange={e => setEditFormData({...editFormData, engine_serial_number: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Alternatör Marka/Model</label>
                    <input type="text" placeholder="Örn: Stamford UCI274" value={editFormData.alternator_model} onChange={e => setEditFormData({...editFormData, alternator_model: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Alternatör Seri Numarası</label>
                    <input type="text" placeholder="Alternatör Seri No" value={editFormData.alternator_serial_number} onChange={e => setEditFormData({...editFormData, alternator_serial_number: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Kumanda Paneli Tipi</label>
                    <select value={editFormData.control_panel_type} onChange={e => setEditFormData({...editFormData, control_panel_type: e.target.value})}>
                      <option value="">Belirtilmemiş</option>
                      <option value="Otomatik">Otomatik</option>
                      <option value="Manuel">Manuel</option>
                      <option value="Marşlı">Marşlı</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Kontrol Cihazı (Modül)</label>
                    <input type="text" placeholder="Örn: Datakom D300" value={editFormData.control_device} onChange={e => setEditFormData({...editFormData, control_device: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Şalter Tipi</label>
                    <select value={editFormData.breaker_type} onChange={e => setEditFormData({...editFormData, breaker_type: e.target.value})}>
                      <option value="">Belirtilmemiş</option>
                      <option value="K Otomat">K Otomat</option>
                      <option value="Kompakt Şalter">Kompakt Şalter</option>
                      <option value="Motorlu Şalter">Motorlu Şalter</option>
                      <option value="Yok">Yok</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Şalter Akımı (Amper)</label>
                    <input type="text" placeholder="Örn: 160A" value={editFormData.breaker_current} onChange={e => setEditFormData({...editFormData, breaker_current: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Transfer Paneli Tipi</label>
                    <select value={editFormData.transfer_panel_type} onChange={e => setEditFormData({...editFormData, transfer_panel_type: e.target.value})}>
                      <option value="">Belirtilmemiş</option>
                      <option value="Kontaktör">Kontaktör</option>
                      <option value="ATS">ATS</option>
                      <option value="Motorlu Şalter">Motorlu Şalter</option>
                    </select>
                  </div>
                </div>
              )}

              {activeEditTab === 'filters' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label>Yağ Kapasitesi (Litre)</label>
                    <input type="text" placeholder="Örn: 8.5 Lt" value={editFormData.oil_capacity} onChange={e => setEditFormData({...editFormData, oil_capacity: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Antifriz Kapasitesi (Litre)</label>
                    <input type="text" placeholder="Örn: 12 Lt" value={editFormData.antifreeze_capacity} onChange={e => setEditFormData({...editFormData, antifreeze_capacity: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Akü Amperi</label>
                    <input type="text" placeholder="Örn: 12V 60Ah" value={editFormData.battery_amperage} onChange={e => setEditFormData({...editFormData, battery_amperage: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Akü Adedi</label>
                    <input type="text" placeholder="Örn: 1" value={editFormData.battery_qty} onChange={e => setEditFormData({...editFormData, battery_qty: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Redresör Voltajı</label>
                    <select value={editFormData.charger_voltage} onChange={e => setEditFormData({...editFormData, charger_voltage: e.target.value})}>
                      <option value="12v">12V</option>
                      <option value="24v">24V</option>
                      <option value="">Belirtilmemiş</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Redresör Amperi</label>
                    <select value={editFormData.charger_amperage} onChange={e => setEditFormData({...editFormData, charger_amperage: e.target.value})}>
                      <option value="5A">5A</option>
                      <option value="10A">10A</option>
                      <option value="">Belirtilmemiş</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                    <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)', margin: 0 }}>Filtre Kodları & Adetleri</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Hava Filtresi Kodu</label><input type="text" placeholder="Kod" value={editFormData.air_filter_code} onChange={e => setEditFormData({...editFormData, air_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.air_filter_qty} onChange={e => setEditFormData({...editFormData, air_filter_qty: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Yakıt Filtresi Kodu</label><input type="text" placeholder="Kod" value={editFormData.fuel_filter_code} onChange={e => setEditFormData({...editFormData, fuel_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.fuel_filter_qty} onChange={e => setEditFormData({...editFormData, fuel_filter_qty: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Yakıt Ön Filtre Kodu</label><input type="text" placeholder="Kod" value={editFormData.fuel_pre_filter_code} onChange={e => setEditFormData({...editFormData, fuel_pre_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.fuel_pre_filter_qty} onChange={e => setEditFormData({...editFormData, fuel_pre_filter_qty: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Şasi Filtresi Kodu</label><input type="text" placeholder="Kod" value={editFormData.chassis_filter_code} onChange={e => setEditFormData({...editFormData, chassis_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.chassis_filter_qty} onChange={e => setEditFormData({...editFormData, chassis_filter_qty: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Yağ Filtresi Kodu</label><input type="text" placeholder="Kod" value={editFormData.oil_filter_code} onChange={e => setEditFormData({...editFormData, oil_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.oil_filter_qty} onChange={e => setEditFormData({...editFormData, oil_filter_qty: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Bypass Filtre Kodu</label><input type="text" placeholder="Kod" value={editFormData.bypass_filter_code} onChange={e => setEditFormData({...editFormData, bypass_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.bypass_filter_qty} onChange={e => setEditFormData({...editFormData, bypass_filter_qty: e.target.value})} /></div>
                  </div>
                  <div className="form-group"><label>Turbo Filtre Kodu</label><input type="text" placeholder="Kod" value={editFormData.turbo_filter_code} onChange={e => setEditFormData({...editFormData, turbo_filter_code: e.target.value})} /></div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Su Filtresi Kodu</label><input type="text" placeholder="Kod" value={editFormData.water_filter_code} onChange={e => setEditFormData({...editFormData, water_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.water_filter_qty} onChange={e => setEditFormData({...editFormData, water_filter_qty: e.target.value})} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 2 }}><label>Santrifüj Filtre Kodu</label><input type="text" placeholder="Kod" value={editFormData.centrifugal_filter_code} onChange={e => setEditFormData({...editFormData, centrifugal_filter_code: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label>Adet</label><input type="text" placeholder="1" value={editFormData.centrifugal_filter_qty} onChange={e => setEditFormData({...editFormData, centrifugal_filter_qty: e.target.value})} /></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Kapat</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>Değişiklikleri Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Modal */}
      {showQuoteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card-solid)', borderRadius: '20px',
            padding: '32px', width: '90%', maxWidth: '480px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)',
            animation: 'scaleUp 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--primary)" /> Teklif Hazırla
              </h3>
              <button onClick={() => setShowQuoteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              <strong>{gen?.brand} {gen?.model}</strong> jeneratörü ve <strong>{gen?.customer?.name}</strong> müşterisi için hangi türde bir teklif hazırlamak istersiniz?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { type: 'Satış', label: 'Jeneratör Satışı', bg: '#eff6ff', color: '#1d4ed8' },
                { type: 'Servis', label: 'Servis Hizmeti', bg: '#ecfdf5', color: '#047857' },
                { type: 'Kiralama', label: 'Kiralama', bg: '#fdf2f8', color: '#be185d' },
                { type: 'Genel Bakım', label: 'Genel Bakım', bg: '#f5f3ff', color: '#6d28d9' },
                { type: 'Periyodik Kontrol', label: 'Periyodik Kontrol', bg: '#fff7ed', color: '#c2410c' },
                { type: 'Yedek Parça', label: 'Yedek Parça / Sarf', bg: '#f1f5f9', color: '#475569' }
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleSelectQuoteType(opt.type)}
                  style={{
                    background: opt.bg,
                    color: opt.color,
                    border: '1px solid transparent',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowQuoteModal(false)}
                style={{ padding: '10px 20px', borderRadius: '8px' }}
              >
                Vazgeç / Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratorDetail;
