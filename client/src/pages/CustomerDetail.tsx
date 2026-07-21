import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, User, Phone, MapPin, Mail, FileText, Zap, Calendar, ClipboardCheck, Loader2, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Generator {
  id: number;
  serial_number: string;
  brand: string;
  model: string;
  location: string;
  kva: string;
  contract_status: string;
}

interface Contract {
  id: number;
  contract_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface CustomerDetail {
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
  generators: Generator[];
  contracts: Contract[];
  user_account: { id: number; username: string; name: string } | null;
}

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User account form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const fetchCustomerQuotes = async () => {
    try {
      const response = await api.get('/quotes');
      const filtered = Array.isArray(response.data) ? response.data.filter((q: any) => 
        q.customer_id === Number(id)
      ) : [];
      filtered.sort((a: any, b: any) => new Date(b.quote_date).getTime() - new Date(a.quote_date).getTime());
      setQuotes(filtered);
    } catch (error) {
      console.error('Error fetching customer quotes:', error);
    }
  };

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/customers/${id}`);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customer detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchCustomerQuotes();
  }, [id]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !username.trim() || !password.trim()) return;

    try {
      setIsCreatingAccount(true);
      await api.post('/auth/register', {
        username,
        password,
        role: 'customer',
        name: customer.authorized_person || customer.name,
        customer_id: customer.id
      });
      toast.success('Müşteri portalı erişim hesabı oluşturuldu.');
      setUsername('');
      setPassword('');
      fetchDetail();
    } catch (err: any) {
      console.error('Error creating customer account:', err);
      const msg = err.response?.data?.error || 'Hesap oluşturulurken bir hata oluştu.';
      toast.error(msg);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleDeleteAccount = async (userId: number) => {
    if (!window.confirm('Bu müşterinin portal erişim hesabını silmek istediğinize emin misiniz?')) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Müşteri portalı hesabı silindi.');
      fetchDetail();
    } catch (err) {
      console.error('Error deleting customer account:', err);
      toast.error('Hesap silinemedi.');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  if (!customer) return <div className="card">Müşteri bulunamadı.</div>;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
         <ArrowLeft size={16}/> Geri Dön
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '30px' }}>
        
        {/* Left Column: Customer Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card" style={{ borderTop: '6px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
               <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '12px' }}>
                  <User size={32} color="var(--primary)"/>
               </div>
               <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>{customer.name}</h2>
                  <span className="status-badge" style={{ marginTop: '5px' }}>{customer.customer_type}</span>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={18} color="#64748b"/>
                  <span style={{ fontWeight: '600' }}>{customer.phone}</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={18} color="#64748b"/>
                  <span>{customer.email || '-'}</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <MapPin size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '3px' }}/>
                  <span style={{ fontSize: '14px', lineHeight: '1.5' }}>{customer.address}</span>
               </div>
            </div>

            <div style={{ marginTop: '25px', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
               <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>Vergi Bilgileri</div>
               <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>VKN/TCKN:</span> <strong>{customer.tax_id || '-'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Vergi Dairesi:</span> <strong>{customer.tax_office || '-'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Yetkili:</span> <strong>{customer.authorized_person || '-'}</strong></div>
               </div>
            </div>
          </div>

          {/* Müşteri Portalı Giriş Hesabı Yönetim Kartı */}
          <div className="card">
             <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} color="var(--primary)"/> Portala Erişim Hesabı
             </h3>
             {customer.user_account ? (
                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                   <div style={{ fontWeight: '700', fontSize: '14px', color: '#166534' }}>Erişim Yetkisi Aktif</div>
                   <div style={{ fontSize: '13px', marginTop: '10px' }}>
                      Kullanıcı Adı: <strong>{customer.user_account.username}</strong>
                   </div>
                   <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleDeleteAccount(customer.user_account!.id)}
                      style={{ marginTop: '15px', width: '100%', color: 'var(--danger)', borderColor: 'var(--danger)', fontWeight: 'bold' }}
                   >
                      Erişim Hesabını Sil
                   </button>
                </div>
             ) : (
                <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Bu müşterinin kendi jeneratörlerini ve raporlarını görebilmesi için bir giriş hesabı tanımlayın.</p>
                   <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', marginBottom: '4px' }}>Kullanıcı Adı</label>
                      <input 
                         type="text" 
                         required 
                         placeholder="örn: akn_musteri1" 
                         value={username} 
                         onChange={e => setUsername(e.target.value)} 
                         style={{ padding: '8px', fontSize: '13px' }}
                      />
                   </div>
                   <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', marginBottom: '4px' }}>Şifre</label>
                      <input 
                         type="password" 
                         required 
                         placeholder="En az 6 karakter" 
                         value={password} 
                         onChange={e => setPassword(e.target.value)} 
                         style={{ padding: '8px', fontSize: '13px' }}
                      />
                   </div>
                   <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={isCreatingAccount}
                      style={{ width: '100%', marginTop: '5px', padding: '10px', fontWeight: 'bold' }}
                   >
                      {isCreatingAccount ? 'Hesap Oluşturuluyor...' : 'Erişim Hesabı Tanımla'}
                   </button>
                </form>
             )}
          </div>

          <div className="card">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <FileText size={20} color="var(--primary)"/> Sözleşme Geçmişi
                </h3>
                <button 
                   className="btn btn-primary" 
                   onClick={() => navigate('/contracts', { state: { openForm: true, preselectedCustomerId: customer.id, returnToCustomer: true } })}
                   style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                   <Plus size={14} /> Sözleşme Ekle
                </button>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {customer.contracts.length > 0 ? customer.contracts.map(con => (
                  <div key={con.id} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9', background: con.status === 'Aktif' ? '#f0fdf4' : '#fff' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{con.contract_type} Anlaşma</span>
                        <span className={`status-badge ${con.status === 'Aktif' ? 'status-green' : 'status-red'}`} style={{ fontSize: '10px' }}>{con.status}</span>
                     </div>
                     <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>{con.start_date} / {con.end_date}</div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>Kayıtlı sözleşme bulunmuyor.</div>
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Generators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
           <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                 <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Zap size={22} color="var(--primary)"/> Kayıtlı Jeneratörler
                 </h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                     <span className="status-badge" style={{ background: 'var(--primary)', color: '#fff' }}>{customer.generators.length} Ekipman</span>
                     <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/generators', { state: { openForm: true, preselectedCustomerId: customer.id, returnToCustomer: true } })}
                        style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}
                     >
                        <Plus size={14} /> Jeneratör Ekle
                     </button>
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                 {customer.generators.length > 0 ? customer.generators.map(gen => (
                   <div key={gen.id} className="card" style={{ margin: 0, padding: '20px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: 'none', transition: 'transform 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                         <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                               <span style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>{gen.brand} {gen.model}</span>
                               <span className={`status-badge ${gen.contract_status === 'Var' ? 'status-green' : 'status-red'}`} style={{ fontSize: '10px' }}>
                                 {gen.contract_status === 'Var' ? 'SÖZLEŞMELİ' : 'SÖZLEŞMESİZ'}
                               </span>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
                               <span>Seri No: <strong style={{ color: 'var(--primary)' }}>{gen.serial_number}</strong></span>
                               <span>Güç: <strong>{gen.kva || '-'} kVA</strong></span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                               <MapPin size={14}/> {gen.location || 'Lokasyon Belirtilmemiş'}
                            </div>
                         </div>
                         <Link to={`/generators/${gen.id}`} className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '12px' }}>
                            Yönet & Detay
                         </Link>
                      </div>
                   </div>
                 )) : (
                   <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                      <Zap size={48} color="#e2e8f0" style={{ marginBottom: '15px' }}/>
                      <div style={{ color: '#64748b' }}>Bu müşteriye ait kayıtlı jeneratör bulunmuyor.</div>
                   </div>
                 )}
              </div>
           </div>

           <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} color="var(--primary)"/> Yapılan Teklifler
                 </h3>
              </div>
              <div className="table-responsive">
                <table>
                  <thead>
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
                        <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '13px' }}>Bu müşteriye henüz teklif yapılmamış.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerDetail;
