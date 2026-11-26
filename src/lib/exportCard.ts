import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export async function exportElementAsPng(element: HTMLElement, fileName: string): Promise<string> {
  // Wait for Google Fonts to finish loading so Arabic ligatures render cleanly
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2,
    cacheBust: true,
    skipAutoScale: true,
  });

  const link = document.createElement('a');
  link.download = `${fileName}.png`;
  link.href = dataUrl;
  link.click();
  return dataUrl;
}

export async function exportElementAsPdf(
  element: HTMLElement,
  fileName: string,
  bgHex = '#FAF6EE',
): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const dataUrl = await toPng(element, {
    quality: 0.96,
    pixelRatio: 2,
    cacheBust: true,
    skipAutoScale: true,
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load captured image for PDF export'));
  });

  const orientation = img.width > img.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [img.width / 2, img.height / 2],
    compress: true,
  });

  pdf.setFillColor(bgHex);
  pdf.rect(0, 0, img.width / 2, img.height / 2, 'F');
  pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2, undefined, 'FAST');
  pdf.save(`${fileName}.pdf`);
}

export function downloadSvgQrCode(svgElement: SVGSVGElement | null, fileName: string): void {
  if (!svgElement) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgElement);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 720, 720);
      ctx.drawImage(img, 40, 40, 640, 640);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${fileName}-qr.png`;
      a.href = pngUrl;
      a.click();
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function buildWhatsAppShareUrl(params: {
  url: string;
  groomAr: string;
  brideAr: string;
  groomEn: string;
  brideEn: string;
  dateLabel: string;
  venue: string;
  guestName?: string;
  lang: 'ar' | 'en';
}): string {
  const { url, groomAr, brideAr, groomEn, brideEn, dateLabel, venue, guestName, lang } = params;
  const text =
    lang === 'ar'
      ? `${guestName ? `ضيفنا الكريم ${guestName}\n` : ''}تسرنا دعوتكم لحضور حفل زفاف\n${groomAr} & ${brideAr}\n📅 ${dateLabel}\n📍 ${venue}\n\nتفاصيل الدعوة وتأكيد الحضور عبر الرابط:\n${url}`
      : `${guestName ? `Dear ${guestName},\n` : ''}You are warmly invited to the wedding celebration of\n${groomEn} & ${brideEn}\nDate: ${dateLabel}\nVenue: ${venue}\n\nView invitation & RSVP:\n${url}`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function parseMapsCoordinates(
  url: string,
  lat: number | null,
  lng: number | null,
  address: string,
): { embedSrc: string; externalHref: string } {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return {
      embedSrc: `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`,
      externalHref: url?.trim() || `https://maps.google.com/?q=${lat},${lng}`,
    };
  }

  // Try extracting @lat,lng or q=lat,lng from Google Maps URL
  const matchAt = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (matchAt) {
    return {
      embedSrc: `https://maps.google.com/maps?q=${matchAt[1]},${matchAt[2]}&z=15&output=embed`,
      externalHref: url,
    };
  }

  const query = encodeURIComponent(address || 'Riyadh, Saudi Arabia');
  return {
    embedSrc: `https://maps.google.com/maps?q=${query}&z=14&output=embed`,
    externalHref: url?.trim() || `https://maps.google.com/?q=${query}`,
  };
}

export function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return null;
  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}
