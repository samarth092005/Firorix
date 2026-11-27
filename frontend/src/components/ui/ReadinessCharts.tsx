import React from 'react';
import './ReadinessCharts.css';

export interface ChartSegment {
  label: string;
  value: number;
  color?: string;
}

export interface ReadinessBarChartProps {
  title: string;
  segments: ChartSegment[];
}

export const ReadinessBarChart: React.FC<ReadinessBarChartProps> = ({ title, segments }) => {
  const total = Math.max(1, segments.reduce((acc, s) => acc + s.value, 0));

  return (
    <section className="fiorify-chart-card" aria-label={title}>
      <h3 className="fiorify-chart-title">{title}</h3>
      <div className="fiorify-bar-list">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} className="fiorify-bar-row">
              <div className="fiorify-bar-meta">
                <span>{seg.label}</span>
                <strong>
                  {seg.value} ({pct}%)
                </strong>
              </div>
              <div className="fiorify-bar-track">
                <div
                  className="fiorify-bar-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: seg.color || 'var(--fiori-primary, #0066ff)'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
