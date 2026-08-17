import React from 'react';
import { RiSettings2Line } from 'react-icons/ri';

import * as Modal from '@/components/ui/modal';

// ── Inline SVG chart illustrations ─────────────────────────────────────────

function LineChartSvg() {
  return (
    <svg
      viewBox='0 0 256 96'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      {/* grid lines */}
      {[0, 32, 64].map((y) => (
        <line key={y} x1='0' y1={y} x2='256' y2={y} stroke='#e2e4e9' strokeWidth='0.5' />
      ))}
      {/* line 1 */}
      <polyline
        points='0,70 40,45 80,60 120,30 160,50 200,20 256,40'
        stroke='#079455'
        strokeWidth='2'
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {/* line 2 */}
      <polyline
        points='0,80 40,65 80,75 120,55 160,70 200,45 256,60'
        stroke='#4ade80'
        strokeWidth='1.5'
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeDasharray='4 2'
      />
      {/* line 3 */}
      <polyline
        points='0,60 40,80 80,50 120,72 160,38 200,58 256,30'
        stroke='#16a34a'
        strokeWidth='1.5'
        fill='none'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

function BarChartSvg() {
  const bars = [
    { x: 18, h: 52, color: '#fdba74' },
    { x: 58, h: 72, color: '#f97316' },
    { x: 98, h: 38, color: '#f17b2c' },
    { x: 138, h: 80, color: '#ea580c' },
    { x: 178, h: 60, color: '#92400e' },
    { x: 218, h: 44, color: '#f17b2c' },
  ];
  return (
    <svg
      viewBox='0 0 256 96'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      {[0, 32, 64].map((y) => (
        <line key={y} x1='0' y1={y} x2='256' y2={y} stroke='#e2e4e9' strokeWidth='0.5' />
      ))}
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={96 - b.h} width='26' height={b.h} rx='2' fill={b.color} />
      ))}
    </svg>
  );
}

function PieChartSvg() {
  const cx = 128,
    cy = 48,
    r = 36,
    innerR = 20;
  const segments = [
    { startAngle: 0, endAngle: 120, color: '#3b0764' },
    { startAngle: 120, endAngle: 230, color: '#7c3aed' },
    { startAngle: 230, endAngle: 360, color: '#c4b5fd' },
  ];

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, outerR, innerR, startAngle, endAngle) {
    const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
    const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
      'Z',
    ].join(' ');
  }

  return (
    <svg
      viewBox='0 0 256 96'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      {segments.map((s, i) => (
        <path key={i} d={describeArc(cx, cy, r, innerR, s.startAngle, s.endAngle)} fill={s.color} />
      ))}
    </svg>
  );
}

function BatteryChartSvg() {
  const bars = [
    { x: 24, w: 93, color: '#dbeafe' },
    { x: 119, w: 48, color: '#93c5fd' },
    { x: 169, w: 21, color: '#375dfb' },
    { x: 192, w: 92, color: '#1e3a8a' },
  ];
  return (
    <svg
      viewBox='0 0 256 76'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      {[0, 25, 50].map((x) => (
        <line key={x} x1={x + 24} y1='0' x2={x + 24} y2='76' stroke='#e2e4e9' strokeWidth='0.5' />
      ))}
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={24} width={b.w} height={26} rx='2' fill={b.color} />
      ))}
      {['30K', '40K', '50K', '60K', '70K', '80K'].map((label, i) => (
        <text key={i} x={24 + i * 38} y={70} fontSize='8' fill='#94a3b8' textAnchor='middle'>
          {label}
        </text>
      ))}
    </svg>
  );
}

function CalculationSvg() {
  return (
    <svg
      viewBox='0 0 312 120'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      <text
        x='156'
        y='68'
        fontSize='40'
        fontWeight='500'
        fill='#0a0d14'
        textAnchor='middle'
        fontFamily='Inter, sans-serif'
      >
        12,458
      </text>
      <text
        x='156'
        y='92'
        fontSize='14'
        fontWeight='600'
        fill='#525866'
        textAnchor='middle'
        fontFamily='Inter, sans-serif'
        opacity='0.7'
      >
        Total Value
      </text>
    </svg>
  );
}

