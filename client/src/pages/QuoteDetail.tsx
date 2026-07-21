import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, User, Phone, MapPin, Mail, FileText, Download, Loader2, Check, X, AlertCircle, ClipboardCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuoteItem {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  vat_percent: number;
  total_price: number;
}

interface QuoteDetailData {
  id: number;
  quote_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_tax_id: string;
  customer_tax_office: string;
  quote_date: string;
  valid_until: string;
  quote_type: string;
  status: string;
  subtotal: number;
  discount: number;
  vat: number;
  grand_total: number;
  notes: string;
  items: QuoteItem[];
}

const fixTurkishChars = (text: string | undefined | null): string => {
  if (!text) return '';
  const charMap: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C'
  };
  return text.split('').map(char => charMap[char] || char).join('');
};

const loadLogo = (): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/logo-2025.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
        return;
      }
      resolve('');
    };
    img.onerror = () => resolve('');
  });
};

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contract_type: 'Yıllık' as 'Yıllık' | '6 Aylık' | 'Özel',
    contract_period: '1 Ay' as '1 Ay' | '2 Ay' | '3 Ay' | '4 Ay' | '6 Ay' | '',
    general_maintenance_month: 'Ocak',
    maintenance_year: new Date().getFullYear(),
    status: 'Aktif' as 'Aktif' | 'Süresi Doldu' | 'İptal',
  });

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/quotes/${id}`);
      setQuote(response.data);
    } catch (error) {
      console.error('Error fetching quote detail:', error);
      toast.error('Teklif yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return;
    try {
      await api.put(`/quotes/${quote.id}/status`, { status: newStatus });
      toast.success(`Teklif durumu ${newStatus} olarak güncellendi.`);
      fetchDetail();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu.');
    }
  };

  const handleApprove = async () => {
    if (!quote) return;
    // First update the status to Approved
    try {
      await api.put(`/quotes/${quote.id}/status`, { status: 'Onaylandı' });
      toast.success('Teklif onayandı.');
      fetchDetail();
      // Open the contract creation modal
      setShowContractModal(true);
    } catch (error) {
      console.error('Error approving quote:', error);
      toast.error('Onaylama sırasında hata oluştu.');
    }
  };

  const handleCreateContract = async () => {
    if (!quote) return;
    try {
      await api.post('/contracts', {
        customer_id: quote.customer_id,
        start_date: contractForm.start_date,
        end_date: contractForm.end_date,
        contract_type: contractForm.contract_type,
        contract_period: contractForm.contract_period,
        general_maintenance_month: contractForm.general_maintenance_month,
        maintenance_year: contractForm.maintenance_year,
        price: quote.grand_total,
        status: contractForm.status,
        notes: `Teklif No: ${quote.quote_number} \u00fczerinden oluşturuldu.\n\n${quote.notes || ''}`,
        maintenance_months: ''
      });
      toast.success('Sözleşme başarıyla oluşturuldu!');
      setShowContractModal(false);
      navigate('/contracts');
    } catch (error: any) {
      console.error('Error creating contract:', error);
      const msg = error?.response?.data?.error || 'Sözleşme oluşturulurken hata oluştu.';
      toast.error(msg);
    }
  };

  const [sendingEmail, setSendingEmail] = useState(false);

  const buildPDFDoc = async (): Promise<jsPDF | null> => {
    if (!quote) return null;
    try {
      const doc = new jsPDF();
      
      // Load and add logo
      let logoBase64 = '';
      try {
        logoBase64 = await loadLogo();
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 14, 10, 50, 15);
        }
      } catch (err) {
        console.warn('Logo load failed:', err);
      }

      // Title & Quote Metadata
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235); // CVS Power Blue
      doc.text('TEKLIF MEKTUBU', 196, 20, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Teklif No: ${quote.quote_number}`, 196, 27, { align: 'right' });
      doc.text(`Tarih: ${quote.quote_date}`, 196, 32, { align: 'right' });
      doc.text(`Gecerlilik: ${quote.valid_until || '-'}`, 196, 37, { align: 'right' });

      // Horizontal line separator
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 42, 196, 42);

      // Company info & Client info columns
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('TEKLIF VEREN', 14, 49);
      
      doc.setFont('Helvetica', 'normal');
      doc.text('CVS POWER Jenerator Ltd. Sti.', 14, 54);
      doc.text('Adres: Ikitelli OSB, Basaksehir / Istanbul', 14, 59);
      doc.text('Tel: 0530 960 84 39', 14, 64);
      doc.text('E-posta: info@cvspower.com', 14, 69);

      doc.setFont('Helvetica', 'bold');
      doc.text('TEKLIF SUNULAN MUSTERI', 110, 49);
      
      doc.setFont('Helvetica', 'normal');
      doc.text(fixTurkishChars(quote.customer_name), 110, 54, { maxWidth: 86 });
      doc.text(`Adres: ${fixTurkishChars(quote.customer_address || '-')}`, 110, 59, { maxWidth: 86 });
      doc.text(`Tel: ${quote.customer_phone || '-'}`, 110, 69);
      doc.text(`E-posta: ${quote.customer_email || '-'}`, 110, 74);
      
      if (quote.customer_tax_id) {
        doc.text(`VD / VKN: ${fixTurkishChars(quote.customer_tax_office || '-')} / ${quote.customer_tax_id}`, 110, 79);
      }

      // AutoTable
      const tableHeaders = [['No', 'Aciklama', 'Miktar', 'Birim', 'Birim Fiyat', 'Indirim', 'KDV', 'Toplam']];
      const tableRows = quote.items.map((item, index) => [
        (index + 1).toString(),
        fixTurkishChars(item.description),
        item.quantity.toString(),
        fixTurkishChars(item.unit),
        `${item.unit_price.toLocaleString('tr-TR')} TL`,
        item.discount_percent > 0 ? `%${item.discount_percent}` : '-',
        `%${item.vat_percent}`,
        `${item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
      ]);

      autoTable(doc, {
        startY: 88,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 27, halign: 'right' }
        }
      });

      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      doc.text('Ara Toplam:', 130, finalY);
      doc.text(`${quote.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, finalY, { align: 'right' });
      
      let currentY = finalY;
      if (quote.discount > 0) {
        currentY += 5;
        doc.text('Toplam Indirim (-):', 130, currentY);
        doc.text(`-${quote.discount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, currentY, { align: 'right' });
      }
      
      currentY += 5;
      doc.text('Toplam KDV:', 130, currentY);
      doc.text(`${quote.vat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, currentY, { align: 'right' });
      
      currentY += 7;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text('GENEL TOPLAM:', 130, currentY);
      doc.text(`${quote.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, currentY, { align: 'right' });

      // Notes
      if (quote.notes) {
        currentY += 15;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('TEKLIF SARTLARI & NOTLAR', 14, currentY);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const splitNotes = doc.splitTextToSize(fixTurkishChars(quote.notes), 180);
        doc.text(splitNotes, 14, currentY + 6);
      }

      return doc;
    } catch (error) {
      console.error('Error generating PDF doc:', error);
      return null;
    }
  };

  const generatePDF = async () => {
    if (!quote) return;
    const doc = await buildPDFDoc();
    if (doc) {
      doc.save(`Teklif_${quote.quote_number}.pdf`);
      toast.success('PDF indirme işlemi başarılı.');
    } else {
      toast.error('PDF oluşturulurken hata oluştu.');
    }
  };

  const handleSendEmail = async () => {
    if (!quote) return;

    let targetEmail = quote.customer_email;
    if (!targetEmail || !targetEmail.trim()) {
      const inputEmail = window.prompt('Müşteri e-posta adresi bulunamadı. Lütfen gönderilecek alıcı e-posta adresini giriniz:', '');
      if (!inputEmail) return;
      targetEmail = inputEmail.trim();
    }

    try {
      setSendingEmail(true);
      toast.loading('PDF oluşturuluyor ve e-posta gönderiliyor...', { id: 'send-email' });

      const doc = await buildPDFDoc();
      if (!doc) {
        toast.error('PDF oluşturulamadı.', { id: 'send-email' });
        setSendingEmail(false);
        return;
      }

      const pdfBase64 = doc.output('datauristring');

      const response = await api.post(`/quotes/${quote.id}/send-email`, {
        pdfBase64,
        recipientEmail: targetEmail
      });

      toast.success(response.data.message || `Teklif PDF'i ${targetEmail} adresine e-posta ile gönderildi.`, { id: 'send-email' });
      fetchDetail();
    } catch (error: any) {
      console.error('Error sending quote email:', error);
      const msg = error.response?.data?.error || 'E-posta gönderilirken bir hata oluştu.';
      toast.error(msg, { id: 'send-email' });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  if (!quote) return <div className="card">Teklif bulunamadı.</div>;

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Onaylandı': return 'status-green';
      case 'Reddedildi': return 'status-red';
      case 'Gönderildi': return 'status-badge';
      default: return 'status-badge';
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Geri Dön
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={generatePDF}>
            <Download size={16} /> PDF İndir
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleSendEmail} 
            disabled={sendingEmail}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {sendingEmail ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
            {sendingEmail ? 'Gönderiliyor...' : 'Mail Olarak Gönder'}
          </button>
          {quote.status === 'Onaylandı' && (
            <button className="btn btn-primary" onClick={() => setShowContractModal(true)} style={{ background: '#8b5cf6' }}>
              <ClipboardCheck size={16} /> Sözleşme Oluştur
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '30px' }}>
        
        {/* Left Column: Summary Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card" style={{ borderTop: '6px solid var(--primary)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Teklif Bilgileri</span>
              <span className={`status-badge ${getStatusClass(quote.status)}`}>{quote.status}</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '14px' }}>
              <div>Teklif Numarası: <strong>{quote.quote_number}</strong></div>
              <div>Teklif Türü: <strong>{quote.quote_type}</strong></div>
              <div>Teklif Tarihi: <strong>{quote.quote_date}</strong></div>
              <div>Geçerlilik Tarihi: <strong>{quote.valid_until || '-'}</strong></div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={18} color="var(--primary)" /> Müşteri Bilgileri
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-main)' }}>{quote.customer_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} color="#64748b" /> {quote.customer_phone || '-'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} color="#64748b" /> {quote.customer_email || '-'}</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><MapPin size={14} color="#64748b" style={{ flexShrink: 0, marginTop: '3px' }} /> {quote.customer_address || '-'}</div>
              
              {quote.customer_tax_id && (
                <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '12px' }}>
                  <div>Vergi Dairesi: <strong>{quote.customer_tax_office || '-'}</strong></div>
                  <div>VKN / TCKN: <strong>{quote.customer_tax_id}</strong></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Items and Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card">
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} color="var(--primary)" /> Teklif Kalemleri
            </h3>
            
            <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Açıklama</th>
                    <th style={{ textAlign: 'center' }}>Miktar</th>
                    <th style={{ textAlign: 'center' }}>Birim</th>
                    <th style={{ textAlign: 'right' }}>Birim Fiyat</th>
                    <th style={{ textAlign: 'center' }}>İndirim</th>
                    <th style={{ textAlign: 'center' }}>KDV</th>
                    <th style={{ textAlign: 'right' }}>Toplam (KDV'li)</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td><strong>{item.description}</strong></td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'center' }}>{item.unit}</td>
                      <td style={{ textAlign: 'right' }}>{item.unit_price.toLocaleString('tr-TR')} TL</td>
                      <td style={{ textAlign: 'center' }}>{item.discount_percent > 0 ? `%${item.discount_percent}` : '-'}</td>
                      <td style={{ textAlign: 'center' }}>%{item.vat_percent}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ width: '320px', background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Ara Toplam:</span>
                  <strong>{quote.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                </div>
                {quote.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--danger)' }}>
                    <span>Toplam İndirim (-):</span>
                    <strong>{quote.discount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Toplam KDV:</span>
                  <strong>{quote.vat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '5px', color: 'var(--primary)' }}>
                  <span>GENEL TOPLAM:</span>
                  <span>{quote.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
                </div>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px' }}>Teklif Şartları & Notlar</h3>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                {quote.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contract Creation Modal */}
      {showContractModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-card-solid)', borderRadius: '20px',
            padding: '36px', width: '100%', maxWidth: '520px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(139,92,246,0.15)', padding: '10px', borderRadius: '12px', color: '#8b5cf6' }}>
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Sözleşme Oluştur</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, marginTop: '3px' }}>
                  <strong>{quote?.customer_name}</strong> müşterisi için teklif bilgileri hazır.
                </p>
              </div>
            </div>

            {/* Auto-filled info notice */}
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', marginTop: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '700', marginBottom: '6px' }}>
                ✅ Otomatik Doldurulan Alanlar
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '20px' }}>
                <span>Müşteri: <strong style={{ color: 'var(--text-main)' }}>{quote?.customer_name}</strong></span>
                <span>Fiyat: <strong style={{ color: '#8b5cf6' }}>{quote?.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</strong></span>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Sözleşme Başlangıç Tarihi</label>
                  <input type="date" value={contractForm.start_date}
                    onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Sözleşme Bitiş Tarihi</label>
                  <input type="date" value={contractForm.end_date}
                    onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Sözleşme Türü</label>
                  <select value={contractForm.contract_type}
                    onChange={e => setContractForm({ ...contractForm, contract_type: e.target.value as any })}>
                    <option value="Yıllık">Yıllık</option>
                    <option value="6 Aylık">6 Aylık</option>
                    <option value="Özel">Özel</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Bakım Periyodu</label>
                  <select value={contractForm.contract_period}
                    onChange={e => setContractForm({ ...contractForm, contract_period: e.target.value as any })}>
                    <option value="1 Ay">1 Ay</option>
                    <option value="2 Ay">2 Ay</option>
                    <option value="3 Ay">3 Ay</option>
                    <option value="4 Ay">4 Ay</option>
                    <option value="6 Ay">6 Ay</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Genel Bakım Ayı</label>
                  <select value={contractForm.general_maintenance_month}
                    onChange={e => setContractForm({ ...contractForm, general_maintenance_month: e.target.value })}>
                    {['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].map(m =>
                      <option key={m} value={m}>{m}</option>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Bakım Yılı</label>
                  <input type="number" value={contractForm.maintenance_year}
                    onChange={e => setContractForm({ ...contractForm, maintenance_year: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowContractModal(false)}>
                Şimdi Değil
              </button>
              <button className="btn btn-primary" onClick={handleCreateContract}
                style={{ background: '#8b5cf6', padding: '12px 28px' }}>
                <ClipboardCheck size={16} /> Sözleşmeyi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteDetail;
