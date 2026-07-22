import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

// Helper function to fix Turkish characters for standard PDF fonts (replace with English equivalents)
const fixTurkishChars = (text: string | undefined | null): string => {
  if (!text) return "";
  const charMap: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C'
  };
  return text.split('').map(char => charMap[char] || char).join('');
};

const loadLogo = (): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = "/logo-2025.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
        return;
      }
      resolve("");
    };
    img.onerror = () => resolve("");
  });
};

const getCertBrandsImage = (): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1100;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Helper function to draw realistic ISO Badges
      const drawIsoBadge = (x: number, y: number, w: number, h: number, primaryColor: string, accentColor: string, code: string, title: string) => {
        // Main Badge Container with linear gradient
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, accentColor);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Left Emblem Box
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.roundRect(x + 10, y + 10, 100, h - 20, 8);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 14, y + 14, 92, h - 28);

        // Globe / Grid background lines inside emblem box
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + 60, y + (h / 2), 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x + 60, y + (h / 2), 32, 16, 0, 0, Math.PI * 2);
        ctx.stroke();

        // ISO Text
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 36px Arial, Helvetica, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ISO", x + 60, y + (h / 2) + 12);

        // Right Content: Standard Code and Title
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px Arial, Helvetica, sans-serif";
        ctx.fillText(code, x + 124, y + 52);

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 18px Arial, Helvetica, sans-serif";
        ctx.fillText(title, x + 124, y + 88);

        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.font = "14px Arial, Helvetica, sans-serif";
        ctx.fillText("ULUSLARARASI SERTİFİKALI", x + 124, y + 114);
      };

      // Helper function to draw authentic TSE-HYB Badge
      const drawTseBadge = (x: number, y: number, w: number, h: number) => {
        // Red Crimson Gradient
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
        gradient.addColorStop(0, "#991b1b");
        gradient.addColorStop(1, "#dc2626");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Official TSE Oval Shield
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(x + 70, y + (h / 2), 52, 42, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#991b1b";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(x + 70, y + (h / 2), 48, 38, 0, 0, Math.PI * 2);
        ctx.stroke();

        // TSE Letters inside Shield
        ctx.fillStyle = "#991b1b";
        ctx.font = "900 36px Arial, Helvetica, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TSE", x + 70, y + (h / 2) + 12);
        ctx.restore();

        // Right Text: TSE - HYB
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px Arial, Helvetica, sans-serif";
        ctx.fillText("TSE - HYB", x + 138, y + 52);

        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.font = "bold 18px Arial, Helvetica, sans-serif";
        ctx.fillText("HİZMET YETERLİLİK BELGESİ", x + 138, y + 88);

        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.font = "14px Arial, Helvetica, sans-serif";
        ctx.fillText("TS 12650 STANDARDI UYGUNLUK", x + 138, y + 114);
      };

      // Top Row: ISO 9001:2015, ISO 14001:2015, ISO 45001:2018
      drawIsoBadge(10, 10, 350, 140, "#1e3a8a", "#2563eb", "9001:2015", "KALİTE YÖNETİMİ");
      drawIsoBadge(375, 10, 350, 140, "#065f46", "#059669", "14001:2015", "ÇEVRE YÖNETİMİ");
      drawIsoBadge(740, 10, 350, 140, "#0f766e", "#0d9488", "45001:2018", "İSG YÖNETİMİ");

      // Bottom Row: ISO 22301:2019 and TSE-HYB
      drawIsoBadge(10, 165, 520, 140, "#3730a3", "#4f46e5", "22301:2019", "İŞ SÜREKLİLİĞİ YÖNETİMİ");
      drawTseBadge(550, 165, 540, 140);

      resolve(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Failed to generate cert brands canvas image:", err);
      resolve("");
    }
  });
};

