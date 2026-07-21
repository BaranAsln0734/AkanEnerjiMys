import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { 
  Zap, 
  FileText, 
  AlertCircle, 
  Plus, 
  Calendar, 
  Clock, 
  Compass, 
  CheckCircle, 
  X, 
  Loader2,
  Download,
  ShieldCheck,
  History,
  Wrench,
  DollarSign,
  Receipt
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateQuotePDF, generateServicePDF, generateServiceThermalPDF } from '../utils/pdfGenerator';

interface Generator {
  id: number;
  serial_number: string;
  brand: string;
  model: string;
  location: string;
  next_maintenance_date: string;
  contract_status: string;
  warranty_status: string;
}

interface Contract {
  id: number;
  start_date: string;
  end_date: string;
  contract_type: string;
  status: string;
  price: number;
  notes?: string;
}

interface Fault {
  id: number;
  generator_id: number;
  serial_number: string;
  fault_date: string;
  status: string;
  notes: string;
}

interface Quote {
  id: number;
  quote_number: string;
  customer_id: number;
  customer_name: string;
  quote_date: string;
  valid_until: string;
  quote_type: string;
  status: string;
  grand_total: number;
}

interface ServiceRecord {
  id: number;
  generator_id: number;
  service_date: string;
  description: string;
  total_cost: number;
  serial_number: string;
  brand: string;
  model: string;
}

