# CVSPower: VPS Canlıya Alma, Müşteri Portalı ve Sistem Yönetim Rehberi

Bu rehber, **CVSPower** projesinin VPS (sanal sunucu) üzerinde sorunsuz çalıştırılması, güncellenmesi, Müşteri Portalı'nın yönetimi, PWA (mobil uygulama) kurulumu ve veri tabanı yedekleme sistemi hakkında detaylı bilgiler içermektedir.

---

## 📋 İçindekiler
1. [Giriş ve Yapılan Geliştirmeler](#1-giriş-ve-yapılan-geliştirmeler)
2. [Kullanıcı Giriş & Rol Sistemi (Müşteri Portalı)](#2-kullanıcı-giriş--rol-sistemi-müşteri-portalı)
3. [VPS Güncelleme & Deploy Adımları](#3-vps-güncelleme--deploy-adımları)
4. [PWA Mobil Kurulumu & SSL (HTTPS) Yapılandırması](#4-pwa-mobil-kurulumu--ssl-https-yapılandırması)
5. [Veri Tabanı ve Yedekleme (Backup) Yönetimi](#5-veri-tabanı-ve-yedekleme-backup-yönetimi)

---

## 1. Giriş ve Yapılan Geliştirmeler

Projeyi canlı ortamda profesyonel bir saha servis uygulamasına dönüştürmek amacıyla aşağıdaki temel sistemler kurulmuştur:
*   **Müşteri Portalı:** Müşterilerin kendi cihazlarını, sözleşmelerini ve servis formlarını şifreleriyle girip takip edebildiği izole alan.
*   **PWA (Progressive Web App):** Uygulamanın mobil cihazlara (Android/iOS) yerel uygulama gibi indirilip kurulabilmesi.
*   **Çevrimdışı Servis Kaydı (Offline Queue):** Sahada internet çekmediğinde yapılan servis kayıtlarının telefonda saklanması ve internet geldiğinde otomatik olarak sunucuya senkronize edilmesi.
*   **Otomatik Yedekleme (Daily Backups):** Günde bir kez otomatik çalışan, veri kaybını önleyen güvenli SQLite `VACUUM` yedekleme sistemi.
*   **Türkçe Karakter Destekli PDF:** Rapor indirmelerinde Türkçe karakterlerin (`ş, ğ, ı, İ, ç, ö, ü`) kusursuz görünmesi için dinamik font motoru.

---

## 2. Kullanıcı Giriş & Rol Sistemi (Müşteri Portalı)

Sistemde 3 tip kullanıcı rolü bulunmaktadır:
1.  **Admin (Yönetici):** Tüm sistemi, teknisyenleri, müşterileri, yedekleri yönetir.
2.  **Technician (Saha Teknisyeni):** Kendisine atanan günlük servis işlerini görür, form doldurur, imza alır.
3.  **Customer (Müşteri):** Sadece kendi jeneratörlerini ve geçmiş servis raporlarını görür.

### 🔑 Müşteri Giriş Bilgileri Nasıl Oluşturulur?
Müşterilerin sisteme girebilmesi için sabit veya hazır şifreler yoktur. Giriş yetkilerini Admin paneli üzerinden şu adımlarla belirlersiniz:

1.  **Admin Paneli**ne giriş yapın.
2.  Sol menüden **Müşteriler** sayfasına girin.
3.  Erişim tanımlamak istediğiniz müşterinin yanındaki **Detay** butonuna tıklayın.
4.  Sol alt tarafta yer alan **"Portala Erişim Hesabı"** bölümünü bulun.
5.  Müşteriniz için bir **Kullanıcı Adı** ve **Şifre** yazarak **"Erişim Hesabı Tanımla"** butonuna basın.
6.  Oluşturulan bu bilgileri müşterinize verdiğinizde, ana giriş ekranından (`/login`) kendi panellerine erişebilirler.

> [!IMPORTANT]
> Güvenlik nedeniyle, rolü `customer` olan bir kullanıcı API seviyesinde kısıtlanır. Başka bir müşterinin jeneratör bilgilerine, servis formlarına ya da sözleşmelerine bağlantı adresini tahmin ederek dahi erişemez.

---

## 3. VPS Güncelleme & Deploy Adımları

Lokal bilgisayarınızda (Windows) kodları geliştirdikten sonra bunları VPS (sunucu) üzerinde canlıya almak için her zaman aşağıdaki standart sıralamayı izleyin:

### Adım A: Kendi Bilgisayarınızda (Lokal)
Terminali (PowerShell) açın ve proje klasöründe şu komutla değişiklikleri uzak depoya gönderin:
```powershell
git push
```

### Adım B: VPS Üzerinde (Ubuntu / SSH)
Ubuntu terminalinize SSH ile bağlandıktan sonra sırasıyla şu komutları çalıştırın:

```bash
# 1. Proje ana klasörüne gidin
cd /var/www/cvspower

# 2. Yeni kodları sunucuya çekin
git pull

# 3. Sunucu (Backend) paketlerini güncelleyin (Yeni paket eklendiyse zorunludur)
cd server
npm install

# 4. Arayüzü (Frontend) yeni kodlarla derleyin
cd ../client
npm install
npm run build

# 5. Çalışan uygulamayı PM2 ile yeniden başlatın
pm2 restart all
```

### 💡 Sık Kullanılan PM2 Komutları
*   `pm2 status` veya `pm2 list`: Çalışan uygulamaların durumunu gösterir.
*   `pm2 logs cvs-backend`: Canlı logları ve olası hataları ekrana yazdırır.
*   `pm2 show cvs-backend`: Çalışma dizinini, portu ve detaylı PM2 ayarlarını listeler.

---

## 4. PWA Mobil Kurulumu & SSL (HTTPS) Yapılandırması

Uygulamanın telefonlara indirilebilmesi (PWA indirme butonu çıkması) için **HTTPS (güvenli bağlantı) zorunludur**. Tarayıcılar (Chrome, Safari), güvensiz HTTP bağlantılarında (`http://68.183.100.102` gibi IP adreslerinde) Service Worker çalıştırılmasına ve uygulamanın kurulmasına güvenlik nedeniyle izin vermez.

### 🔒 Nginx ve Let's Encrypt (SSL) Kurulum Adımları
Sunucunuzda bir alan adına (Örn: `servis.cvspower.com`) SSL kurup PWA'yı aktif etmek için şu adımları izleyebilirsiniz:

1.  **Nginx Kurulumu (Yoksa):**
    ```bash
    sudo apt update
    sudo apt install nginx -y
    ```
2.  **Nginx Konfigürasyonu:**
    `/etc/nginx/sites-available/cvspower` dosyası oluşturup aşağıdaki ayarları ekleyin:
    ```nginx
    server {
        listen 80;
        server_name servis.cvspower.com; # Alan adınızı buraya yazın

        # Frontend (Build edilmiş statik dosyalar)
        location / {
            root /var/www/cvspower/client/dist;
            try_files $uri $uri/ /index.html;
        }

        # Backend API Proxy
        location /api {
            proxy_pass http://localhost:5000; # Express backend portu
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    Dosyayı aktifleştirin ve Nginx'i yeniden başlatın:
    ```bash
    sudo ln -s /etc/nginx/sites-available/cvspower /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

3.  **SSL (Let's Encrypt) Kurulumu:**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d servis.cvspower.com
    ```
    *Certbot yönlendirmeleri tamamladığında siteniz artık HTTPS olarak çalışacaktır. Tarayıcıdan alan adınıza girdiğinizde sağ üst köşede **"Uygulamayı İndir/Yükle"** simgesi çıkacaktır.*

---

## 5. Veri Tabanı ve Yedekleme (Backup) Yönetimi

Veri tabanı dosyanız `/var/www/cvspower/server/database.sqlite` konumundadır.

### 🕒 Günlük Otomatik Yedekleme
Sistem arka planda her **24 saatte bir** otomatik olarak yedek alır. Yedekleme işlemi sırasında veri tabanının kilitlenmemesi için güvenli SQLite `VACUUM INTO` yöntemi kullanılır.
*   Yedekler `/var/www/cvspower/server/backups/` klasörünün altına `backup_YYYY-MM-DD_HH-mm-ss.sqlite` formatında kaydedilir.

### ⚙️ Yönetici Yedek Kontrolleri
Admin kullanıcısı panel üzerinden yedekleri yönetebilir:
*   **Manuel Yedek Alma:** Sistem yedekleme sayfasından anında manuel yedek tetiklenebilir.
*   **Listeleme ve İndirme:** Alınmış olan yedek dosyaları boyutlarıyla listelenebilir ve bilgisayara indirilebilir.
*   **Geri Yükleme:** Olası bir sorunda eski bir yedek dosyası indirilip ana `database.sqlite` dosyası ile değiştirilerek sistem eski haline döndürülebilir.

---
*Bu rehber dokümanı, CVSPower sisteminin kararlı çalışmasını sağlamak amacıyla gelecekteki yönetim ve bakım süreclerinde referans olarak kullanılmalıdır.*