const drawFooterStrip = (doc: jsPDF) => {
  doc.setFillColor(30, 58, 138); // Dark blue (#1e3a8a)
  doc.rect(8, 276, 194, 11, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(fixTurkishChars("MERKEZ ATÖLYE: Ahmet Yesevi Caddesi Tatlı Sokak No: 38 Başakşehir / İSTANBUL"), 105, 283, { align: "center" });
};

export const generateServicePDF = async (data: any) => {
  const doc = new jsPDF();
  
  const t = (text: string | undefined | null): string => {
    if (!text) return "";
    return fixTurkishChars(text);
  };

  // Force standard Helvetica font for offline capability and maximum speed
  doc.setFont("helvetica", "normal");

  // ----------------------------------------------------
  // 1. HEADER (ÜST ALAN) TASARIMI
  // ----------------------------------------------------
  let logoBase64 = "";
  let certBrandsImg = "";
  try {
    logoBase64 = await loadLogo();
  } catch (error) {
    console.error("Failed to load logo", error);
  }

  try {
    certBrandsImg = await getCertBrandsImage();
  } catch (error) {
    console.error("Failed to load cert brands graphic", error);
  }

  if (logoBase64) {
    // Enlarged Logo
    doc.addImage(logoBase64, 'PNG', 8, 4, 48, 21);
  } else {
    // Fallback if image not found
    doc.setFontSize(26);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("helvetica", "bold");
    doc.text("AKAN", 8, 19);
    doc.setTextColor(230, 126, 34); // Brand Accent Orange
    doc.text("ENERJI", 34, 19);
  }

  // Servis Bilgi Formu Title Box (Shifted to Left)
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(68, 8, 48, 7);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(t("SERVİS BİLGİ FORMU"), 92, 12.8, { align: "center" });

  doc.rect(68, 15, 48, 7);
  doc.setFontSize(8.5);
  doc.setTextColor(239, 68, 68); // Red for Form No
  doc.text(t(`FORM NO: 016${data.id || '651'}`), 92, 19.8, { align: "center" });

  // Right side certificates graphic badges
  if (certBrandsImg) {
    doc.addImage(certBrandsImg, 'PNG', 122, 4, 80, 20);
  }

  // Dark blue banner strip
  doc.setFillColor(30, 58, 138); // Dark blue (#1e3a8a)
  doc.rect(8, 26, 194, 5, 'F');
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(t("SATIŞ - SERVİS - KİRALAMA - 2.EL VE YEDEK PARÇA   |   0549 621 34 60   |   info@akanenerji.com   |   www.akanenerji.com"), 105, 29.5, { align: "center" });

  // ----------------------------------------------------
  // 2. CİHAZ VE EKİPMAN BİLGİLERİ TABLOSU
  // ----------------------------------------------------
  const gen = data.generator || {};
  
  const rawHours = data.runtime_hours || data.measurements?.runtime_hours || gen.runtime_hours;
  const runtimeDisplay = rawHours 
    ? (String(rawHours).toLowerCase().includes('saat') ? String(rawHours) : `${rawHours} Saat`)
    : '-';

  autoTable(doc, {
    startY: 33,
    margin: { left: 8, right: 8 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, lineColor: [210, 210, 210] },
    body: [
      [t("Jeneratör Modeli / Seri No"), t(`${gen.brand || ''} ${gen.model || ''} / ${gen.serial_number || data.serial_number || ''}`), t("Servis Tarihi"), t(data.service_date || '-')],
      [t("Motor Modeli / Seri No"), t(`${gen.engine_model || '-'} / ${gen.engine_serial_number || '-'}`), t("Yağ Filtre Kodu"), t(gen.oil_filter_code || '-')],
      [t("Alternatör Modeli / Seri No"), t(`${gen.alternator_model || '-'} / ${gen.alternator_serial_number || '-'}`), t("Yakıt Filtre Kodu"), t(gen.fuel_filter_code || '-')],
      [t("Kontrol Paneli / Cihaz Tipi"), t(`${gen.control_panel_type || '-'} / ${gen.control_device || '-'}`), t("Hava Filtre Kodu"), t(gen.air_filter_code || '-')],
      [t("Şalter Tipi / Kontaktör Tipi"), t(`${gen.breaker_type || '-'} ${gen.breaker_current ? '(' + gen.breaker_current + 'A)' : ''}`), t("Bypass Yağ Kodu"), t(gen.bypass_filter_code || '-')],
      [t("Jeneratör Çalışma Saati"), t(runtimeDisplay), t("Bypass Yakıt Kodu"), t(gen.chassis_filter_code || '-')],
      [t("Bakıma Başlama / Bitiş Saati"), t(data.start_time && data.end_time ? `${data.start_time} - ${data.end_time}` : (data.start_time || data.end_time || '-')), t("Ekstra / Diğer Kodu"), t(gen.extra_filter_code || data.extra_filter_code || gen.other_filter_code || '-')],
    ],
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold', fillColor: [245, 245, 245] },
      1: { cellWidth: 61 },
      2: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
      3: { cellWidth: 52 }
    }
  });

  // ----------------------------------------------------
  // 3. MÜŞTERİ VE FATURA DETAYLARI TABLOSU
  // ----------------------------------------------------
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 2.5,
    margin: { left: 8, right: 8 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.2, cellPadding: 1.5, lineColor: [210, 210, 210] },
    body: [
      [t("Firma İsmi"), t(data.customer?.name || '-'), t("Telefon / Faks"), t(data.customer?.phone || '-')],
      [t("Firma Adresi"), t(data.customer?.address || '-'), t("V.D. / V.No"), t(`${data.customer?.tax_office || '-'} / ${data.customer?.tax_id || '-'}`)],
    ],
    columnStyles: {
      0: { cellWidth: 27, fontStyle: 'bold', fillColor: [245, 245, 245] },
      1: { cellWidth: 92 },
      2: { cellWidth: 33, fontStyle: 'bold', fillColor: [245, 245, 245] },
      3: { cellWidth: 42 }
    }
  });

  // ----------------------------------------------------
  // 4. KONTROL LİSTESİ (SOL VE SAĞ SÜTUN)
  // ----------------------------------------------------
  const list = data.checklist || {};
  const solList = [
    "Yağ Seviyesi", "Su Seviyesi ve Katkılar", "Yakıt Seviyesi", "Turbo Kontrolü",
    "Kutup Başları ve Kabloları", "Kayış Gerginlikleri", "Alternatör Kontrolü",
    "Radyatör Kontrolü", "Egzoz Sistemi", "Havalandırma Sistemi"
  ];
  const sagList = [
    "Blok Su Isıtıcı ve Hortumları", "Sirkülasyon ve Devirdaim Kontrolü",
    "Filtrelerin Kontrolü", "Marş Motoru Kontrolü", "Güç ve Kumanda Devresi Kontrolü",
    "Pompa - Enjektör - Yakıt Yolu - Solenoid", "Kontrol Panosu", "Kontrol Cihazı",
    "Göstergeler", "Transfer Panosu"
  ];

  const getStatusText = (val: string) => {
    if (val === 'ok') return "Tatminkar";
    if (val === 'comment') return "Yorumlu";
    return "Haric";
  };

  const leftItems = solList.map(item => [t(item), t(getStatusText(list[item] || 'ok'))]);
  const rightItems = sagList.map(item => [t(item), t(getStatusText(list[item] || 'ok'))]);

  const checklistStartY = (doc as any).lastAutoTable.finalY + 3;

  autoTable(doc, {
    startY: checklistStartY,
    margin: { left: 8, right: 107 },
    head: [[t("Genel Kontroller"), t("Durum")]],
    body: leftItems,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.2, lineColor: [210, 210, 210] },
    headStyles: { fillColor: [44, 62, 80], cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 66 }, 1: { cellWidth: 29, fontStyle: 'bold' } }
  });
  const leftChecklistFinalY = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: checklistStartY,
    margin: { left: 107, right: 8 },
    head: [[t("Motor & Kumanda"), t("Durum")]],
    body: rightItems,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.2, lineColor: [210, 210, 210] },
    headStyles: { fillColor: [44, 62, 80], cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 66 }, 1: { cellWidth: 29, fontStyle: 'bold' } }
  });
  const rightChecklistFinalY = (doc as any).lastAutoTable.finalY;

  const checklistsFinalY = Math.max(leftChecklistFinalY, rightChecklistFinalY);

  // ----------------------------------------------------
  // 5. PARAMETRELER VE FAZ ÖLÇÜMLERİ
  // ----------------------------------------------------
  const m = data.measurements || {};
  const paramStartY = checklistsFinalY + 3.5;

  autoTable(doc, {
    startY: paramStartY,
    margin: { left: 8, right: 94 },
    head: [[t("Ölçülen Parametre Değerleri"), t("Değer")]],
    body: [
      [t("Akü Grubu"), (() => {
        if (!m.battery_group) return '-';
        const val = m.battery_group.trim();
        if (!/v/i.test(val) && !/ah/i.test(val) && /^\d+$/.test(val)) {
          return `12V ${val}Ah`;
        }
        return val;
      })()],
      [t("Akü Adedi"), `${m.battery_qty || '-'}`],
      [t("Şarj Alternatörü"), `${m.charger_alternator || '-'} Vdc`],
      [t("Şarj Cihazı"), `${m.charger_device || '-'} Vdc`],
      [t("Antifriz Sıcaklığı"), `${m.coolant_temp || '-'} °C`],
      [t("Yağ Basıncı"), `${m.oil_pressure || '-'} BAR`],
      [t("Yakıt Durumu"), `${m.fuel_level_text || '-'}`]
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1, lineColor: [210, 210, 210] },
    headStyles: { fillColor: [44, 62, 80], cellPadding: 1.2 },
    columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 43 } }
  });
  const leftParamFinalY = (doc as any).lastAutoTable.finalY;

  autoTable(doc, {
    startY: paramStartY,
    margin: { left: 122, right: 8 },
    head: [[t("Faz Gerilim ve Akımları"), t("Değer")]],
    body: [
      [t("U Fazı Gerilim / Akım"), `${m.voltage_u || '-'} V / ${m.current_u || '-'} A`],
      [t("V Fazı Gerilim / Akım"), `${m.voltage_v || '-'} V / ${m.current_v || '-'} A`],
      [t("W Fazı Gerilim / Akım"), `${m.voltage_w || '-'} V / ${m.current_w || '-'} A`],
      [t("Frekans"), `${m.frequency || '-'} Hz`],
      [t("Topraklama"), `${m.grounding || '-'}`]
    ],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1, lineColor: [210, 210, 210] },
    headStyles: { fillColor: [44, 62, 80], cellPadding: 1.2 },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 30 } }
  });
  const rightParamFinalY = (doc as any).lastAutoTable.finalY;

  const paramsFinalY = Math.max(leftParamFinalY, rightParamFinalY);

  // ----------------------------------------------------
  // 6. YAPILAN İŞLEMLER / AÇIKLAMALAR
  // (Multi-page overflow safe)
  // ----------------------------------------------------
  let descriptionFinalY = paramsFinalY;
  let cleanDescription = data.description || "";
  if (cleanDescription.includes("EK NOTLAR:")) {
    const parts = cleanDescription.split("EK NOTLAR:");
    cleanDescription = parts[parts.length - 1].trim();
  } else if (cleanDescription.includes("KONTROL LİSTESİ:") || cleanDescription.includes("KONTROL LISTESI:")) {
    const parts = cleanDescription.split("EK NOTLAR:");
    cleanDescription = parts[parts.length - 1].trim();
  }
  
  if (cleanDescription && cleanDescription !== "Planlı Servis Tamamlandı") {
    const descLines = doc.splitTextToSize(t(cleanDescription), 194);
    const descHeight = (descLines.length * 3.5) + 8;

    // Check if drawing description here would cross page bottom (230mm)
    if (descriptionFinalY + descHeight > 230) {
      drawFooterStrip(doc);
      doc.addPage();
      descriptionFinalY = 20;
    } else {
      descriptionFinalY += 5;
    }

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(t("YAPILAN İŞLEMLER / AÇIKLAMALAR"), 8, descriptionFinalY);
    
    doc.setFontSize(7.2);
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    
    doc.text(descLines, 8, descriptionFinalY + 3.5);
    descriptionFinalY += (descLines.length * 3.5) + 3;
  }

  // ----------------------------------------------------
  // 6.5. KULLANILAN YEDEK PARÇALAR VE SARF MALZEMELERİ
  // (Multi-page safe with margin.bottom protection)
  // ----------------------------------------------------
  const partsBody = (data.used_parts && data.used_parts.length > 0)
    ? data.used_parts.map((p: any) => [t(p.part_number || '-'), t(p.name), t(p.unit || 'Adet'), p.quantity])
    : [[t("-"), t("Yedek parça kullanılmadı"), t("-"), "-"]];

  let partsStartY = descriptionFinalY + 3.5;
  if (partsStartY > 215) {
    drawFooterStrip(doc);
    doc.addPage();
    partsStartY = 20;
  }

  autoTable(doc, {
    startY: partsStartY,
    margin: { left: 8, right: 8, top: 20, bottom: 25 },
    showHead: 'everyPage',
    head: [[t("Parça No"), t("Parça Adı"), t("Birim"), t("Miktar")]],
    body: partsBody,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.2, lineColor: [210, 210, 210] },
    headStyles: { fillColor: [44, 62, 80], cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 245] },
      1: { cellWidth: 119 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 }
    }
  });

  const partsFinalY = (doc as any).lastAutoTable.finalY || 205;

  // ----------------------------------------------------
  // 7. YASAL METİNLER VE İMZALAR (FOOTER)
  // (Multi-page overflow safe: Signatures need ~35mm)
  // ----------------------------------------------------
  let footerY = partsFinalY + 4;

  // If footerY + 35mm signature box would cross 270mm page bottom, push to new page!
  if (footerY + 35 > 270) {
    drawFooterStrip(doc);
    doc.addPage();
    footerY = 20;
  }

  // Left Legal Box & Customer Signature
  doc.setFontSize(5.8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  const legalTextLeft = doc.splitTextToSize(t("Servis süresi 20 iş günüdür. Servis süresini takiben 90 takvim günü içinde teslim alınmayan müşteri mallarından sorumluluk kabul edilmez. Yapılan tüm bakım ve servis hizmetlerini kabul ediyorum."), 92);
  doc.text(legalTextLeft, 8, footerY);

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(t("Müşteri Yetkilisi (Adı-Soyadı / İmza):"), 8, footerY + 14);
  if (data.customer_authorized_name) {
    doc.setFont("helvetica", "normal");
    doc.text(data.customer_authorized_name, 8, footerY + 17.5);
    doc.setFont("helvetica", "bold");
  }
  if (data.custSig) {
    doc.addImage(data.custSig, "PNG", 8, footerY + 19, 45, 12);
  }

  // Right Legal Box & Technician Signature
  doc.setFontSize(5.8);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  const legalTextMiddle = doc.splitTextToSize(t("Yukarıda bahsedilen arızaların çözümlenmemesinden kaynaklanacak kayıplar müşteri sorumluluğundadır. Jeneratörün bu formda yazılı tüm arızaları giderilerek veya bakımı yapılarak MÜŞTERİ'ye ÇALIŞIR DURUMDA SORUNSUZ olarak teslim edilmiştir."), 92);
  doc.text(legalTextMiddle, 107, footerY);

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(t("Servis Yetkilisi (Adı-Soyadı / İmza):"), 107, footerY + 14);
  if (data.tech_name) {
    doc.setFont("helvetica", "normal");
    doc.text(data.tech_name, 107, footerY + 17.5);
    doc.setFont("helvetica", "bold");
  }
  if (data.techSig) {
    doc.addImage(data.techSig, "PNG", 107, footerY + 19, 45, 12);
  }

  // ----------------------------------------------------
  // 8. ADRES ŞERİDİ (EN ALT TABELA ON CURRENT PAGE)
  // ----------------------------------------------------
  drawFooterStrip(doc);

  // ----------------------------------------------------
  // 9. BAKIM / SERVIS FOTOGRAFLARI (EK SAYFA IF PRESENT)
  // ----------------------------------------------------
  if (data.photo_before_url || data.photo_after_url) {
    doc.addPage();
    
    // Draw Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); // Dark Blue
    doc.text(t("BAKIM / SERVIS FOTOGRAFLARI"), 8, 20);
    
    // Draw horizontal separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(8, 24, 202, 24);

    const photoY = 32;

    if (data.photo_before_url) {
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(t("Servis Oncesi Cihaz Durumu:"), 8, photoY);
      
      try {
        doc.addImage(data.photo_before_url, "JPEG", 8, photoY + 3, 90, 90);
      } catch (err) {
        console.error("Error drawing photo_before on PDF:", err);
      }
    }

    if (data.photo_after_url) {
      const xPos = data.photo_before_url ? 107 : 8;
      
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(t("Servis Sonrasi Cihaz Durumu:"), xPos, photoY);
      
      try {
        doc.addImage(data.photo_after_url, "JPEG", xPos, photoY + 3, 90, 90);
      } catch (err) {
        console.error("Error drawing photo_after on PDF:", err);
      }
    }

    // Footer Adres Şeridi on Photo Page
    drawFooterStrip(doc);
  }

  doc.save(`Servis_Raporu_${data.serial_number}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateMonthlyProgramPDF = async (month: string, year: number, items: any[]) => {
  const doc = new jsPDF();
  
  const t = (text: string | undefined | null): string => {
    if (!text) return "";
    return fixTurkishChars(text);
  };
  
  // Header
  doc.setFillColor(30, 41, 59); // Dark Slate (#1e293b)
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Akan Enerji Operasyonel Takvim", 105, 20, { align: "center" });
  
  doc.setFontSize(14);
  doc.text(t(`${month} ${year} - Bakım Programı`), 105, 32, { align: "center" });

  // Summary Stats
  const planned = items.filter(i => i.type === 'periodic' && !i.isDone).length;
  const general = items.filter(i => i.type === 'general' && !i.isDone).length;
  const faults = items.filter(i => i.type === 'fault' && !i.isDone).length;
  const completed = items.filter(i => i.isDone).length;

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(t(`Kalan Planlı: ${planned}`), 15, 50);
  doc.text(t(`Kalan Genel: ${general}`), 70, 50);
  doc.text(t(`Kalan Özel: ${faults}`), 125, 50);
  doc.text(t(`Tamamlanan: ${completed}`), 170, 50);

  // Table
  autoTable(doc, {
    startY: 55,
    head: [[t("Müşteri"), t("Marka/Model"), t("Seri No"), t("İş Tipi"), t("Durum"), t("Sorumlu")]],
    body: items.map(i => [
      t(i.customer_name),
      t(`${i.brand} ${i.model}`),
      i.serial_number,
      t(i.type === 'periodic' ? 'Periyodik' : (i.type === 'general' ? 'Genel' : 'Özel Servis')),
      t(i.isDone ? 'Tamamlandı' : 'Bekliyor'),
      t(i.assignedTech ? `${i.assignedTech}${i.assistantTech ? ' + ' + i.assistantTech : ''}` : '-')
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 }
    }
  });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(t(`Oluşturma Tarihi: ${new Date().toLocaleString('tr-TR')}`), 105, 285, { align: "center" });

  doc.save(`Akan_Program_${month}_${year}.pdf`);
};

export const generateQuotePDF = async (quote: any) => {
  const doc = new jsPDF();
  
  const t = (text: string | undefined | null): string => {
    if (!text) return "";
    return fixTurkishChars(text);
  };
  
  // Load and add logo
  let logoBase64 = '';
  try {
    logoBase64 = await loadLogo();
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 50, 15);
    }
  } catch (err) {
    console.warn('Logo load failed:', err);
  }

  // Title & Quote Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // CVS Power Blue
  doc.text('TEKLIF MEKTUBU', 196, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Teklif No: ${quote.quote_number}`, 196, 27, { align: 'right' });
  doc.text(`Tarih: ${quote.quote_date}`, 196, 32, { align: 'right' });
  doc.text(`Gecerlilik: ${quote.valid_until || '-'}`, 196, 37, { align: 'right' });

  // Horizontal line separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 42, 196, 42);

  // Company info & Client info columns
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('TEKLIF VEREN', 14, 49);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Akan Enerji Jenerator Ltd. Sti.', 14, 54);
  doc.text('Adres: Ahmet Yesevi Cad. Tatli Sok. No:38 Basaksehir / Istanbul', 14, 59);
  doc.text('Tel: 0549 621 34 60', 14, 64);
  doc.text('E-posta: info@akanenerji.com', 14, 69);

  doc.setFont('helvetica', 'bold');
  doc.text('TEKLIF SUNULAN MUSTERI', 110, 49);
  
  doc.setFont('helvetica', 'normal');
  doc.text(t(quote.customer_name), 110, 54, { maxWidth: 86 });
  doc.text(`Adres: ${t(quote.customer_address || '-')}`, 110, 59, { maxWidth: 86 });
  doc.text(`Tel: ${quote.customer_phone || '-'}`, 110, 69);
  doc.text(`E-posta: ${quote.customer_email || '-'}`, 110, 74);
  
  if (quote.customer_tax_id) {
    doc.text(`VD / VKN: ${t(quote.customer_tax_office || '-')} / ${quote.customer_tax_id}`, 110, 79);
  }

  const toTitleCaseTr = (str: string): string => {
    return str
      .toLocaleLowerCase('tr')
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toLocaleUpperCase('tr') + word.slice(1);
      })
      .join(' ');
  };

  // AutoTable
  const tableHeaders = [['No', 'Aciklama', 'Miktar', 'Birim', 'Birim Fiyat', 'Indirim', 'KDV', 'Toplam']];
  const tableRows = quote.items.map((item: any, index: number) => {
    let desc = item.description || '';
    if (desc.toLocaleLowerCase('tr').includes('kontrol cihaz')) {
      desc = toTitleCaseTr(desc);
    }
    return [
      (index + 1).toString(),
      t(desc),
      item.quantity.toString(),
      t(item.unit),
      `${item.unit_price.toLocaleString('tr-TR')} TL`,
      item.discount_percent > 0 ? `%${item.discount_percent}` : '-',
      `%${item.vat_percent}`,
      `${item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
    ];
  });

  autoTable(doc, {
    startY: 88,
    head: tableHeaders,
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 27, halign: 'right' }
    }
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  
  doc.text('Ara Toplam:', 130, finalY);
  doc.text(`${quote.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, finalY, { align: 'right' });
  
  let currentY = finalY;
  if (quote.discount > 0) {
    currentY += 5;
    doc.text('Toplam Indirim (-):', 130, currentY);
    doc.text(`-${quote.discount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, currentY, { align: 'right' });
  }
  
  currentY += 5;
  doc.text('Toplam KDV:', 130, currentY);
  doc.text(`${quote.vat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, currentY, { align: 'right' });
  
  currentY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text('GENEL TOPLAM:', 130, currentY);
  doc.text(`${quote.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, 196, currentY, { align: 'right' });

  // Notes
  if (quote.notes) {
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('TEKLIF SARTLARI & NOTLAR', 14, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(t(quote.notes), 180);
    doc.text(splitNotes, 14, currentY + 6);
  }

  doc.save(`Teklif_${quote.quote_number}.pdf`);
};

export const generateServiceThermalPDF = async (data: any) => {
  const t = (text: string | undefined | null): string => {
    if (!text) return "";
    return fixTurkishChars(text);
  };

  let logoBase64 = "";
  let certBrandsImg = "";
  try {
    logoBase64 = await loadLogo();
  } catch (e) {}

  try {
    certBrandsImg = await getCertBrandsImage();
  } catch (e) {}

  // Calculate dynamic roll height
  const usedPartsCount = (data.used_parts && Array.isArray(data.used_parts)) ? data.used_parts.length : 0;
  const checklistCount = data.checklist ? Object.keys(data.checklist).length : 20;
  const estimatedHeight = Math.max(360, 240 + (checklistCount * 3.5) + (usedPartsCount * 5) + 60);

  const doc = new jsPDF({
    unit: "mm",
    format: [80, estimatedHeight]
  });

  doc.setFont("helvetica", "normal");
  let currentY = 8;

  // 1. Logo & Header
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 20, currentY, 40, 16);
      currentY += 18;
    } catch(e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("AKAN ENERJI", 40, currentY + 5, { align: "center" });
      currentY += 10;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("AKAN ENERJI", 40, currentY + 5, { align: "center" });
    currentY += 10;
  }

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text(t("JENERATOR VE GUC SISTEMLERI"), 40, currentY, { align: "center" });
  currentY += 3.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(t("Ahmet Yesevi Cad. Tatli Sok. No:38 Basaksehir / IST"), 40, currentY, { align: "center" });
  currentY += 3;
  doc.text(t("Tel: 0549 621 34 60  |  info@akanenerji.com"), 40, currentY, { align: "center" });
  currentY += 4;

  if (certBrandsImg) {
    try {
      doc.addImage(certBrandsImg, 'PNG', 6, currentY, 68, 18);
      currentY += 20;
    } catch (e) {}
  }

  doc.setLineWidth(0.3);
  doc.setDrawColor(30, 58, 138);
  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // Report Title Box
  doc.setFillColor(30, 58, 138);
  doc.rect(4, currentY, 72, 6, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(t("80mm TAM SERVIS BİLGİ RAPORU"), 40, currentY + 4.2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  currentY += 9;

  // Form Meta
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text(t(`FORM NO: 016${data.id || '651'}`), 4, currentY);
  doc.text(t(`TARİH: ${data.service_date || '-'}`), 40, currentY);
  currentY += 3.5;

  if (data.start_time || data.end_time) {
    doc.setFont("helvetica", "normal");
    doc.text(t(`Servis Saatleri: ${data.start_time || '-'} - ${data.end_time || '-'}`), 4, currentY);
    currentY += 3.5;
  }

  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200);
  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 2. Customer Details Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(240, 240, 240);
  doc.rect(4, currentY, 72, 4.5, 'F');
  doc.text(t("MÜŞTERİ / FİRMA BİLGİLERİ"), 6, currentY + 3.2);
  currentY += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const custNameLines = doc.splitTextToSize(t(`Firma: ${data.customer?.name || '-'}`), 72);
  doc.text(custNameLines, 4, currentY);
  currentY += (custNameLines.length * 3);

  if (data.customer?.address) {
    const custAddrLines = doc.splitTextToSize(t(`Adres: ${data.customer?.address}`), 72);
    doc.text(custAddrLines, 4, currentY);
    currentY += (custAddrLines.length * 3);
  }
  doc.text(t(`Tel: ${data.customer?.phone || '-'}`), 4, currentY);
  currentY += 3.5;
  if (data.customer_authorized_name) {
    doc.text(t(`Firma Yetkilisi: ${data.customer_authorized_name}`), 4, currentY);
    currentY += 3.5;
  }

  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 3. Generator & Equipment Details Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(240, 240, 240);
  doc.rect(4, currentY, 72, 4.5, 'F');
  doc.text(t("JENERATÖR VE EKİPMAN BİLGİLERİ"), 6, currentY + 3.2);
  currentY += 6.5;

  const gen = data.generator || {};
  const rawHours = data.runtime_hours || data.measurements?.runtime_hours || gen.runtime_hours;
  const runtimeDisplay = rawHours 
    ? (String(rawHours).toLowerCase().includes('saat') ? String(rawHours) : `${rawHours} Saat`)
    : '-';

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(t(`Marka / Model: ${gen.brand || ''} ${gen.model || ''} ${gen.kva ? '(' + gen.kva + ' kVA)' : ''}`), 4, currentY);
  currentY += 3.5;
  doc.text(t(`Seri No: ${gen.serial_number || data.serial_number || '-'}`), 4, currentY);
  currentY += 3.5;
  doc.text(t(`Çalışma Saati: ${runtimeDisplay}`), 4, currentY);
  currentY += 3.5;

  if (gen.oil_filter_code || gen.fuel_filter_code || gen.air_filter_code) {
    doc.setFont("helvetica", "bold");
    doc.text(t("Filtre Kodları:"), 4, currentY);
    currentY += 3;
    doc.setFont("helvetica", "normal");
    if (gen.oil_filter_code) { doc.text(t(`- Yağ Filtresi: ${gen.oil_filter_code}`), 6, currentY); currentY += 3; }
    if (gen.fuel_filter_code) { doc.text(t(`- Yakıt Filtresi: ${gen.fuel_filter_code}`), 6, currentY); currentY += 3; }
    if (gen.air_filter_code) { doc.text(t(`- Hava Filtresi: ${gen.air_filter_code}`), 6, currentY); currentY += 3; }
  }

  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 4. Inspection Checklist (Full 20-Item Detailed List)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(240, 240, 240);
  doc.rect(4, currentY, 72, 4.5, 'F');
  doc.text(t("SERVİS KONTROL LİSTESİ (20 KALEM)"), 6, currentY + 3.2);
  currentY += 6.5;

  const checklistObj = data.checklist || {};
  const checklistKeys = Object.keys(checklistObj).length > 0 
    ? Object.keys(checklistObj)
    : [...SOL_KONTROLLER, ...SAG_KONTROLLER];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);

  for (const item of checklistKeys) {
    const status = checklistObj[item] || 'ok';
    let statusText = '[OK] Normal';
    if (status === 'comment') statusText = '[O] Yorumlu';
    if (status === 'na') statusText = '[X] Hariç';

    const lineStr = `${statusText} - ${item}`;
    const wrappedItem = doc.splitTextToSize(t(lineStr), 72);
    doc.text(wrappedItem, 4, currentY);
    currentY += (wrappedItem.length * 3);
  }

  currentY += 1;
  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 5. Measurements Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(240, 240, 240);
  doc.rect(4, currentY, 72, 4.5, 'F');
  doc.text(t("ÖLÇÜM VE PARAMETRE DEĞERLERİ"), 6, currentY + 3.2);
  currentY += 6.5;

  const m = data.measurements || {};
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  doc.text(t(`Akü Grubu / Adedi: ${m.battery_group || '-'} / ${m.battery_qty || '-'}`), 4, currentY); currentY += 3.5;
  doc.text(t(`Şarj Alternatörü: ${m.charger_alternator || '-'} Vdc`), 4, currentY); currentY += 3.5;
  doc.text(t(`Şarj Cihazı (Redresör): ${m.charger_device || '-'} Vdc`), 4, currentY); currentY += 3.5;
  doc.text(t(`Topraklama: ${m.grounding || '-'}`), 4, currentY); currentY += 3.5;
  doc.text(t(`Yağ Basıncı: ${m.oil_pressure || '-'} BAR`), 4, currentY); currentY += 3.5;
  doc.text(t(`Motor Harareti: ${m.coolant_temp || '-'} °C`), 4, currentY); currentY += 3.5;
  doc.text(t(`Frekans: ${m.frequency || '-'} Hz`), 4, currentY); currentY += 3.5;
  doc.text(t(`Yakıt Seviyesi: ${m.fuel_level_text || '-'}`), 4, currentY); currentY += 3.5;
  doc.text(t(`U Fazı: ${m.voltage_u || '-'}V / ${m.current_u || '-'}A`), 4, currentY); currentY += 3.5;
  doc.text(t(`V Fazı: ${m.voltage_v || '-'}V / ${m.current_v || '-'}A`), 4, currentY); currentY += 3.5;
  doc.text(t(`W Fazı: ${m.voltage_w || '-'}V / ${m.current_w || '-'}A`), 4, currentY); currentY += 3.5;

  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 6. Parts Used Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(240, 240, 240);
  doc.rect(4, currentY, 72, 4.5, 'F');
  doc.text(t("KULLANILAN YEDEK PARÇALAR"), 6, currentY + 3.2);
  currentY += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  if (data.used_parts && Array.isArray(data.used_parts) && data.used_parts.length > 0) {
    for (const p of data.used_parts) {
      const lineStr = `${p.quantity} x ${p.name} (${(p.quantity * (p.unit_price || 0)).toLocaleString('tr-TR')} TL)`;
      const wrappedP = doc.splitTextToSize(t(lineStr), 72);
      doc.text(wrappedP, 4, currentY);
      currentY += (wrappedP.length * 3);
    }
  } else {
    doc.text(t("Yedek parça kullanılmadı."), 4, currentY);
    currentY += 3.5;
  }

  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 7. Operations & Notes Section
  let cleanDesc = data.description || "";
  if (cleanDesc.includes("EK NOTLAR:")) {
    const pArr = cleanDesc.split("EK NOTLAR:");
    cleanDesc = pArr[pArr.length - 1].trim();
  }

  if (cleanDesc) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setFillColor(240, 240, 240);
    doc.rect(4, currentY, 72, 4.5, 'F');
    doc.text(t("YAPILAN İŞLEMLER VE EK NOTLAR"), 6, currentY + 3.2);
    currentY += 6.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    const descLines = doc.splitTextToSize(t(cleanDesc), 72);
    doc.text(descLines, 4, currentY);
    currentY += (descLines.length * 3);

    doc.line(4, currentY, 76, currentY);
    currentY += 4;
  }

  // 8. Financial Totals
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(240, 240, 240);
  doc.rect(4, currentY, 72, 4.5, 'F');
  doc.text(t("FİNANSAL ÖZET"), 6, currentY + 3.2);
  currentY += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  const fee = data.service_fee || 0;
  const partsCost = data.total_cost || 0;
  const subTotal = fee + partsCost;
  const vat = subTotal * 0.20;
  const grandTotal = subTotal + vat;

  doc.text(t(`Servis İşçilik Ücreti: ${fee.toLocaleString('tr-TR')} TL`), 4, currentY); currentY += 3.5;
  doc.text(t(`Yedek Parça Tutarı: ${partsCost.toLocaleString('tr-TR')} TL`), 4, currentY); currentY += 3.5;
  doc.text(t(`Ara Toplam: ${subTotal.toLocaleString('tr-TR')} TL`), 4, currentY); currentY += 3.5;
  doc.text(t(`KDV (%20): ${vat.toLocaleString('tr-TR')} TL`), 4, currentY); currentY += 3.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(t(`GENEL TOPLAM: ${grandTotal.toLocaleString('tr-TR')} TL`), 4, currentY);
  currentY += 5;

  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 9. High-Resolution Digital Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(t("TESLİM EDEN VE TESLİM ALAN İMZALARI"), 4, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  // Technician Sig Box
  doc.text(t(`Teknisyen: ${data.technician_name || data.tech_name || 'Akan Enerji'}`), 4, currentY);
  if (data.techSig) {
    try {
      doc.addImage(data.techSig, "PNG", 4, currentY + 1, 32, 12);
    } catch(e) {}
  }

  // Customer Sig Box
  doc.text(t(`Müşteri Yetkilisi: ${data.customer_authorized_name || '-'}`), 40, currentY);
  if (data.custSig) {
    try {
      doc.addImage(data.custSig, "PNG", 40, currentY + 1, 32, 12);
    } catch(e) {}
  }

  currentY += 15;
  doc.line(4, currentY, 76, currentY);
  currentY += 4;

  // 10. Footer Message
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100);
  doc.text(t("Akan Enerji Servis Hizmetini Aldığınız İçin Teşekkür Ederiz."), 40, currentY, { align: "center" });
  currentY += 3;
  doc.text(t("Ahmet Yesevi Caddesi Tatlı Sokak No: 38 Başakşehir / İSTANBUL"), 40, currentY, { align: "center" });

  doc.save(`Servis_Raporu_80mm_${data.serial_number || 'Akan'}_${new Date().toISOString().split('T')[0]}.pdf`);
};