const CustomerPortal = () => {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<number | null>(null);
  
  // Arıza Bildirim Formu State'i
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [selectedGeneratorId, setSelectedGeneratorId] = useState('');
  const [faultNotes, setFaultNotes] = useState('');

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const [genRes, conRes, faultRes, quoteRes, srRes, apptRes] = await Promise.all([
        api.get('/generators'),
        api.get('/contracts'),
        api.get('/generator-faults'),
        api.get('/quotes'),
        api.get('/service-records'),
        api.get('/appointments')
      ]);
      setGenerators(genRes.data);
      setContracts(conRes.data);
      setFaults(faultRes.data);
      setQuotes(quoteRes.data);
      setServiceRecords(srRes.data);
      setAppointments(apptRes.data);
    } catch (err) {
      console.error('Error fetching customer data:', err);
      toast.error('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGeneratorId || !faultNotes.trim()) {
      toast.error('Lütfen ekipman seçin ve arıza açıklamasını yazın.');
      return;
    }

    try {
      await api.post('/generator-faults', {
        generator_id: Number(selectedGeneratorId),
        fault_code_id: null,
        fault_date: new Date().toISOString().split('T')[0],
        status: 'Açık',
        notes: faultNotes
      });

      toast.success('Arıza kaydı başarıyla oluşturuldu, ekiplerimiz bilgilendirildi.');
      setFaultNotes('');
      setSelectedGeneratorId('');
      setShowFaultModal(false);
      
      // Yenile
      fetchCustomerData();
    } catch (err) {
      console.error('Error reporting fault:', err);
      toast.error('Arıza kaydı gönderilemedi.');
    }
  };

  const handleDownloadQuote = async (quoteId: number) => {
    try {
      setDownloadingQuoteId(quoteId);
      const response = await api.get(`/quotes/${quoteId}`);
      await generateQuotePDF(response.data);
      toast.success('Teklif PDF başarıyla indirildi.');
    } catch (err) {
      console.error('Error downloading quote PDF:', err);
      toast.error('PDF indirilirken bir hata oluştu.');
    } finally {
      setDownloadingQuoteId(null);
    }
  };

  const handleUpdateQuoteStatus = async (quoteId: number, status: 'Onaylandı' | 'Reddedildi') => {
    const confirmMessage = status === 'Onaylandı' 
      ? 'Bu teklifi onaylamak istediğinize emin misiniz?' 
      : 'Bu teklifi reddetmek istediğinize emin misiniz?';
    if (!window.confirm(confirmMessage)) return;

    try {
      await api.put(`/quotes/${quoteId}/status`, { status });
      toast.success(status === 'Onaylandı' ? 'Teklif başarıyla onaylandı.' : 'Teklif reddedildi.');
      fetchCustomerData();
    } catch (err) {
      console.error('Error updating quote status:', err);
      toast.error('İşlem gerçekleştirilemedi.');
    }
  };

  const handleDownloadServicePDF = async (record: any, type: 'a4' | 'thermal' = 'a4') => {
    try {
      const response = await api.get(`/generators/${record.generator_id}`);
      const genData = response.data;
      
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
        generator: genData,
        customer: genData.customer,
        serial_number: genData.serial_number,
        model: genData.model,
        service_date: record.service_date,
        description: record.description,
        techSig: record.technician_signature_url,
        custSig: record.customer_signature_url,
        service_fee: record.service_fee,
        total_cost: record.total_cost,
        used_parts: usedPartsList,
        checklist: checklistObj,
        measurements: measurementsObj,
        customer_authorized_name: customerAuthName,
        tech_name: techNameStr,
        photo_before_url: record.photo_before_url,
        photo_after_url: record.photo_after_url
      };

      if (type === 'thermal') {
        await generateServiceThermalPDF(docData);
      } else {
        await generateServicePDF(docData);
      }
      
      toast.success('Servis raporu başarıyla indirildi.');
    } catch (err) {
      console.error('Error downloading service PDF:', err);
      toast.error('Rapor indirilirken bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
      </div>
    );
  }

  const activeContracts = contracts.filter(c => c.status === 'Aktif');
  const openFaults = faults.filter(f => f.status === 'Açık');
  const primaryContract = activeContracts[0]; // Primary active contract

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Üst Karşılama Alanı */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Müşteri Portalı</h2>
          <p style={{ color: '#64748b' }}>Kayıtlı ekipmanlarınızın durumunu izleyin ve yeni servis talepleri oluşturun.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowFaultModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
        >
          <AlertCircle size={18} /> Yeni Arıza Bildir
        </button>
      </div>

      {/* Aktif Saha Görevleri & Canlı Takip */}
      {appointments.filter(a => a.status !== 'Tamamlandı' && a.status !== 'İptal').length > 0 && (
        <div className="card" style={{ borderLeft: '6px solid var(--primary)', marginBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={20} className="animate-spin" color="var(--primary)" style={{ animationDuration: '6s' }} /> Güncel Bakım / Servis Randevuları & Ekip Durumu
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {appointments.filter(a => a.status !== 'Tamamlandı' && a.status !== 'İptal').map(appt => {
              const apptDate = new Date(appt.appointment_date);
              
              let statusText = 'Planlandı / Bekliyor';
              let statusColor = '#ef4444'; // Red
              let statusBg = 'rgba(239, 68, 68, 0.1)';
              
              if (appt.status === 'Yolda') {
                statusText = 'Ekip Yolda 🚚';
                statusColor = '#f59e0b'; // Amber
                statusBg = 'rgba(245, 158, 11, 0.1)';
              } else if (appt.status === 'İşlem Başladı') {
                statusText = 'Bakım Sürüyor 🛠️';
                statusColor = '#10b981'; // Green
                statusBg = 'rgba(16, 185, 129, 0.1)';
              }

              const matchingGen = generators.find(g => g.serial_number === appt.serial_number);

              return (
                <div key={appt.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: 'var(--bg-input)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
                      📅 {apptDate.toLocaleDateString('tr-TR')}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '20px', color: statusColor, background: statusBg }}>
                      {statusText}
                    </span>
                  </div>
                  
                  <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>
                    {matchingGen ? `${matchingGen.brand} ${matchingGen.model}` : 'Ekipman'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '10px' }}>
                    Seri No: {appt.serial_number}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>ATANAN SAHA EKİBİ:</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                      👤 {appt.technician_name} {appt.assistant_name ? `+ ${appt.assistant_name}` : ''}
                    </div>
                    {appt.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', background: 'rgba(148, 163, 184, 0.05)', padding: '6px 10px', borderRadius: '6px' }}>
                        &ldquo;{appt.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aktif Sözleşme Özet Kartı */}
      <div className="card" style={{
        background: primaryContract 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))' 
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03))',
        borderLeft: `6px solid ${primaryContract ? '#10b981' : '#ef4444'}`,
        padding: '24px',
        marginBottom: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={26} color={primaryContract ? '#10b981' : '#ef4444'} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: primaryContract ? '#065f46' : '#991b1b' }}>
            {primaryContract ? 'Aktif Bakım Anlaşmanız Bulunmaktadır' : 'Aktif Bakım Sözleşmeniz Bulunmamaktadır'}
          </h3>
        </div>
        {primaryContract ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '8px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Anlaşma Türü</span>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>{primaryContract.contract_type} Bakım Anlaşması</strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Başlangıç / Bitiş Tarihi</span>
              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                {new Date(primaryContract.start_date).toLocaleDateString('tr-TR')} - {new Date(primaryContract.end_date).toLocaleDateString('tr-TR')}
              </strong>
            </div>
            {primaryContract.notes && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Notlar</span>
                <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0', fontStyle: 'italic' }}>{primaryContract.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#7f1d1d' }}>
            Jeneratörlerinizin kesintisiz ve güvenli çalışması için periyodik bakım anlaşması yapmanızı öneririz. Teklif almak için lütfen bizimle iletişime geçin.
          </p>
        )}
      </div>

      {/* İstatistik Kartları */}
      <div className="stats-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{generators.length}</div>
            <div className="stat-label">Toplam Jeneratör</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{activeContracts.length}</div>
            <div className="stat-label">Aktif Sözleşme</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{quotes.length}</div>
            <div className="stat-label">Toplam Teklif</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{openFaults.length}</div>
            <div className="stat-label">Bekleyen Arıza</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '30px', marginBottom: '30px' }}>
        
        {/* Jeneratör Listesi */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '800' }}>Ekipmanlarınız</h3>
          {generators.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Zap size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p>Sisteme kayıtlı jeneratörünüz bulunmuyor.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Marka / Model</th>
                    <th>Seri No</th>
                    <th>Lokasyon</th>
                    <th>Sözleşme</th>
                    <th>Sonraki Bakım</th>
                  </tr>
                </thead>
                <tbody>
                  {generators.map(gen => (
                    <tr key={gen.id}>
                      <td>
                        <strong>{gen.brand || 'Bilinmeyen'}</strong>
                        {gen.model ? ` / ${gen.model}` : ''}
                      </td>
                      <td><code style={{ fontWeight: 'bold' }}>{gen.serial_number}</code></td>
                      <td><span style={{ fontSize: '13px', color: '#64748b' }}>📍 {gen.location || 'Belirtilmemiş'}</span></td>
                      <td>
                        {gen.contract_status === 'Var' ? (
                          <span className="status-badge status-green">ETKİN</span>
                        ) : (
                          <span className="status-badge status-red">YOK</span>
                        )}
                      </td>
                      <td>
                        {gen.next_maintenance_date ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600' }}>
                            <Calendar size={14} color="#94a3b8" /> {new Date(gen.next_maintenance_date).toLocaleDateString('tr-TR')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Teklifler Bölümü */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--primary)" /> Güncel Teklifleriniz
          </h3>
          {quotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <FileText size={40} style={{ opacity: 0.2, marginBottom: '10px', alignSelf: 'center' }} />
              <p>Adınıza düzenlenmiş bir teklif bulunmamaktadır.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {quotes.map(q => (
                <div key={q.id} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{q.quote_number}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tarih: {new Date(q.quote_date).toLocaleDateString('tr-TR')}</div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--primary)', marginTop: '8px' }}>
                      {q.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span className={`status-badge ${
                      q.status === 'Onaylandı' ? 'status-green' : q.status === 'Reddedildi' ? 'status-red' : 'status-yellow'
                    }`} style={{ fontSize: '10px' }}>
                      {q.status}
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {q.status === 'Gönderildi' && (
                        <>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleUpdateQuoteStatus(q.id, 'Onaylandı')}
                            style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--success)', borderColor: 'var(--success)', fontWeight: 'bold' }}
                          >
                            Onayla
                          </button>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleUpdateQuoteStatus(q.id, 'Reddedildi')}
                            style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)', fontWeight: 'bold' }}
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDownloadQuote(q.id)}
                        disabled={downloadingQuoteId === q.id}
                        style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {downloadingQuoteId === q.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        PDF İndir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '30px' }}>
        
        {/* Servis Geçmişi Bölümü */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="#10b981" /> Servis Geçmişi
          </h3>
          {serviceRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <History size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p>Tamamlanan servis kaydınız bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Ekipman</th>
                    <th>Yapılan İşlem</th>
                    <th>Ücret</th>
                    <th style={{ textAlign: 'right' }}>Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRecords.slice(0, 8).map(sr => (
                    <tr key={sr.id}>
                      <td style={{ fontSize: '13px', fontWeight: '600' }}>
                        {new Date(sr.service_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{sr.brand} {sr.model}</div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{sr.serial_number}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sr.description}>
                        {sr.description}
                      </td>
                      <td style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>
                        {(sr.total_cost || 0).toLocaleString('tr-TR')} TL
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleDownloadServicePDF(sr, 'a4')}
                            style={{ padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="A4 PDF Raporu İndir"
                          >
                            <FileText size={10} /> A4 Raporu
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleDownloadServicePDF(sr, 'thermal')}
                            style={{ padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                            title="80mm Termal Fiş İndir"
                          >
                            <Receipt size={10} /> Termal Fiş
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Son Arıza Talepleri */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={20} color="#f59e0b" /> Son Arıza Talepleri
          </h3>
          {faults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Wrench size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p>Aktif veya geçmiş bir arıza kaydınız bulunmuyor.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {faults.slice(0, 5).map(f => (
                <div key={f.id} style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  background: f.status === 'Açık' ? 'rgba(245, 158, 11, 0.03)' : 'rgba(16, 185, 129, 0.03)',
                  borderLeft: `5px solid ${f.status === 'Açık' ? '#f59e0b' : '#10b981'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>Seri No: {f.serial_number}</span>
                    <span className={`status-badge ${f.status === 'Açık' ? 'status-yellow' : 'status-green'}`} style={{ fontSize: '10px' }}>
                      {f.status === 'Açık' ? 'BEKLİYOR' : 'ÇÖZÜLDÜ'}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '8px 0' }}>{f.notes}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                    <Clock size={12} /> {new Date(f.fault_date).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Arıza Bildirim Modalı */}
      {showFaultModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(15, 23, 42, 0.6)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px', padding: '24px', animation: 'scaleUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle color="#ef4444" size={22} /> Arıza Talebi Bildir
              </h3>
              <button onClick={() => setShowFaultModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFaultSubmit}>
              <div className="form-group">
                <label>Arızalı Ekipman / Jeneratör Seçin</label>
                <select 
                  required 
                  value={selectedGeneratorId} 
                  onChange={e => setSelectedGeneratorId(e.target.value)}
                >
                  <option value="">Ekipman seçiniz...</option>
                  {generators.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.brand} {g.model} ({g.serial_number}) - Lokasyon: {g.location || 'Yok'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Arıza Açıklaması / Belirtiler</label>
                <textarea 
                  required 
                  rows={4} 
                  value={faultNotes} 
                  onChange={e => setFaultNotes(e.target.value)}
                  placeholder="Cihazın ekranındaki hata kodunu veya arıza detaylarını buraya yazabilirsiniz..."
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical' }}
                ></textarea>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFaultModal(false)}>Vazgeç</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle size={16} /> Talebi Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
