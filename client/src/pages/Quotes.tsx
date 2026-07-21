import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Edit2, Trash2, Search, X, Loader2, FileText, ChevronLeft, ChevronRight, Calculator, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface QuoteItem {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  vat_percent: number;
  total_price: number;
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
  subtotal: number;
  discount: number;
  vat: number;
  grand_total: number;
  notes: string;
}

interface Customer {
  id: number;
  name: string;
}

interface Part {
  id: number;
  name: string;
  unit_price: number;
  unit: string;
  part_number?: string;
}

const Quotes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filtered, setFiltered] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    quote_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quote_type: 'Yedek Parça',
    status: 'Taslak',
    notes: ''
  });

  const [formItems, setFormItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, unit: 'Adet', unit_price: 0, discount_percent: 0, vat_percent: 20, total_price: 0 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.openForm) {
      setShowForm(true);
      if (location.state?.preselectedCustomerId) {
        setFormData(prev => ({
          ...prev,
          customer_id: location.state.preselectedCustomerId.toString(),
          quote_type: location.state.quoteType || prev.quote_type,
          notes: location.state.notes || prev.notes
        }));
      }
      if (location.state?.preselectedItems && location.state.preselectedItems.length > 0) {
        setFormItems(location.state.preselectedItems);
      }
    }
  }, [location.state]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotesRes, customersRes, partsRes] = await Promise.all([
        api.get('/quotes'),
        api.get('/customers'),
        api.get('/parts')
      ]);
      setQuotes(quotesRes.data);
      const custData = Array.isArray(customersRes.data) ? customersRes.data : [];
      custData.sort((a, b) => (a.name || '').toString().trim().localeCompare((b.name || '').toString().trim(), 'tr'));
      setCustomers(custData);
      setParts(partsRes.data);
    } catch (error) {
      console.error('Error fetching quotes data:', error);
      toast.error('Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const results = quotes.filter(q => {
      const matchesSearch = q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === '' || q.status === statusFilter;
      const matchesType = typeFilter === '' || q.quote_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
    setFiltered(results);
  }, [search, statusFilter, typeFilter, quotes]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filtered, currentPage, itemsPerPage]);

  // Form Calculations
  const calculateTotals = (itemsList: QuoteItem[]) => {
    let subtotal = 0;
    let discount = 0;
    let vat = 0;

    const updated = itemsList.map(item => {
      const lineRaw = item.quantity * item.unit_price;
      const lineDisc = lineRaw * (item.discount_percent / 100);
      const lineVat = (lineRaw - lineDisc) * (item.vat_percent / 100);
      const lineTotal = lineRaw - lineDisc + lineVat;

      subtotal += lineRaw;
      discount += lineDisc;
      vat += lineVat;

      return {
        ...item,
        total_price: lineTotal
      };
    });

    return {
      items: updated,
      subtotal,
      discount,
      vat,
      grand_total: subtotal - discount + vat
    };
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value } as QuoteItem;
    
    // Auto-calculate line total
    const calc = calculateTotals(updated);
    setFormItems(calc.items);
  };

  const toTitleCaseTr = (str: string) => {
    return str
      .toLocaleLowerCase('tr')
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toLocaleUpperCase('tr') + word.slice(1);
      })
      .join(' ');
  };

  const handleSelectPart = (index: number, partIdStr: string) => {
    if (!partIdStr) return;
    const partId = parseInt(partIdStr);
    const selectedPart = parts.find(p => p.id === partId);
    if (!selectedPart) return;

    let description = selectedPart.name;
    if (selectedPart.name.toLocaleLowerCase('tr').includes('kontrol cihaz')) {
      description = toTitleCaseTr(selectedPart.name);
      if (selectedPart.part_number) {
        description += ` (${selectedPart.part_number})`;
      }
    }

    const updated = [...formItems];
    updated[index] = {
      ...updated[index],
      description: description,
      unit: selectedPart.unit || 'Adet',
      unit_price: selectedPart.unit_price || 0
    };
    const calc = calculateTotals(updated);
    setFormItems(calc.items);
  };

  const addItemRow = () => {
    setFormItems([...formItems, { description: '', quantity: 1, unit: 'Adet', unit_price: 0, discount_percent: 0, vat_percent: 20, total_price: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    const updated = formItems.filter((_, i) => i !== index);
    const calc = calculateTotals(updated);
    setFormItems(calc.items);
  };

  const handleEdit = async (quote: Quote) => {
    try {
      const response = await api.get(`/quotes/${quote.id}`);
      const detail = response.data;
      setEditId(detail.id);
      setFormData({
        customer_id: detail.customer_id.toString(),
        quote_date: detail.quote_date,
        valid_until: detail.valid_until || '',
        quote_type: detail.quote_type,
        status: detail.status,
        notes: detail.notes || ''
      });
      setFormItems(detail.items || []);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching quote detail:', error);
      toast.error('Teklif detayları alınırken hata oluştu.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu teklifi ve tüm kalemlerini silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/quotes/${id}`);
      toast.success('Teklif başarıyla silindi.');
      fetchData();
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Silme işlemi başarısız.');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.put(`/quotes/${id}/status`, { status });
      toast.success('Teklif durumu güncellendi.');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenemedi.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.some(item => !item.description.trim())) {
      toast.error('Lütfen tüm teklif kalemlerinin açıklamasını doldurun.');
      return;
    }

    try {
      const payload = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        items: formItems
      };

      if (editId) {
        await api.put(`/quotes/${editId}`, payload);
        toast.success('Teklif başarıyla güncellendi.');
      } else {
        await api.post('/quotes', payload);
        toast.success('Teklif başarıyla oluşturuldu.');
      }
      
      resetForm();
      setShowForm(false);
      fetchData();
      if (location.state?.returnToGeneratorId) {
        navigate(`/generators/${location.state.returnToGeneratorId}`);
      }
    } catch (error: any) {
      console.error('Error saving quote:', error);
      const msg = error.response?.data?.error || 'Kayıt sırasında hata oluştu.';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      customer_id: '',
      quote_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quote_type: 'Yedek Parça',
      status: 'Taslak',
      notes: ''
    });
    setFormItems([{ description: '', quantity: 1, unit: 'Adet', unit_price: 0, discount_percent: 0, vat_percent: 20, total_price: 0 }]);
  };

  const calculatedTotals = calculateTotals(formItems);

  // Pagination totals
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Onaylandı': return 'status-green';
      case 'Reddedildi': return 'status-red';
      case 'Gönderildi': return 'status-badge';
      default: return 'status-badge';
    }
  };

  if (loading && quotes.length === 0) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Teklif Yönetimi</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => { 
            if (showForm) {
              resetForm();
              if (location.state?.returnToGeneratorId) {
                navigate(`/generators/${location.state.returnToGeneratorId}`);
                return;
              }
            }
            setShowForm(!showForm); 
          }}
        >
          <Plus size={18} /> {showForm ? 'Vazgeç' : 'Yeni Teklif Oluştur'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ borderTop: `5px solid ${editId ? 'var(--warning)' : 'var(--primary)'}`, animation: 'fadeIn 0.3s ease-out', marginBottom: '30px' }}>
          <h3>{editId ? `Teklifi Düzenle (#${editId})` : 'Yeni Teklif Hazırla'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="form-group">
                <label>Müşteri Seçin</label>
                <select required value={formData.customer_id} onChange={e => setFormData({ ...formData, customer_id: e.target.value })}>
                  <option value="">Seçiniz...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Teklif Türü</label>
                <select value={formData.quote_type} onChange={e => setFormData({ ...formData, quote_type: e.target.value })}>
                  <option value="Satış">Satış</option>
                  <option value="Servis">Servis</option>
                  <option value="Kiralama">Kiralama</option>
                  <option value="Genel Bakım">Genel Bakım</option>
                  <option value="Periyodik Kontrol">Periyodik Kontrol</option>
                  <option value="Yedek Parça">Yedek Parça</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>
              <div className="form-group">
                <label>Teklif Tarihi</label>
                <input type="date" required value={formData.quote_date} onChange={e => setFormData({ ...formData, quote_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Geçerlilik Son Tarihi</label>
                <input type="date" required value={formData.valid_until} onChange={e => setFormData({ ...formData, valid_until: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Durum</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Taslak">Taslak</option>
                  <option value="Gönderildi">Gönderildi</option>
                  <option value="Onaylandı">Onaylandı</option>
                  <option value="Reddedildi">Reddedildi</option>
                </select>
              </div>
            </div>

            {/* Teklif Kalemleri Alanı */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>
                Teklif Kalemleri
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                {formItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.2fr 1fr 1fr 1.5fr auto', gap: '10px', alignItems: 'end', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    
                    {/* Parça Kütüphanesinden Ekleme (Kısayol) */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Parça Seç (Hızlı)</label>
                      <select style={{ padding: '6px', fontSize: '12px' }} onChange={e => handleSelectPart(idx, e.target.value)}>
                        <option value="">Seç...</option>
                        {parts.map(p => <option key={p.id} value={p.id}>{p.name} {p.part_number ? `(${p.part_number})` : ''}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Açıklama / Ürün - Hizmet</label>
                      <input type="text" required placeholder="Açıklama giriniz" style={{ padding: '6px', fontSize: '12px' }} value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Miktar</label>
                      <input type="number" required min="1" step="any" style={{ padding: '6px', fontSize: '12px' }} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Birim</label>
                      <select style={{ padding: '6px', fontSize: '12px' }} value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)}>
                        <option value="Adet">Adet</option>
                        <option value="Litre">Litre</option>
                        <option value="Saat">Saat</option>
                        <option value="Metre">Metre</option>
                        <option value="Takım">Takım</option>
                        <option value="Paket">Paket</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Birim Fiyatı (TL)</label>
                      <input type="number" required min="0" step="any" style={{ padding: '6px', fontSize: '12px' }} value={item.unit_price} onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>İndirim (%)</label>
                      <input type="number" min="0" max="100" style={{ padding: '6px', fontSize: '12px' }} value={item.discount_percent} onChange={e => handleItemChange(idx, 'discount_percent', parseFloat(e.target.value) || 0)} />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>KDV (%)</label>
                      <input type="number" min="0" max="100" style={{ padding: '6px', fontSize: '12px' }} value={item.vat_percent} onChange={e => handleItemChange(idx, 'vat_percent', parseFloat(e.target.value) || 0)} />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>Satır Toplamı (KDV'li)</label>
                      <div style={{ padding: '8px', fontSize: '12.5px', fontWeight: 'bold', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'right' }}>
                        {item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                      </div>
                    </div>

                    <button type="button" className="btn" style={{ padding: '8px', color: 'var(--danger)', background: 'none' }} onClick={() => removeItemRow(idx)} disabled={formItems.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={addItemRow}>
                    <Plus size={15} /> Kalem Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Şartlar & Notlar ve Tutar Özet Kutusu */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '30px', marginTop: '30px' }}>
              <div className="form-group">
                <label>Ödeme, Teslimat Şartları ve Teklif Notları</label>
                <textarea rows={6} placeholder="Ödeme şartları, garanti süresi, teslim bilgileri vb. notlarınızı buraya yazın..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ padding: '12px', fontSize: '13px', width: '100%', resize: 'none' }} />
              </div>
              
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', height: 'fit-content' }}>
                <h4 style={{ margin: 0, paddingBottom: '10px', borderBottom: '1px solid #cbd5e1', color: 'var(--primary)' }}>Tutar Özeti</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>Ara Toplam (KDV Hariç):</span>
                  <strong>{calculatedTotals.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                </div>
                {calculatedTotals.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--danger)' }}>
                    <span>Toplam İndirim (-):</span>
                    <strong>{calculatedTotals.discount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>Toplam KDV:</span>
                  <strong>{calculatedTotals.vat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '5px', color: 'var(--text-main)' }}>
                  <span>GENEL TOPLAM:</span>
                  <span style={{ color: 'var(--primary)' }}>{calculatedTotals.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { 
                  resetForm(); 
                  setShowForm(false); 
                  if (location.state?.returnToGeneratorId) {
                    navigate(`/generators/${location.state.returnToGeneratorId}`);
                  }
                }}
              >
                İptal
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 30px' }}><Calculator size={18} /> Teklifi Kaydet</button>
            </div>
          </form>
        </div>
      )}

      {/* Arama ve Filtreleme Kartı */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px' }}>
          <Search size={20} color="#9ca3af" />
          <input 
            type="text" 
            placeholder="Teklif numarası veya müşteri adına göre ara..." 
            style={{ border: 'none', width: '100%', fontSize: '15px', outline: 'none', background: 'transparent' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', padding: '12px 24px' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '100%', fontWeight: 'bold' }}>
            <option value="">Tüm Durumlar</option>
            <option value="Taslak">Taslak</option>
            <option value="Gönderildi">Gönderildi</option>
            <option value="Onaylandı">Onaylandı</option>
            <option value="Reddedildi">Reddedildi</option>
          </select>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', padding: '12px 24px' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '100%', fontWeight: 'bold' }}>
            <option value="">Tüm Teklif Türleri</option>
            <option value="Satış">Satış</option>
            <option value="Servis">Servis</option>
            <option value="Kiralama">Kiralama</option>
            <option value="Genel Bakım">Genel Bakım</option>
            <option value="Periyodik Kontrol">Periyodik Kontrol</option>
            <option value="Yedek Parça">Yedek Parça</option>
            <option value="Diğer">Diğer</option>
          </select>
        </div>
      </div>

      {/* Teklif Tablosu */}
      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileText size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
            <div style={{ color: '#64748b' }}>Kayıtlı teklif bulunamadı.</div>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Teklif No</th>
                    <th>Müşteri</th>
                    <th>Tür</th>
                    <th>Tarih</th>
                    <th>Son Geçerlilik</th>
                    <th style={{ textAlign: 'right' }}>Genel Toplam</th>
                    <th style={{ textAlign: 'center' }}>Durum</th>
                    <th style={{ textAlign: 'center' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(q => (
                    <tr key={q.id}>
                      <td><code style={{ fontWeight: 'bold', fontSize: '13px' }}>{q.quote_number}</code></td>
                      <td><strong>{q.customer_name}</strong></td>
                      <td style={{ fontSize: '13px' }}>{q.quote_type}</td>
                      <td style={{ fontSize: '13px' }}>{q.quote_date}</td>
                      <td style={{ fontSize: '13px' }}>{q.valid_until || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {q.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <select 
                          value={q.status} 
                          onChange={e => handleStatusChange(q.id, e.target.value)}
                          className={`status-badge ${getStatusBadgeClass(q.status)}`}
                          style={{ border: 'none', cursor: 'pointer', outline: 'none', fontWeight: 'bold', padding: '4px 8px' }}
                        >
                          <option value="Taslak">Taslak</option>
                          <option value="Gönderildi">Gönderildi</option>
                          <option value="Onaylandı">Onaylandı</option>
                          <option value="Reddedildi">Reddedildi</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <Link to={`/quotes/${q.id}`} className="btn btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>İncele & PDF</Link>
                          <button className="btn btn-secondary" onClick={() => handleEdit(q)} style={{ padding: '8px' }}>
                            <Edit2 size={15} />
                          </button>
                          <button className="btn btn-secondary" onClick={() => handleDelete(q.id)} style={{ padding: '8px', color: 'var(--danger)' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px', padding: '15px', borderTop: '1px solid #f1f5f9' }}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="btn btn-secondary" style={{ padding: '8px' }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Sayfa {currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="btn btn-secondary" style={{ padding: '8px' }}><ChevronRight size={16} /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Quotes;
