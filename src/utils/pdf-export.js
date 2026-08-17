import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ── Shared Generic Colors ──
export const COLORS = {
  text: [10, 10, 10],
  sub: [113, 113, 122],
  soft: [161, 161, 170],
  white: [255, 255, 255],
  stroke: [228, 228, 231],
  headerBg: [241, 245, 249],
  headerText: [71, 85, 105],
  green: [73, 178, 124], // DevX brand green
};

// ── Generic Draw Pill Helper ──
export const drawPill = (doc, text, cx, cy, ch) => {
  doc.setFontSize(6);
  const tw = doc.getTextWidth(text);
  const px = 3,
    h = 4.8,
    r = 1.2,
    w = tw + px * 2;
  const x = cx + 3,
    y = cy + (ch - h) / 2;
  doc.roundedRect(x, y, w, h, r, r, 'F');
  doc.text(text, x + px, y + h - 1.3);
};

const loadImageAsDataUrl = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    });
    img.addEventListener('error', () => reject(new Error('Failed to load report cover image')));
    img.src = url;
  });

// ── Generic PDF Report Builder ──
// Config accepts: title, fileName, brandName, filters, summaryTable, detailPages, coverImageUrl
export const generatePDFReport = async (config) => {
  const {
    title = 'Availability Report',
    fileName = `Report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`,
    brandName = 'DevX',
    filters = [],
    summaryTable = null,
    detailPages = [],
    reportDate = null,
    coverImageUrl = null,
  } = config;

  let doc;
  let coverPageCount = 0;
  const pageOrientation = coverImageUrl ? 'portrait' : 'landscape';

  if (coverImageUrl) {
    const cover = await loadImageAsDataUrl(coverImageUrl);
    doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const cpw = doc.internal.pageSize.getWidth();
    const cph = doc.internal.pageSize.getHeight();
    doc.addImage(cover.dataUrl, 'PNG', 0, 0, cpw, cph);
    doc.addPage('a4', 'portrait');
    coverPageCount = 1;
  } else {
    doc = new jsPDF({ orientation: pageOrientation, unit: 'mm', format: 'a4' });
  }

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;

  let y = m;

  // ── Page 1: Summary ──
  // Title with Branding
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(brandName, m, y + 7);
  const brandW = doc.getTextWidth(brandName);
  doc.setTextColor(...COLORS.text);
  doc.text(title, m + brandW + 4, y + 7);
  if (reportDate) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(reportDate, pw - m, y + 7, { align: 'right' });
  }
  y += 14;

  doc.setDrawColor(...COLORS.stroke);
  doc.setLineWidth(0.3);
  doc.line(m, y, pw - m, y);
  y += 8;

  // Render Filters Metadata
  if (filters && filters.length > 0) {
    doc.setFontSize(9);
    filters.forEach(({ label, value }) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.sub);
      doc.text(label, m + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text(value, m + 40, y);
      y += 6;
    });
    y += 10;
  }

  // Render Summary Main Table
  if (summaryTable) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(summaryTable.title || 'Overview', m, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: m, right: m },
      head: summaryTable.head || [],
      body: summaryTable.body || [],
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 3.5, textColor: COLORS.text, lineWidth: 0 },
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.headerText,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: summaryTable.columnStyles || {},
      didParseCell: summaryTable.didParseCell || undefined,
      didDrawCell: (d) => {
        if (d.section === 'body') {
          doc.setDrawColor(...COLORS.stroke);
          doc.setLineWidth(0.15);
          doc.line(
            d.cell.x,
            d.cell.y + d.cell.height,
            d.cell.x + d.cell.width,
            d.cell.y + d.cell.height,
          );
        }
      },
    });
  }

  // ── Page 2+: Detailed Group Pages ──
  detailPages.forEach((page) => {
    doc.addPage('a4', pageOrientation);
    y = m;

    // Header per page
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(page.title || '-', m, y + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.sub);
    if (page.subtitle) {
      doc.text(page.subtitle, m, y + 12);
    }

    if (page.rightText) {
      doc.setFont('helvetica', 'bold');
      doc.text(page.rightText, pw - m, y + 6, { align: 'right' });
    }

    y += 16;
    doc.setDrawColor(...COLORS.stroke);
    doc.setLineWidth(0.3);
    doc.line(m, y, pw - m, y);
    y += 4;

    // Table data body
    if (!page.bodyRows || page.bodyRows.length === 0) return;

    autoTable(doc, {
      startY: y,
      margin: { left: m, right: m },
      tableWidth: pw - 2 * m,
      columns: page.headerColumns || [],
      body: page.bodyRows || [],
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        textColor: COLORS.text,
        lineWidth: 0,
        overflow: 'visible',
      },
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.headerText,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: page.columnStyles || {},
      didParseCell: page.didParseCell || undefined,
      didDrawCell: (d) => {
        if (d.section !== 'body') return;

        // Render generic row dividers
        doc.setDrawColor(...COLORS.stroke);
        doc.setLineWidth(0.15);
        doc.line(
          d.cell.x,
          d.cell.y + d.cell.height,
          d.cell.x + d.cell.width,
          d.cell.y + d.cell.height,
        );

        // Perform custom rendering passed by caller (like badges)
        if (page.didDrawCell) {
          page.didDrawCell(d, doc);
        }
      },
    });
  });

  // ── Global Footer Rendering ──
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    if (coverPageCount && i <= coverPageCount) continue;
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.green);
    doc.text(brandName, m, ph - 6);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.soft);
    doc.text(`Page ${i} / ${total}`, pw - m, ph - 6, { align: 'right' });
  }

  doc.save(fileName);
};
