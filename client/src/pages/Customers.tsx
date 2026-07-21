import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Search, UserPlus, Phone, MapPin, Mail, Filter, Edit2, Trash2, ArrowUpDown, X, ChevronLeft, ChevronRight, FileText, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  customer_type: string;
  category: string;
  tax_id: string;
  tax_office: string;
  authorized_person: string;
}

interface Contract {
  customer_id: number;
  status: string;
}

interface Generator {
  id: number;
  customer_id: number;
  serial_number: string;
  brand: string;
  model: string;
  location: string;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [contractFilter, setContractFilter] = useState(''); // 'active', 'none'
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [formData, setFormData] = useState({ 
    name: '', email: '', phone: '', address: '', 
    customer_type: 'Tüzel Kişi', category: 'Özel', tax_id: '', tax_office: '', authorized_person: '' 
  });

  useEffect(() => {
    fetchCustomers();
    fetchContracts();
    fetchGenerators();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, catFilter, contractFilter]);

  useEffect(() => {
    if (!customers) return;

    let results = customers.filter(c => {
      const name = c.name?.toLowerCase() || '';
      const email = c.email?.toLowerCase() || '';
      const phone = c.phone || '';
      const taxId = c.tax_id || '';
      const searchTerm = search.toLowerCase();

      const matchesSearch = name.includes(searchTerm) || 
                            email.includes(searchTerm) || 
                            phone.includes(searchTerm) || 
                            taxId.includes(searchTerm);
      
      const matchesType = typeFilter === '' || c.customer_type === typeFilter;
      const matchesCat = catFilter === '' || c.category === catFilter;
      
      const hasActiveContract = Array.isArray(contracts) && contracts.some(con => con.customer_id === c.id && con.status === 'Aktif');
      let matchesContract = true;
      if (contractFilter === 'active') matchesContract = hasActiveContract;
      else if (contractFilter === 'none') matchesContract = !hasActiveContract;

      return matchesSearch && matchesType && matchesCat && matchesContract;
    });

    if (sortConfig) {
      results.sort((a, b) => {
        const aVal = (a[sortConfig.key] || '').toString().trim();
        const bVal = (b[sortConfig.key] || '').toString().trim();
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal, 'tr')
          : bVal.localeCompare(aVal, 'tr');
      });
    }

    setFiltered(results);
  }, [search, typeFilter, catFilter, contractFilter, customers, contracts, sortConfig]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filtered, currentPage, itemsPerPage]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Müşteri listesi alınamadı.');
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts');
      setContracts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchGenerators = async () => {
    try {
      const response = await api.get('/generators');
      setGenerators(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching generators:', error);
    }
  };

  const handleSort = (key: keyof Customer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEdit = (customer: Customer) => {
    setEditId(customer.id);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      address: customer.address,
      customer_type: customer.customer_type || 'Tüzel Kişi',
      category: customer.category || 'Özel',
      tax_id: customer.tax_id || '',
      tax_office: customer.tax_office || '',
      authorized_person: customer.authorized_person || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu müşteriyi ve tüm kayıtlarını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
      toast.success('Müşteri başarıyla silindi.');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error('Müşteri silinirken bir hata oluştu.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/customers/${editId}`, formData);
        toast.success('Müşteri bilgileri güncellendi.');
      } else {
        await api.post('/customers', formData);
        toast.success('Müşteri başarıyla eklendi.');
      }
      
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const msg = error.response?.data?.error || 'İşlem sırasında bir hata oluştu.';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({ name: '', email: '', phone: '', address: '', customer_type: 'Tüzel Kişi', category: 'Özel', tax_id: '', tax_office: '', authorized_person: '' });
  };

  const toggleForm = () => {
    if (showForm) resetForm();
    else setShowForm(true);
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setCatFilter('');
    setContractFilter('');
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Müşteri Portföyü</h2>
          <p style={{ color: '#64748b' }}>Sistemde kayıtlı aktif müşteriler ve iletişim bilgileri.</p>
        </div>
        <button className="btn btn-primary" onClick={toggleForm}>
          <UserPlus size={18} /> {showForm ? 'Vazgeç' : 'Yeni Müşteri Tanımla'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px' }}>
          <Search size={20} color="#9ca3af" />
          <input 
            type="text" 
            placeholder="İsim, VKN veya telefon ile ara..." 
            style={{ border: 'none', width: '100%', fontSize: '15px', outline: 'none', background: 'transparent' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px' }}>
           <Filter size={18} color="#64748b" />
           <select 
             value={contractFilter} 
             onChange={e => setContractFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '130px', fontWeight: 'bold', color: contractFilter ? 'var(--primary)' : 'inherit' }}
           >
             <option value="">Tüm Müşteriler</option>
             <option value="active">📜 Sözleşmeli</option>
             <option value="none">⚪ Sözleşmesiz</option>
           </select>
           <select 
             value={typeFilter} 
             onChange={e => setTypeFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '110px' }}
           >
             <option value="">Tüm Tipler</option>
             <option value="Tüzel Kişi">Tüzel Kişi</option>
             <option value="Gerçek Kişi">Gerçek Kişi</option>
           </select>
           <select 
             value={catFilter} 
             onChange={e => setCatFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '110px' }}
           >
             <option value="">Tüm Kategoriler</option>
             <option value="Özel">Özel Sektör</option>
             <option value="Kamu">Kamu Kurumu</option>
           </select>
           {(search || typeFilter || catFilter || contractFilter) && (
             <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
               <X size={16}/>
             </button>
           )}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ borderTop: `5px solid ${editId ? 'var(--warning)' : 'var(--primary)'}`, animation: 'fadeIn 0.3s ease-out', marginBottom: '30px' }}>
          <h3>{editId ? 'Müşteri Bilgilerini Düzenle' : 'Yeni Müşteri Kayıt Formu'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label>Müşteri Tipi</label>
                 <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="ctype" checked={formData.customer_type === 'Tüzel Kişi'} onChange={() => setFormData({...formData, customer_type: 'Tüzel Kişi'})} /> Tüzel Kişi
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="ctype" checked={formData.customer_type === 'Gerçek Kişi'} onChange={() => setFormData({...formData, customer_type: 'Gerçek Kişi'})} /> Gerçek Kişi
                   </label>
                 </div>
               </div>
               
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label>Kategori</label>
                 <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="cat" checked={formData.category === 'Özel'} onChange={() => setFormData({...formData, category: 'Özel'})} /> Özel Sektör
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="cat" checked={formData.category === 'Kamu'} onChange={() => setFormData({...formData, category: 'Kamu'})} /> Kamu Kurumu
                   </label>
                 </div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label>Firma Adı / Unvanı</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Vergi Kimlik Numarası (VKN/TCKN)</label>
                <input type="text" value={formData.tax_id} onChange={e => setFormData({...formData, tax_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Vergi Dairesi</label>
                <input type="text" value={formData.tax_office} onChange={e => setFormData({...formData, tax_office: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Yetkili Kişi</label>
                <input type="text" value={formData.authorized_person} onChange={e => setFormData({...formData, authorized_person: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Telefon Numarası</label>
                <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>E-posta Adresi</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Adres Bilgileri</label>
              <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={3}></textarea>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editId && <button type="button" className="btn btn-secondary" onClick={toggleForm}>İptal</button>}
              <button type="submit" className="btn btn-primary">{editId ? 'Değişiklikleri Kaydet' : 'Kaydı Tamamla'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState 
            title="Müşteri Bulunamadı" 
            description="Kriterlere uygun kayıt bulunmuyor." 
            icon={Search}
          />
        ) : (
          <>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Firma Adı / Unvan <ArrowUpDown size={12}/></div>
                    </th>
                    <th>Vergi Numarası & Vergi Dairesi</th>
                    <th>Yetkili & İletişim</th>
                    <th>Adres / Jeneratör Sayısı</th>
                    <th style={{ textAlign: 'center' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(customer => {
                    const hasActiveContract = Array.isArray(contracts) && contracts.some(con => con.customer_id === customer.id && con.status === 'Aktif');
                    const customerGenerators = Array.isArray(generators) ? generators.filter(g => g.customer_id === customer.id) : [];
                    
                    return (
                      <tr key={customer.id}>
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Link to={`/customers/${customer.id}`} style={{ fontWeight: '700', fontSize: '16px', color: 'var(--primary)', textDecoration: 'none' }}>
                               {customer.name}
                            </Link>
                            {hasActiveContract && <span title="Aktif Sözleşmeli"><FileText size={14} color="var(--primary)" /></span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{customer.customer_type} | {customer.category}</div>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ fontSize: '13px' }}>
                            <strong>VKN:</strong> {customer.tax_id || '-'}<br/>
                            <strong>V.D.:</strong> {customer.tax_office || '-'}
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ fontSize: '13px' }}>
                            <strong>Yetkili:</strong> {customer.authorized_person || '-'}<br/>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', color: 'var(--primary)', fontWeight: '600' }}>
                              <Phone size={12}/> {customer.phone}
                            </div>
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', maxWidth: '300px', marginBottom: '10px' }}>
                            <MapPin size={16} color="#64748b" style={{ flexShrink: 0, marginTop: '3px' }}/>
                            <span style={{ fontWeight: '500' }}>{customer.address}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '8px', width: 'fit-content' }}>
                             <Zap size={14} color="var(--primary)"/>
                             <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>{customerGenerators.length} Jeneratör</span>
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => handleEdit(customer)} style={{ padding: '8px' }}>
                              <Edit2 size={16} />
                            </button>
                            <button className="btn btn-secondary" onClick={() => handleDelete(customer.id)} style={{ padding: '8px', color: 'var(--danger)' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px', padding: '15px', borderTop: '1px solid #f1f5f9' }}>
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
    </div>
  );
};

export default Customers;
