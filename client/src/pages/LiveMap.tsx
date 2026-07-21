import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import { Compass, Users, Zap, Search, MapPin, RefreshCw, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Generator {
  id: number;
  brand: string;
  model: string;
  serial_number: string;
  address: string;
  latitude: number;
  longitude: number;
  customer_name?: string;
}

interface Technician {
  id: number;
  name: string;
  phone: string;
  specialty: string;
  latitude: number;
  longitude: number;
  last_location_update: string;
  username: string;
}

// Global declaration for Leaflet window object
declare global {
  interface Window {
    L: any;
  }
}

const LiveMap = () => {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Dynamically load Google Maps script
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setGoogleReady(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setGoogleReady(true);
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDSMvlUKqujaiziqhlUHYW5VA8pa_lLlNs&libraries=places';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleReady(true);
    };
    document.head.appendChild(script);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [genRes, techRes] = await Promise.all([
        api.get('/generators'),
        api.get('/technicians')
      ]);
      setGenerators(genRes.data);
      setTechnicians(techRes.data);
    } catch (error) {
      console.error('Error fetching map data:', error);
      toast.error('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update map size when entering or exiting full screen
  useEffect(() => {
    if (mapRef.current && (window as any).google) {
      setTimeout(() => {
        (window as any).google.maps.event.trigger(mapRef.current, 'resize');
      }, 200);
    }
  }, [isFullScreen]);

  // Initialize and update Map markers
  useEffect(() => {
    if (!googleReady || loading || !document.getElementById('map-element')) return;

    const google = (window as any).google;

    // Create Map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(document.getElementById('map-element'), {
        center: { lat: 41.0082, lng: 28.9784 },
        zoom: 11,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
    }

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const now = new Date();

    // 1. Add Technician Markers
    technicians.forEach(t => {
      if (!t.latitude || !t.longitude) return;

      const isOnline = t.last_location_update && 
        (now.getTime() - new Date(t.last_location_update).getTime() < 3600000); // Online if updated in past 1 hour

      const infoWindowContent = `
        <div style="font-family: sans-serif; min-width: 160px; padding: 5px;">
          <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: 800; color: #1e293b;">👤 ${t.name}</h4>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b;">${t.specialty}</p>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 11px; color: #334155;">
            <strong>Durum:</strong> ${isOnline ? '<span style="color:#10b981;font-weight:bold;">Aktif (Çevrimiçi)</span>' : '<span style="color:#64748b;font-weight:bold;">Çevrimdışı</span>'}<br/>
            <strong>Telefon:</strong> ${t.phone || '-'}<br/>
            <strong>Son Güncelleme:</strong> ${t.last_location_update ? new Date(t.last_location_update).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
          </div>
        </div>
      `;

      const pinColor = isOnline ? '#10b981' : '#64748b';
      
      const marker = new google.maps.Marker({
        position: { lat: Number(t.latitude), lng: Number(t.longitude) },
        map: mapRef.current,
        title: t.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2.5,
          scale: 8,
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
      });

      marker.addListener('click', () => {
        infoWindow.open({
          anchor: marker,
          map: mapRef.current,
          shouldFocus: false
        });
      });
      
      markersRef.current.push(marker);
    });

    // 2. Add Generator Markers
    generators.forEach(g => {
      if (!g.latitude || !g.longitude) return;

      const infoWindowContent = `
        <div style="font-family: sans-serif; min-width: 180px; padding: 5px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 800; color: #2563eb;">⚡ ${g.brand} ${g.model}</h4>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; font-family: monospace;">Seri No: ${g.serial_number}</p>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 11px; color: #334155;">
            <strong>Müşteri:</strong> ${g.customer_name || 'Kayıtlı Müşteri'}<br/>
            <strong>Adres:</strong> ${g.address || '-'}
          </div>
          <a href="/generators/${g.id}" style="display: block; text-align: center; margin-top: 8px; padding: 4px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 4px; font-size: 10px; font-weight: bold;">Cihaz Detayına Git</a>
        </div>
      `;

      const marker = new google.maps.Marker({
        position: { lat: Number(g.latitude), lng: Number(g.longitude) },
        map: mapRef.current,
        title: `${g.brand} ${g.model}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 7,
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
      });

      marker.addListener('click', () => {
        infoWindow.open({
          anchor: marker,
          map: mapRef.current,
          shouldFocus: false
        });
      });

      markersRef.current.push(marker);
    });

  }, [googleReady, loading, generators, technicians]);

  const centerOnMarker = (lat: number, lng: number, zoom = 14) => {
    if (mapRef.current && (window as any).google) {
      mapRef.current.setCenter({ lat: Number(lat), lng: Number(lng) });
      mapRef.current.setZoom(zoom);
    }
  };

  const centerOnAll = () => {
    if (!mapRef.current || !(window as any).google) return;
    const google = (window as any).google;
    const markers = [...technicians, ...generators].filter(x => x.latitude && x.longitude);
    if (markers.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(x => {
      bounds.extend({ lat: Number(x.latitude), lng: Number(x.longitude) });
    });
    mapRef.current.fitBounds(bounds);
  };

  const filteredTechs = technicians.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 120px)' }}>
      
      <style>{`
        @keyframes pulseGreen {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
          70% { transform: scale(1.2); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .ping-effect {
          animation: pulseGreen 2.2s infinite ease-in-out;
        }
        .map-sidebar-item:hover {
          background: var(--bg-input);
        }
      `}</style>

      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass className="animate-spin" style={{ animationDuration: '8s' }} color="var(--primary)" /> Canlı Saha Haritası
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Saha ekiplerinin anlık GPS konumlarını ve kurulu jeneratör koordinatlarını izleyin.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchData} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} /> Konumları Yenile
          </button>
          <button 
            className="btn btn-primary" 
            onClick={centerOnAll}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Haritayı Sığdır
          </button>
        </div>
      </div>

      {/* KPI Cards & Legend bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
        <div className="card" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '12px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>
              {technicians.filter(t => t.latitude && t.longitude).length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Konumlu Saha Teknisyeni</div>
          </div>
        </div>

        <div className="card" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '12px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>
              {generators.filter(g => g.latitude && g.longitude).length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Haritadaki Jeneratör Sayısı</div>
          </div>
        </div>

        {/* Legend */}
        <div className="card" style={{ 
          padding: '12px 18px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          fontSize: '11px', 
          justifyContent: 'center',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span style={{ fontWeight: 'bold' }}>Yeşil Nokta:</span>
            <span>Aktif Çevrimiçi Teknisyen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }}></span>
            <span style={{ fontWeight: 'bold' }}>Gri Nokta:</span>
            <span>Çevrimdışı Teknisyen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
            <span style={{ fontWeight: 'bold' }}>Mavi Nokta:</span>
            <span>Müşteri Jeneratörü</span>
          </div>
        </div>
      </div>

      {/* Main Map Container & Sidebar Grid */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
        
        {/* Left Sidebar: Technicians list */}
        <div className="card" style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '15px', 
          gap: '12px',
          borderRadius: '16px',
          flexShrink: 0
        }}>
          {/* Search bar */}
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', borderRadius: '10px', padding: '8px 12px', border: '1px solid var(--border-color)' }}>
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Personel ara..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-main)' }}
            />
          </div>

          {/* List Wrapper */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredTechs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px' }}>
                Kayıt bulunamadı.
              </div>
            ) : (
              filteredTechs.map(t => {
                const hasCoords = !!(t.latitude && t.longitude);
                const isOnline = t.last_location_update && 
                  (Date.now() - new Date(t.last_location_update).getTime() < 3600000);

                return (
                  <div 
                    key={t.id}
                    className="map-sidebar-item"
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      transition: 'background 0.2s',
                      cursor: hasCoords ? 'pointer' : 'default',
                      opacity: hasCoords ? 1 : 0.55
                    }}
                    onClick={() => hasCoords && centerOnMarker(t.latitude, t.longitude, 15)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: isOnline ? '#10b981' : '#64748b' 
                        }}></span>
                        <span style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--text-main)' }}>
                          {t.name}
                        </span>
                      </div>
                      
                      {hasCoords ? (
                        <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={10} /> Konumlu
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Konum Yok
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Branş: {t.specialty}
                    </div>

                    {hasCoords && t.last_location_update && (
                      <div style={{ fontSize: '10px', color: '#64748b', background: 'rgba(100,116,139,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                        Son Sinyal: {new Date(t.last_location_update).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} ({new Date(t.last_location_update).toLocaleDateString('tr-TR')})
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Map Element */}
        <div 
          className="card" 
          style={isFullScreen ? {
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            width: '100vw',
            height: '100vh',
            borderRadius: 0,
            border: 'none',
            margin: 0,
            padding: 0
          } : {
            flex: 1,
            padding: 0,
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid var(--border-color)'
          }}
        >
          {(loading || !googleReady) && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.15)', backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                {!googleReady ? 'Google Haritalar Yükleniyor...' : 'Veriler Yükleniyor...'}
              </span>
            </div>
          )}
          
          {/* Full Screen Action Buttons */}
          {googleReady && !loading && (
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 1010,
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease'
              }}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 size={14} /> Küçült
                </>
              ) : (
                <>
                  <Maximize2 size={14} /> Tam Ekran
                </>
              )}
            </button>
          )}

          <div id="map-element" style={{ width: '100%', height: '100%', zIndex: 1 }}></div>
        </div>

      </div>

    </div>
  );
};

export default LiveMap;
