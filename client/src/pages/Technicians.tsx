import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Search, UserPlus, Phone, Wrench, Shield, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

interface Technician {
  id: number;
  name: string;
  phone: string;
  specialty: string;
  username: string;
}

const Technicians = () => {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [filtered, setFiltered] = useState<Technician[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialty: 'Genel Bakım',
    username: '',
    password: ''
  });

  useEffect(() => {
    fetchTechs();
  }, []);

  useEffect(() => {
    const results = techs.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialty.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(results);
  }, [search, techs]);

  const fetchTechs = async () => {
    try {
      const response = await api.get('/technicians');
      setTechs(response.data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleEdit = (tech: Technician) => {
    setEditId(tech.id);
    setFormData({
      name: tech.name,
      phone: tech.phone || '',
      specialty: tech.specialty || 'Genel Bakım',
      username: tech.username || '',
      password: ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu personeli ve kullanıcı giriş yetkisini silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/technicians/${id}`);
      fetchTechs();
      toast.success('Personel başarıyla silindi.');
    } catch (error) {
      console.error('Error deleting technician:', error);
      toast.error('Silme işlemi başarısız oldu.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/technicians/${editId}`, formData);
        toast.success('Personel bilgileri güncellendi.');
      } else {
        await api.post('/technicians', formData);
        toast.success('Yeni personel başarıyla eklendi.');
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', phone: '', specialty: 'Genel Bakım', username: '', password: '' });
      fetchTechs();
    } catch (error) {
      console.error('Error saving technician:', error);
      toast.error('İşlem sırasında hata oluştu.');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Saha Ekibi</h2>
          <p style={{ color: '#64748b' }}>Teknik personel yönetimi ve uzmanlık alanları.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <UserPlus size={18} /> {showForm ? 'Vazgeç' : 'Yeni Personel Ekle'}
        </button>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 30px', marginBottom: '24px' }}>
        <Search size={20} color="#9ca3af" />
        <input 
          type="text" 
          placeholder="İsim veya uzmanlık alanına göre ara..." 
          style={{ border: 'none', width: '100%', fontSize: '16px', outline: 'none' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="card" style={{ borderTop: `5px solid ${editId ? 'var(--warning)' : 'var(--primary)'}`, marginBottom: '30px' }}>
          <h3>{editId ? 'Personel Düzenle' : 'Yeni Personel Tanımla'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label>Ad Soyad</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Telefon</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Uzmanlık Alanı</label>
                <select value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
                  <option value="Genel Bakım">Genel Bakım</option>
                  <option value="Elektrik & Otomasyon">Elektrik & Otomasyon</option>
                  <option value="Mekanik Motor">Mekanik Motor</option>
                  <option value="Arıza Tespit">Arıza Tespit</option>
                  <option value="Periyodik Kontrolcü">Periyodik Kontrolcü</option>
                </select>
              </div>
              <div className="form-group">
                <label>Kullanıcı Adı (Saha Girişi İçin)</label>
                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>
              <div className="form-group">
                <label>{editId ? 'Şifre (Değiştirmek istemiyorsanız boş bırakın)' : 'Şifre'}</label>
                <input type="password" required={!editId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">{editId ? 'Değişiklikleri Kaydet' : 'Personeli Kaydet'}</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState 
          title="Personel Bulunamadı" 
          description="Arama kriterlerine uygun personel kaydı bulunmuyor." 
          icon={Search}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {filtered.map(tech => (
            <div key={tech.id} className="card" style={{ padding: '0', overflow: 'hidden', borderTop: '6px solid var(--primary)' }}>
              <div style={{ padding: '25px', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px', margin: '0 auto 20px' }}>
                  {tech.name.charAt(0)}
                </div>
                <Link to={`/technicians/${tech.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 5px 0', cursor: 'pointer' }}>{tech.name}</h3>
                </Link>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                   <Wrench size={14}/> {tech.specialty}
                </div>
              </div>
              
              <div style={{ padding: '15px 25px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '14px' }}>
                  <Phone size={16} /> <strong>{tech.phone || '-'}</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleEdit(tech)}><Edit2 size={16}/></button>
                  <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDelete(tech.id)}><Trash2 size={16}/></button>
                </div>
              </div>

              <div style={{ padding: '10px 25px', textAlign: 'center' }}>
                {tech.username ? (
                  <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold' }}><Shield size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Saha girişi aktif: {tech.username}</div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--danger)', fontStyle: 'italic' }}>Giriş yetkisi yok</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Technicians;
