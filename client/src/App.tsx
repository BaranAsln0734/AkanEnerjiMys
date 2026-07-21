import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Zap, AlertCircle, Bell, Package, BookOpen, Truck, Calendar, LogOut, Shield, FileText, ClipboardList, Moon, Sun, FileSignature, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Generators from './pages/Generators';
import GeneratorDetail from './pages/GeneratorDetail';
import Contracts from './pages/Contracts';
import TechnicianTasks from './pages/TechnicianTasks';
import MaintenanceProgram from './pages/MaintenanceProgram';
import PublicGeneratorView from './pages/PublicGeneratorView';
import CustomerDetail from './pages/CustomerDetail';
import Login from './pages/Login';
import CustomerPortal from './pages/CustomerPortal';
import Parts from './pages/Parts';
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';
import { Toaster } from 'react-hot-toast';
import { syncOfflineServices } from './utils/offlineQueue';
import api from './api';
import './App.css';

// Global Navigation Link Helper

const NavLink = ({ to, children, icon: Icon }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <li>
      <Link to={to} className={isActive ? 'active' : ''}>
        <Icon size={20} /> <span>{children}</span>
      </Link>
    </li>
  );
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const { data: notifications = [], refetch: refetchNotifications } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 20000 // Refetch every 20 seconds
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      refetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      refetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Sync offline services on startup
    syncOfflineServices();

    // Listen for connection going online to trigger sync
    window.addEventListener('online', syncOfflineServices);
    return () => {
      window.removeEventListener('online', syncOfflineServices);
    };
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!user || user.role !== 'technician') return;

    let watchId: number;

    const reportLocation = async (lat: number, lng: number) => {
      try {
        await api.post('/technicians/location', { latitude: lat, longitude: lng });
      } catch (err) {
        console.error('Error reporting technician location:', err);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          reportLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 15000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          reportLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn('Geolocation watch error:', err),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) return null;

  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/public/generator/:hash" element={<PublicGeneratorView />} />
        <Route path="*" element={
          user ? (
            <div className="app-container">
              <nav className="sidebar">
                <div className="user-profile" style={{ padding: '0 20px', marginBottom: '20px', marginTop: '25px' }}>
                  <div style={{ 
                    background: '#1e293b', 
                    padding: '12px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{ 
                      background: 'var(--primary)', 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#111827'
                    }}>
                      {user.role === 'admin' ? <Shield size={18} /> : <Zap size={18} />}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>{user.role}</div>
                    </div>
                  </div>
                </div>

                <ul className="nav-links">
                  {user.role === 'admin' && (
                    <>
                      <NavLink to="/" icon={LayoutDashboard}>Panel</NavLink>
                      <NavLink to="/customers" icon={Users}>Müşteriler</NavLink>
                      <NavLink to="/generators" icon={Zap}>Jeneratörler</NavLink>
                      <NavLink to="/quotes" icon={FileSignature}>Teklifler</NavLink>
                      <NavLink to="/contracts" icon={FileText}>Sözleşmeler</NavLink>
                      <NavLink to="/maintenance-program" icon={Calendar}>Yıllık Program</NavLink>
                      <NavLink to="/parts" icon={Package}>Yedek Parçalar</NavLink>
                    </>
                  )}
                  {user.role === 'technician' && (
                    <>
                      <NavLink to="/my-tasks" icon={ClipboardList}>Günlük Görevlerim</NavLink>
                    </>
                  )}
                  {user.role === 'customer' && (
                    <>
                      <NavLink to="/" icon={LayoutDashboard}>Müşteri Portalı</NavLink>
                    </>
                  )}
                </ul>
                
                <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px' }}>
                  <button 
                    onClick={handleLogout}
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '12px', 
                      background: '#fee2e2', 
                      color: '#ef4444', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}
                  >
                    <LogOut size={18} /> Oturumu Kapat
                  </button>
                  <div style={{ marginTop: '20px', fontSize: '11px', opacity: 0.3, textAlign: 'center' }}>
                    © 2026 Akan Enerji v1.3
                  </div>
                </div>
              </nav>
              
              <div className="content-wrapper">
                <header className="top-header" style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  padding: '15px 40px',
                  background: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '20px',
                  position: 'relative'
                }}>
                  {/* Theme Toggle Button */}
                  <button 
                    onClick={toggleTheme}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '8px', 
                      background: 'var(--bg-input)', 
                      color: 'var(--text-main)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={theme === 'light' ? 'Karanlık Mod' : 'Aydınlık Mod'}
                  >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} 
                  </button>

                  {/* Notification Bell */}
                  <div className="logo-bell" style={{ cursor: 'pointer', padding: '8px', position: 'relative', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNotifications(!showNotifications)}>
                    <Bell size={18} style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} />
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        borderRadius: '10px',
                        padding: '1px 4px',
                        minWidth: '10px',
                        textAlign: 'center',
                        lineHeight: '1'
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Floating Notification Dropdown */}
                  {showNotifications && (
                    <div className="notification-dropdown" style={{ left: 'auto', right: '40px', top: '55px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)' }}>Bildirimler</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Hepsini Oku
                          </button>
                        )}
                      </div>
                      
                      <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notifications.length > 0 ? (
                          notifications.map((n: any) => (
                            <div 
                              key={n.id} 
                              onClick={() => {
                                handleMarkAsRead(n.id);
                                if (n.title.includes('Görev') || n.title.includes('Servis')) {
                                  setShowNotifications(false);
                                }
                              }}
                              className="notification-item"
                              style={{
                                background: n.is_read ? 'transparent' : 'var(--bg-input)',
                                border: n.is_read ? '1px solid transparent' : '1px solid var(--border-color)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '800', fontSize: '11.5px', color: 'var(--text-main)' }}>{n.title}</span>
                                {!n.is_read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>}
                              </div>
                              <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4', textAlign: 'left' }}>{n.message}</p>
                              <div style={{ fontSize: '8.5px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                                {new Date(n.created_at).toLocaleDateString('tr-TR')} {new Date(n.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '11px' }}>
                            Yeni bildirim yok.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </header>

                <main className="content">
                  <Routes>
                    <Route path="/" element={
                      user.role === 'admin' ? (
                        <Dashboard />
                      ) : user.role === 'customer' ? (
                        <CustomerPortal />
                      ) : (
                        <Navigate to="/my-tasks" />
                      )
                    } />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/customers/:id" element={<CustomerDetail />} />
                    <Route path="/generators" element={<Generators />} />
                    <Route path="/generators/:id" element={<GeneratorDetail />} />
                    <Route path="/maintenance-program" element={<MaintenanceProgram />} />
                    <Route path="/contracts" element={<Contracts />} />
                    <Route path="/parts" element={<Parts />} />
                    <Route path="/quotes" element={<Quotes />} />
                    <Route path="/quotes/:id" element={<QuoteDetail />} />
                    <Route path="/my-tasks" element={<TechnicianTasks />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
              </div>
            </div>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
