import React, { useEffect, useState } from 'react';
import api from '../api';
import { Calendar, Zap, CheckCircle, Clock, Loader2, AlertCircle, ChevronLeft, ChevronRight, UserPlus, X, ClipboardList, User, CheckSquare, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { generateMonthlyProgramPDF } from '../utils/pdfGenerator';

interface Contract {
  id: number;
  customer_id: number;
  customer_name: string;
  maintenance_months: string;
  general_maintenance_month: string;
  maintenance_year: number;
  status: string;
}

interface Generator {
  id: number;
  customer_id: number;
  customer_name?: string;
  serial_number: string;
  model: string;
  brand: string;
  location: string;
  region?: string;
}

interface ServiceRecord {
  id: number;
  generator_id: number;
  service_date: string;
}

interface Technician {
  id: number;
  name: string;
}

interface Appointment {
  id: number;
  generator_id: number;
  technician_id: number;
  assistant_technician_id: number | null;
  appointment_date: string;
  status: string;
  notes?: string;
  technician_name?: string;
  assistant_name?: string;
}

interface Fault {
  id: number;
  generator_id: number;
  fault_date: string;
  status: string;
  serial_number: string;
  customer_name: string;
}

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const MaintenanceProgram = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewDay, setViewDay] = useState<number | 0>(0); // 0 means all days
  const [viewType, setViewYearType] = useState<'pending' | 'completed'>('pending');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ genId: number, customerName: string, serialNumber: string, type: 'periodic' | 'general' | 'fault' | 'planned_extra', faultId?: number, appointmentId?: number } | null>(null);
  const [assignData, setAssignAssignData] = useState({
    technician_id: '',
    assistant_technician_id: '',
    appointment_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, generatorsRes, recordsRes, techsRes, faultsRes, appointmentsRes] = await Promise.all([
        api.get('/contracts'),
        api.get('/generators'),
        api.get('/service-records'),
        api.get('/technicians'),
        api.get('/generator-faults'),
        api.get('/appointments')
      ]);
      
      setContracts(contractsRes.data.filter((c: any) => c.status === 'Aktif'));
      setGenerators(generatorsRes.data);
      setRecords(recordsRes.data);
      setTechnicians(techsRes.data);
      setFaults(faultsRes.data);
      setAppointments(appointmentsRes.data);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const currentMonthName = MONTHS[viewMonth];

  const getMonthItems = () => {
    const monthContracts = contracts.filter(c => {
      const monthKey = `${viewYear}-${currentMonthName}`;
      const maintenanceMonthsArr = c.maintenance_months ? c.maintenance_months.split(',') : [];
      const periodicMatch = maintenanceMonthsArr.some(m => {
        if (m === currentMonthName && (!c.maintenance_year || c.maintenance_year === viewYear)) return true;
        if (m === monthKey) return true;
        return false;
      });
      const generalMatch = c.general_maintenance_month === currentMonthName && (!c.maintenance_year || c.maintenance_year === viewYear);
      return periodicMatch || generalMatch;
    });

    const maintenanceItems = monthContracts.flatMap(c => {
      const customerGens = generators.filter(g => g.customer_id === c.customer_id);
      return customerGens.map(gen => {
        const isGeneral = c.general_maintenance_month === currentMonthName;
        const assigned = appointments.find(a => {
          const d = new Date(a.appointment_date);
          return a.generator_id === gen.id && d.getMonth() === viewMonth && d.getFullYear() === viewYear;
        });

        const doneRecord = records.find(record => {
          const date = new Date(record.service_date);
          return record.generator_id === gen.id && date.getMonth() === viewMonth && date.getFullYear() === viewYear;
        });

        const isDone = (assigned && assigned.status === 'Tamamlandı') || !!doneRecord;
        const itemDate = assigned ? assigned.appointment_date : (doneRecord ? doneRecord.service_date : null);

        return {
          id: `${c.id}-${gen.id}`,
          genId: gen.id,
          customerId: c.customer_id,
          customer_name: c.customer_name,
          serial_number: gen.serial_number,
          brand: gen.brand,
          model: gen.model,
          location: gen.location,
          region: gen.region || '',
          type: isGeneral ? 'general' : 'periodic',
          isDone,
          assignedTech: assigned ? assigned.technician_name : null,
          assistantTech: assigned ? assigned.assistant_name : null,
          appointmentId: assigned ? assigned.id : null,
          date: itemDate ? itemDate.split('T')[0] : null
        };
      });
    });

    const monthFaults = faults.filter(f => {
      const date = new Date(f.fault_date);
      return date.getMonth() === viewMonth && date.getFullYear() === viewYear;
    }).map(f => {
      const assigned = appointments.find(a => {
        const d = new Date(a.appointment_date);
        return a.generator_id === f.generator_id && d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      });

      const doneRecord = records.find(record => {
        const date = new Date(record.service_date);
        return record.generator_id === f.generator_id && date.getMonth() === viewMonth && date.getFullYear() === viewYear;
      });

      const isDone = f.status === 'Çözüldü' || (assigned && assigned.status === 'Tamamlandı') || !!doneRecord;
      const itemDate = assigned ? assigned.appointment_date : (doneRecord ? doneRecord.service_date : f.fault_date.split('T')[0]);

      const gen = generators.find(g => g.id === f.generator_id);

      return {
        id: `fault-${f.id}`,
        genId: f.generator_id,
        customerId: gen?.customer_id,
        customer_name: f.customer_name,
        serial_number: f.serial_number,
        brand: gen?.brand || '-',
        model: gen?.model || '-',
        location: gen?.location || '-',
        region: gen?.region || '',
        type: 'fault',
        isDone,
        assignedTech: assigned ? assigned.technician_name : null,
        assistantTech: assigned ? assigned.assistant_name : null,
        appointmentId: assigned ? assigned.id : null,
        date: itemDate ? itemDate.split('T')[0] : null
      };
    });

    const monthAppointments = appointments.filter(a => {
      const d = new Date(a.appointment_date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });

    const standaloneItems = monthAppointments.filter(a => {
      const inMaintenance = maintenanceItems.some(m => m.genId === a.generator_id);
      const inFaults = monthFaults.some(f => f.genId === a.generator_id);
      return !inMaintenance && !inFaults;
    }).map(a => {
      const gen = generators.find(g => g.id === a.generator_id);
      const doneRecord = records.find(record => {
        const date = new Date(record.service_date);
        return record.generator_id === a.generator_id && date.getMonth() === viewMonth && date.getFullYear() === viewYear;
      });
      const isDone = a.status === 'Tamamlandı' || !!doneRecord;

      return {
        id: `appt-${a.id}`,
        genId: a.generator_id,
        customerId: gen?.customer_id,
        customer_name: gen?.customer_name || 'Bilinmeyen Müşteri',
        serial_number: gen?.serial_number || '-',
        brand: gen?.brand || '-',
        model: gen?.model || '-',
        location: gen?.location || '-',
        region: gen?.region || '',
        type: 'planned_extra',
        isDone,
        assignedTech: a.technician_name || null,
        assistantTech: a.assistant_name || null,
        appointmentId: a.id,
        date: a.appointment_date.split('T')[0]
      };
    });

    const allItems = [...maintenanceItems, ...monthFaults, ...standaloneItems];
    
    // Sort custom priority: Avrupa first (1), Anadolu second (2), others third (3)
    // Within the same group, sort alphabetically by customer name
    allItems.sort((a, b) => {
      const getPriority = (r: string | undefined | null, customerName?: string) => {
        const nameLower = (customerName || '').toLowerCase();
        if (nameLower.includes('pendik') || nameLower.includes('üsküdar')) {
          return 2; // Anadolu
        }
        if (!r) return 3;
        const regionLower = r.toLowerCase();
        if (regionLower === 'avrupa') return 1;
        if (regionLower === 'anadolu') return 2;
        return 3;
      };
      
      const priorityA = getPriority(a.region, a.customer_name);
      const priorityB = getPriority(b.region, b.customer_name);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      const aName = (a.customer_name || '').toString().trim();
      const bName = (b.customer_name || '').toString().trim();
      return aName.localeCompare(bName, 'tr');
    });

    return allItems;
  };

  const allMonthItems = getMonthItems();
  
  const filteredMonthItems = viewDay === 0 
    ? allMonthItems 
    : allMonthItems.filter(item => {
        if (!item.date) return false;
        const itemDate = new Date(item.date);
        return itemDate.getDate() === viewDay && itemDate.getMonth() === viewMonth && itemDate.getFullYear() === viewYear;
      });

  const pendingItems = filteredMonthItems.filter(i => !i.isDone);
  const completedItems = filteredMonthItems.filter(i => i.isDone);
  
  // Real-time decreasing stats
  const stats = {
    planned: pendingItems.filter(i => i.type === 'periodic' || i.type === 'planned_extra').length,
    general: pendingItems.filter(i => i.type === 'general').length,
    faults: pendingItems.filter(i => i.type === 'fault').length,
    done: completedItems.length
  };

  const handleAssignClick = (item: any) => {
    setSelectedItem({ 
      genId: item.genId, 
      customerName: item.customer_name, 
      serialNumber: item.serial_number,
      type: item.type as any,
      faultId: item.type === 'fault' ? parseInt(item.id.replace('fault-', '')) : undefined,
      appointmentId: item.appointmentId || undefined
    });
    
    const today = new Date();
    let defaultDate = item.date || `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-01`;
    if (!item.date && today.getMonth() === viewMonth && today.getFullYear() === viewYear) {
      defaultDate = today.toISOString().split('T')[0];
    }

    const existingAppt = item.appointmentId ? appointments.find(a => a.id === item.appointmentId) : null;

    setAssignAssignData({
       technician_id: existingAppt ? existingAppt.technician_id.toString() : '',
       assistant_technician_id: existingAppt && existingAppt.assistant_technician_id ? existingAppt.assistant_technician_id.toString() : '',
       appointment_date: existingAppt ? existingAppt.appointment_date.split('T')[0] : defaultDate,
       notes: existingAppt ? (existingAppt.notes || '') : (item.type === 'fault' ? 'Özel Servis / Arıza Görevi' : (item.type === 'general' ? 'Genel Bakım Görevi' : 'Periyodik Bakım Görevi'))
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const payload = {
      generator_id: selectedItem.genId,
      technician_id: parseInt(assignData.technician_id),
      assistant_technician_id: assignData.assistant_technician_id ? parseInt(assignData.assistant_technician_id) : null,
      fault_id: selectedItem.faultId || null,
      appointment_date: assignData.appointment_date,
      notes: assignData.notes
    };

    try {
      if (selectedItem.appointmentId) {
        await api.put(`/appointments/${selectedItem.appointmentId}`, payload);
        toast.success('Görev başarıyla güncellendi.');
      } else {
        await api.post('/appointments', payload);
        toast.success('Görev teknisyenlere atandı.');
      }
      setShowAssignModal(false);
      fetchData();
    } catch (error) {
      toast.error('Atama işlemi başarısız oldu.');
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!window.confirm('Bu görev atamasını iptal etmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/appointments/${appointmentId}`);
      toast.success('Görev ataması iptal edildi.');
      if (showAssignModal) {
        setShowAssignModal(false);
      }
      fetchData();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Görev ataması iptal edilirken bir hata oluştu.');
    }
  };

  const renderCalendarView = () => {
    // Group all month items by date
    const itemsByDate: Record<string, any[]> = {};
    
    // Sort all month items by date ascending
    const sortedMonthItems = [...allMonthItems].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.localeCompare(b.date);
    });

    sortedMonthItems.forEach(item => {
      if (!item.date) return;
      if (!itemsByDate[item.date]) {
        itemsByDate[item.date] = [];
      }
      itemsByDate[item.date].push(item);
    });

    const datesWithEvents = Object.keys(itemsByDate);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-out' }}>
        
        {/* Renk Açıklamaları (Legend) */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          flexWrap: 'wrap', 
          background: 'var(--bg-card)', 
          padding: '12px 20px', 
          borderRadius: '12px', 
          border: '1px solid var(--border-color)', 
          fontSize: '12px', 
          fontWeight: '700',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Renk Açıklamaları:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary)' }}></span>
            <span style={{ color: 'var(--text-main)' }}>Periyodik Bakım</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#8b5cf6' }}></span>
            <span style={{ color: 'var(--text-main)' }}>Genel Bakım</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--danger)' }}></span>
            <span style={{ color: 'var(--text-main)' }}>Özel Servis / Arıza</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--success)' }}></span>
            <span style={{ color: 'var(--text-main)' }}>Tamamlanan İşler</span>
          </div>
        </div>

        {/* Gün Kartları Grid (Responsive) */}
        {datesWithEvents.length === 0 ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <Calendar size={48} style={{ marginBottom: '15px', opacity: 0.2 }} />
            <div>Bu ay için planlanmış herhangi bir operasyon bulunmuyor.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {datesWithEvents.map(dateStr => {
              const dayItems = itemsByDate[dateStr];
              const dateObj = new Date(dateStr);
              const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
              
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              return (
                <div 
                  key={dateStr}
                  className="card"
                  style={{
                    padding: '20px',
                    borderTop: isToday ? '5px solid var(--primary)' : '5px solid #cbd5e1',
                    boxShadow: isToday ? '0 8px 24px rgba(59, 130, 246, 0.1)' : '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    borderRadius: '16px',
                    background: 'var(--bg-card)'
                  }}
                >
                  {/* Kart Başlığı */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: isToday ? 'var(--primary)' : 'var(--text-main)' }}>
                        {formattedDate}
                      </span>
                      {isToday && (
                        <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>
                          ★ Bugün
                        </span>
                      )}
                    </div>
                    
                    {/* Hızlı Atama Butonu */}
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedItem({ genId: 0, customerName: 'Yeni Planlı İş', serialNumber: '-', type: 'planned_extra' });
                        setAssignAssignData({
                          technician_id: '',
                          assistant_technician_id: '',
                          appointment_date: dateStr,
                          notes: ''
                        });
                        setShowAssignModal(true);
                      }}
                      title="Yeni Planlı İş Ekle"
                      style={{ 
                        background: 'var(--bg-input)', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--primary)', 
                        cursor: 'pointer', 
                        fontSize: '11px', 
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: '800'
                      }}
                    >
                      + İş Ekle
                    </button>
                  </div>

                  {/* Gün İçindeki İş Kartları */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dayItems.map((item, itemIdx) => {
                      let borderLeft = '4px solid #64748b';
                      let statusText = 'Planlandı';
                      let typeLabel = 'Periyodik Bakım';
                      let labelBg = 'var(--primary-light)';
                      let labelColor = 'var(--primary)';

                      if (item.isDone) {
                        borderLeft = '4px solid var(--success)';
                        statusText = 'Tamamlandı';
                        labelBg = 'var(--success-light)';
                        labelColor = 'var(--success)';
                      } else if (item.type === 'periodic' || item.type === 'planned_extra') {
                        borderLeft = '4px solid var(--primary)';
                        statusText = 'Atama Bekliyor';
                      } else if (item.type === 'general') {
                        borderLeft = '4px solid #8b5cf6';
                        typeLabel = 'Genel Bakım';
                        labelBg = 'rgba(139, 92, 246, 0.1)';
                        labelColor = '#8b5cf6';
                      } else if (item.type === 'fault') {
                        borderLeft = '4px solid var(--danger)';
                        typeLabel = 'Özel Servis / Arıza';
                        labelBg = 'var(--danger-light)';
                        labelColor = 'var(--danger)';
                      }

                      if (item.assignedTech && !item.isDone) {
                        statusText = 'Atandı / Bekliyor';
                      }

                      return (
                        <div 
                          key={itemIdx}
                          onClick={() => handleAssignClick(item)}
                          style={{
                            borderLeft: borderLeft,
                            background: 'var(--bg-input)',
                            borderRadius: '10px',
                            padding: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <Link
                              to={item.customerId ? `/customers/${item.customerId}` : '#'}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontWeight: '800',
                                fontSize: '14px',
                                color: 'var(--text-main)',
                                textDecoration: 'none',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                            >
                              {item.customer_name}
                            </Link>
                            <span style={{ 
                              fontSize: '9px', 
                              fontWeight: 'bold', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: labelBg, 
                              color: labelColor,
                              whiteSpace: 'nowrap'
                            }}>
                              {typeLabel}
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            Seri No: {item.serial_number} (
                            <Link
                              to={`/generators/${item.genId}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: 'var(--primary)',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              {item.brand} {item.model}
                            </Link>
                            )
                          </div>

                          {/* Ekip Bilgisi */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Atanan Ekip:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {item.assignedTech ? `👤 ${item.assignedTech}` : '❌ Atanmadı'}
                                {item.assistantTech ? ` + ${item.assistantTech}` : ''}
                              </span>
                              {item.assignedTech && item.appointmentId && !item.isDone && (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelAppointment(item.appointmentId!);
                                  }}
                                  title="Görev Atamasını İptal Et"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Bölge:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{item.region || 'Avrupa'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header & Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Operasyonel Bakım Takvimi</h2>
          <p style={{ color: '#64748b' }}>Seçili ay için iş atama ve takip merkezi.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
           {/* Gün Seçimi */}
           <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', borderRadius: '16px', padding: '8px 15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', height: '54px' }}>
              <select 
                value={viewDay} 
                onChange={e => setViewDay(Number(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontSize: '15px', fontWeight: '800', outline: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <option value={0} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Tüm Ay</option>
                {Array.from({length: new Date(viewYear, viewMonth + 1, 0).getDate()}, (_, i) => i + 1).map(day => (
                  <option key={day} value={day} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{day} {currentMonthName}</option>
                ))}
              </select>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', borderRadius: '16px', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)' }}>
              <button onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
                else setViewMonth(v => v - 1);
              }} className="btn-icon"><ChevronLeft size={20}/></button>
              <div style={{ padding: '0 15px', textAlign: 'center', minWidth: '160px' }}>
                 <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase' }}>{viewYear}</div>
                 <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{currentMonthName}</div>
              </div>
              <button onClick={() => {
                if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
                else setViewMonth(v => v + 1);
              }} className="btn-icon"><ChevronRight size={20}/></button>
           </div>
           <button className="btn btn-secondary" onClick={() => generateMonthlyProgramPDF(currentMonthName, viewYear, allMonthItems)} style={{ borderRadius: '12px', height: '54px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Printer size={18}/> PDF Olarak İndir
           </button>
           <button className="btn btn-secondary" onClick={fetchData} style={{ borderRadius: '12px', height: '54px' }}>
             Verileri Yenile
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
         <div className={`card stat-card-dynamic ${viewType === 'pending' ? 'active' : ''}`} onClick={() => setViewYearType('pending')} style={{ padding: '20px', borderLeft: '6px solid var(--primary)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px' }}><ClipboardList color="var(--primary)"/></div>
              <div>
                 <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>KALAN PLANLI İŞ</div>
                 <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)' }}>{stats.planned}</div>
              </div>
            </div>
         </div>
         <div className="card" style={{ padding: '20px', borderLeft: '6px solid #8b5cf6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '12px' }}><Zap color="#8b5cf6"/></div>
              <div>
                 <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>KALAN GENEL BAKIM</div>
                 <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)' }}>{stats.general}</div>
              </div>
            </div>
         </div>
         <div className="card" style={{ padding: '20px', borderLeft: '6px solid var(--danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '12px' }}><AlertCircle color="var(--danger)"/></div>
              <div>
                 <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>KALAN ÖZEL SERVİS</div>
                 <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)' }}>{stats.faults}</div>
              </div>
            </div>
         </div>
         <div className={`card stat-card-dynamic completed ${viewType === 'completed' ? 'active' : ''}`} onClick={() => setViewYearType('completed')} style={{ padding: '20px', borderLeft: '6px solid var(--success)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--success-light)', padding: '10px', borderRadius: '12px' }}><CheckSquare color="var(--success)"/></div>
              <div>
                 <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>BİTEN TOPLAM İŞ</div>
                 <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--success)' }}>{stats.done}</div>
              </div>
            </div>
         </div>
      </div>

      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: viewType === 'pending' ? 'var(--warning)' : 'var(--success)' }}></div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{viewType === 'pending' ? 'Sıradaki İş Listesi' : 'Tamamlanan İş Kayıtları'}</h3>
         </div>

         {/* Görünüm Modu Seçici */}
         <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              onClick={() => setViewMode('list')} 
              style={{
                border: 'none',
                background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text-main)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Liste Görünümü
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('calendar')} 
              style={{
                border: 'none',
                background: viewMode === 'calendar' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'calendar' ? '#fff' : 'var(--text-main)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Takvim Görünümü
            </button>
         </div>
      </div>

      {viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
         <div className="table-responsive">
            <table style={{ margin: 0 }}>
               <thead style={{ background: 'var(--bg-input)' }}>
                  <tr>
                     <th style={{ padding: '20px', color: 'var(--text-main)' }}>Müşteri / Firma</th>
                     <th style={{ color: 'var(--text-main)' }}>Marka / Model</th>
                     <th style={{ color: 'var(--text-main)' }}>Seri No</th>
                     <th style={{ color: 'var(--text-main)' }}>İş Tipi</th>
                     <th style={{ color: 'var(--text-main)' }}>Durum / Görevli</th>
                     <th style={{ textAlign: 'right', paddingRight: '20px', color: 'var(--text-main)' }}>Aksiyon</th>
                  </tr>
               </thead>
               <tbody>
                  {(viewType === 'pending' ? pendingItems : completedItems).length > 0 ? (viewType === 'pending' ? pendingItems : completedItems).map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                       <td style={{ padding: '20px' }}>
                           <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                              <Link
                                to={item.customerId ? `/customers/${item.customerId}` : '#'}
                                style={{
                                  color: 'var(--text-main)',
                                  textDecoration: 'none',
                                  transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                              >
                                {item.customer_name}
                              </Link>
                              {item.region && (
                                <span style={{
                                  fontSize: '9px',
                                  marginLeft: '8px',
                                  background: item.region === 'Avrupa' ? 'rgba(37,99,235,0.1)' : 'rgba(245,158,11,0.1)',
                                  color: item.region === 'Avrupa' ? '#2563eb' : '#b45309',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}>
                                  {item.region === 'Avrupa' ? 'Avrupa Yakası' : 'Anadolu Yakası'}
                                </span>
                              )}
                           </div>
                           <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.location}</div>
                       </td>
                       <td>
                          <Link
                             to={`/generators/${item.genId}`}
                             style={{
                               fontWeight: '700',
                               fontSize: '14px',
                               color: 'var(--text-main)',
                               textDecoration: 'none',
                               transition: 'color 0.2s'
                             }}
                             onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                             onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                           >
                             {item.brand} {item.model}
                           </Link>
                       </td>
                       <td>
                          <Link to={`/generators/${item.genId}`} style={{ textDecoration: 'none' }}>
                             <code style={{ fontSize: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                               {item.serial_number}
                             </code>
                           </Link>
                       </td>
                       <td>
                           {item.type === 'periodic' && <span style={{ fontSize: '10px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>PERİYODİK BAKIM</span>}
                           {item.type === 'general' && <span style={{ fontSize: '10px', background: '#ede9fe', color: '#8b5cf6', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>GENEL BAKIM</span>}
                           {item.type === 'fault' && <span style={{ fontSize: '10px', background: '#fee2e2', color: 'var(--danger)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>ÖZEL SERVİS</span>}
                           {item.type === 'planned_extra' && <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>PLANLI EK SERVİS</span>}
                           {item.date && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>{item.date}</div>}
                        </td>
                       <td>
                          {item.isDone ? 
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--success)', fontWeight: 'bold', fontSize: '13px' }}><CheckCircle size={16}/> Tamamlandı</div> :
                            <div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--warning)', fontWeight: 'bold', fontSize: '13px', marginBottom: item.assignedTech ? '5px' : '0' }}><Clock size={16}/> Bekliyor</div>
                               {item.assignedTech && (
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px', width: 'fit-content' }}>
                                    <User size={12}/> {item.assignedTech} {item.assistantTech ? `+ ${item.assistantTech}` : ''}
                                 </div>
                               )}
                            </div>
                          }
                       </td>
                       <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                          {!item.isDone && !item.assignedTech && (
                            <button onClick={() => handleAssignClick(item)} className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '12px', borderRadius: '10px' }}>
                               <UserPlus size={14} style={{ marginRight: '5px' }}/> Görev Ata
                            </button>
                          )}
                          {!item.isDone && item.assignedTech && (
                             <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                               <button onClick={() => handleAssignClick(item)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <RefreshCw size={14}/> Yeniden Ata
                               </button>
                               {item.appointmentId && (
                                 <button onClick={() => handleCancelAppointment(item.appointmentId!)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Görev Atamasını İptal Et">
                                    <X size={14}/> Atamayı İptal Et
                                 </button>
                               )}
                             </div>
                          )}
                          {item.isDone && (
                             <Link to={`/generators/${item.genId}`} className="btn btn-secondary" style={{ padding: '8px 15px', fontSize: '11px', borderRadius: '10px' }}>Detay / PDF</Link>
                          )}
                       </td>
                    </tr>
                  )) : (
                    <tr>
                       <td colSpan={6} style={{ padding: '100px 20px', textAlign: 'center', color: '#94a3b8' }}>
                          <Calendar size={48} style={{ marginBottom: '15px', opacity: 0.2 }} />
                          <div>Bu ay için gösterilecek {viewType === 'pending' ? 'bekleyen bir iş' : 'tamamlanmış bir kayıt'} bulunmuyor.</div>
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
      )}

      {showAssignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
           <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '30px', animation: 'slideUp 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                 <h3 style={{ margin: 0 }}>Saha Ekibi Ataması</h3>
                 <button onClick={() => setShowAssignModal(false)} className="btn-icon"><X size={20}/></button>
              </div>

              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                 <div style={{ fontSize: '12px', color: '#64748b' }}>Müşteri / Cihaz</div>
                 <div style={{ fontWeight: '800' }}>{selectedItem?.customerName}</div>
                 <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>{selectedItem?.serialNumber}</div>
              </div>

              <form onSubmit={handleAssignSubmit}>
                 <div className="form-group">
                    <label>Sorumlu Teknisyen</label>
                    <select required value={assignData.technician_id} onChange={e => setAssignAssignData({...assignData, technician_id: e.target.value})}>
                       <option value="">Teknisyen Seçin...</option>
                       {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
                 <div className="form-group">
                    <label>Yardımcı Teknisyen (Opsiyonel)</label>
                    <select value={assignData.assistant_technician_id} onChange={e => setAssignAssignData({...assignData, assistant_technician_id: e.target.value})}>
                       <option value="">Yardımcı Seçin...</option>
                       {technicians.filter(t => t.id.toString() !== assignData.technician_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
                 <div className="form-group">
                    <label>Görev Tarihi</label>
                    <input type="date" required value={assignData.appointment_date} onChange={e => setAssignAssignData({...assignData, appointment_date: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label>Görev Notu</label>
                    <textarea value={assignData.notes} onChange={e => setAssignAssignData({...assignData, notes: e.target.value})} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="Yapılacak iş hakkında notlar..."></textarea>
                 </div>
                 
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                     {selectedItem?.appointmentId && (
                        <button 
                          type="button" 
                          onClick={() => handleCancelAppointment(selectedItem.appointmentId!)} 
                          className="btn btn-secondary" 
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                           <Trash2 size={16} /> Görevi İptal Et
                        </button>
                     )}
                     <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Kapat</button>
                     <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Ekibi Ata ve Gönder</button>
                  </div>
              </form>
           </div>
        </div>
      )}

      <style>{`
        .stat-card-dynamic.active {
          background: #fff;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          transform: translateY(-2px);
          border-bottom: 3px solid var(--primary);
        }
        .stat-card-dynamic.completed.active {
          border-bottom-color: var(--success);
        }
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: #f1f5f9;
          color: var(--primary);
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MaintenanceProgram;
