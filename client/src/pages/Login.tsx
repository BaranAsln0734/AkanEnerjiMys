import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Lock, User, AlertCircle, ArrowRight, Wrench, FileText, Calendar, QrCode, Phone, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      const redirectPath = searchParams.get('redirect') || '/';
      navigate(redirectPath);
      window.location.reload(); // To refresh the layout/state
    } catch (err: any) {
      setError(err.response?.data?.error || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Scoped CSS styling for breathtaking layout */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1) translate(0px, 0px); }
          50% { opacity: 0.7; transform: scale(1.15) translate(30px, -30px); }
        }
        @keyframes driftGlow {
          0%, 100% { opacity: 0.3; transform: scale(1.2) translate(0px, 0px); }
          50% { opacity: 0.6; transform: scale(0.9) translate(-40px, 40px); }
        }
        .login-container {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          overflow: hidden;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0f172a;
        }
        
        /* Left Information Panel */
        .login-info-panel {
          flex: 1.2;
          background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
          padding: 60px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .login-info-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .info-header {
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
        }
        .info-logo-img {
          height: 96px;
          width: auto;
        }
        .info-main {
          max-width: 580px;
          z-index: 2;
          margin: 40px 0;
        }
        .info-tagline {
          font-size: 14px;
          font-weight: 800;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }
        .info-title {
          font-size: 36px;
          font-weight: 900;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 24px;
          letter-spacing: -0.5px;
        }
        .features-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .feature-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .feature-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.15);
          border: 1px solid rgba(37, 99, 235, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          flex-shrink: 0;
        }
        .feature-content h4 {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 4px 0;
        }
        .feature-content p {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.5;
        }
        .info-footer {
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 13px;
        }
        
        /* Right Form Panel */
        .login-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
          background: radial-gradient(circle at 70% 80%, rgba(30, 58, 138, 0.12) 0%, transparent 60%);
        }
        
        .glow-bubble-1 {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%);
          top: -100px;
          right: -100px;
          animation: pulseGlow 10s infinite alternate ease-in-out;
          pointer-events: none;
        }
        .glow-bubble-2 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(30, 58, 138, 0.1) 0%, transparent 70%);
          bottom: -150px;
          left: -100px;
          animation: driftGlow 14s infinite alternate-reverse ease-in-out;
          pointer-events: none;
        }
        .login-card {
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5);
          padding: 45px 40px;
          width: 100%;
          max-width: 400px;
          z-index: 10;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .login-card:hover {
          border-color: rgba(37, 99, 235, 0.25);
        }
        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 25px;
        }
        .logo-img {
          height: 68px;
          width: auto;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
        }
        .login-input-wrapper {
          position: relative;
          margin-bottom: 20px;
        }
        .login-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .login-input {
          background: rgba(30, 41, 59, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
          border-radius: 14px !important;
          padding: 14px 16px 14px 44px !important;
          width: 100%;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 15px;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15) !important;
          background: rgba(30, 41, 59, 0.6) !important;
          outline: none;
        }
        .login-icon {
          position: absolute;
          left: 14px;
          top: 40px;
          color: #64748b;
          transition: color 0.3s ease;
        }
        .login-input:focus + .login-icon {
          color: #2563eb;
        }
        .login-button {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 15px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
        }
        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
        }
        
        /* Responsiveness */
        @media (max-width: 900px) {
          .login-info-panel {
            display: none;
          }
          .login-form-panel {
            flex: 1;
          }
        }
      `}</style>

      {/* LEFT COLUMN: System Info Panel */}
      <div className="login-info-panel">
        <div className="info-header">
          <img src="/logo-2025.png" alt="CVS Power Logo" className="info-logo-img" />
        </div>

        <div className="info-main">
          <div className="info-tagline">Müşteri & Servis Yönetim Portalı</div>
          <h1 className="info-title">Güç Güven İster,<br />Güven Takip İster.</h1>
          
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon-box">
                <Calendar size={20} />
              </div>
              <div className="feature-content">
                <h4>Periyodik Bakım ve Yıllık Program</h4>
                <p>Sözleşmeli jeneratörlerin aylık ve yıllık periyodik bakım takvimi ile gelecekteki servis planları otomatik izlenir.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <QrCode size={20} />
              </div>
              <div className="feature-content">
                <h4>QR Kod ve Dijital Jeneratör Kimliği</h4>
                <p>Jeneratör etiketlerindeki QR kodlar sayesinde geçmiş servis raporlarına ve teknik ölçümlere saniyeler içinde erişilir.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <Wrench size={20} />
              </div>
              <div className="feature-content">
                <h4>Saha Ekip ve Envanter Yönetimi</h4>
                <p>Teknisyen iş atamaları, kullanılan yedek parçaların anlık stok takibi ve kritik stok sınır uyarıları merkezi olarak yönetilir.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <FileText size={20} />
              </div>
              <div className="feature-content">
                <h4>Otomatik PDF Servis Raporları</h4>
                <p>Tamamlanan servisler sonrasında akü, şarj alternatörü ve faz voltaj ölçümlerini içeren imzalı PDF raporları anında oluşturulur.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="info-footer">
          <Phone size={14} />
          <span>Destek ve İletişim Hattı: <strong>0530 960 84 39</strong> | info@cvspower.com | cvspower.com</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Glassmorphic Login Form */}
      <div className="login-form-panel">
        <div className="glow-bubble-1"></div>
        <div className="glow-bubble-2"></div>

        <div className="login-card">
          {/* Logo container visible on mobile or smaller viewports */}
          <div className="logo-container" style={{ display: window.innerWidth <= 900 ? 'flex' : 'none' }}>
            <img src="/logo-2025.png" alt="CVS Power Logo" className="logo-img" />
          </div>
          
          <div style={{ marginBottom: '35px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px', margin: '0 0 6px 0' }}>Sistem Girişi</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Devam etmek için kullanıcı bilgilerinizi yazın</p>
          </div>

          {error && (
            <div className="error-alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-input-wrapper">
              <label className="login-label">Kullanıcı Adı</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="login-input"
                placeholder="kullanıcı adı"
                required
              />
              <User size={18} className="login-icon" />
            </div>

            <div className="login-input-wrapper">
              <label className="login-label">Şifre</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="login-input"
                placeholder="••••••••"
                required
              />
              <Lock size={18} className="login-icon" />
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
              style={{ marginTop: '10px' }}
            >
              <span>{loading ? 'Bağlanılıyor...' : 'Sisteme Güvenli Giriş Yap'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '35px', fontSize: '11px', color: '#475569', fontWeight: '500' }}>
            Cvspower Jeneratör Müşteri Yönetim Sistemi 1.3
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
