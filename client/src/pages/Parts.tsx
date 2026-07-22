import React, { useEffect, useState } from 'react';
import api from '../api';
import { Search, Plus, Package, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

interface Part {
  id: number;
  name: string;
  part_number: string;
  stock_quantity: number;
  unit: string;
  unit_price: number;
  critical_level: number;
}

const Parts = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [filtered, setFiltered] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastMonths, setForecastMonths] = useState<number>(1);
  const [forecastData, setForecastData] = useState<{ maintenanceCount: number; forecast: any[] } | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const fetchForecast = async () => {
    try {
      setLoadingForecast(true);
      const response = await api.get(`/inventory/forecast?months=${forecastMonths}`);
      setForecastData(response.data);
    } catch (error) {
      console.error('Error fetching inventory forecast:', error);
      toast.error('Öngörü verileri yüklenirken hata oluştu.');
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    if (showForecast) {
      fetchForecast();
    }
  }, [showForecast, forecastMonths]);

  // Stock adjustment modal
  const [stockModal, setStockModal] = useState<{ part: Part; type: 'add' | 'remove' } | null>(null);
  const [stockAmount, setStockAmount] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    part_number: '',
    stock_quantity: 0,
    unit: 'Adet',
    unit_price: 0,
    critical_level: 5
  });

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    const results = parts.filter(p =>
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.part_number || '').toLowerCase().includes(search.toLowerCase())
    );

    results.sort((a, b) => {
      const codeA = (a.part_number || '').toString().trim();
      const codeB = (b.part_number || '').toString().trim();
      return codeA.localeCompare(codeB, 'tr', { numeric: true, sensitivity: 'base' });
    });

    setFiltered(results);
  }, [search, parts]);

  const fetchParts = async () => {
    try {
      const response = await api.get('/parts');
      setParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Parçalar yüklenirken hata oluştu.');
    }
  };

  const handleEdit = (part: Part) => {
    setEditId(part.id);
    setFormData({
      name: part.name,
      part_number: part.part_number,
      stock_quantity: part.stock_quantity,
      unit: part.unit || 'Adet',
      unit_price: part.unit_price || 0,
      critical_level: part.critical_level || 5
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu yedek parçayı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/parts/${id}`);
      fetchParts();
      toast.success('Yedek parça başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Silme işlemi başarısız oldu.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/parts/${editId}`, formData);
        toast.success('Yedek parça başarıyla güncellendi.');
      } else {
        await api.post('/parts', formData);
        toast.success('Yeni yedek parça başarıyla eklendi.');
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', part_number: '', stock_quantity: 0, unit: 'Adet', unit_price: 0, critical_level: 5 });
      fetchParts();
    } catch (error) {
      console.error('Error saving part:', error);
      toast.error('İşlem sırasında hata oluştu. Kod benzersiz olmalıdır.');
    }
  };

  const handleStockAdjust = async () => {
    if (!stockModal || stockAmount <= 0) return;
    const adjustment = stockModal.type === 'add' ? stockAmount : -stockAmount;
    try {
      const res = await api.patch(`/parts/${stockModal.part.id}/stock`, { adjustment });
      toast.success(
        stockModal.type === 'add'
          ? `✅ ${stockModal.part.name}: +${stockAmount} eklendi. Yeni stok: ${res.data.new_quantity} ${stockModal.part.unit}`
          : `📦 ${stockModal.part.name}: -${stockAmount} düşüldü. Yeni stok: ${res.data.new_quantity} ${stockModal.part.unit}`
      );
      setStockModal(null);
      setStockAmount(1);
      fetchParts();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Stok güncelleme başarısız.');
    }
  };

  const criticalParts = parts.filter(p => {
    const stock = Number(p.stock_quantity) || 0;
    const crit = p.critical_level !== null && p.critical_level !== undefined ? Number(p.critical_level) : 5;
    return stock <= crit;
  });
  const outOfStock = parts.filter(p => Number(p.stock_quantity) === 0);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Yedek Parça & Sarf Malzeme Envanteri</h2>
          <p style={{ color: 'var(--text-muted)' }}>Servislerde kullanılacak yedek parçaların stok, birim ve kritik seviye yönetimi.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${showForecast ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowForecast(!showForecast)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <TrendingUp size={18} /> {showForecast ? 'Öngörüyü Gizle' : '30 Günlük Stok Öngörüsü'}
          </button>
          <button className="btn btn-primary" onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditId(null);
              setFormData({ name: '', part_number: '', stock_quantity: 0, unit: 'Adet', unit_price: 0, critical_level: 5 });
            }
          }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> {showForm ? 'Vazgeç' : 'Yeni Parça Ekle'}
          </button>
        </div>
      </div>

      {/* Envanter Öngörüsü Kartı */}
      {showForecast && (
        <div className="card" style={{ borderTop: '5px solid var(--primary)', marginBottom: '24px', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: '800', margin: 0 }}>
              <TrendingUp color="var(--primary)" /> Envanter / Stok İhtiyacı Öngörüsü
            </h3>
            
            {/* Süre Seçici */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)' }}>
              {[
                { label: '1 Ay', val: 1 },
                { label: '3 Ay', val: 3 },
                { label: '6 Ay', val: 6 },
                { label: '1 Yıl', val: 12 }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setForecastMonths(opt.val)}
                  style={{
                    border: 'none',
                    background: forecastMonths === opt.val ? 'var(--primary)' : 'transparent',
                    color: forecastMonths === opt.val ? '#fff' : 'var(--text-main)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
            Önümüzdeki {forecastMonths * 30} gün içinde planlanmış ve geçmişte vadesi gelmiş (gecikmiş) olan bakım programlarına ve jeneratör sayılarına göre tahmini envanter ihtiyacı.
          </p>

          {loadingForecast ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '30px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Öngörü verileri hesaplanıyor...</span>
            </div>
          ) : forecastData ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Planlanan & Gecikmiş Toplam Bakım Sayısı: </span>
                <strong style={{ fontSize: '18px', color: 'var(--primary)' }}>{forecastData.maintenanceCount} Jeneratör</strong>
              </div>

              {forecastData.forecast.length > 0 ? (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Parça Kodu</th>
                        <th>Parça Adı</th>
                        <th>Mevcut Stok</th>
                        <th>Gerekli Tahmin</th>
                        <th>Açık / İhtiyaç</th>
                        <th>Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.forecast.map((item, idx) => {
                        const hasShortage = item.shortage > 0;
                        return (
                          <tr key={idx} style={{ background: hasShortage ? 'rgba(239,68,68,0.03)' : undefined }}>
                            <td>
                              <code style={{ fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                {item.part_number}
                              </code>
                            </td>
                            <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                            <td>{item.stock_quantity} {item.unit}</td>
                            <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{item.needed} {item.unit}</td>
                            <td>
                              {hasShortage ? (
                                <span style={{ color: 'var(--danger)', fontWeight: '800' }}>
                                  ⚠️ {item.shortage} {item.unit} Eksik
                                </span>
                              ) : (
                                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                                  ✓ Yeterli
                                </span>
                              )}
                            </td>
                            <td>
                              {hasShortage && (
                                <button 
                                  className="btn btn-secondary" 
                                  onClick={() => { setStockModal({ part: item, type: 'add' }); setStockAmount(item.shortage); }}
                                  style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                >
                                  Eksik Stok Ekle
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>Bakım programlarında gereksinim duyulan filtre veya yağ kalemi envanterde eşleşmedi.</div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Critical Stock Alert Banner */}
      {criticalParts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
          border: '1px solid rgba(239,68,68,0.3)',
          borderLeft: '5px solid var(--danger)',
          borderRadius: '12px', padding: '16px 20px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <AlertTriangle size={20} color="var(--danger)" />
            <span style={{ fontWeight: '800', color: 'var(--danger)', fontSize: '15px' }}>
              {outOfStock.length > 0
                ? `⚠️ ${outOfStock.length} parçanın stoğu tükendi, ${criticalParts.length} parça kritik seviyede!`
                : `⚠️ ${criticalParts.length} parça kritik stok seviyesinde!`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {criticalParts.map(p => (
              <button
                key={p.id}
                onClick={() => { setStockModal({ part: p, type: 'add' }); setStockAmount(p.critical_level || 5); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: p.stock_quantity === 0 ? 'var(--danger)' : 'rgba(239,68,68,0.15)',
                  color: p.stock_quantity === 0 ? '#fff' : 'var(--danger)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: '20px', padding: '4px 12px', fontSize: '12px',
                  fontWeight: '700', cursor: 'pointer'
                }}
              >
                {p.stock_quantity === 0 ? '🚫' : '⚠️'} {p.name}: {p.stock_quantity} {p.unit} → Stok Ekle
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 30px', marginBottom: '24px' }}>
        <Search size={20} color="#9ca3af" />
        <input
          type="text"
          placeholder="Parça adı veya koduna göre ara..."
          style={{ border: 'none', width: '100%', fontSize: '16px', outline: 'none', background: 'transparent', color: 'var(--text-main)' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {/* Quick stats */}
        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Toplam: <strong style={{ color: 'var(--primary)' }}>{parts.length}</strong>
          </span>
          {criticalParts.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger)', whiteSpace: 'nowrap' }}>
              Kritik: <strong>{criticalParts.length}</strong>
            </span>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ borderTop: `5px solid ${editId ? 'var(--warning)' : 'var(--primary)'}`, marginBottom: '30px' }}>
          <h3>{editId ? 'Yedek Parça Düzenle' : 'Yeni Yedek Parça Ekle'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label>Parça Adı</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.replace(/[0-9]/g, '') })} placeholder="Örn: Yağ Filtresi" />
              </div>
              <div className="form-group">
                <label>Parça Kodu / Numarası</label>
                <input type="text" required value={formData.part_number} onChange={e => setFormData({ ...formData, part_number: e.target.value })} placeholder="Örn: LF16015" />
              </div>
              <div className="form-group">
                <label>Mevcut Stok Miktarı</label>
                <input type="text" required value={formData.stock_quantity} onChange={e => setFormData({ ...formData, stock_quantity: Number(e.target.value.replace(/[^0-9]/g, '')) })} />
              </div>
              <div className="form-group">
                <label>Birim</label>
                <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                  <option value="Adet">Adet</option>
                  <option value="Litre">Litre</option>
                  <option value="Metre">Metre</option>
                  <option value="Kg">Kg</option>
                  <option value="Set">Set</option>
                  <option value="Takım">Takım</option>
                </select>
              </div>
              <div className="form-group">
                <label>Birim Fiyatı (TL)</label>
                <input type="text" required value={formData.unit_price} onChange={e => setFormData({ ...formData, unit_price: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
              </div>
              <div className="form-group">
                <label>Kritik Stok Seviyesi</label>
                <input type="text" required value={formData.critical_level} onChange={e => setFormData({ ...formData, critical_level: Number(e.target.value.replace(/[^0-9]/g, '')) })} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">{editId ? 'Değişiklikleri Kaydet' : 'Parçayı Kaydet'}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="Yedek Parça Bulunamadı"
          description="Envanterde arama kriterlerine uygun kayıt bulunmuyor."
          icon={Package}
        />
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ margin: 0 }}>
              <thead style={{ background: 'var(--bg-input)' }}>
                <tr>
                  <th style={{ padding: '20px', color: 'var(--text-main)' }}>Parça Kodu</th>
                  <th style={{ color: 'var(--text-main)' }}>Parça Adı</th>
                  <th style={{ color: 'var(--text-main)' }}>Stok Durumu</th>
                  <th style={{ color: 'var(--text-main)' }}>Birim Fiyat</th>
                  <th style={{ color: 'var(--text-main)' }}>Kritik Limit</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px', color: 'var(--text-main)' }}>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(part => {
                  const stockVal = Number(part.stock_quantity) || 0;
                  const critVal = part.critical_level !== null && part.critical_level !== undefined ? Number(part.critical_level) : 5;
                  const isCritical = stockVal <= critVal;
                  const isOutOfStock = stockVal === 0;
                  return (
                    <tr key={part.id} style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: isOutOfStock ? 'rgba(239,68,68,0.04)' : isCritical ? 'rgba(245,158,11,0.03)' : undefined
                    }}>
                      <td style={{ padding: '16px 20px' }}>
                        <code style={{ fontSize: '13px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          {part.part_number}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>{part.name}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontWeight: 'bold', fontSize: '15px',
                            color: isOutOfStock ? 'var(--danger)' : isCritical ? '#f59e0b' : 'var(--success)'
                          }}>
                            {part.stock_quantity} {part.unit}
                          </span>
                          {isOutOfStock && (
                            <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 7px', borderRadius: '4px' }}>
                              TÜKENDI
                            </span>
                          )}
                          {!isOutOfStock && isCritical && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.15)', color: '#b45309', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                              <AlertTriangle size={10} /> KRİTİK
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                        {part.unit_price.toLocaleString('tr-TR')} TL
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {part.critical_level} {part.unit}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary"
                            title="Stok Ekle"
                            style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', borderColor: '#10b981' }}
                            onClick={() => { setStockModal({ part, type: 'add' }); setStockAmount(1); }}
                          >
                            <TrendingUp size={14} /> Ekle
                          </button>
                          <button
                            className="btn btn-secondary"
                            title="Stok Düş"
                            style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', borderColor: '#f59e0b' }}
                            onClick={() => { setStockModal({ part, type: 'remove' }); setStockAmount(1); }}
                            disabled={part.stock_quantity === 0}
                          >
                            <TrendingDown size={14} /> Düş
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleEdit(part)}><Edit2 size={16} /></button>
                          <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDelete(part.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card-solid)', borderRadius: '20px',
            padding: '32px', width: '100%', maxWidth: '420px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
                  {stockModal.type === 'add' ? '📦 Stok Girişi' : '📤 Stok Çıkışı'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {stockModal.part.name} <code style={{ fontSize: '11px' }}>({stockModal.part.part_number})</code>
                </p>
              </div>
              <button onClick={() => setStockModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'var(--bg-input)', borderRadius: '10px',
              padding: '12px 16px', marginBottom: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mevcut Stok</span>
              <span style={{ fontWeight: '800', fontSize: '18px', color: stockModal.part.stock_quantity === 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                {stockModal.part.stock_quantity} {stockModal.part.unit}
              </span>
            </div>

            <div className="form-group">
              <label>{stockModal.type === 'add' ? 'Eklenecek Miktar' : 'Düşülecek Miktar'}</label>
              <input
                type="number"
                min="1"
                max={stockModal.type === 'remove' ? stockModal.part.stock_quantity : undefined}
                value={stockAmount}
                onChange={e => setStockAmount(Math.max(1, parseInt(e.target.value) || 1))}
                autoFocus
              />
            </div>

            {stockAmount > 0 && (
              <div style={{
                background: stockModal.type === 'add' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${stockModal.type === 'add' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
                fontSize: '13px', color: 'var(--text-muted)'
              }}>
                {stockModal.type === 'add' ? 'Yeni stok: ' : 'Kalan stok: '}
                <strong style={{ color: stockModal.type === 'add' ? '#10b981' : 'var(--danger)', fontSize: '15px' }}>
                  {stockModal.type === 'add'
                    ? stockModal.part.stock_quantity + stockAmount
                    : stockModal.part.stock_quantity - stockAmount} {stockModal.part.unit}
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setStockModal(null)}>İptal</button>
              <button
                className="btn btn-primary"
                onClick={handleStockAdjust}
                style={{ background: stockModal.type === 'add' ? '#10b981' : '#f59e0b' }}
                disabled={stockModal.type === 'remove' && stockAmount > stockModal.part.stock_quantity}
              >
                {stockModal.type === 'add' ? `+${stockAmount} Stok Ekle` : `-${stockAmount} Stok Düş`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parts;
