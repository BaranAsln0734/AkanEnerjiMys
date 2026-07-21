import React, { useEffect, useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Play, Zap, User, Settings, ClipboardCheck, ArrowRight, Plus, Trash2, FileText, Download, Check, RefreshCw, X } from 'lucide-react';
import api from '../api';
import { toast } from 'react-hot-toast';
import { generateServicePDF } from '../utils/pdfGenerator';

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
}

interface Generator {
  id: number;
  customer_id: number;
  serial_number: string;
  brand: string;
  model: string;
  kva?: string;
  location?: string;
}

interface ServiceRecord {
  id: number;
  generator_id: number;
  service_date: string;
  description: string;
  service_fee: number;
  total_cost: number;
  customer_name?: string;
  generator_serial?: string;
  generator_brand?: string;
  generator_model?: string;
  generator_kva?: string;
  checklist_json?: string;
  technician_signature_url?: string;
  customer_signature_url?: string;
}

const SOL_KONTROLLER = [
  "Yağ Seviyesi", "Su Seviyesi ve Katkılar", "Yakıt Seviyesi", "Turbo Kontrolü",
  "Kutup Başları ve Kabloları", "Kayış Gerginlikleri", "Alternatör Kontrolü",
  "Radyatör Kontrolü", "Egzoz Sistemi", "Havalandırma Sistemi"
];

const SAG_KONTROLLER = [
  "Blok Su Isıtıcı ve Hortumları", "Sirkülasyon ve Devirdaim Kontrolü",
  "Filtrelerin Kontrolü", "Marş Motoru Kontrolü", "Güç ve Kumanda Devresi Kontrolü",
  "Pompa - Enjektör - Yakıt Yolu - Solenoid", "Kontrol Panosu", "Kontrol Cihazı",
  "Göstergeler", "Transfer Panosu"
];

