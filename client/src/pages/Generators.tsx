import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Zap, ShieldCheck, Edit2, Trash2, ArrowUpDown, Search, Filter, X, ChevronLeft, ChevronRight, FileText, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';

interface Generator {
  id: number;
  customer_name: string;
  customer_id: number;
  serial_number: string;
  model: string;
  installation_date: string;
  next_maintenance_date: string;
  brand: string;
  kva: string;
  engine_model: string;
  engine_serial_number: string;
  alternator_model: string;
  alternator_serial_number: string;
  control_panel_type: string;
  control_device: string;
  breaker_type: string;
  breaker_current: string;
  transfer_panel_type: string;
  has_canopy: number;
  location: string;
  region: string;
  address: string;
  contract_status: string; // Var / Yok
  runtime_hours: string;
  oil_capacity: string;
  antifreeze_capacity: string;
  air_filter_code: string;
  air_filter_qty: string | number;
  fuel_filter_code: string;
  fuel_filter_qty: string | number;
  fuel_pre_filter_code: string;
  fuel_pre_filter_qty: string | number;
  chassis_filter_code: string;
  chassis_filter_qty: string | number;
  oil_filter_code: string;
  oil_filter_qty: string | number;
  bypass_filter_code: string;
  bypass_filter_qty: string | number;
  turbo_filter_code: string;
  water_filter_code: string;
  water_filter_qty: string | number;
  centrifugal_filter_code: string;
  centrifugal_filter_qty: string | number;
  battery_amperage: string;
  battery_qty: string | number;
  charger_voltage: string;
  charger_amperage: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Customer {
  id: number;
  name: string;
}

const calculateDaysLeft = (dateString: string) => {
  if (!dateString) return 9999;
  const nextDate = new Date(dateString);
  const today = new Date();
  const diffTime = nextDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const Generators = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>(location.state?.filter || '');
  
  useEffect(() => {
    if (location.state?.filter !== undefined) {
      setMaintenanceFilter(location.state.filter);
    }
  }, [location.state]);

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



  const [generators, setGenerators] = useState<Generator[]>([]);
  const [filtered, setFiltered] = useState<Generator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Generator, direction: 'asc' | 'desc' } | null>({ key: 'customer_name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [formData, setFormData] = useState({ 
    customer_id: '', 
    serial_number: '', 
    model: '', 
    installation_date: '', 
    next_maintenance_date: '',
    runtime_hours: '',
    brand: '',
    kva: '',
    engine_model: '',
    engine_serial_number: '',
    alternator_model: '',
    alternator_serial_number: '',
    control_panel_type: 'Otomatik',
    control_device: '',
    breaker_type: 'K Otomat',
    breaker_current: '',
    transfer_panel_type: 'Kontaktör',
    has_canopy: 1,
    location: '',
    region: '',
    address: '',
    contract_status: 'Yok',
    oil_capacity: '',
    antifreeze_capacity: '',
    air_filter_code: '',
    air_filter_qty: '',
    fuel_filter_code: '',
    fuel_filter_qty: '',
    fuel_pre_filter_code: '',
    fuel_pre_filter_qty: '',
    chassis_filter_code: '',
    chassis_filter_qty: '',
    oil_filter_code: '',
    oil_filter_qty: '',
    bypass_filter_code: '',
    bypass_filter_qty: '',
    turbo_filter_code: '',
    water_filter_code: '',
    water_filter_qty: '',
    centrifugal_filter_code: '',
    centrifugal_filter_qty: '',
    battery_amperage: '',
    battery_qty: '',
    charger_voltage: '12v',
    charger_amperage: '5A',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    fetchGenerators();
    fetchCustomers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, regionFilter, contractFilter, maintenanceFilter]);

