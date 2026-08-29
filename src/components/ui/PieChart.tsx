'use client';

import React, { useState } from 'react';

export interface PieChartItem {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartItem[];
  title?: string;
  subtitle?: string;
  donut?: boolean;
  size?: number;
  className?: string;
}

export function PieChart({
  data,
  donut = true,
  size = 180,
  className = '',
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // SVG dimensions
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 10;
  const innerRadius = donut ? outerRadius * 0.52 : 0;

  // Calculate slice angles
  let cumulativeAngle = 0;
  const slices = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = total > 0 ? (item.value / total) * 2 * Math.PI : 0;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
      index,
    };
  });

  function getArcPath(
    startAngle: number,
    endAngle: number,
    r: number,
    ir: number
  ) {
    // Edge case for 360 deg single slice
    let effectiveEndAngle = endAngle;
    if (effectiveEndAngle - startAngle >= 2 * Math.PI - 0.0001) {
      effectiveEndAngle = startAngle + 2 * Math.PI - 0.0001;
    }

    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(effectiveEndAngle);
    const y2 = cy - r * Math.cos(effectiveEndAngle);

    const largeArcFlag = effectiveEndAngle - startAngle > Math.PI ? 1 : 0;

    if (ir > 0) {
      const ix1 = cx + ir * Math.sin(effectiveEndAngle);
      const iy1 = cy - ir * Math.cos(effectiveEndAngle);
      const ix2 = cx + ir * Math.sin(startAngle);
      const iy2 = cy - ir * Math.cos(startAngle);

      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArcFlag} 0 ${ix2} ${iy2} Z`;
    }

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* Chart Canvas & SVG Container */}
      <div className="relative inline-block" style={{ width: size, height: size }}>
        {total === 0 ? (
          /* Empty State Ring */
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={cx}
              cy={cy}
              r={outerRadius}
              fill="none"
              stroke="#e4e4e7"
              strokeWidth={outerRadius - innerRadius}
            />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-zinc-400 text-[11px] font-medium"
            >
              No Data
            </text>
          </svg>
        ) : (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            {slices.map((slice) => {
              if (slice.value === 0) return null;
              const isHovered = hoveredIndex === slice.index;
              const pathD = getArcPath(
                slice.startAngle,
                slice.endAngle,
                isHovered ? outerRadius + 4 : outerRadius,
                innerRadius
              );

              return (
                <path
                  key={slice.name}
                  d={pathD}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.65,
                    filter: isHovered ? 'drop-shadow(0px 4px 6px rgba(0,0,0,0.25))' : 'none',
                  }}
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}

            {/* Center Label inside Donut */}
            {donut && (
              <g pointerEvents="none">
                <text
                  x={cx}
                  y={cy - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-zinc-900 font-extrabold text-sm font-mono tracking-tight"
                >
                  {activeSlice ? activeSlice.value : total}
                </text>
                <text
                  x={cx}
                  y={cy + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-zinc-500 text-[10px] font-medium uppercase tracking-wider"
                >
                  {activeSlice ? activeSlice.name : 'Total'}
                </text>
              </g>
            )}
          </svg>
        )}

        {/* Hover Tooltip Overlay */}
        {activeSlice && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            {/* Displayed smoothly inside donut center or overlay */}
          </div>
        )}
      </div>

      {/* Monochrome Legend */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-xs">
        {slices.map((slice) => (
          <div
            key={slice.name}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
              hoveredIndex === slice.index ? 'bg-zinc-100 font-semibold' : 'hover:bg-zinc-50'
            }`}
            onMouseEnter={() => setHoveredIndex(slice.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-xs shrink-0 border border-zinc-400/30"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-zinc-700 truncate text-[11px] font-medium">{slice.name}</span>
            </div>
            <span className="font-mono text-zinc-900 text-[11px] font-bold shrink-0 ml-1">
              {slice.value} ({Math.round(slice.percentage)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
