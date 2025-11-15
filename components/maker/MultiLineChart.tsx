import React from "react";

type MultiLineChartProps = {
  dates: string[];
  lineData: { label: string; values: number[] }[];
  width?: number;
  height?: number;
};

const colors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#14b8a6"];

const MultiLineChart: React.FC<MultiLineChartProps> = ({ dates, lineData, width = 480, height = 260 }) => {
  if (!lineData.length || !dates.length) return null;
  const padding = 40;
  height = 440;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  // Y軸の最大値
  const maxY = Math.max(...lineData.flatMap(d => d.values));
  const minY = 0;
  // X座標計算
  const xStep = chartWidth / (dates.length - 1);
  // Y座標計算
  // グラフが下端に固定されないように修正
  const getY = (v: number) => padding + chartHeight - ((v - minY) / (maxY - minY)) * chartHeight;

  return (
    <svg width={width} height={height} style={{background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}}>
      {/* 軸 */}
      <g>
        <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#333" strokeWidth={2} />
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#333" strokeWidth={2} />
      </g>
      {/* 折れ線（複数） */}
      {lineData.map((d, idx) => (
        <polyline
          key={d.label}
          fill="none"
          stroke={colors[idx % colors.length]}
          strokeWidth={3}
          points={d.values.map((v, i) => `${padding + i * xStep},${getY(v)}`).join(' ')}
        />
      ))}
      {/* 点とラベル */}
      {lineData.map((d, idx) => (
        d.values.map((v, i) => (
          <g key={d.label + i}>
            <circle cx={padding + i * xStep} cy={getY(v)} r={5} fill={colors[idx % colors.length]} />
            {i === 0 && (
              <text x={padding - 10} y={getY(v)} textAnchor="end" fontSize={15} fill={colors[idx % colors.length]} fontWeight="bold">{d.label}</text>
            )}
            <text x={padding + i * xStep} y={height-padding-10} textAnchor="middle" fontSize={16} fill="#333">{dates[i]}</text>
            <text x={padding + i * xStep} y={getY(v) - 10} textAnchor="middle" fontSize={13} fill="#222">{v}</text>
          </g>
        ))
      ))}
      {/* グラフ下部の説明テキスト */}
      <text x={width/2} y={height - padding / 2} textAnchor="middle" fontSize={16} fill="#888">月別推移</text>
    </svg>
  );
};

export default MultiLineChart;