const QuickService = () => {
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [checklist, setChecklist] = useState<Record<string, 'ok' | 'comment' | 'na'>>({});

  const renderChecklistItem = (item: string) => {
    const value = checklist[item] || 'ok';
    const setStatus = (status: 'ok' | 'comment' | 'na') => {
      setChecklist(prev => ({ ...prev, [item]: status }));
    };
    return (
      <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: 'var(--text-main)' }}>{item}</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            type="button"
            onClick={() => setStatus('ok')}
            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-color)', background: value === 'ok' ? '#d1fae5' : 'var(--bg-main)', color: value === 'ok' ? '#065f46' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setStatus('comment')}
            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-color)', background: value === 'comment' ? '#fef3c7' : 'var(--bg-main)', color: value === 'comment' ? '#92400e' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            O
          </button>
          <button
            type="button"
            onClick={() => setStatus('na')}
            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-color)', background: value === 'na' ? '#fee2e2' : 'var(--bg-main)', color: value === 'na' ? '#991b1b' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            X
          </button>
        </div>
      </div>
    );
  };

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    customer_type: 'Tüzel Kişi',
    category: 'Özel'
  });

  const [generatorForm, setGeneratorForm] = useState({
    brand: 'AKAN',
    model: '',
    serial_number: '',
    kva: '',
    location: '',
    installation_date: new Date().toISOString().split('T')[0],
    warranty_status: 'Yok',
    contract_status: 'Yok'
  });

  const [serviceFee, setServiceFee] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('Genel Bakım');
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState<string>(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
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

  const [customerAuthorizedName, setCustomerAuthorizedName] = useState<string>('');
  const [usedParts, setUsedParts] = useState<any[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partQty, setPartQty] = useState<number>(1);

  // Signatures
  const techSigRef = useRef<SignatureCanvas>(null);
  const custSigRef = useRef<SignatureCanvas>(null);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get('/service-records');
      setHistory(response.data);
      setLoadingHistory(false);
    } catch (err) {
      console.error('Error fetching service records history:', err);
      setLoadingHistory(false);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await api.get('/parts');
      setParts(response.data);
    } catch (err) {
      console.error('Error fetching spare parts:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchParts();
  }, []);

  const handleAddPart = () => {
    if (!selectedPartId) return;
    const partId = parseInt(selectedPartId);
    
    if (usedParts.some(p => p.id === partId)) {
      toast.error('Bu parça zaten listeye eklenmiş.');
      return;
    }

    const partObj = parts.find(p => p.id === partId);
    if (partObj) {
      if (partQty > partObj.stock_quantity) {
        toast.error(`Yetersiz stok! Stokta yalnızca ${partObj.stock_quantity} ${partObj.unit} mevcut.`);
        return;
      }
      setUsedParts([...usedParts, {
        id: partObj.id,
        name: partObj.name,
        part_number: partObj.part_number,
        quantity: partQty,
        unit_price: partObj.unit_price || 0,
        unit: partObj.unit || 'Adet',
        stock_quantity: partObj.stock_quantity
      }]);
      setSelectedPartId('');
      setPartQty(1);
    }
  };

  const handleRemovePart = (id: number) => {
    setUsedParts(usedParts.filter(p => p.id !== id));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerForm.name || !customerForm.phone || !customerForm.address) {
      toast.error('Lütfen Müşteri Bilgilerini eksiksiz doldurun.');
      return;
    }
    if (!generatorForm.serial_number || !generatorForm.model) {
      toast.error('Lütfen Jeneratör Bilgilerini (Seri No ve Model) doldurun.');
      return;
    }

    let techSig = '';
    let custSig = '';

    if (techSigRef.current && !techSigRef.current.isEmpty()) {
      techSig = techSigRef.current.toDataURL();
    } else if (editingRecordId) {
      const existing = history.find(r => r.id === editingRecordId);
      techSig = existing?.technician_signature_url || '';
    } else {
      toast.error('Lütfen Teknisyen İmzasını atın.');
      return;
    }

    if (custSigRef.current && !custSigRef.current.isEmpty()) {
      custSig = custSigRef.current.toDataURL();
    } else if (editingRecordId) {
      const existing = history.find(r => r.id === editingRecordId);
      custSig = existing?.customer_signature_url || '';
    } else {
      toast.error('Lütfen Müşteri İmzasını atın.');
      return;
    }

    setSubmitting(true);

    // Get current technician user name
    const storedUser = localStorage.getItem('user');
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const techName = currentUser ? currentUser.name : 'Akan Enerji';

    const checklistItems = [...SOL_KONTROLLER, ...SAG_KONTROLLER];
    const fullChecklist: Record<string, 'ok' | 'comment' | 'na'> = {};
    checklistItems.forEach(item => {
      fullChecklist[item] = checklist[item] || 'ok';
    });

    const checklistSummary = checklistItems.map(item => {
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

    const fullDescription = `
HİZMET TÜRÜ: ${serviceType}

KONTROL LİSTESİ:
${checklistSummary}

PARAMETRELER & ÖLÇÜMLER:
${measurementsSummary}

İşçilik: ${serviceFee || '0'} TL

EK NOTLAR:
${description}
    `.trim();

    const endTimeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const postData = {
      customer: customerForm,
      generator: {
        ...generatorForm,
        address: generatorForm.location || customerForm.address,
        runtime_hours: measurements.runtime_hours
      },
      service: {
        service_date: new Date().toISOString().split('T')[0],
        description: fullDescription,
        technician_signature: techSig,
        customer_signature: custSig,
        next_maintenance_date: nextMaintenanceDate,
        service_fee: Number(serviceFee),
        used_parts: usedParts.map(p => ({ id: p.id, quantity: p.quantity })),
        checklist_json: JSON.stringify({
          checklist: fullChecklist,
          measurements,
          customer_authorized_name: customerAuthorizedName,
          technician_name: techName,
          used_parts: usedParts,
          start_time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          end_time: endTimeStr
        }),
        start_time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        end_time: endTimeStr
      }
    };

    try {
      let response;
      if (editingRecordId) {
        response = await api.put(`/quick-service/${editingRecordId}`, postData);
        toast.success('Servis kaydı başarıyla güncellendi!');
      } else {
        response = await api.post('/quick-service', postData);
        toast.success('Hızlı servis kaydı, müşteri ve jeneratör başarıyla oluşturuldu!');
      }
      
      const totalPartsCost = usedParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
      
      // Auto trigger PDF generation
      generateServicePDF({
        id: response.data.service_record_id,
        generator: {
          brand: generatorForm.brand,
          model: generatorForm.model,
          serial_number: generatorForm.serial_number,
          kva: generatorForm.kva,
          location: generatorForm.location || customerForm.address
        },
        customer: {
          name: customerForm.name,
          phone: customerForm.phone,
          address: customerForm.address
        },
        serial_number: generatorForm.serial_number,
        model: generatorForm.model,
        service_date: new Date().toLocaleDateString('tr-TR'),
        description: `Hizmet Türü: ${serviceType}\n\n${description}` || 'Servis ve Bakim Raporu',
        techSig: techSig,
        custSig: custSig,
        service_fee: Number(serviceFee),
        total_cost: totalPartsCost,
        used_parts: usedParts,
        checklist: fullChecklist,
        measurements: measurements,
        customer_authorized_name: customerAuthorizedName,
        technician_name: techName
      });

      // Reset form and reload
      setShowFormModal(false);
      resetForm();
      fetchHistory();
    } catch (err: any) {
      console.error('Quick service submission error:', err);
      const errorMsg = err.response?.data?.error || 'Servis kaydı oluşturulurken hata meydana geldi.';
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (record: ServiceRecord) => {
    setEditingRecordId(record.id);
    
    let parsedChecklist: any = {};
    if (record.checklist_json) {
      try {
        parsedChecklist = JSON.parse(record.checklist_json);
      } catch (e) {}
    }
    
    setCustomerForm({
      name: record.customer_name || '',
      phone: record.customer_phone || '',
      address: record.customer_address || '',
      customer_type: parsedChecklist.checklist?.customer_type || 'Tüzel Kişi',
      category: parsedChecklist.checklist?.category || 'Özel'
    });
    
    setGeneratorForm({
      brand: record.generator_brand || 'AKAN',
      model: record.generator_model || '',
      serial_number: record.generator_serial || '',
      kva: record.generator_kva || '',
      location: record.generator_location || '',
      installation_date: new Date().toISOString().split('T')[0],
      warranty_status: 'Yok',
      contract_status: 'Yok'
    });
    
    let servType = 'Genel Bakım';
    if (record.description?.includes('HİZMET TÜRÜ:')) {
      const match = record.description.match(/HİZMET TÜRÜ:\s*(.*)/);
      if (match && match[1]) {
        servType = match[1].split('\n')[0].trim();
      }
    }
    setServiceType(servType);
    
    let origDesc = record.description || '';
    if (record.description?.includes('EK NOTLAR:')) {
      const parts = record.description.split('EK NOTLAR:');
      origDesc = parts[parts.length - 1].trim();
    }
    setDescription(origDesc);
    
    setServiceFee(record.service_fee ? String(record.service_fee) : '');
    
    if (parsedChecklist.measurements) {
      setMeasurements(parsedChecklist.measurements);
    } else {
      setMeasurements({
        battery_group: '', battery_qty: '', charger_alternator: '', charger_device: '', grounding: '',
        coolant_temp: '', oil_pressure: '', frequency: '', voltage_u: '', current_u: '',
        voltage_v: '', current_v: '', voltage_w: '', current_w: '', fuel_level_text: '', runtime_hours: ''
      });
    }
    
    setCustomerAuthorizedName(parsedChecklist.customer_authorized_name || '');
    setUsedParts(parsedChecklist.used_parts || []);
    setChecklist(parsedChecklist.checklist || {});
    
    setShowFormModal(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (!window.confirm('Bu servis kaydını silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await api.delete(`/quick-service/${id}`);
      toast.success('Servis kaydı başarıyla silindi.');
      fetchHistory();
    } catch (err: any) {
      console.error('Failed to delete service record:', err);
      toast.error('Kayıt silinirken hata oluştu.');
    }
  };

  const resetForm = () => {
    setCustomerForm({ name: '', phone: '', address: '', customer_type: 'Tüzel Kişi', category: 'Özel' });
    setGeneratorForm({ brand: 'AKAN', model: '', serial_number: '', kva: '', location: '', installation_date: new Date().toISOString().split('T')[0], warranty_status: 'Yok', contract_status: 'Yok' });
    setServiceFee('');
    setServiceType('Genel Bakım');
    setDescription('');
    setMeasurements({
      battery_group: '', battery_qty: '', charger_alternator: '', charger_device: '', grounding: '',
      coolant_temp: '', oil_pressure: '', frequency: '', voltage_u: '', current_u: '',
      voltage_v: '', current_v: '', voltage_w: '', current_w: '', fuel_level_text: '', runtime_hours: ''
    });
    setCustomerAuthorizedName('');
    setUsedParts([]);
    techSigRef.current?.clear();
    custSigRef.current?.clear();
  };

  const downloadExistingPDF = async (record: ServiceRecord) => {
    let parsedChecklist: any = {};
    if (record.checklist_json) {
      try {
        parsedChecklist = JSON.parse(record.checklist_json);
      } catch (e) {}
    }

    const totalPartsCost = Array.isArray(parsedChecklist.used_parts) 
      ? parsedChecklist.used_parts.reduce((sum: number, p: any) => sum + (p.quantity * (p.unit_price || 0)), 0)
      : 0;

    generateServicePDF({
      id: record.id,
      generator: {
        brand: record.generator_brand || '',
        model: record.generator_model || '',
        serial_number: record.generator_serial || '',
        kva: record.generator_kva || '',
        location: record.generator_serial || ''
      },
      customer: {
        name: record.customer_name || '',
        phone: '',
        address: ''
      },
      serial_number: record.generator_serial || '',
      model: record.generator_model || '',
      service_date: new Date(record.service_date).toLocaleDateString('tr-TR'),
      description: record.description.split('EK NOTLAR:\n')[1] || record.description,
      techSig: record.technician_signature_url || '',
      custSig: record.customer_signature_url || '',
      service_fee: record.service_fee || 0,
      total_cost: totalPartsCost,
      used_parts: parsedChecklist.used_parts || [],
      checklist: parsedChecklist.checklist || {},
      measurements: parsedChecklist.measurements || {},
      customer_authorized_name: parsedChecklist.customer_authorized_name || '',
      technician_name: parsedChecklist.technician_name || 'Teknisyen'
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '26px', fontWeight: '800', margin: 0 }}>
            <ClipboardCheck size={28} style={{ color: 'var(--primary)' }} /> Tek Seferlik Hızlı Servis Paneli
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px', margin: '5px 0 0 0' }}>
            Tek seferlik müşteriler için anında müşteri, jeneratör ve servis raporunu tek ekrandan oluşturun.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRecordId(null);
            resetForm();
            setShowFormModal(true);
          }}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '800',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <Plus size={18} /> Yeni Servis Başlat
        </button>
      </div>

      {/* History Table Card */}
      <div className="card" style={{ borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} /> Son Yapılan Hızlı Servis Girişleri
        </h3>

        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '10px' }} />
            <p>Servis kayıt geçmişi yükleniyor...</p>
          </div>
        ) : history.length > 0 ? (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ color: 'var(--text-main)' }}>Form No</th>
                  <th style={{ color: 'var(--text-main)' }}>Tarih</th>
                  <th style={{ color: 'var(--text-main)' }}>Müşteri / Firma</th>
                  <th style={{ color: 'var(--text-main)' }}>Ekipman / Cihaz</th>
                  <th style={{ color: 'var(--text-main)' }}>Seri No</th>
                  <th style={{ color: 'var(--text-main)' }}>İşçilik Ücreti</th>
                  <th style={{ color: 'var(--text-main)', textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>#016{record.id}</td>
                    <td style={{ color: 'var(--text-main)' }}>
                      {new Date(record.service_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{record.customer_name}</td>
                    <td style={{ color: 'var(--text-main)' }}>
                      <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', marginRight: '6px' }}>
                        {record.generator_brand}
                      </span>
                      {record.generator_model} {record.generator_kva ? `- ${record.generator_kva} kVA` : ''}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {record.generator_serial}
                    </td>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                      {(record.service_fee || 0).toLocaleString('tr-TR')} TL
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => downloadExistingPDF(record)}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          borderRadius: '6px',
                          color: 'var(--primary)',
                          marginRight: '6px'
                        }}
                      >
                        <Download size={12} /> PDF
                      </button>
                      <button
                        onClick={() => handleEditClick(record)}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          borderRadius: '6px',
                          color: 'var(--info)',
                          marginRight: '6px'
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteClick(record.id)}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          borderRadius: '6px',
                          color: 'var(--danger)'
                        }}
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
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Henüz hızlı servis girişi yapılmadı. Sağ üstteki "Yeni Servis Başlat" butonuna tıklayarak ilk girişinizi yapın.
          </div>
        )}
      </div>

      {/* Unified Quick Service Form Modal */}
      {showFormModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)',
            background: 'var(--bg-card-solid)',
            padding: '30px',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={22} style={{ color: 'var(--primary)' }} /> Tek Seferlik Hızlı Servis Formu
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: '4px 0 0 0' }}>
                  Müşteri, jeneratör ve servis verilerini girerek anında rapor üretin.
                </p>
              </div>
              <button 
                onClick={() => setShowFormModal(false)}
                style={{ background: 'var(--bg-hover)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <X size={20} style={{ margin: 'auto' }} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* SECTION 1: CUSTOMER & GENERATOR BASIC INFO */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '30px' }}>
                  
                  {/* Left Column: Customer Details */}
                  <div style={{ background: 'rgba(229, 169, 0, 0.03)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginBottom: '15px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                      1. Müşteri / Firma Bilgileri
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Firma / Müşteri Adı *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Örn: Akan Enerji Ltd. Şti." 
                          value={customerForm.name} 
                          onChange={e => setCustomerForm({...customerForm, name: e.target.value})} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Telefon Numarası *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Örn: 05551234567" 
                          value={customerForm.phone} 
                          onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Müşteri Adresi *</label>
                        <textarea 
                          rows={3} 
                          required 
                          placeholder="Açık adres yazınız..." 
                          value={customerForm.address} 
                          onChange={e => setCustomerForm({...customerForm, address: e.target.value})}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '13px' }}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Generator Details */}
                  <div style={{ background: 'rgba(229, 169, 0, 0.03)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginBottom: '15px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                      2. Cihaz / Jeneratör Bilgileri
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Marka *</label>
                        <input 
                          type="text" 
                          required 
                          value={generatorForm.brand} 
                          onChange={e => setGeneratorForm({...generatorForm, brand: e.target.value})} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Model *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Örn: AK-150" 
                          value={generatorForm.model} 
                          onChange={e => setGeneratorForm({...generatorForm, model: e.target.value})} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Seri Numarası *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Örn: AKN-998822" 
                          value={generatorForm.serial_number} 
                          onChange={e => setGeneratorForm({...generatorForm, serial_number: e.target.value})} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Güç (kVA)</label>
                        <input 
                          type="text" 
                          placeholder="Örn: 150 kVA" 
                          value={generatorForm.kva} 
                          onChange={e => setGeneratorForm({...generatorForm, kva: e.target.value})} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Jeneratör Konumu (Lokasyon)</label>
                        <input 
                          type="text" 
                          placeholder="Örn: Çatı Katı, Bodrum vb. (Boş ise firma adresi alınır)" 
                          value={generatorForm.location} 
                          onChange={e => setGeneratorForm({...generatorForm, location: e.target.value})} 
                        />
                      </div>
                      
                      <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Uygulanan Hizmet Türü *</label>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          {['Genel Bakım', 'Periyodik Kontrol', 'Servis Hizmeti'].map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                              <input 
                                type="radio" 
                                name="service_type" 
                                value={type} 
                                checked={serviceType === type} 
                                onChange={() => setServiceType(type)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* SECTION 2: GENERAL AND ENGINE CONTROLLER CHECKLIST */}
                <div style={{ background: 'rgba(229, 169, 0, 0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginBottom: '15px' }}>
                    3. Genel Kontroller & Motor Kumanda Kontrolleri
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
                    <div>
                      <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: 'bold' }}>Genel Kontroller</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {SOL_KONTROLLER.map(item => renderChecklistItem(item))}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: 'bold' }}>Motor & Kumanda</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {SAG_KONTROLLER.map(item => renderChecklistItem(item))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: MEASUREMENTS (ÖLÇÜMLER) */}
                <div style={{ background: 'var(--bg-hover)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginBottom: '15px' }}>
                    4. Teknik Ölçümler & Parametreler
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Jeneratör Çalışma Saati *</label>
                      <input type="text" required placeholder="Örn: 1250 Saat" value={measurements.runtime_hours} onChange={e => setMeasurements({...measurements, runtime_hours: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Akü Grubu (Voltaj)</label>
                      <input type="text" placeholder="Örn: 12V / 24V" value={measurements.battery_group} onChange={e => setMeasurements({...measurements, battery_group: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Akü Adedi</label>
                      <input type="text" placeholder="Örn: 1 Adet" value={measurements.battery_qty} onChange={e => setMeasurements({...measurements, battery_qty: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Şarj Alternatörü (Vdc)</label>
                      <input type="text" placeholder="Örn: 13.8 Vdc" value={measurements.charger_alternator} onChange={e => setMeasurements({...measurements, charger_alternator: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Şarj Cihazı (Vdc)</label>
                      <input type="text" placeholder="Örn: 27.6 Vdc" value={measurements.charger_device} onChange={e => setMeasurements({...measurements, charger_device: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Topraklama Ölçümü</label>
                      <input type="text" placeholder="Örn: 0.8 Ohm" value={measurements.grounding} onChange={e => setMeasurements({...measurements, grounding: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Motor Hararet Sıcaklığı (°C)</label>
                      <input type="text" placeholder="Örn: 75" value={measurements.coolant_temp} onChange={e => setMeasurements({...measurements, coolant_temp: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Motor Yağ Basıncı (BAR)</label>
                      <input type="text" placeholder="Örn: 4.5" value={measurements.oil_pressure} onChange={e => setMeasurements({...measurements, oil_pressure: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Frekans (Hz)</label>
                      <input type="text" placeholder="Örn: 50" value={measurements.frequency} onChange={e => setMeasurements({...measurements, frequency: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px' }}>Yakıt Seviyesi</label>
                      <input type="text" placeholder="Örn: %80" value={measurements.fuel_level_text} onChange={e => setMeasurements({...measurements, fuel_level_text: e.target.value})} />
                    </div>
                  </div>

                  {/* Faz Ölçümleri Block */}
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px', color: 'var(--primary)' }}>Gerilim & Akım (Faz Ölçümleri)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-input)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '11.5px', color: 'var(--primary)' }}>U Fazı</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" style={{ padding: '6px', fontSize: '12px' }} placeholder="Volt" value={measurements.voltage_u} onChange={e => setMeasurements({...measurements, voltage_u: e.target.value})} />
                        <input type="text" style={{ padding: '6px', fontSize: '12px' }} placeholder="Amper" value={measurements.current_u} onChange={e => setMeasurements({...measurements, current_u: e.target.value})} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-input)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '11.5px', color: 'var(--primary)' }}>V Fazı</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" style={{ padding: '6px', fontSize: '12px' }} placeholder="Volt" value={measurements.voltage_v} onChange={e => setMeasurements({...measurements, voltage_v: e.target.value})} />
                        <input type="text" style={{ padding: '6px', fontSize: '12px' }} placeholder="Amper" value={measurements.current_v} onChange={e => setMeasurements({...measurements, current_v: e.target.value})} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-input)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '11.5px', color: 'var(--primary)' }}>W Fazı</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" style={{ padding: '6px', fontSize: '12px' }} placeholder="Volt" value={measurements.voltage_w} onChange={e => setMeasurements({...measurements, voltage_w: e.target.value})} />
                        <input type="text" style={{ padding: '6px', fontSize: '12px' }} placeholder="Amper" value={measurements.current_w} onChange={e => setMeasurements({...measurements, current_w: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: SPARE PARTS (YEDEK PARÇALAR) */}
                <div style={{ background: 'rgba(229, 169, 0, 0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginBottom: '15px' }}>
                    5. Kullanılan Yedek Parçalar
                  </h3>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }} className="form-group">
                      <label style={{ fontSize: '12px' }}>Parça Seçin</label>
                      <select
                        value={selectedPartId}
                        onChange={e => setSelectedPartId(e.target.value)}
                        style={{ height: '42px', padding: '8px', fontSize: '13px' }}
                      >
                        <option value="">-- Parça Seçiniz --</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.part_number}) - Stok: {p.stock_quantity} {p.unit} - Fiyat: {p.unit_price} TL
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ width: '100px' }} className="form-group">
                      <label style={{ fontSize: '12px' }}>Adet</label>
                      <input
                        type="number"
                        min={1}
                        value={partQty}
                        onChange={e => setPartQty(parseInt(e.target.value) || 1)}
                        style={{ height: '42px', padding: '8px' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddPart}
                      style={{ height: '42px', padding: '0 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Plus size={16} /> Ekle
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
                              <td style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{p.quantity} {p.unit}</td>
                              <td style={{ color: 'var(--text-main)' }}>{p.unit_price} TL</td>
                              <td style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{(p.quantity * p.unit_price).toLocaleString('tr-TR')} TL</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => handleRemovePart(p.id)}
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
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                      Henüz kullanılan parça eklenmedi.
                    </div>
                  )}
                </div>

                {/* SECTION 4: SERVICE DETAILS & NOTATION */}
                <div style={{ background: 'var(--bg-hover)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)', marginBottom: '15px' }}>
                    6. Servis Ücreti, Notlar & İmzalar
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>İşçilik Ücreti (TL)</label>
                      <input 
                        type="number" 
                        min={0} 
                        value={serviceFee} 
                        onChange={e => setServiceFee(e.target.value)} 
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Müşteri Yetkilisi (İsim Soyisim)</label>
                      <input 
                        type="text" 
                        placeholder="Örn: Ahmet Yılmaz" 
                        value={customerAuthorizedName} 
                        onChange={e => setCustomerAuthorizedName(e.target.value)} 
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Yapılan İşlemler / Açıklama</label>
                      <textarea 
                        rows={4} 
                        placeholder="Radyatör suyu kontrol edildi, yağ değişimi yapıldı vb..." 
                        value={description} 
                        onChange={e => setDescription(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '13px' }}
                      ></textarea>
                    </div>

                  </div>

                  {/* SIGNATURE PANELS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '25px' }}>
                    
                    {/* Tech Signature */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>Teknisyen İmzası *</span>
                      <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                        <SignatureCanvas
                          ref={techSigRef}
                          canvasProps={{ width: 440, height: 180, className: 'sigCanvas' }}
                          penColor='#1e293b'
                        />
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => techSigRef.current?.clear()}
                        style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '12px' }}
                      >
                        Temizle
                      </button>
                    </div>

                    {/* Customer Signature */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>Müşteri / Yetkili İmzası *</span>
                      <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                        <SignatureCanvas
                          ref={custSigRef}
                          canvasProps={{ width: 440, height: 180, className: 'sigCanvas' }}
                          penColor='#1e293b'
                        />
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => custSigRef.current?.clear()}
                        style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '12px' }}
                      >
                        Temizle
                      </button>
                    </div>

                  </div>
                </div>

                {/* MODAL FOOTER ACTION BUTTONS */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowFormModal(false)}
                    style={{ padding: '12px 24px', borderRadius: '10px' }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 30px',
                      fontWeight: '800',
                      borderRadius: '10px',
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="spin" /> Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Check size={18} /> Raporu Kaydet ve PDF Üret
                      </>
                    )}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuickService;
