import { format } from 'date-fns';
import { generatePDFReport, COLORS, drawPill } from '@/utils/pdf-export';
import coverImageUrl from '@/assets/pdf/space-availability-report-cover.png';

// ── Space Specific Constants ──
const STATUS = {
  occupied: { bg: [219, 234, 254], text: [37, 99, 235] },
  available: { bg: [220, 252, 231], text: [22, 163, 74] },
  reserved: { bg: [255, 237, 213], text: [234, 88, 12] },
  left: { bg: [254, 226, 226], text: [220, 38, 38] },
  notice: { bg: [254, 226, 226], text: [220, 38, 38] },
};

const TYPE = {
  co: { label: 'CO-WORKING', bg: [255, 237, 213], text: [234, 88, 12] },
  managed: { label: 'MANAGED OFFICE', bg: [243, 232, 255], text: [147, 51, 234] },
  resource: { label: 'RESOURCE', bg: [252, 231, 243], text: [219, 39, 119] },
};

const FALLBACK = { bg: [243, 244, 246], text: [107, 114, 128] };

const fmt = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
};

const getStatus = (s) => STATUS[(s || '').toLowerCase()] || FALLBACK;

const getType = (t) => {
  const n = (t || '').toLowerCase();
  if (n.includes('managed')) return TYPE.managed;
  if (n.includes('co')) return TYPE.co;
  if (n.includes('resource')) return TYPE.resource;
  return { label: (t || '-').toUpperCase(), ...FALLBACK };
};

const alignIndexColumn = (d) => {
  if (d.column.index !== 0) return;
  d.cell.styles.halign = 'center';
  if (d.section === 'body') d.cell.styles.valign = 'middle';
};

const fmtAvailableSeatsOrSft = (space) => {
  const sft = Number(space?.total_carpet_sft);
  if (Number.isFinite(sft) && sft > 0) {
    const value = Number.isInteger(sft) ? sft : Number.parseFloat(sft.toFixed(2));
    return `${value} Sft`;
  }
  return String(space?.available_seats ?? 0);
};

export const generateSpacePDF = async (rawData, filtersObj = {}) => {
  // Always include all passed centers in the main list
  const data = { ...rawData };

  // Format filters into an array for the generic builder
  const filters = [];
  if (filtersObj.state) filters.push({ label: 'State', value: filtersObj.state });
  if (filtersObj.city) filters.push({ label: 'City', value: filtersObj.city });

  const zoneKeys = filtersObj.zones
    ? Array.isArray(filtersObj.zones)
      ? filtersObj.zones
      : Object.keys(filtersObj.zones)
    : [];
  if (zoneKeys.length > 0) filters.push({ label: 'Zones', value: zoneKeys.join(', ') });

  filters.push({ label: 'Centers', value: String(data.centers?.length || 0) });
  filters.push({ label: 'Total Spaces', value: String(data.total_count || 0) });

  // Summary Table Configuration
  const summaryTable = {
    title: 'Centers Overview',
    head: [['#', 'Center Name', 'Zone', 'City', 'Micro Market', 'Spaces']],
    body: (data.centers || []).map((c, i) => [
      i + 1,
      c.center_name || '-',
      c.zone || '-',
      c.city || '-',
      c.micro_market || '-',
      c.space_count ?? 0,
    ]),
    columnStyles: {
      0: { halign: 'center', valign: 'middle', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 22 },
    },
    didParseCell: alignIndexColumn,
  };

  // Build detail pages array configuring behavior
  const detailPages = (data.centers || [])
    .map((center) => {
      // Determine subtitle
      const subtitle = [center.zone, center.city, center.state, center.micro_market]
        .filter(Boolean)
        .join('  •  ');
      const rightText = `${center.space_count ?? 0} spaces`;

      const rowMapper = (s, i) => ({
        idx: String(i + 1),
        spaceName: s.inventory_name || '-',
        floor: s.floor || '-',
        status: s.status || '-',
        spaceType: s.space_type || '-',
        spaceSubType: s.space_sub_type || '-',
        availableSeats: fmtAvailableSeatsOrSft(s),
      });

      const bodyRows = (center.spaces || []).map(rowMapper);

      return {
        title: center.center_name || '-',
        subtitle,
        rightText,
        // If no spaces length, we don't render tables for this page by providing empty rows.
        // But we just skip adding it basically if it shouldn't show (based on previous fixes, we said NO empty center pages).
        skipPage: !center.spaces?.length,
        headerColumns: [
          { header: '#', dataKey: 'idx' },
          { header: 'Space Name', dataKey: 'spaceName' },
          { header: 'Floor', dataKey: 'floor' },
          { header: 'Product Type', dataKey: 'spaceType' },
          { header: 'Subspace Type', dataKey: 'spaceSubType' },
          { header: 'Available Seats/Sft', dataKey: 'availableSeats' },
          { header: 'Status', dataKey: 'status' },
        ],
        bodyRows,
        columnStyles: {
          0: { halign: 'center', valign: 'middle', cellWidth: 14 },
          5: { halign: 'center', cellWidth: 34 },
        },
        didParseCell: (d) => {
          alignIndexColumn(d);
          // Clear text because we will paint a colored pill for these columns
          if (
            d.section === 'body' &&
            (d.column.dataKey === 'spaceType' || d.column.dataKey === 'status')
          ) {
            d.cell.text = [];
          }
        },
        didDrawCell: (d, doc) => {
          // Status Badge Custom Draw
          if (d.column.dataKey === 'status') {
            const c = getStatus(d.row.raw.status);
            const text = (d.row.raw.status || '-').toUpperCase();
            doc.setFillColor(...COLORS.white);
            doc.rect(d.cell.x + 0.3, d.cell.y + 0.3, d.cell.width - 0.6, d.cell.height - 0.6, 'F');
            doc.setFillColor(...c.bg);
            doc.setTextColor(...c.text);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            const px = 3;
            const pillH = 4.8;
            const pillR = 1.2;
            const tw = doc.getTextWidth(text);
            const pillW = tw + px * 2;
            const pillX = d.cell.x + (d.cell.width - pillW) / 2;
            const pillY = d.cell.y + (d.cell.height - pillH) / 2;
            doc.roundedRect(pillX, pillY, pillW, pillH, pillR, pillR, 'F');
            doc.text(text, pillX + pillW / 2, pillY + pillH / 2, {
              align: 'center',
              baseline: 'middle',
            });
          }

          // Space Type Badge Custom Draw
          if (d.column.dataKey === 'spaceType') {
            const t = getType(d.row.raw.spaceType);
            doc.setFillColor(...COLORS.white);
            doc.rect(d.cell.x + 0.3, d.cell.y + 0.3, d.cell.width - 0.6, d.cell.height - 0.6, 'F');
            doc.setFillColor(...t.bg);
            doc.setTextColor(...t.text);
            doc.setFont('helvetica', 'bold');
            drawPill(doc, t.label, d.cell.x, d.cell.y, d.cell.height);
          }
        },
      };
    })
    .filter((page) => !page.skipPage);

  await generatePDFReport({
    title: 'Space Availability Report',
    fileName: `Space_Report_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`,
    brandName: 'DevX',
    reportDate: fmt(new Date()),
    coverImageUrl,
    filters,
    summaryTable,
    detailPages,
  });
};
