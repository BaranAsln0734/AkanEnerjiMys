import { generateServiceThermalPDF } from './pdfGenerator';
import { toast } from 'react-hot-toast';

const SOL_KONTROLLER = [
  "Yağ Seviyesi", "Su Seviyesi ve Katkılar", "Yakıt Seviyesi", "Turbo Kontrolü",
  "Kutup Başları ve Kabloları", "Kayış Gerginlikleri", "Alternatör Kontrolü",
  "Radyatör Kontrolü", "Egzoz Sistemi", "Havalandırma Sistemi"
];

const SAG_KONTROLLER = [
  "Blok Su Isıtıcı ve Hortumları", "Sirkülasyon ve Devirdaim Kontrolü",
  "Filtrelerin Kontrolü", "Marş Motoru Kontrolü", "Güç ve Kumanda Devresi Kontrolü",
  "Pompa - Enjektör - Yakıt Yolu - Solenoid", "Kontrol Panosu", "Kontrol Cihazı",
  "Göstergeler", "Transfer Panosu"
];

export const sendToRawBTPrinter = (data: any) => {
  try {
    const gen = data.generator || {};
    const cust = data.customer || {};
    const m = data.measurements || {};
    const list = data.checklist || {};
    const checklistKeys = Object.keys(list).length > 0 ? Object.keys(list) : [...SOL_KONTROLLER, ...SAG_KONTROLLER];

    const fee = data.service_fee || 0;
    const partsCost = data.total_cost || 0;
    const subTotal = fee + partsCost;
    const vat = subTotal * 0.20;
    const grandTotal = subTotal + vat;

    let text = "";
    text += "================================================\n";
    text += "               AKAN ENERJİ                      \n";
    text += "      JENERATÖR VE GÜÇ SİSTEMLERİ               \n";
    text += "================================================\n";
    text += "Ahmet Yesevi Cad. Tatlı Sok. No:38 Başakşehir/İST\n";
    text += "Tel: 0549 621 34 60  |  info@akanenerji.com     \n";
    text += "------------------------------------------------\n";
    text += "            80mm SERVİS BİLGİ RAPORU            \n";
    text += "------------------------------------------------\n";
    text += `FORM NO : 016${data.id || '651'}\n`;
    text += `TARİH   : ${data.service_date || new Date().toLocaleDateString('tr-TR')}\n`;
    if (data.start_time || data.end_time) {
      text += `SAAT    : ${data.start_time || '-'} - ${data.end_time || '-'}\n`;
    }
    text += "------------------------------------------------\n";

    // Müşteri Bilgileri
    text += "[ MÜŞTERİ / FİRMA BİLGİLERİ ]\n";
    text += `Firma : ${cust.name || '-'}\n`;
    text += `Adres : ${cust.address || '-'}\n`;
    text += `Tel   : ${cust.phone || '-'}\n`;
    if (data.customer_authorized_name) {
      text += `Yetkili: ${data.customer_authorized_name}\n`;
    }
    text += "------------------------------------------------\n";

    // Jeneratör Bilgileri
    text += "[ JENERATÖR BİLGİLERİ ]\n";
    text += `Marka/Model : ${gen.brand || ''} ${gen.model || ''} ${gen.kva ? '(' + gen.kva + ' kVA)' : ''}\n`;
    text += `Seri No     : ${gen.serial_number || data.serial_number || '-'}\n`;
    text += `Çalışma Saati: ${data.runtime_hours || m.runtime_hours || gen.runtime_hours || '-'}\n`;
    text += "------------------------------------------------\n";

    // Kontrol Listesi
    text += "[ SERVİS KONTROL LİSTESİ (20 KALEM) ]\n";
    for (const item of checklistKeys) {
      const status = list[item] || 'ok';
      let st = '[OK] Normal';
      if (status === 'comment') st = '[O] Yorumlu';
      if (status === 'na') st = '[X] Hariç ';
      text += `${st} - ${item}\n`;
    }
    text += "------------------------------------------------\n";

    // Ölçümler
    text += "[ TEKNİK ÖLÇÜMLER ]\n";
    text += `Akü Grubu / Adet : ${m.battery_group || '-'} / ${m.battery_qty || '-'}\n`;
    text += `Şarj Alt / Redr  : ${m.charger_alternator || '-'}V / ${m.charger_device || '-'}V\n`;
    text += `Topraklama       : ${m.grounding || '-'}\n`;
    text += `Hararet / Basınç : ${m.coolant_temp || '-'} °C / ${m.oil_pressure || '-'} BAR\n`;
    text += `Frekans          : ${m.frequency || '-'} Hz\n`;
    text += `U Fazı (V/A)     : ${m.voltage_u || '-'}V / ${m.current_u || '-'}A\n`;
    text += `V Fazı (V/A)     : ${m.voltage_v || '-'}V / ${m.current_v || '-'}A\n`;
    text += `W Fazı (V/A)     : ${m.voltage_w || '-'}V / ${m.current_w || '-'}A\n`;
    text += "------------------------------------------------\n";

    // Kullanılan Parçalar
    text += "[ KULLANILAN PARÇALAR ]\n";
    if (data.used_parts && Array.isArray(data.used_parts) && data.used_parts.length > 0) {
      for (const p of data.used_parts) {
        text += `- ${p.quantity}x ${p.name} (${(p.quantity * (p.unit_price || 0)).toLocaleString('tr-TR')} TL)\n`;
      }
    } else {
      text += "Yedek parça kullanılmadı.\n";
    }
    text += "------------------------------------------------\n";

    // Yapılan İşlemler
    let cleanDesc = data.description || "";
    if (cleanDesc.includes("EK NOTLAR:")) {
      cleanDesc = cleanDesc.split("EK NOTLAR:")[1].trim();
    }
    if (cleanDesc) {
      text += "[ YAPILAN İŞLEMLER VE AÇIKLAMA ]\n";
      text += `${cleanDesc}\n`;
      text += "------------------------------------------------\n";
    }

    // Finansal Özet
    text += "[ FİNANSAL ÖZET ]\n";
    text += `İşçilik Ücreti : ${fee.toLocaleString('tr-TR')} TL\n`;
    text += `Yedek Parça    : ${partsCost.toLocaleString('tr-TR')} TL\n`;
    text += `Ara Toplam     : ${subTotal.toLocaleString('tr-TR')} TL\n`;
    text += `KDV (%20)      : ${vat.toLocaleString('tr-TR')} TL\n`;
    text += `GENEL TOPLAM   : ${grandTotal.toLocaleString('tr-TR')} TL\n`;
    text += "------------------------------------------------\n";

    // İmzalar ve Son
    text += `Teknisyen : ${data.technician_name || data.tech_name || 'Akan Enerji'}\n`;
    text += `Müşteri   : ${data.customer_authorized_name || '-'}\n`;
    text += "================================================\n";
    text += " Akan Enerji Hizmetinizi Aldığınız İçin Teşekkür Ederiz.\n\n\n\n";

    // Encode text to UTF-8 Base64
    const utf8Bytes = new TextEncoder().encode(text);
    let binary = '';
    utf8Bytes.forEach(b => binary += String.fromCharCode(b));
    const base64Data = window.btoa(binary);

    // RawBT Intent URL for Android
    const intentUrl = `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a414.rawbt;type=text/plain;end;`;

    // Attempt trigger RawBT Intent
    window.location.href = intentUrl;
    toast.success('RawBT yazıcı komutu gönderildi!');

  } catch (err) {
    console.error('RawBT print error:', err);
    toast.error('Bluetooth yazıcıya gönderilemedi. 80mm PDF indiriliyor...');
    generateServiceThermalPDF(data);
  }
};
