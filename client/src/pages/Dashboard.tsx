import React from 'react';
import api from '../api';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  TrendingUp, 
  Loader2, 
  FileText, 
  Navigation, 
  Users, 
  FileSignature,
  Calendar,
  Layers,
  ArrowUpRight,
  Package
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Generator {
  id: number;
  customer_name: string;
  serial_number: string;
  model: string;
  next_maintenance_date: string;
}

interface Contract {
  id: number;
  customer_name: string;
  end_date: string;
  status: string;
  price: number;
}

interface Technician {
  id: number;
  name: string;
}

interface Appointment {
  id: number;
  technician_name: string;
  assistant_name?: string;
  status: string;
  customer_name: string;
  appointment_date: string;
  generator_address?: string;
  customer_address?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: generators = [], isLoading, refetch, isFetching } = useQuery<Generator[]>({
    queryKey: ['generators'],
    queryFn: async () => {
      const response = await api.get('/generators');
      return response.data;
    }
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: async () => {
      const response = await api.get('/contracts');
      return response.data;
    }
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await api.get('/appointments');
      return response.data;
    }
  });

  const { data: technicians = [] } = useQuery<Technician[]>({
    queryKey: ['technicians'],
    queryFn: async () => {
      const response = await api.get('/technicians');
      return response.data;
    }
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    }
  });

  const { data: quotes = [] } = useQuery<any[]>({
    queryKey: ['quotes'],
    queryFn: async () => {
      const response = await api.get('/quotes');
      return response.data;
    }
  });

  const { data: parts = [] } = useQuery<any[]>({
    queryKey: ['parts'],
    queryFn: async () => {
      const response = await api.get('/parts');
      return response.data;
    }
  });

  const calculateDaysLeft = (dateString: string | null | undefined): number => {
    if (!dateString) return 9999; // No date set → treat as safe, not urgent
    const parts = dateString.split('T')[0].split('-');
    if (parts.length !== 3) return 9999;
    // Parse as local time to avoid UTC midnight → previous-day shift
    const nextDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(nextDate.getTime())) return 9999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const openInMap = (address: string) => {
    if (!address) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const stats = {
    total: generators.length,
    // Overdue: maintenance date is in the past
    overdue: generators.filter(g => calculateDaysLeft(g.next_maintenance_date) < 0).length,
    // Acil: due within 0–14 days (not yet past due)
    critical: generators.filter(g => {
      const d = calculateDaysLeft(g.next_maintenance_date);
      return d >= 0 && d < 15;
    }).length,
    warning: generators.filter(g => {
      const d = calculateDaysLeft(g.next_maintenance_date);
      return d >= 15 && d <= 30;
    }).length,
    ok: generators.filter(g => calculateDaysLeft(g.next_maintenance_date) > 30).length,
    expiringContracts: contracts.filter(c => c.status === 'Aktif' && calculateDaysLeft(c.end_date) < 30).length,
    totalContractValue: contracts.filter(c => c.status === 'Aktif').reduce((sum, c) => sum + (c.price || 0), 0),
    pendingQuotes: quotes.filter((q: any) => q.status === 'Gönderildi').length,
    approvedQuotesTotal: quotes.filter((q: any) => q.status === 'Onaylandı').reduce((sum: number, q: any) => sum + (q.grand_total || 0), 0),
    totalQuotes: quotes.length,
    draftQuotes: quotes.filter((q: any) => q.status === 'Taslak').length,
    criticalParts: parts.filter((p: any) => {
      const stock = Number(p.stock_quantity) || 0;
      const crit = p.critical_level !== null && p.critical_level !== undefined ? Number(p.critical_level) : 5;
      return stock <= crit;
    }).length,
  };

  const pieData = {
    labels: ['Gecikmiş (Geçti)', 'Acil (0-14 gün)', 'Yaklaşan (15-30 gün)', 'Güvenli (>30 gün)'],
    datasets: [{
      data: [stats.overdue, stats.critical, stats.warning, stats.ok],
      backgroundColor: ['#7c3aed', '#ef4444', '#f59e0b', '#10b981'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const pieOptions = {
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${context.label}: ${context.raw} Jeneratör`
        }
      }
    },
    cutout: '72%',
    maintainAspectRatio: false
  };

  const todayStr = new Date().toLocaleDateString('sv-SE');
  const completedToday = appointments.filter(a => a.status === 'Tamamlandı' && a.appointment_date === todayStr).slice(0, 5);

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: '24px',
        padding: '30px 40px',
        color: '#ffffff',
        marginBottom: '35px',
        boxShadow: '0 10px 30px -5px rgba(229, 169, 0, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800', margin: 0, color: '#ffffff' }}>Akan Enerji Yönetim Paneli</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.85)', margin: '6px 0 0', fontSize: '15px' }}>
            Jeneratör filosu, sözleşmeler ve saha ekiplerinin gerçek zamanlı operasyon izleme merkezi.
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => refetch()} 
          disabled={isFetching}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '700',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          {isFetching ? 'Veriler Alınıyor...' : '🔄 Paneli Yenile'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        
        {/* Total Generators */}
        <div className="card stat-card" onClick={() => navigate('/generators')} style={{ cursor: 'pointer', borderLeft: '6px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam Ekipman</h4>
            <div className="value" style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '14px' }}>
            <Zap size={24} />
          </div>
        </div>

        {/* Overdue Maintenance */}
        <div className="card stat-card" onClick={() => navigate('/generators', { state: { filter: 'critical' } })} style={{ cursor: 'pointer', borderLeft: '6px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bakımı Geçmiş</h4>
            <div className="value" style={{ fontSize: '30px', fontWeight: '800', color: '#7c3aed' }}>{stats.overdue}</div>
          </div>
          <div style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '12px', borderRadius: '14px', position: 'relative' }}>
            <AlertTriangle size={24} />
            {stats.overdue > 0 && (
              <span className="animate-ping" style={{ position: 'absolute', top: '-4px', right: '-4px', width: '12px', height: '12px', background: '#7c3aed', borderRadius: '50%' }} />
            )}
          </div>
        </div>

        {/* Critical Maintenance (0-14 days) */}
        <div className="card stat-card" onClick={() => navigate('/generators', { state: { filter: 'critical' } })} style={{ cursor: 'pointer', borderLeft: '6px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acil Müdahale</h4>
            <div className="value" style={{ fontSize: '30px', fontWeight: '800', color: 'var(--danger)' }}>{stats.critical}</div>
          </div>
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '12px', borderRadius: '14px', position: 'relative' }}>
            <AlertTriangle size={24} />
            {stats.critical > 0 && (
              <span className="animate-ping" style={{ position: 'absolute', top: '-4px', right: '-4px', width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '50%' }} />
            )}
          </div>
        </div>

        {/* Upcoming Services */}
        <div className="card stat-card" onClick={() => navigate('/generators', { state: { filter: 'warning' } })} style={{ cursor: 'pointer', borderLeft: '6px solid var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yaklaşan Servis</h4>
            <div className="value" style={{ fontSize: '30px', fontWeight: '800', color: 'var(--warning)' }}>{stats.warning}</div>
          </div>
          <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '12px', borderRadius: '14px' }}>
            <Calendar size={24} />
          </div>
        </div>

        {/* Expiring Contracts */}
        <div className="card stat-card" onClick={() => navigate('/contracts', { state: { filter: 'expiring' } })} style={{ cursor: 'pointer', borderLeft: '6px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Biten Sözleşme</h4>
            <div className="value" style={{ fontSize: '30px', fontWeight: '800', color: '#8b5cf6' }}>{stats.expiringContracts}</div>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '12px', borderRadius: '14px' }}>
            <FileText size={24} />
          </div>
        </div>

        {/* Pending Quotes */}
        <div className="card stat-card" onClick={() => navigate('/quotes')} style={{ cursor: 'pointer', borderLeft: '6px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Onay Bekleyen</h4>
            <div className="value" style={{ fontSize: '30px', fontWeight: '800', color: '#f59e0b' }}>{stats.pendingQuotes}</div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '12px', borderRadius: '14px' }}>
            <FileSignature size={24} />
          </div>
        </div>

      </div>

      {/* Main Body Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '35px' }}>
        
        {/* Field Operation Status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
           <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Activity size={20} color="var(--primary)" /> Saha Operasyon Durumu
           </h3>
           <div className="table-responsive" style={{ flex: 1 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                 <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                       <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>TEKNİSYEN</th>
                       <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>DURUM</th>
                       <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>SON KONUM / BUGÜNKÜ İŞ</th>
                       <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>AKSİYON</th>
                    </tr>
                 </thead>
                 <tbody>
                    {technicians.map(tech => {
                      const activeJob = appointments.find(a => (a.technician_name === tech.name || a.assistant_name === tech.name) && a.status === 'İşlemde');
                      const completedCount = appointments.filter(a => 
                        (a.technician_name === tech.name || a.assistant_name === tech.name) && 
                        a.status === 'Tamamlandı' &&
                        a.appointment_date === todayStr
                      ).length;
                      const addr = activeJob?.generator_address || activeJob?.customer_address;
                      
                      return (
                        <tr key={tech.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                           <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-main)' }}>{tech.name}</td>
                           <td style={{ padding: '16px' }}>
                              {activeJob ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  background: 'rgba(245, 158, 11, 0.1)', color: '#b45309',
                                  fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px'
                                }}>
                                  <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #f59e0b' }} />
                                  SAHADA ÇALIŞIYOR
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  background: 'rgba(16, 185, 129, 0.1)', color: '#065f46',
                                  fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px'
                                }}>
                                  <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                                  BOŞTA / HAZIR
                                </span>
                              )}
                           </td>
                           <td style={{ padding: '16px', fontSize: '13px' }}>
                              {activeJob ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                   <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>📍 {activeJob.customer_name}</span>
                                   {activeJob.assistant_name && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Yardımcı: {activeJob.assistant_name}</span>}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Bugün {completedCount} iş tamamladı.</span>
                              )}
                           </td>
                           <td style={{ padding: '16px', textAlign: 'center' }}>
                              {activeJob && addr ? (
                                <button 
                                  onClick={() => openInMap(addr)} 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                   <Navigation size={13}/> Harita
                                </button>
                              ) : '-'}
                           </td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Fleet Health Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '800', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--primary)" /> Filo Bakım Sağlığı
          </h3>
          
          <div style={{ width: '160px', height: '160px', position: 'relative', margin: '15px 0' }}>
            <Doughnut data={pieData} options={pieOptions} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-main)' }}>{stats.total}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Cihaz</div>
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(124,58,237,0.08)', borderRadius: '8px' }}>
              <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>🟣 Bakımı Geçmiş</span>
              <strong>{stats.overdue}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>🔴 Acil (0-14 gün)</span>
              <strong>{stats.critical}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px' }}>
              <span style={{ color: '#b45309', fontWeight: 'bold' }}>🟡 Yaklaşan (15-30 gün)</span>
              <strong>{stats.warning}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px' }}>
              <span style={{ color: '#065f46', fontWeight: 'bold' }}>🟢 Güvenli (&gt;30 gün)</span>
              <strong>{stats.ok}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Financial Overview & Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
         
         {/* Financial Overview Card */}
         <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '800' }}>Finansal Göstergeler</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', width: '100%', marginBottom: '20px' }}>
               
               <div onClick={() => navigate('/customers')} style={{ cursor: 'pointer', background: 'var(--bg-input)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', background: 'var(--primary-light)', padding: '10px', borderRadius: '50%', color: 'var(--primary)', marginBottom: '8px' }}>
                     <Users size={20} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Müşteri</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>{customers.length}</div>
               </div>

               <div onClick={() => navigate('/contracts')} style={{ cursor: 'pointer', background: 'var(--bg-input)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', background: 'rgba(139, 92, 246, 0.15)', padding: '10px', borderRadius: '50%', color: '#8b5cf6', marginBottom: '8px' }}>
                     <FileText size={20} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Sözleşme</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{contracts.length}</div>
               </div>

               <div onClick={() => navigate('/quotes')} style={{ cursor: 'pointer', background: 'var(--bg-input)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', background: 'rgba(245, 158, 11, 0.15)', padding: '10px', borderRadius: '50%', color: '#f59e0b', marginBottom: '8px' }}>
                     <FileSignature size={20} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Teklif</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>{stats.totalQuotes}</div>
               </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
               <div className="card" onClick={() => navigate('/contracts')} style={{ cursor: 'pointer', background: 'var(--bg-input)', borderTop: '4px solid #10b981', padding: '16px', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 6px 0' }}>AKTİF SÖZLEŞME HACMİ</h4>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>
                     {stats.totalContractValue.toLocaleString('tr-TR')} TL
                  </div>
               </div>

               <div className="card" onClick={() => navigate('/quotes')} style={{ cursor: 'pointer', background: 'var(--bg-input)', borderTop: '4px solid #f59e0b', padding: '16px', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 6px 0' }}>ONAYLANAN TEKLİF CİROSU</h4>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>
                     {stats.approvedQuotesTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </div>
               </div>
            </div>
         </div>

         {/* Recent Activity Card */}
         <div className="card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '800' }}>Anlık İş Akışı (Bugün)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', flex: 1 }}>
               {completedToday.length > 0 ? completedToday.map(a => (
                 <div key={a.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ background: 'var(--success-light)', padding: '8px', borderRadius: '8px', color: 'var(--success)' }}>
                       <CheckCircle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{a.customer_name}</div>
                       <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                         Teknisyen: {a.technician_name} {a.assistant_name ? `& ${a.assistant_name}` : ''}
                       </div>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '800', background: 'var(--success-light)', padding: '3px 8px', borderRadius: '12px' }}>
                      TAMAMLANDI
                    </span>
                 </div>
               )) : (
                 <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                    <CheckCircle size={36} style={{ opacity: 0.15, alignSelf: 'center', marginBottom: '10px' }} />
                    Bugün henüz tamamlanan saha operasyonu bulunmuyor.
                 </div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
};

export default Dashboard;
