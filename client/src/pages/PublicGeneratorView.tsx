import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Calendar, Zap, CheckCircle, Clock, Loader2, MapPin, ShieldCheck, ShieldOff, AlertTriangle, Wrench } from 'lucide-react';

interface PublicData {
  id: number;
  serial_number: string;
  model: string;
  brand: string;
  location: string;
  customer_name: string;
  installation_date: string;
  next_maintenance_date: string;
  warranty_status: string;
  warranty_end_date: string;
  records: { service_date: string, description: string }[];
}

const PublicGeneratorView = () => {
  const { hash } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const response = await api.get(`/public/generators/${hash}`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Ekipman bilgisi alınamadı.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [hash]);

  const handleTechLogin = () => {
    if (!data) return;
    const user = localStorage.getItem('user');
    if (user) {
      navigate(`/generators/${data.id}`);
    } else {
      navigate(`/login?redirect=/generators/${data.id}`);
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
      <Loader2 className="animate-spin" size={40} color="#2563eb" />
    </div>
  );

  if (error || !data) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center', background: '#f8fafc' }}>
      <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
      <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Hata Oluştu</h2>
      <p style={{ color: '#64748b', marginTop: '10px' }}>{error || 'Geçersiz QR kod veya bağlantı.'}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Tech Shortcut Button */}
        <button 
          onClick={handleTechLogin}
          style={{ 
            width: '100%', 
            marginBottom: '20px', 
            padding: '12px', 
            borderRadius: '12px', 
            background: '#1e293b', 
            color: '#fff', 
            border: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          <Wrench size={18} /> Saha Personeli Girişi
        </button>
        
        {/* Header Card */}
        <div className="card" style={{ borderTop: '8px solid #2563eb', textAlign: 'center', marginBottom: '25px' }}>
           <img src="/logo-2025.png" alt="Logo" style={{ width: '150px', marginBottom: '20px' }} />
           <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '5px' }}>{data.serial_number}</h1>
           <p style={{ color: '#64748b', fontWeight: '600' }}>{data.customer_name}</p>
           
           <div style={{ display: 'inline-flex', marginTop: '15px' }}>
             {data.warranty_status === 'Var' && new Date(data.warranty_end_date) > new Date() ? (
               <span className="status-badge status-green" style={{ padding: '8px 16px' }}><ShieldCheck size={14} style={{ marginRight: '5px' }}/> GARANTİ KAPSAMINDA</span>
             ) : (
               <span className="status-badge status-red" style={{ padding: '8px 16px' }}><ShieldOff size={14} style={{ marginRight: '5px' }}/> GARANTİ DIŞI</span>
             )}
           </div>
        </div>

        {/* Maintenance Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
           <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>Son Bakım</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb' }}>
                {data.records[0] ? new Date(data.records[0].service_date).toLocaleDateString('tr-TR') : '-'}
              </div>
           </div>
           <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>Gelecek Bakım</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb' }}>
                {new Date(data.next_maintenance_date).toLocaleDateString('tr-TR')}
              </div>
           </div>
        </div>

        {/* Technical Specs */}
        <div className="card" style={{ marginBottom: '25px' }}>
           <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Zap size={20} color="#2563eb" /> Teknik Bilgiler
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Marka / Model:</span>
                <span style={{ fontWeight: '700' }}>{data.brand} / {data.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Lokasyon:</span>
                <span style={{ fontWeight: '700' }}><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />{data.location || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Kurulum Tarihi:</span>
                <span style={{ fontWeight: '700' }}>{data.installation_date}</span>
              </div>
           </div>
        </div>

        {/* Service History */}
        <div className="card">
           <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Calendar size={20} color="#2563eb" /> Servis Geçmişi
           </h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {data.records.length > 0 ? data.records.map((record, index) => (
                <div key={index} style={{ borderLeft: '3px solid #e2e8f0', paddingLeft: '15px', position: 'relative' }}>
                   <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#2563eb', position: 'absolute', left: '-7px', top: '5px' }}></div>
                   <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{new Date(record.service_date).toLocaleDateString('tr-TR')}</div>
                   <p style={{ fontSize: '13px', color: '#64748b', marginTop: '5px', whiteSpace: 'pre-line' }}>{record.description}</p>
                </div>
              )) : (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Henüz servis kaydı bulunmuyor.</p>
              )}
           </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', opacity: 0.5, fontSize: '11px' }}>
          © 2026 Cvspower Dijital Servis Takip Sistemi
        </div>
      </div>
    </div>
  );
};

export default PublicGeneratorView;
