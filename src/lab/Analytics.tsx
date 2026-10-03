import { useId, useMemo, useState } from 'react';
import { Button, ButtonGroup, HTMLSelect, Icon } from '@blueprintjs/core';
import type { Experiment } from './model';
import { fmt } from './model';
import './analytics.css';

type Range = '7d' | '14d' | '30d';
type Metric = 'conversion' | 'activation' | 'revenue';
type Props = { experiments: Experiment[]; range: Range; onRangeChange: (value: Range) => void };
const metrics: Record<Metric, { label: string; base: number; unit: string }> = {
  conversion: { label: 'Conversion', base: 5.1, unit: '%' },
  activation: { label: 'Activation', base: 31.8, unit: '%' },
  revenue: { label: 'Revenue / visitor', base: 2.26, unit: '$' },
};
const plot = { left: 44, right: 682, top: 12, bottom: 150, width: 700, height: 184 };
const formatValue = (value: number, metric: Metric) => metric === 'revenue' ? `$${value.toFixed(2)}` : `${value.toFixed(1)}%`;
function curve(points: { x: number; y: number }[]) {
  return points.map((point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const before = points[index - 1];
    const middle = (before.x + point.x) / 2;
    return `C ${middle} ${before.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }).join(' ');
}

export default function Analytics({ experiments, range, onRangeChange }: Props) {
  const [metric, setMetric] = useState<Metric>('conversion');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = `analytics-gradient-${useId().replace(/:/g, '')}`;
  const data = useMemo(() => {
    const days = Number.parseInt(range, 10);
    const measured = experiments.filter(experiment => experiment.visitors > 0);
    const total = measured.reduce((sum, experiment) => sum + experiment.visitors, 0);
    const uplift = total ? measured.reduce((sum, experiment) => sum + experiment.uplift * experiment.visitors, 0) / total : 0;
    const base = metrics[metric].base;
    const sequence = Array.from({ length: days }, (_, index) => {
      const progress = index / (days - 1);
      const wave = Math.sin(index * 1.3) * 0.019 + Math.cos(index * 0.59) * 0.015;
      const control = base * (1 + progress * 0.065 + wave);
      const variant = control * (1 + (uplift / 100) * (0.27 + progress * 0.73)) + base * Math.sin(index * 0.91) * 0.012;
      const date = new Date(Date.UTC(2026, 9, 3 - (days - 1) + index));
      return { control, variant, date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) };
    });
    const all = sequence.flatMap(value => [value.control, value.variant]);
    const padding = base * 0.055;
    const min = Math.min(...all) - padding;
    const max = Math.max(...all) + padding;
    const x = (index: number) => plot.left + index / (days - 1) * (plot.right - plot.left);
    const y = (value: number) => plot.bottom - (value - min) / (max - min) * (plot.bottom - plot.top);
    const variantPoints = sequence.map((value, index) => ({ x: x(index), y: y(value.variant) }));
    const controlPoints = sequence.map((value, index) => ({ x: x(index), y: y(value.control) }));
    return { days, total, uplift, sequence, min, max, x, y, variantPoints, controlPoints };
  }, [experiments, range, metric]);
  const hovered = hoverIndex === null ? null : data.sequence[Math.min(hoverIndex, data.days - 1)];
  const activeIndex = Math.min(hoverIndex ?? 0, data.days - 1);
  const activePoint = data.variantPoints[activeIndex];
  const hasData = data.total > 0;
  const shownVisitors = Math.round(data.total * data.days / 30);
  const steps = [
    { label: 'Visitors', rate: 100, value: shownVisitors },
    { label: 'Signups', rate: 34.8, value: Math.round(shownVisitors * .348) },
    { label: 'Activated', rate: 22.6, value: Math.round(shownVisitors * .226) },
    { label: 'Paid customers', rate: 5.8, value: Math.round(shownVisitors * .058) },
  ];

  return <section className="lab-analytics" aria-label="Simulated performance analytics">
    <div className="lab-analytics-chart-panel">
      <div className="lab-analytics-header">
        <div className="lab-analytics-title"><h2>Performance over time</h2><span className="lab-simulation-badge">SIMULATED</span></div>
        <div className="lab-analytics-controls">
          <HTMLSelect aria-label="Chart metric" value={metric} onChange={event => { setMetric(event.target.value as Metric); setHoverIndex(null); }} options={Object.entries(metrics).map(([value, item]) => ({ value, label: item.label }))} minimal />
          <ButtonGroup className="lab-range-buttons" aria-label="Chart date range" minimal>
            {(['7d', '14d', '30d'] as const).map(value => <Button key={value} small active={range === value} intent={range === value ? 'primary' : 'none'} onClick={() => { onRangeChange(value); setHoverIndex(null); }} aria-pressed={range === value}>{value}</Button>)}
          </ButtonGroup>
        </div>
      </div>
      {hasData ? <>
        <div className="lab-chart-key"><span><i className="lab-chart-dot" />Variant</span><span><i className="lab-chart-dot lab-chart-dot-control" />Control</span><span className="lab-chart-key-unit">{metrics[metric].label}</span></div>
        <div className="lab-chart-canvas">
          <svg viewBox={`0 0 ${plot.width} ${plot.height}`} preserveAspectRatio="none" role="img" aria-label={`${metrics[metric].label}, simulated over ${data.days} days. Use left and right arrow keys to inspect daily values.`} tabIndex={0}
            onMouseMove={event => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width * plot.width;
              setHoverIndex(Math.max(0, Math.min(data.days - 1, Math.round((x - plot.left) / (plot.right - plot.left) * (data.days - 1)))));
            }}
            onMouseLeave={() => setHoverIndex(null)} onBlur={() => setHoverIndex(null)}
            onKeyDown={event => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                setHoverIndex(index => Math.max(0, Math.min(data.days - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));
              }
              if (event.key === 'Escape') setHoverIndex(null);
            }}>
            <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--lab-blue)" stopOpacity=".14" /><stop offset="100%" stopColor="var(--lab-blue)" stopOpacity=".005" /></linearGradient></defs>
            {[0, 1, 2, 3].map(tick => {
              const value = data.min + (data.max - data.min) * tick / 3;
              const y = data.y(value);
              return <g key={tick}><line className="lab-chart-grid" x1={plot.left} x2={plot.right} y1={y} y2={y} /><text className="lab-chart-label" x={plot.left - 10} y={y + 4} textAnchor="end">{formatValue(value, metric)}</text></g>;
            })}
            <path d={`${curve(data.variantPoints)} L ${plot.right} ${plot.bottom} L ${plot.left} ${plot.bottom} Z`} fill={`url(#${gradientId})`} />
            <path className="lab-chart-control-line" d={curve(data.controlPoints)} />
            <path className="lab-chart-variant-line" d={curve(data.variantPoints)} />
            {[0, Math.round((data.days - 1) / 3), Math.round((data.days - 1) * 2 / 3), data.days - 1].map(index => <text className="lab-chart-label" key={index} x={data.x(index)} y={plot.height - 9} textAnchor={index === 0 ? 'start' : index === data.days - 1 ? 'end' : 'middle'}>{data.sequence[index].date}</text>)}
            {hovered && <g><line className="lab-chart-cursor" x1={activePoint.x} x2={activePoint.x} y1={plot.top} y2={plot.bottom} /><circle cx={activePoint.x} cy={data.y(hovered.control)} r="3" className="lab-chart-control-marker" /><circle cx={activePoint.x} cy={activePoint.y} r="4" className="lab-chart-marker" /></g>}
          </svg>
          {hovered && <div className="lab-chart-tooltip" style={{ left: `${Math.max(15, Math.min(83, activePoint.x / plot.width * 100))}%` }} role="status"><strong>{hovered.date}</strong><span>Variant <b>{formatValue(hovered.variant, metric)}</b></span><span>Control <b>{formatValue(hovered.control, metric)}</b></span></div>}
        </div>
      </> : <div className="lab-analytics-empty"><Icon icon="timeline-line-chart" size={24} /><strong>No measured experiments</strong><span>Adjust your filters to explore the sample results.</span></div>}
    </div>
    <div className="lab-funnel-panel">
      <div className="lab-funnel-heading"><h2>Conversion funnel</h2><Icon icon="filter" size={13} /></div>
      <div className="lab-funnel-steps">
        {steps.map((step, index) => <div className="lab-funnel-step" key={step.label}>
          <div className="lab-funnel-step-label"><span>{step.label}</span><span><b>{hasData ? fmt(step.value) : '—'}</b><em>{hasData ? `${step.rate}%` : '—'}</em></span></div>
          <div className="lab-funnel-track"><div style={{ width: `${hasData ? step.rate : 0}%`, opacity: 0.36 + index * .19 }} /></div>
        </div>)}
      </div>
      <div className="lab-funnel-insight"><Icon icon="lightbulb" size={14} /><span>{hasData ? <>Biggest opportunity: <strong>signup → activation.</strong></> : 'Select experiments with visitor data to see the funnel.'}</span></div>
    </div>
  </section>;
}
