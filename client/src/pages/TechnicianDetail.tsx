import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, User, Phone, Wrench, Shield, Calendar, MapPin, Zap, CheckCircle, Clock, Trash2, Search, Loader2, Navigation, ChevronLeft, ChevronRight, ListChecks, History, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Appointment {
  id: number;
  customer_name: string;
  customer_address: string;
  generator_address: string;
  serial_number: string;
  brand?: string;
  model?: string;
  appointment_date: string;
  status: string;
  notes: string;
  assistant_name?: string;
  generator_id: number;
}

interface TechnicianDetail {
  id: number;
  name: string;
  phone: string;
  specialty: string;
  username?: string;
  appointments: Appointment[];
}

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const TechnicianDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tech, setTech] = useState<TechnicianDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewTab, setViewTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/technicians/${id}`);
      setTech(response.data);
    } catch (error) {
      console.error('Error fetching technician detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId: number, status: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status });
      toast.success(`Durum: ${status}`);
      fetchDetail();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteTask = async (appointmentId: number) => {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/appointments/${appointmentId}`);
      toast.success('Görev silindi.');
      fetchDetail();
    } catch (error) {
      toast.error('Silme başarısız.');
    }
  };

  const openInMap = (address: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  if (!tech) return <div className="card">Personel bulunamadı.</div>;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Tamamlandı': return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
      case 'İşlemde': return { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' };
      default: return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    }
  };

  const monthAppointments = tech.appointments.filter(a => {
    const d = new Date(a.appointment_date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const activeTasks = monthAppointments.filter(a => a.status !== 'Tamamlandı');
  const completedTasks = monthAppointments
    .filter(a => a.status === 'Tamamlandı')
    .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/technicians')} style={{ borderRadius: '12px' }}>
           <ArrowLeft size={16}/> Personel Listesi
        </button>

        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '16px', padding: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <button onClick={() => {
              if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
              else setViewMonth(v => v - 1);
            }} className="btn-icon"><ChevronLeft size={18}/></button>
            
            <div style={{ padding: '0 20px', textAlign: 'center', minWidth: '140px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{viewYear}</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{MONTHS[viewMonth]}</div>
            </div>

            <button onClick={() => {
              if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
              else setViewMonth(v => v + 1);
            }} className="btn-icon"><ChevronRight size={18}/></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="card" style={{ borderTop: '6px solid var(--primary)', textAlign: 'center', padding: '40px 30px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '42px', margin: '0 auto 20px', border: '5px solid var(--primary-light)' }}>
              {tech.name.charAt(0)}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: '0 0 8px 0' }}>{tech.name}</h2>
            <div style={{ fontSize: '12px', color: 'var(--primary)', background: 'var(--primary-light)', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontWeight: '800', textTransform: 'uppercase' }}>
               {tech.specialty}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}><Phone size={18} color="#64748b"/></div>
                  <strong>{tech.phone || '-'}</strong>
               </div>
               {tech.username && (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}><Shield size={18} color="#64748b"/></div>
                    <span>Kullanıcı: <strong>{tech.username}</strong></span>
                 </div>
               )}
            </div>
          </div>

          <div className="card">
             <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{MONTHS[viewMonth]} Karnesi</div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                <div style={{ background: 'var(--primary-light)', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>Toplam İş</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)' }}>{monthAppointments.length}</div>
                   </div>
                   <Zap size={32} color="var(--primary)" opacity={0.3}/>
                </div>
                <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>Tamamlanan</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#166534' }}>{completedTasks.length}</div>
                   </div>
                   <CheckCircle size={32} color="#166534" opacity={0.3}/>
                </div>
             </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
           
           <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button 
                onClick={() => setViewTab('active')}
                style={{ 
                  flex: 1, padding: '15px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                  background: viewTab === 'active' ? '#1e293b' : '#fff',
                  color: viewTab === 'active' ? '#fff' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold',
                  boxShadow: viewTab === 'active' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.3s'
                }}
              >
                <ListChecks size={20}/> Bekleyen Görevler ({activeTasks.length})
              </button>
              <button 
                onClick={() => setViewTab('completed')}
                style={{ 
                  flex: 1, padding: '15px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                  background: viewTab === 'completed' ? '#166534' : '#fff',
                  color: viewTab === 'completed' ? '#fff' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold',
                  boxShadow: viewTab === 'completed' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.3s'
                }}
              >
                <History size={20}/> Tamamlananlar ({completedTasks.length})
              </button>
           </div>

           <div style={{ minHeight: '500px' }}>
              {viewTab === 'active' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {activeTasks.length > 0 ? activeTasks.map(task => {
                    const style = getStatusStyle(task.status);
                    const displayAddress = task.generator_address || task.customer_address;
                    
                    return (
                      <div key={task.id} className="card" style={{ 
                        padding: '25px', 
                        borderRadius: '20px', 
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        position: 'relative',
                        borderLeft: `8px solid ${style.color}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                           <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                 <span style={{ fontSize: '10px', fontWeight: '900', padding: '4px 12px', borderRadius: '30px', background: style.color, color: '#fff' }}>{task.status.toUpperCase()}</span>
                                 <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800' }}>{new Date(task.appointment_date).toLocaleDateString('tr-TR')}</span>
                              </div>
                              <h4 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0 }}>{task.customer_name}</h4>
                              {task.assistant_name && (
                                <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                   <User size={14}/> 🤝 Ekip Arkadaşı: {task.assistant_name}
                                </div>
                              )}
                           </div>
                           <button onClick={() => handleDeleteTask(task.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={18}/></button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#475569', fontWeight: '600' }}>
                              <MapPin size={18} color="var(--primary)"/> {displayAddress}
                           </div>
                           {displayAddress && (
                             <button 
                               onClick={() => openInMap(displayAddress)}
                               className="btn btn-primary" 
                               style={{ padding: '8px 16px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px' }}
                             >
                                <Navigation size={16}/> Yol Tarifi
                             </button>
                           )}
                        </div>

                        {task.notes && (
                          <div style={{ background: 'var(--primary-light)', padding: '15px', borderRadius: '12px', fontSize: '13px', color: 'var(--text-main)', fontStyle: 'italic', marginBottom: '20px', borderLeft: '4px solid var(--primary)' }}>
                             <strong>Görev Notu:</strong> "{task.notes}"
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '15px' }}>
                           <button onClick={() => updateStatus(task.id, 'İşlemde')} className="btn btn-secondary" style={{ flex: 1, padding: '15px', fontWeight: '900', background: '#fff', border: '2px solid #e2e8f0' }}>🚩 YOLA ÇIK / BAŞLAT</button>
                           <button onClick={() => updateStatus(task.id, 'Tamamlandı')} className="btn btn-primary" style={{ flex: 1, padding: '15px', fontWeight: '900' }}>✅ GÖREVİ BİTİR</button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: 'center', padding: '100px 20px', color: '#94a3b8', background: '#fff', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                       <Calendar size={64} style={{ opacity: 0.1, marginBottom: '20px' }}/>
                       <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Bekleyen görev bulunmuyor.</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="table-responsive">
                    <table style={{ margin: 0 }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '15px 20px' }}>Tarih</th>
                          <th>Müşteri</th>
                          <th>Marka / Model</th>
                          <th>Seri No</th>
                          <th style={{ textAlign: 'right', paddingRight: '20px' }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedTasks.length > 0 ? completedTasks.slice(0, 5).map(task => (
                          <tr key={task.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '15px 20px', fontWeight: 'bold' }}>{new Date(task.appointment_date).toLocaleDateString('tr-TR')}</td>
                            <td>{task.customer_name}</td>
                            <td>{task.brand} {task.model}</td>
                            <td><code style={{ fontWeight: 'bold' }}>{task.serial_number}</code></td>
                            <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                               <Link to={`/generators/${task.generator_id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>Rapor / PDF</Link>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Henüz tamamlanmış görev yok.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
           </div>
        </div>

      </div>
      <style>{`
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 8px;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: #f1f5f9;
          color: var(--primary);
        }
      `}</style>
    </div>
  );
};

export default TechnicianDetail;
