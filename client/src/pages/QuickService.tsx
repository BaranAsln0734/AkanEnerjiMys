import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Zap, User, Settings, ClipboardCheck, ArrowRight } from 'lucide-react';
import api from '../api';

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface Generator {
  id: number;
  customer_id: number;
  serial_number: string;
  brand: string;
  model: string;
  kva?: string;
}

const QuickService = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedGenId, setSelectedGenId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get('/customers')
      .then(res => {
        setCustomers(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading customers:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setGenerators([]);
      setSelectedGenId('');
      return;
    }
    // Fetch generators for selected customer
    api.get('/generators')
      .then(res => {
        const filtered = res.data.filter((g: any) => g.customer_id === Number(selectedCustomerId));
        setGenerators(filtered);
        if (filtered.length > 0) {
          setSelectedGenId(filtered[0].id.toString());
        } else {
          setSelectedGenId('');
        }
      })
      .catch(err => console.error('Error loading generators:', err));
  }, [selectedCustomerId]);

  const handleStartService = () => {
    if (!selectedGenId) return;
    navigate(`/generators/${selectedGenId}?startService=true`);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '10px' }}>
      <div className="page-header" style={{ marginBottom: '25px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: '800' }}>
          <ClipboardCheck size={26} style={{ color: 'var(--primary)' }} /> Hızlı Servis Başlat
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px' }}>
          Jeneratörü ve müşteriyi seçerek doğrudan servis raporu formunu açın.
        </p>
      </div>

      <div className="card" style={{ padding: '30px', borderRadius: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Müşteriler yükleniyor...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Step 1: Customer Selection */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                1. Müşteri / Firma Seçin
              </label>
              
              {/* Search filter for ease of select */}
              <input
                type="text"
                placeholder="Firma ismi arayın..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  width: '100%',
                  marginBottom: '10px',
                  fontSize: '14px'
                }}
              />

              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  width: '100%',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Firma Seçiniz --</option>
                {filteredCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Generator Selection */}
            {selectedCustomerId && (
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                  2. Jeneratör Seçin
                </label>
                {generators.length > 0 ? (
                  <select
                    value={selectedGenId}
                    onChange={e => setSelectedGenId(e.target.value)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      width: '100%',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {generators.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.brand} {g.model} ({g.serial_number}) {g.kva ? `- ${g.kva} kVA` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ 
                    padding: '12px', 
                    background: 'var(--bg-hover)', 
                    borderRadius: '10px', 
                    color: 'var(--danger)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    Bu firmaya kayıtlı jeneratör bulunamadı! Lütfen önce Jeneratörler sayfasından cihaz ekleyin.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Trigger Button */}
            <div style={{ marginTop: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={handleStartService}
                disabled={!selectedGenId}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  fontWeight: '800',
                  fontSize: '15px',
                  borderRadius: '12px',
                  cursor: selectedGenId ? 'pointer' : 'not-allowed',
                  opacity: selectedGenId ? 1 : 0.6
                }}
              >
                <Play size={18} fill="currentColor" /> Servis Formunu Aç
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default QuickService;
