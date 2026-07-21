import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Clock, MapPin, Zap, ExternalLink, Play, Check,
  RefreshCw, Calendar, AlertTriangle, Filter, Navigation, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Task {
  id: number;
  generator_id: number;
  serial_number: string;
  customer_name: string;
  customer_address: string;
  generator_address?: string;
  appointment_date: string;
  status: string;
  notes: string;
  technician_name: string;
  assistant_name?: string;
}

const todayStr = new Date().toLocaleDateString('sv-SE');

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
};

const getDayLabel = (dateStr: string): { label: string; color: string; bg: string } => {
  const today = new Date(todayStr);
  const d = new Date(dateStr);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)} gün gecikmiş`, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  if (diff === 0) return { label: 'Bugün', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
  if (diff === 1) return { label: 'Yarın', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  return { label: `${diff} gün sonra`, color: '#64748b', bg: 'rgba(100,116,139,0.08)' };
};

const TechnicianTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today');
  const [techFilter, setTechFilter] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setIsFetching(true);
    try {
      const response = await api.get('/appointments');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Görevler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // Auto-refresh every 3 minutes
    const interval = setInterval(() => fetchTasks(true), 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      toast.success(status === 'İşlemde' ? '▶️ İş başlatıldı.' : status === 'Tamamlandı' ? '✅ İş tamamlandı!' : 'Durum güncellendi.');
      fetchTasks(true);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Durum güncellenirken hata oluştu.');
    }
  };

  const openInMap = (address: string) => {
    if (!address) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  // Get unique technicians from tasks
  const technicians = Array.from(new Set(tasks.map(t => t.technician_name).filter(Boolean)));

  // Filter logic
  const weekEnd = new Date(todayStr);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const filterByDate = (t: Task) => {
    if (dateFilter === 'today') return t.appointment_date === todayStr;
    if (dateFilter === 'week') return t.appointment_date >= todayStr && t.appointment_date <= weekEndStr;
    return true;
  };

  const filterByTech = (t: Task) => {
    if (!techFilter) return true;
    return t.technician_name === techFilter || t.assistant_name === techFilter;
  };

  const activeTasks = tasks
    .filter(t => t.status !== 'Tamamlandı' && t.status !== 'İptal')
    .filter(filterByDate)
    .filter(filterByTech)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  const overdueTasks = activeTasks.filter(t => t.appointment_date < todayStr);
  const todayTasks = activeTasks.filter(t => t.appointment_date === todayStr);
  const upcomingTasks = activeTasks.filter(t => t.appointment_date > todayStr);

  const completedTasks = tasks
    .filter(t => t.status === 'Tamamlandı')
    .filter(filterByDate)
    .filter(filterByTech)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));

  const todayCompleted = tasks.filter(t => t.status === 'Tamamlandı' && t.appointment_date === todayStr).length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <RefreshCw size={36} className="animate-spin" color="var(--primary)" />
    </div>
  );

  const TaskCard = ({ task, highlight }: { task: Task; highlight?: 'overdue' | 'today' | 'upcoming' }) => {
    const addr = task.generator_address || task.customer_address;
    const dayLabel = getDayLabel(task.appointment_date);
    const isActive = task.status === 'İşlemde';

    const borderColor = highlight === 'overdue' ? '#ef4444' : highlight === 'today' ? '#10b981' : 'var(--border-color)';
    const topStripe = highlight === 'overdue' ? '#ef4444' : highlight === 'today' ? '#10b981' : '#64748b';

    return (
      <div className="card" style={{ padding: '0', overflow: 'hidden', borderTop: `4px solid ${topStripe}`, transition: 'transform 0.15s', position: 'relative' }}>
        {isActive && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            background: '#1e40af', color: '#fff', fontSize: '10px',
            fontWeight: '800', padding: '3px 10px', borderRadius: '20px',
            letterSpacing: '0.5px', animation: 'pulse 2s infinite'
          }}>
            ● SAHADA
          </div>
        )}
        <div style={{ padding: '20px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: dayLabel.bg, color: dayLabel.color,
                fontSize: '11px', fontWeight: '800', padding: '3px 10px',
                borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Calendar size={11} /> {dayLabel.label}
              </span>
              <span style={{
                background: task.status === 'İşlemde' ? '#dbeafe' : '#f1f5f9',
                color: task.status === 'İşlemde' ? '#1e40af' : '#475569',
                fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px'
              }}>
                {task.status}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', fontFamily: 'monospace' }}>#{task.serial_number}</span>
          </div>

          {/* Customer name */}
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>{task.customer_name}</div>

          {/* Date */}
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={12} /> {formatDate(task.appointment_date)}
          </div>

          {/* Technician */}
          {task.technician_name && (
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={12} />
              {task.technician_name}{task.assistant_name ? ` & ${task.assistant_name}` : ''}
            </div>
          )}

          {/* Address */}
          {addr && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '18px' }}>
              <MapPin size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{addr}</span>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div style={{ background: 'var(--bg-input)', padding: '12px 15px', borderRadius: '8px', fontSize: '12px', fontStyle: 'italic', marginBottom: '18px', borderLeft: '3px solid var(--border-color)', color: 'var(--text-muted)' }}>
              "{task.notes}"
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {task.status !== 'İşlemde' ? (
              <button
                onClick={() => updateStatus(task.id, 'İşlemde')}
                className="btn btn-secondary"
                style={{ padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}
              >
                <Play size={16} /> İşi Başlat
              </button>
            ) : (
              <button
                onClick={() => navigate(`/generators/${task.generator_id}`)}
                className="btn btn-primary"
                style={{ padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}
              >
                <Zap size={16} /> Servis Formu
              </button>
            )}
            <button
              onClick={() => updateStatus(task.id, 'Tamamlandı')}
              className="btn btn-primary"
              style={{ padding: '13px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}
            >
              <Check size={16} /> Tamamla
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'var(--bg-input)', padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {addr ? (
            <button
              onClick={() => openInMap(addr)}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}
            >
              <Navigation size={13} /> Haritada Aç
            </button>
          ) : <span />}
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID: #{task.id}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '30px', fontWeight: '800', margin: 0 }}>Saha Görevleri</h2>
          <p style={{ color: '#64748b', margin: '6px 0 0' }}>
            Bugün <strong style={{ color: 'var(--primary)' }}>{todayCompleted}</strong> iş tamamlandı ·{' '}
            {activeTasks.length} aktif görev
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchTasks(true)}
          disabled={isFetching}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Yükleniyor...' : 'Yenile'}
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} color="#94a3b8" />

        {/* Date filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {([
            { key: 'today', label: 'Bugün' },
            { key: 'week', label: 'Bu Hafta' },
            { key: 'all', label: 'Tümü' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateFilter(key)}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: '700', borderRadius: '20px',
                border: `1.5px solid ${dateFilter === key ? 'var(--primary)' : 'var(--border-color)'}`,
                background: dateFilter === key ? 'var(--primary)' : 'transparent',
                color: dateFilter === key ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tech filter */}
        {technicians.length > 1 && (
          <select
            value={techFilter}
            onChange={e => setTechFilter(e.target.value)}
            style={{
              padding: '6px 12px', fontSize: '12px', fontWeight: '700',
              border: '1.5px solid var(--border-color)', borderRadius: '20px',
              background: 'var(--bg-input)', color: 'var(--text-main)', cursor: 'pointer'
            }}
          >
            <option value="">Tüm Teknisyenler</option>
            {technicians.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={18} color="#ef4444" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ef4444', margin: 0 }}>
                Gecikmiş İşler ({overdueTasks.length})
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {overdueTasks.map(task => <TaskCard key={task.id} task={task} highlight="overdue" />)}
            </div>
          </div>
        )}

        {/* Today */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10b981', margin: 0 }}>
              Bugünün İşleri ({todayTasks.length})
            </h3>
          </div>
          {todayTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {todayTasks.map(task => <TaskCard key={task.id} task={task} highlight="today" />)}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <CheckCircle size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: '600' }}>Bugün için aktif görev yok.</p>
            </div>
          )}
        </div>

        {/* Upcoming */}
        {upcomingTasks.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={16} color="#64748b" />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#64748b', margin: 0 }}>
                Yaklaşan İşler ({upcomingTasks.length})
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {upcomingTasks.map(task => <TaskCard key={task.id} task={task} highlight="upcoming" />)}
            </div>
          </div>
        )}

        {activeTasks.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <CheckCircle size={52} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <p style={{ fontWeight: '700', fontSize: '16px', margin: '0 0 6px' }}>Harika! Tüm işler tamam.</p>
            <p style={{ margin: 0, fontSize: '13px' }}>Seçili filtre için aktif görev bulunmuyor.</p>
          </div>
        )}

        {/* Completed tasks toggle */}
        {completedTasks.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '800', color: '#94a3b8', padding: 0, marginBottom: '12px'
              }}
            >
              {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Tamamlanan İşler ({completedTasks.length})
            </button>
            {showCompleted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {completedTasks.slice(0, 15).map(task => (
                  <div key={task.id} className="card" style={{ opacity: 0.65, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>{task.customer_name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {formatDate(task.appointment_date)} · {task.technician_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ExternalLink
                          size={14}
                          color="var(--primary)"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/generators/${task.generator_id}`)}
                        />
                        <CheckCircle color="#10b981" size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianTasks;