function TableSvg() {
  const headers = ['#', 'GPD (USD)', 'GPD - PC (USD)'];
  const rows = [
    ['1', '$25,462 B', '$78,287'],
    ['2', '$17,886 B', '$12,598'],
  ];
  const colWidths = [28, 110, 110];
  const colXs = [0, 28, 138];

  return (
    <svg
      viewBox='0 0 272 90'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='w-full h-full'
    >
      {/* header bg */}
      <rect x='0' y='0' width='272' height='25' fill='#f7f8fa' />
      {/* row alternating */}
      <rect x='0' y='25' width='272' height='25' fill='white' />
      <rect x='0' y='50' width='272' height='25' fill='#f6faff' />
      {/* vertical dividers */}
      {colXs.slice(1).map((x, i) => (
        <line key={i} x1={x} y1='0' x2={x} y2='75' stroke='#e3e6ea' strokeWidth='0.5' />
      ))}
      {/* horizontal dividers */}
      {[25, 50, 75].map((y) => (
        <line key={y} x1='0' y1={y} x2='272' y2={y} stroke='#e3e6ea' strokeWidth='0.5' />
      ))}
      {/* headers */}
      {headers.map((h, i) => (
        <text
          key={i}
          x={colXs[i] + 6}
          y='16'
          fontSize='9'
          fontWeight='500'
          fill='#19213d'
          fontFamily='Inter, sans-serif'
        >
          {h}
        </text>
      ))}
      {/* data rows */}
      {rows.map((row, ri) =>
        row.map((cell, ci) => (
          <text
            key={`${ri}-${ci}`}
            x={colXs[ci] + 6}
            y={25 + ri * 25 + 16}
            fontSize='9'
            fill='#525866'
            fontFamily='Inter, sans-serif'
          >
            {cell}
          </text>
        )),
      )}
    </svg>
  );
}

// ── Tile config ─────────────────────────────────────────────────────────────

const TILES = [
  {
    id: 'line',
    title: 'Line Chart',
    subtitle: 'Custom line chart with any data',
    bannerColor: '#079455',
    Preview: LineChartSvg,
    previewType: 'chart',
  },
  {
    id: 'vertical_bar',
    title: 'Bar Chart',
    subtitle: 'Custom bar chart with any data',
    bannerColor: '#f17b2c',
    Preview: BarChartSvg,
    previewType: 'chart',
  },
  {
    id: 'pie',
    title: 'Pie Chart',
    subtitle: 'Custom pie or donut chart with any data',
    bannerColor: '#6e3ff3',
    Preview: PieChartSvg,
    previewType: 'chart',
  },
  {
    id: 'battery',
    title: 'Battery Chart',
    subtitle: 'Custom battery chart with any data',
    bannerColor: '#375dfb',
    Preview: BatteryChartSvg,
    previewType: 'wide',
  },
  {
    id: 'kpi',
    title: 'Calculation',
    subtitle: 'Calculate sum, averages and much more',
    bannerColor: '#35b9e9',
    Preview: CalculationSvg,
    previewType: 'kpi',
  },
  {
    id: 'table',
    title: 'Table',
    subtitle: 'Custom table with any data',
    bannerColor: '#f2ae40',
    Preview: TableSvg,
    previewType: 'table',
  },
];

// ── Card component ──────────────────────────────────────────────────────────

function ChartTypeCard({ tile, onSelect }) {
  const { Preview } = tile;
  return (
    <button
      type='button'
      onClick={onSelect}
      className='group flex flex-col items-start overflow-clip rounded-[12px] border border-stroke-soft-200 bg-bg-white-0 text-left transition hover:border-primary-base hover:shadow-md w-full'
    >
      {/* colored banner */}
      <div
        className='relative h-[140px] w-full overflow-hidden rounded-t-[12px] shrink-0'
        style={{ backgroundColor: tile.bannerColor }}
      >
        {/* white inset card */}
        <div
          className='absolute rounded-t-[8px] bg-bg-white-0'
          style={{ left: '23.89px', top: '24px', width: '312px', height: '176px' }}
        />
        {/* chart illustration */}
        <div
          className='absolute'
          style={{ left: '60px', top: '44px', width: '256px', height: '96px' }}
        >
          <Preview />
        </div>
      </div>
      {/* info row */}
      <div className='border-t border-stroke-soft-200 p-5 w-full'>
        <p className='text-sm font-semibold leading-5 text-text-strong-950'>{tile.title}</p>
        <p className='mt-1 text-xs leading-[18px] text-text-sub-500'>{tile.subtitle}</p>
      </div>
    </button>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────

export default function AddWidgetModal({ open, onOpenChange, onSelect }) {
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-[800px]'>
        <Modal.Header
          icon={RiSettings2Line}
          title='Add Widget'
          description='Select a chart type to get started'
        />
        <Modal.Body className='px-8 py-6'>
          <div className='grid grid-cols-2 gap-4'>
            {TILES.map((tile) => (
              <ChartTypeCard
                key={tile.id}
                tile={tile}
                onSelect={() => {
                  onSelect(tile.id);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