  useEffect(() => {
    let results = generators.filter(g => {
      const matchesSearch = (
        g.serial_number.toLowerCase().includes(search.toLowerCase()) || 
        g.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        (g.location && g.location.toLowerCase().includes(search.toLowerCase())) ||
        (g.model && g.model.toLowerCase().includes(search.toLowerCase())) ||
        (g.brand && g.brand.toLowerCase().includes(search.toLowerCase())) ||
        (g.address && g.address.toLowerCase().includes(search.toLowerCase()))
      );

      const matchesRegion = regionFilter === '' || g.region === regionFilter;
      const matchesContract = contractFilter === '' || g.contract_status === contractFilter;
      
      let matchesMaintenance = true;
      if (maintenanceFilter === 'critical') {
        const days = calculateDaysLeft(g.next_maintenance_date);
        matchesMaintenance = days < 15;
      } else if (maintenanceFilter === 'warning') {
        const days = calculateDaysLeft(g.next_maintenance_date);
        matchesMaintenance = days >= 15 && days <= 30;
      }
      
      return matchesSearch && matchesRegion && matchesContract && matchesMaintenance;
    });

    if (sortConfig) {
      results.sort((a, b) => {
        if (sortConfig.key === 'customer_name') {
          // Sort by customer_name, fallback to location
          const aCust = (a.customer_name || '').toString().trim();
          const bCust = (b.customer_name || '').toString().trim();
          const comp = aCust.localeCompare(bCust, 'tr');
          if (comp !== 0) return sortConfig.direction === 'asc' ? comp : -comp;
          
          const aLoc = (a.location || '').toString().trim();
          const bLoc = (b.location || '').toString().trim();
          return sortConfig.direction === 'asc' ? aLoc.localeCompare(bLoc, 'tr') : bLoc.localeCompare(aLoc, 'tr');
        } else {
          const aVal = (a[sortConfig.key] || '').toString().trim();
          const bVal = (b[sortConfig.key] || '').toString().trim();
          return sortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal, 'tr')
            : bVal.localeCompare(aVal, 'tr');
        }
      });
    }

    setFiltered(results);
  }, [search, regionFilter, contractFilter, maintenanceFilter, generators, sortConfig]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filtered, currentPage, itemsPerPage]);

  const fetchGenerators = async () => {
    try {
      const response = await api.get('/generators');
      setGenerators(response.data);
    } catch (error) {
      console.error('Error fetching generators:', error);
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

  const handleSort = (key: keyof Generator) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEdit = (gen: Generator) => {
    setEditId(gen.id);
    setFormData({
      customer_id: gen.customer_id.toString(),
      serial_number: gen.serial_number,
      model: gen.model || '',
      installation_date: gen.installation_date || '',
      next_maintenance_date: gen.next_maintenance_date || '',
      runtime_hours: gen.runtime_hours || '',
      brand: gen.brand || '',
      kva: gen.kva || '',
      engine_model: gen.engine_model || '',
      engine_serial_number: gen.engine_serial_number || '',
      alternator_model: gen.alternator_model || '',
      alternator_serial_number: gen.alternator_serial_number || '',
      control_panel_type: gen.control_panel_type || 'Otomatik',
      control_device: gen.control_device || '',
      breaker_type: gen.breaker_type || 'K Otomat',
      breaker_current: gen.breaker_current || '',
      transfer_panel_type: gen.transfer_panel_type || 'Kontaktör',
      has_canopy: gen.has_canopy === 0 ? 0 : 1,
      location: gen.location || '',
      region: gen.region || '',
      address: gen.address || '',
      contract_status: gen.contract_status || 'Yok',
      oil_capacity: gen.oil_capacity || '',
      antifreeze_capacity: gen.antifreeze_capacity || '',
      air_filter_code: gen.air_filter_code || '',
      air_filter_qty: gen.air_filter_qty?.toString() || '',
      fuel_filter_code: gen.fuel_filter_code || '',
      fuel_filter_qty: gen.fuel_filter_qty?.toString() || '',
      fuel_pre_filter_code: gen.fuel_pre_filter_code || '',
      fuel_pre_filter_qty: gen.fuel_pre_filter_qty?.toString() || '',
      chassis_filter_code: gen.chassis_filter_code || '',
      chassis_filter_qty: gen.chassis_filter_qty?.toString() || '',
      oil_filter_code: gen.oil_filter_code || '',
      oil_filter_qty: gen.oil_filter_qty?.toString() || '',
      bypass_filter_code: gen.bypass_filter_code || '',
      bypass_filter_qty: gen.bypass_filter_qty?.toString() || '',
      turbo_filter_code: gen.turbo_filter_code || '',
      water_filter_code: gen.water_filter_code || '',
      water_filter_qty: gen.water_filter_qty?.toString() || '',
      centrifugal_filter_code: gen.centrifugal_filter_code || '',
      centrifugal_filter_qty: gen.centrifugal_filter_qty?.toString() || '',
      battery_amperage: gen.battery_amperage || '',
      battery_qty: gen.battery_qty?.toString() || '',
      charger_voltage: gen.charger_voltage || '12v',
      charger_amperage: gen.charger_amperage || '5A',
      latitude: gen.latitude !== null && gen.latitude !== undefined ? gen.latitude.toString() : '',
      longitude: gen.longitude !== null && gen.longitude !== undefined ? gen.longitude.toString() : ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (location.state?.editId && generators.length > 0) {
      const targetGen = generators.find(g => g.id === Number(location.state.editId));
      if (targetGen) {
        handleEdit(targetGen);
      }
    }
  }, [location.state, generators]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu jeneratörü ve tüm servis kayıtlarını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/generators/${id}`);
      fetchGenerators();
      toast.success('Jeneratör başarıyla silindi.');
    } catch (error: any) {
      console.error('Error deleting generator:', error);
      toast.error('Silme işlemi sırasında bir hata oluştu.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/generators/${editId}`, formData);
        toast.success('Jeneratör bilgileri güncellendi.');
        resetForm();
        setShowForm(false);
      } else {
        await api.post('/generators', formData);
        toast.success('Jeneratör başarıyla kaydedildi.');
        
        if (location.state?.returnToCustomer && location.state?.preselectedCustomerId) {
          // Keep the form open, but reset all other fields except preselected customer_id
          const preselectedId = location.state.preselectedCustomerId.toString();
          setFormData({
            customer_id: preselectedId,
            serial_number: '',
            model: '',
            installation_date: '',
            next_maintenance_date: '',
            runtime_hours: '',
            brand: '',
            kva: '',
            engine_model: '',
            engine_serial_number: '',
            alternator_model: '',
            alternator_serial_number: '',
            control_panel_type: 'Otomatik',
            control_device: '',
            breaker_type: 'K Otomat',
            breaker_current: '',
            transfer_panel_type: 'Kontaktör',
            has_canopy: 1,
            location: '',
            region: '',
            address: '',
            contract_status: 'Yok',
            oil_capacity: '',
            antifreeze_capacity: '',
            air_filter_code: '',
            air_filter_qty: '',
            fuel_filter_code: '',
            fuel_filter_qty: '',
            fuel_pre_filter_code: '',
            fuel_pre_filter_qty: '',
            chassis_filter_code: '',
            chassis_filter_qty: '',
            oil_filter_code: '',
            oil_filter_qty: '',
            bypass_filter_code: '',
            bypass_filter_qty: '',
            turbo_filter_code: '',
            water_filter_code: '',
            water_filter_qty: '',
            centrifugal_filter_code: '',
            centrifugal_filter_qty: '',
            battery_amperage: '',
            battery_qty: '',
            charger_voltage: '12v',
            charger_amperage: '5A',
            latitude: '',
            longitude: ''
          });
          toast('Yeni bir jeneratör eklemeye devam edebilirsiniz.', { icon: '➕' });
        } else {
          if (location.state?.editId) {
            navigate(`/generators/${location.state.editId}`);
            return;
          }
          resetForm();
          setShowForm(false);
        }
      }
      
      fetchGenerators();
    } catch (error: any) {
      console.error('Error saving generator:', error);
      const msg = error.response?.data?.error || 'İşlem sırasında bir hata oluştu.';
      toast.error(msg);
    }
  };

  const handleCancel = () => {
    if (location.state?.returnToCustomer && location.state?.preselectedCustomerId) {
      navigate(`/customers/${location.state.preselectedCustomerId}`);
    } else if (location.state?.editId) {
      navigate(`/generators/${location.state.editId}`);
    } else {
      resetForm();
      setShowForm(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      customer_id: '',
      serial_number: '',
      model: '',
      installation_date: '',
      next_maintenance_date: '',
      runtime_hours: '',
      brand: '',
      kva: '',
      engine_model: '',
      engine_serial_number: '',
      alternator_model: '',
      alternator_serial_number: '',
      control_panel_type: 'Otomatik',
      control_device: '',
      breaker_type: 'K Otomat',
      breaker_current: '',
      transfer_panel_type: 'Kontaktör',
      has_canopy: 1,
      location: '',
      region: '',
      address: '',
      contract_status: 'Yok',
      oil_capacity: '',
      antifreeze_capacity: '',
      air_filter_code: '',
      air_filter_qty: '',
      fuel_filter_code: '',
      fuel_filter_qty: '',
      fuel_pre_filter_code: '',
      fuel_pre_filter_qty: '',
      chassis_filter_code: '',
      chassis_filter_qty: '',
      oil_filter_code: '',
      oil_filter_qty: '',
      bypass_filter_code: '',
      bypass_filter_qty: '',
      turbo_filter_code: '',
      water_filter_code: '',
      water_filter_qty: '',
      centrifugal_filter_code: '',
      centrifugal_filter_qty: '',
      battery_amperage: '',
      battery_qty: '',
      charger_voltage: '12v',
      charger_amperage: '5A',
      latitude: '',
      longitude: ''
    });
  };

  const toggleForm = () => {
    if (showForm) {
      handleCancel();
    } else {
      setShowForm(true);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRegionFilter('');
    setContractFilter('');
    setMaintenanceFilter('');
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Jeneratör Envanteri</h2>
        <button className="btn btn-primary" onClick={toggleForm}>
          <Plus size={18} /> {showForm ? 'Vazgeç' : 'Yeni Jeneratör Ekle'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px' }}>
          <Search size={20} color="#9ca3af" />
          <input 
            type="text" 
            placeholder="Seri no, müşteri, marka veya lokasyon ile ara..." 
            style={{ border: 'none', width: '100%', fontSize: '15px', outline: 'none', background: 'transparent' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 24px' }}>
           <select 
             value={contractFilter} 
             onChange={e => setContractFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '130px', fontWeight: 'bold', color: contractFilter ? 'var(--primary)' : 'inherit' }}
           >
             <option value="">Sözleşme Durumu</option>
             <option value="Var">📜 Sözleşmeli</option>
             <option value="Yok">⚪ Sözleşmesiz</option>
           </select>
           <select 
             value={maintenanceFilter} 
             onChange={e => setMaintenanceFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '140px', fontWeight: 'bold', color: maintenanceFilter ? 'var(--danger)' : 'inherit' }}
           >
             <option value="">Bakım Durumu</option>
             <option value="critical">🚨 Kritik (&lt;15 Gün)</option>
             <option value="warning">⚠️ Yaklaşan (15-30 Gün)</option>
           </select>
           <select 
             value={regionFilter} 
             onChange={e => setRegionFilter(e.target.value)}
             style={{ border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', width: '120px' }}
           >
             <option value="">Tüm Bölgeler</option>
             <option value="Avrupa">Avrupa</option>
             <option value="Anadolu">Anadolu</option>
           </select>
           {(search || regionFilter || contractFilter || maintenanceFilter) && (
             <button onClick={clearFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
               <X size={16}/>
             </button>
           )}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ borderTop: `5px solid ${editId ? 'var(--warning)' : 'var(--primary)'}`, animation: 'fadeIn 0.3s ease-out', marginBottom: '30px' }}>
          <h3>{editId ? 'Ekipman Bilgilerini Düzenle' : 'Yeni Ekipman Kaydı'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              
              {/* Temel Bilgiler */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>Müşteri & Temel Bilgiler</h4>
              </div>
              <div className="form-group">
                <label>Müşteri Seçin</label>
                <select 
                  required 
                  value={formData.customer_id} 
                  onChange={e => setFormData({...formData, customer_id: e.target.value})}
                >
                  <option value="">Seçiniz...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sözleşme Durumu</label>
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="contract" checked={formData.contract_status === 'Var'} onChange={() => setFormData({...formData, contract_status: 'Var'})} /> Var
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="contract" checked={formData.contract_status === 'Yok'} onChange={() => setFormData({...formData, contract_status: 'Yok'})} /> Yok
                   </label>
                 </div>
              </div>
              <div className="form-group">
                <label>Bölge</label>
                <select 
                  value={formData.region} 
                  onChange={e => setFormData({...formData, region: e.target.value})}
                >
                  <option value="">Seçiniz...</option>
                  <option value="Avrupa">Avrupa Yakası</option>
                  <option value="Anadolu">Anadolu Yakası</option>
                </select>
              </div>
              <div className="form-group">
                <label>Jeneratör Lokasyonu (Etiket)</label>
                <input type="text" placeholder="Örn: Merkez Bina, Şube 1..." value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Tam Adres (Harita İçin)</label>
                <input type="text" placeholder="Mahalle, Sokak, No, İlçe/İl..." value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div className="form-group">
                <label>Çalışma Saati</label>
                <input type="text" placeholder="Örn: 1200" value={formData.runtime_hours || ''} onChange={e => setFormData({...formData, runtime_hours: e.target.value.replace(/[^0-9.]/g, '')})} />
              </div>
              <div className="form-group">
                <label>Marka</label>
                <input type="text" value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value.replace(/[0-9]/g, '')})} />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input type="text" placeholder="Örn: 50kVA Perkins Motor" required value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Seri Numarası</label>
                <input type="text" required placeholder="AKN-XXXXX" value={formData.serial_number || ''} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label>kVA Değeri</label>
                <input type="text" value={formData.kva || ''} onChange={e => setFormData({...formData, kva: e.target.value.replace(/[^0-9.]/g, '')})} />
              </div>
              <div className="form-group">
                <label>Kabin Durumu</label>
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="canopy" checked={formData.has_canopy === 1} onChange={() => setFormData({...formData, has_canopy: 1})} /> Var
                   </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                     <input type="radio" name="canopy" checked={formData.has_canopy === 0} onChange={() => setFormData({...formData, has_canopy: 0})} /> Yok
                   </label>
                 </div>
              </div>

              {/* Teknik Özellikler */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>Teknik Özellikler</h4>
              </div>
              <div className="form-group">
                <label>Motor Modeli</label>
                <input type="text" value={formData.engine_model || ''} onChange={e => setFormData({...formData, engine_model: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Motor Seri Numarası</label>
                <input type="text" value={formData.engine_serial_number || ''} onChange={e => setFormData({...formData, engine_serial_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Alternatör Modeli</label>
                <input type="text" value={formData.alternator_model || ''} onChange={e => setFormData({...formData, alternator_model: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Alternatör Seri Numarası</label>
                <input type="text" value={formData.alternator_serial_number || ''} onChange={e => setFormData({...formData, alternator_serial_number: e.target.value})} />
              </div>

              {/* Kontrol ve Güç Panosu */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>Kontrol & Güç Panosu</h4>
              </div>
              <div className="form-group">
                <label>Kontrol Panosu</label>
                <select value={formData.control_panel_type || 'Otomatik'} onChange={e => setFormData({...formData, control_panel_type: e.target.value})}>
                  <option value="Otomatik">Otomatik</option>
                  <option value="Manuel">Manuel</option>
                  <option value="Marşlı">Marşlı</option>
                </select>
              </div>
              <div className="form-group">
                <label>Kontrol Cihazı</label>
                <input type="text" value={formData.control_device || ''} onChange={e => setFormData({...formData, control_device: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Çıkış Şalteri Tipi</label>
                <select value={formData.breaker_type || 'K Otomat'} onChange={e => setFormData({...formData, breaker_type: e.target.value})}>
                  <option value="K Otomat">K Otomat</option>
                  <option value="Kompakt Şalter">Kompakt Şalter</option>
                  <option value="Motorlu Şalter">Motorlu Şalter</option>
                  <option value="Yok">Yok</option>
                </select>
              </div>
              <div className="form-group">
                <label>Çıkış Şalter Akımı (A)</label>
                <input type="text" value={formData.breaker_current || ''} onChange={e => setFormData({...formData, breaker_current: e.target.value.replace(/[^0-9.]/g, '')})} />
              </div>
              <div className="form-group">
                <label>Transfer Panosu</label>
                <select value={formData.transfer_panel_type || 'Kontaktör'} onChange={e => setFormData({...formData, transfer_panel_type: e.target.value})}>
                  <option value="Kontaktör">Kontaktör</option>
                  <option value="ATS">ATS</option>
                  <option value="Motorlu Şalter">Motorlu Şalter</option>
                </select>
              </div>

              {/* Kapasiteler ve Filtreler */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>Kapasiteler ve Filtreler</h4>
              </div>
              <div className="form-group">
                <label>Motor Yağ Kapasitesi (L)</label>
                <input type="text" value={formData.oil_capacity || ''} onChange={e => setFormData({...formData, oil_capacity: e.target.value.replace(/[^0-9.]/g, '')})} />
              </div>
              <div className="form-group">
                <label>Antifiriz Kapasitesi (L)</label>
                <input type="text" value={formData.antifreeze_capacity || ''} onChange={e => setFormData({...formData, antifreeze_capacity: e.target.value.replace(/[^0-9.]/g, '')})} />
              </div>
              
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Hava Filtresi Kodu</label>
                  <input type="text" value={formData.air_filter_code || ''} onChange={e => setFormData({...formData, air_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.air_filter_qty} onChange={e => setFormData({...formData, air_filter_qty: e.target.value})} />
                </div>
              </div>
              
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Yakıt Filtresi Kodu</label>
                  <input type="text" value={formData.fuel_filter_code || ''} onChange={e => setFormData({...formData, fuel_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.fuel_filter_qty} onChange={e => setFormData({...formData, fuel_filter_qty: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Yakıt Ön Filtresi Kodu</label>
                  <input type="text" value={formData.fuel_pre_filter_code || ''} onChange={e => setFormData({...formData, fuel_pre_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.fuel_pre_filter_qty} onChange={e => setFormData({...formData, fuel_pre_filter_qty: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Şase Filtresi Kodu</label>
                  <input type="text" value={formData.chassis_filter_code || ''} onChange={e => setFormData({...formData, chassis_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.chassis_filter_qty} onChange={e => setFormData({...formData, chassis_filter_qty: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Yağ Filtresi Kodu</label>
                  <input type="text" value={formData.oil_filter_code || ''} onChange={e => setFormData({...formData, oil_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.oil_filter_qty} onChange={e => setFormData({...formData, oil_filter_qty: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>By-Pass Filtresi Kodu</label>
                  <input type="text" value={formData.bypass_filter_code || ''} onChange={e => setFormData({...formData, bypass_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.bypass_filter_qty} onChange={e => setFormData({...formData, bypass_filter_qty: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Turbo Yağ Filtresi Kodu</label>
                <input type="text" value={formData.turbo_filter_code || ''} onChange={e => setFormData({...formData, turbo_filter_code: e.target.value})} />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Su Filtresi Kodu</label>
                  <input type="text" value={formData.water_filter_code || ''} onChange={e => setFormData({...formData, water_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.water_filter_qty} onChange={e => setFormData({...formData, water_filter_qty: e.target.value})} />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Santrifüj Filtresi Kodu</label>
                  <input type="text" value={formData.centrifugal_filter_code || ''} onChange={e => setFormData({...formData, centrifugal_filter_code: e.target.value})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.centrifugal_filter_qty} onChange={e => setFormData({...formData, centrifugal_filter_qty: e.target.value})} />
                </div>
              </div>

              {/* Akü ve Redresör */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>Akü ve Redresör Bilgileri</h4>
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                <div>
                  <label>Akü Amperi (Ah)</label>
                  <input type="text" value={formData.battery_amperage || ''} onChange={e => setFormData({...formData, battery_amperage: e.target.value.replace(/[^0-9.]/g, '')})} />
                </div>
                <div>
                  <label>Adet</label>
                  <input type="text" value={formData.battery_qty} onChange={e => setFormData({...formData, battery_qty: e.target.value.replace(/[^0-9]/g, '')})} />
                </div>
              </div>
              <div className="form-group">
                <label>Redresör Voltajı</label>
                <select value={formData.charger_voltage || '12v'} onChange={e => setFormData({...formData, charger_voltage: e.target.value})}>
                  <option value="12v">12V</option>
                  <option value="24v">24V</option>
                  <option value="">Belirtilmemiş</option>
                </select>
              </div>
              <div className="form-group">
                <label>Redresör Amperi</label>
                <select value={formData.charger_amperage || '5A'} onChange={e => setFormData({...formData, charger_amperage: e.target.value})}>
                  <option value="5A">5A</option>
                  <option value="10A">10A</option>
                  <option value="">Belirtilmemiş</option>
                </select>
              </div>

              {/* Bakım & Garanti */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>Tarihler</h4>
              </div>
              <div className="form-group">
                <label>Kurulum Tarihi</label>
                <input type="date" value={formData.installation_date || ''} onChange={e => setFormData({...formData, installation_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>İlk Bakım Tarihi</label>
                <input type="date" value={formData.next_maintenance_date || ''} onChange={e => setFormData({...formData, next_maintenance_date: e.target.value})} />
              </div>
              {/* Harita Koordinatları */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: 'var(--primary)' }}>Harita Koordinatları</h4>
              </div>
              <div className="form-group">
                <label>Enlem (Latitude - Boş bırakılırsa adresten çözümlenir)</label>
                <input 
                  type="number" 
                  step="any" 
                  placeholder="Örn: 41.012345" 
                  value={formData.latitude} 
                  onChange={e => setFormData({...formData, latitude: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Boylam (Longitude - Boş bırakılırsa adresten çözümlenir)</label>
                <input 
                  type="number" 
                  step="any" 
                  placeholder="Örn: 28.976543" 
                  value={formData.longitude} 
                  onChange={e => setFormData({...formData, longitude: e.target.value})} 
                />
              </div>

            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <button type="button" className="btn btn-secondary" onClick={handleCancel}>Geri Dön / İptal</button>
               <button type="submit" className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '16px' }}>{editId ? 'Güncelle' : 'Sisteme Kaydet'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState 
            title="Ekipman Bulunamadı" 
            description="Kriterlere uygun jeneratör bulunamadı." 
            icon={Zap}
          />
        ) : (
          <>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Marka / Model</th>
                    <th onClick={() => handleSort('serial_number')} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Seri No <ArrowUpDown size={12}/></div>
                    </th>
                    <th onClick={() => handleSort('customer_name')} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Müşteri / Lokasyon <ArrowUpDown size={12}/></div>
                    </th>
                    <th>kVA</th>
                    <th>Bölge</th>
                    <th>Sözleşme</th>
                    <th style={{ textAlign: 'center' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(gen => (
                    <tr key={gen.id}>
                      <td>
                        {gen.brand ? <strong>{gen.brand}</strong> : ''}
                        {gen.brand && gen.model ? ' / ' : ''}
                        {gen.model}
                      </td>
                      <td><code style={{fontWeight: 'bold'}}>{gen.serial_number}</code></td>
                      <td>
                        <Link 
                          to={`/customers/${gen.customer_id}`} 
                          style={{ fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}
                          title="Müşteri profilini görüntüle"
                        >
                          {gen.customer_name}
                        </Link>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>📍 {gen.location || 'Belirtilmemiş'}</div>
                      </td>
                      <td>{gen.kva || '-'}</td>
                      <td>
                         <span>
                            {gen.region || '-'}
                         </span>
                      </td>
                      <td>
                        {gen.contract_status === 'Var' ? (
                          <span className="status-badge status-green">VAR</span>
                        ) : (
                          <span className="status-badge status-red">YOK</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <Link to={`/generators/${gen.id}`} className="btn btn-secondary" style={{ padding: '8px' }}>Yönet</Link>
                          <button className="btn btn-secondary" onClick={() => handleEdit(gen)} style={{ padding: '8px' }}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn btn-secondary" onClick={() => handleDelete(gen.id)} style={{ padding: '8px', color: 'var(--danger)' }}>
                            <Trash2 size={16} />
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

export default Generators;
