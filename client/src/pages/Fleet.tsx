import React, { useEffect, useState } from 'react';
import api from '../api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Truck, Activity, Settings, Zap, MapPin as MapPinIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
}

interface TraccarPosition {
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number;
  attributes: any;
}

interface Generator {
  id: number;
  serial_number: string;
  customer_name: string;
  traccar_id: string;
  location: string;
}

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center);
  return null;
};

const Fleet = () => {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [devices, setDevices] = useState<TraccarDevice[]>([]);
  const [positions, setPositions] = useState<TraccarPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9334, 32.8597]); // Center of Turkey

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchLiveUpdates, 15000); // Update every 15s
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      const genRes = await api.get('/generators');
      setGenerators(genRes.data);
      await fetchLiveUpdates();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching fleet data:', error);
      toast.error('Filo verileri yüklenemedi.');
      setLoading(false);
    }
  };

  const fetchLiveUpdates = async () => {
    try {
      const [devRes, posRes] = await Promise.all([
        api.get('/traccar/devices'),
        api.get('/traccar/positions')
      ]);
      setDevices(devRes.data);
      setPositions(posRes.data);
    } catch (error) {
      console.error('Traccar update error:', error);
    }
  };

  const getGeneratorData = (traccarId: string) => {
    const device = devices.find(d => d.uniqueId === traccarId || d.id.toString() === traccarId);
    const position = device ? positions.find(p => p.deviceId === device.id) : null;
    return { device, position };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'offline': return '#64748b';
      case 'unknown': return '#f59e0b';
      default: return '#ef4444';
    }
  };

  const linkedGenerators = generators.filter(g => g.traccar_id);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Canlı Filo Takibi</h2>
          <p style={{ color: '#64748b' }}>Traccar entegrasyonu ile jeneratörlerin anlık GPS konumları.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
           <div className="status-badge status-green" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }}></div>
              {devices.filter(d => d.status === 'online').length} AKTİF CİHAZ
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Real Leaflet Map */}
        <div className="card" style={{ height: '700px', padding: 0, overflow: 'hidden', zIndex: 1 }}>
           <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google"
              />
              <ChangeView center={mapCenter} />
              {linkedGenerators.map(gen => {
                const { position } = getGeneratorData(gen.traccar_id);
                if (!position) return null;
                return (
                  <Marker key={gen.id} position={[position.latitude, position.longitude]}>
                    <Popup>
                      <div style={{ padding: '5px' }}>
                        <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>{gen.serial_number}</strong>
                        <div style={{ fontSize: '12px', marginTop: '5px' }}>
                          <strong>Müşteri:</strong> {gen.customer_name}<br/>
                          <strong>Hız:</strong> {Math.round(position.speed * 1.852)} km/h<br/>
                          <strong>Son Güncelleme:</strong> {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
           </MapContainer>
        </div>

        {/* Sidebar List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', maxHeight: '700px', paddingRight: '5px' }}>
          {linkedGenerators.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Zap size={40} style={{ opacity: 0.2, marginBottom: '10px' }}/>
              <p>Henüz Traccar ID tanımlanmış bir jeneratör bulunmuyor.</p>
            </div>
          ) : linkedGenerators.map(g => {
            const { device, position } = getGeneratorData(g.traccar_id);
            const status = device?.status || 'offline';
            
            return (
              <div key={g.id} 
                   className="card" 
                   onClick={() => position && setMapCenter([position.latitude, position.longitude])}
                   style={{ padding: '20px', borderLeft: `6px solid ${getStatusColor(status)}`, transition: 'transform 0.2s', cursor: 'pointer' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '900', fontSize: '16px', color: 'var(--primary)' }}>{g.serial_number}</span>
                    <span className="status-badge" style={{ fontSize: '9px', background: '#f1f5f9', color: '#64748b' }}>
                      {status.toUpperCase()}
                    </span>
                 </div>
                 <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{g.customer_name}</div>
                 <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '15px' }}>📍 {g.location || 'Konum Belirtilmedi'}</div>
                 
                 {position ? (
                   <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: '#94a3b8' }}>HIZ</div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{Math.round(position.speed * 1.852)} km/h</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', color: '#94a3b8' }}>GPS DURUMU</div>
                        <div style={{ fontWeight: '700', fontSize: '11px', color: '#10b981' }}>SİNYAL OK</div>
                      </div>
                   </div>
                 ) : (
                   <div style={{ fontSize: '11px', color: 'var(--danger)', fontStyle: 'italic' }}>Konum verisi alınamıyor</div>
                 )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Fleet;
