import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../api';
import { FileText, Plus, ShieldCheck, ShieldAlert, ShieldOff, Calendar, DollarSign, Edit2, Trash2, CheckSquare, Square, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

interface Contract {
  id: number;
  customer_name: string;
  customer_id: number;
  start_date: string;
  end_date: string;
  contract_type: string;
  contract_period: string;
  maintenance_months: string; // Format: "2026-Ocak,2027-Subat"
  general_maintenance_month: string;
  maintenance_year: number; // Legacy or primary year
  price: number;
  status: string;
  notes: string;
}

interface Customer {
  id: number;
  name: string;
}

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const sortMonthsChronologically = (months: string[]): string[] => {
  const parseMonthKey = (key: string) => {
    if (key.includes('-')) {
      const parts = key.split('-');
      const year = parseInt(parts[0]) || 0;
      const monthName = parts.slice(1).join('-');
      const index = MONTHS.indexOf(monthName);
      return { year, index: index >= 0 ? index : 0 };
    } else {
      const index = MONTHS.indexOf(key);
      return { year: 0, index: index >= 0 ? index : 0 };
    }
  };

  return [...months].sort((a, b) => {
    const parsedA = parseMonthKey(a);
    const parsedB = parseMonthKey(b);
    if (parsedA.year !== parsedB.year) {
      return parsedA.year - parsedB.year;
    }
    return parsedA.index - parsedB.index;
  });
};

const YEARS = [
  new Date().getFullYear() - 1,
  new Date().getFullYear(),
  new Date().getFullYear() + 1,
  new Date().getFullYear() + 2
];

const Contracts = () => {
  const location = useLocation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filtered, setFiltered] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(location.state?.filter === 'expiring' ? 'Aktif' : '');
  const [typeFilter, setTypeFilter] = useState('');
  const [isExpiringFilter, setIsExpiringFilter] = useState<boolean>(location.state?.filter === 'expiring');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Multi-year month selection state
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]); // Format: "YYYY-Month"
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [formData, setFormData] = useState({
    customer_id: '',
    start_date: '',
    end_date: '',
    contract_type: 'Yıllık',
    contract_period: '1 Ay',
    general_maintenance_month: 'Ocak',
    maintenance_year: new Date().getFullYear(),
    price: 0,
    status: 'Aktif',
    notes: ''
  });

  useEffect(() => {
    fetchContracts();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (location.state?.openForm) {
      setShowForm(true);
      if (location.state?.preselectedCustomerId) {
        setFormData(prev => ({
          ...prev,
          customer_id: location.state.preselectedCustomerId.toString()
        }));
      }
    }
  }, [location.state]);

  const calculateDaysLeft = (dateString: string) => {
    const nextDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = nextDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, isExpiringFilter]);

  useEffect(() => {
    let results = contracts.filter(c => {
      const matchesSearch = (c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
       (c.notes && c.notes.toLowerCase().includes(search.toLowerCase())));
      
      const matchesStatus = statusFilter === '' || c.status === statusFilter;
      const matchesType = typeFilter === '' || c.contract_type === typeFilter;
      
      let matchesExpiring = true;
      if (isExpiringFilter) {
        matchesExpiring = c.status === 'Aktif' && calculateDaysLeft(c.end_date) < 30;
      }

      return matchesSearch && matchesStatus && matchesType && matchesExpiring;
    });

    results.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

    setFiltered(results);
  }, [search, statusFilter, typeFilter, isExpiringFilter, contracts]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filtered, currentPage, itemsPerPage]);

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts');
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      const data = Array.isArray(response.data) ? response.data : [];
      data.sort((a, b) => (a.name || '').toString().trim().localeCompare((b.name || '').toString().trim(), 'tr'));
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditId(contract.id);
    setFormData({
      customer_id: contract.customer_id.toString(),
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      contract_type: contract.contract_type || 'Yıllık',
      contract_period: contract.contract_period || '1 Ay',
      general_maintenance_month: contract.general_maintenance_month || 'Ocak',
      maintenance_year: contract.maintenance_year || new Date().getFullYear(),
      price: contract.price || 0,
      status: contract.status || 'Aktif',
      notes: contract.notes || ''
    });
    
    // Parse months. If they don't have year prefix, assume maintenance_year or current year
    const months = contract.maintenance_months ? contract.maintenance_months.split(',') : [];
    const formattedMonths = months.map(m => {
      if (m.includes('-')) return m;
      return `${contract.maintenance_year || new Date().getFullYear()}-${m}`;
    });
    
    setSelectedMonths(sortMonthsChronologically(formattedMonths));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMonth = (month: string) => {
    const key = `${formYear}-${month}`;
    setSelectedMonths(prev => {
      const next = prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key];
      return sortMonthsChronologically(next);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sortedSelectedMonths = sortMonthsChronologically(selectedMonths);
    const payload = {
      ...formData,
      customer_id: parseInt(formData.customer_id),
      price: parseFloat(formData.price.toString()),
      maintenance_months: sortedSelectedMonths.join(',')
    };

    try {
      if (editId) {
        await api.put(`/contracts/${editId}`, payload);
        toast.success('Sözleşme güncellendi.');
      } else {
        await api.post('/contracts', payload);
        toast.success('Sözleşme başarıyla eklendi.');
      }
      resetForm();
      fetchContracts();
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('İşlem sırasında hata oluştu.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setSelectedMonths([]);
    setFormData({
      customer_id: '',
      start_date: '',
      end_date: '',
      contract_type: 'Yıllık',
      contract_period: '1 Ay',
      general_maintenance_month: 'Ocak',
      maintenance_year: new Date().getFullYear(),
      price: 0,
      status: 'Aktif',
      notes: ''
    });
  };

  const toggleForm = () => {
    if (showForm) resetForm();
    else setShowForm(true);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setIsExpiringFilter(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aktif': return <ShieldCheck color="var(--success)" />;
      case 'Süresi Doldu': return <ShieldOff color="var(--danger)" />;
      case 'İptal': return <ShieldAlert color="#64748b" />;
      default: return <FileText />;
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu sözleşmeyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/contracts/${id}`);
      fetchContracts();
      toast.success('Sözleşme silindi.');
    } catch (error) {
      toast.error('Silme başarısız.');
    }
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helper to group selected months by year for display
  const getSelectedSummary = () => {
    const groups: Record<number, string[]> = {};
    const sorted = sortMonthsChronologically(selectedMonths);
    sorted.forEach(sm => {
      const [y, m] = sm.split('-');
      const year = parseInt(y);
      if (!groups[year]) groups[year] = [];
      groups[year].push(m);
    });
    return Object.entries(groups).map(([y, ms]) => (
      <div key={y} style={{ fontSize: '12px', marginBottom: '5px' }}>
        <strong style={{ color: 'var(--primary)' }}>{y}:</strong> {ms.join(', ')}
      </div>
    ));
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Bakım Sözleşmeleri</h2>
          <p style={{ color: '#64748b' }}>Müşteri bazlı periyodik bakım anlaşmaları ve süre takibi.</p>
        </div>
        <button className="btn btn-primary" onClick={toggleForm}>
          <Plus size={18} /> {showForm ? 'Vazgeç' : 'Yeni Sözleşme Tanımla'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px' }}>
          <Search size={20} color="#9ca3af" />
          <input 
            type="text" 
            placeholder="Müşteri adı veya notlara göre ara..." 
            style={{ border: 'none', width: '100%', fontSize: '15px', outline: 'none', background: 'transparent' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px' }}>
           <Filter size={18} color="#64748b" />
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #e2e8f0', paddingRight: '15px', marginRight: '5px' }}>
             <input 
               type="checkbox" 
               id="expiring" 
               checked={isExpiringFilter} 
               onChange={e => setIsExpiringFilter(e.target.checked)}
             />
             <label htmlFor="expiring" style={{ fontSize: '13px', fontWeight: 'bold', color: '#8b5cf6', cursor: 'pointer' }}>Bitenler</label>
           </div>
           <select 
             value={statusFilter} 
             onChange={e => setStatusFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '110px' }}
           >
             <option value="">Tüm Durumlar</option>
             <option value="Aktif">Aktif</option>
             <option value="Süresi Doldu">Süresi Doldu</option>
             <option value="İptal">İptal</option>
           </select>
           <select 
             value={typeFilter} 
             onChange={e => setTypeFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '100px' }}
           >
             <option value="">Tüm Tipler</option>
             <option value="Yıllık">Yıllık</option>
             <option value="6 Aylık">6 Aylık</option>
             <option value="Özel">Özel Anlaşma</option>
           </select>
           {(search || statusFilter || typeFilter || isExpiringFilter) && (
             <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
               <X size={16}/>
             </button>
           )}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ borderTop: `5px solid ${editId ? 'var(--warning)' : 'var(--primary)'}`, marginBottom: '30px' }}>
          <h3>{editId ? 'Sözleşmeyi Düzenle' : 'Yeni Sözleşme Ekle'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label>Müşteri</label>
                <select required value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                  <option value="">Seçiniz...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Başlangıç Tarihi</label>
                <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Bitiş Tarihi</label>
                <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Sözleşme Tipi</label>
                <select value={formData.contract_type} onChange={e => setFormData({...formData, contract_type: e.target.value})}>
                  <option value="Yıllık">Yıllık</option>
                  <option value="6 Aylık">6 Aylık</option>
                  <option value="Özel">Özel Anlaşma</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fatura/Ödeme Periyodu</label>
                <select value={formData.contract_period} onChange={e => setFormData({...formData, contract_period: e.target.value})}>
                  <option value="1 Ay">1 Aylık</option>
                  <option value="2 Ay">2 Aylık</option>
                  <option value="3 Ay">3 Aylık</option>
                  <option value="4 Ay">4 Aylık</option>
                  <option value="6 Ay">6 Aylık</option>
                </select>
              </div>
              <div className="form-group">
                <label>Sözleşme Bedeli (TL)</label>
                <input type="text" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0})} />
              </div>
              
              <div className="form-group">
                <label>Genel Bakım Yapılacak Ay</label>
                <select value={formData.general_maintenance_month} onChange={e => setFormData({...formData, general_maintenance_month: e.target.value})}>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {editId && (
                <div className="form-group">
                  <label>Durum</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Aktif">Aktif</option>
                    <option value="Süresi Doldu">Süresi Doldu</option>
                    <option value="İptal">İptal</option>
                  </select>
                </div>
              )}
              
              <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ margin: 0, fontWeight: '800' }}>Periyodik Bakım Yapılacak Aylar</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>YIL SEÇİN:</span>
                    <select 
                      value={formYear} 
                      onChange={e => setFormYear(parseInt(e.target.value))}
                      style={{ padding: '5px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: 'var(--primary)' }}
                    >
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '15px' }}>
                  İpucu: Yılı değiştirerek farklı yıllar için ayları ayrı ayrı seçebilirsiniz.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  {MONTHS.map(month => {
                    const isSelected = selectedMonths.includes(`${formYear}-${month}`);
                    return (
                      <div 
                        key={month} 
                        onClick={() => toggleMonth(month)}
                        style={{ 
                          padding: '10px', 
                          borderRadius: '8px', 
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--primary)' : '#e2e8f0',
                          background: isSelected ? 'var(--primary-light)' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="#cbd5e1" />}
                        <span style={{ fontWeight: isSelected ? '700' : '500' }}>{month}</span>
                      </div>
                    );
                  })}
                </div>

                {selectedMonths.length > 0 && (
                  <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Seçili Bakım Programı Özeti:</div>
                    {getSelectedSummary()}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Notlar</label>
                <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              {editId && <button type="button" className="btn btn-secondary" onClick={toggleForm}>İptal</button>}
              <button type="submit" className="btn btn-primary">{editId ? 'Değişiklikleri Kaydet' : 'Sözleşmeyi Kaydet'}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState 
          title="Sözleşme Bulunamadı" 
          description="Arama kriterlerine uygun sözleşme bulunmuyor." 
          icon={FileText}
        />
      ) : (
        <>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
            {paginatedData.map(contract => {
              const daysLeft = calculateDaysLeft(contract.end_date);
              
              let statusColor = 'var(--success)'; 
              if (contract.status !== 'Aktif' || daysLeft <= 0) {
                statusColor = 'var(--danger)';
              } else if (daysLeft <= 7) {
                statusColor = 'var(--danger)';
              } else if (daysLeft <= 30) {
                statusColor = 'var(--warning)';
              }

              return (
                <div key={contract.id} className="card" style={{ borderLeft: `6px solid ${statusColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getStatusIcon(contract.status)}
                      <Link 
                        to={`/customers/${contract.customer_id}`}
                        style={{ 
                          fontWeight: '800', 
                          fontSize: '18px', 
                          color: 'var(--text-main)', 
                          textDecoration: 'none',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                      >
                        {contract.customer_name}
                      </Link>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="status-badge" style={{ 
                        background: statusColor === 'var(--success)' ? 'var(--success-light)' : (statusColor === 'var(--warning)' ? 'var(--warning-light)' : 'var(--danger-light)'),
                        color: statusColor,
                        fontWeight: 'bold'
                      }}>
                        {contract.status}
                      </span>
                      <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => handleEdit(contract)}><Edit2 size={14}/></button>
                      <button className="btn btn-secondary" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDelete(contract.id)}><Trash2 size={14}/></button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SÖZLEŞME / ÖDEME</div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{contract.contract_type} / {contract.contract_period || '-'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BEDEL</div>
                        <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{contract.price.toLocaleString()} TL</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', marginBottom: '5px' }}>
                        <Calendar size={14} /> <span>{contract.start_date} - {contract.end_date}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Genel Bakım Ayı:</strong> <span style={{ color: 'var(--text-main)' }}>{contract.general_maintenance_month || '-'}</span><br/>
                      <div style={{ marginTop: '5px' }}>
                        <strong style={{ color: 'var(--text-main)' }}>Bakım Programı:</strong>
                        <div style={{ padding: '5px 0' }}>
                          {contract.maintenance_months ? sortMonthsChronologically(contract.maintenance_months.split(',')).map(m => {
                            const [y, mn] = m.includes('-') ? m.split('-') : [contract.maintenance_year || '?', m];
                            return <span key={m} style={{ fontSize: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '2px 6px', borderRadius: '4px', marginRight: '4px', display: 'inline-block', marginBottom: '4px' }}>{y} {mn}</span>
                          }) : 'Belirtilmemiş'}
                        </div>
                      </div>
                    </div>
                    
                    {contract.status === 'Aktif' && (
                      <div style={{ 
                        background: statusColor === 'var(--danger)' ? '#fee2e2' : (statusColor === 'var(--warning)' ? '#fffbeb' : '#f0fdf4'),
                        color: statusColor === 'var(--danger)' ? '#991b1b' : (statusColor === 'var(--warning)' ? '#92400e' : '#166534'),
                        padding: '8px', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        fontWeight: '700', 
                        border: `1px solid ${statusColor}`,
                        marginTop: '10px' 
                      }}>
                        {daysLeft <= 0 ? '⚠️ Sözleşme süresi doldu!' : `⏱️ Sözleşme bitimine ${daysLeft} gün kaldı!`}
                      </div>
                    )}
                  </div>

                  {contract.notes && (
                    <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>"{contract.notes}"</p>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '30px' }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="btn btn-secondary"
                style={{ padding: '8px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>
                Sayfa {currentPage} / {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="btn btn-secondary"
                style={{ padding: '8px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Contracts;
