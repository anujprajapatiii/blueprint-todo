import { useEffect, useState } from 'react';
import {
  Button, Callout, Collapse, EditableText, Icon, MenuItem, PopoverNext as Popover, ProgressBar,
  Slider, Tab, Tabs, Tag, Tooltip,
} from '@blueprintjs/core';
import { DateRangePicker, type DateRange } from '@blueprintjs/datetime';
import { Select } from '@blueprintjs/select';
import { fmt, lift, owners, statusIntent, type Experiment, type Status } from './model';
import './inspector.css';

type Props = {
  experiment: Experiment;
  onUpdate: (id: string, patch: Partial<Experiment>) => void;
  onClose: () => void;
  onNotify: (message: string) => void;
};
type Activity = { experimentId: string; message: string; time: string };
const toDate = (date: string) => new Date(`${date}T12:00:00`);
const dateLabel = (date: string) => toDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const toISODate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function Inspector({ experiment, onUpdate, onClose, onNotify }: Props) {
  const [tab, setTab] = useState<string | number>('overview');
  const [traffic, setTraffic] = useState(experiment.traffic);
  const [hypothesisDraft, setHypothesisDraft] = useState(experiment.hypothesis);
  const [guardrailsOpen, setGuardrailsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [range, setRange] = useState<DateRange>([toDate(experiment.start), toDate(experiment.end)]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => { setTraffic(experiment.traffic); }, [experiment.id, experiment.traffic]);
  useEffect(() => { setHypothesisDraft(experiment.hypothesis); }, [experiment.id, experiment.hypothesis]);
  useEffect(() => {
    setRange([toDate(experiment.start), toDate(experiment.end)]);
    setCalendarOpen(false);
  }, [experiment.id, experiment.start, experiment.end]);

  function update(patch: Partial<Experiment>, message: string) {
    onUpdate(experiment.id, patch);
    setActivity(items => [{ experimentId: experiment.id, message, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }, ...items].slice(0, 30));
    onNotify(message);
  }

  const nextStatus: Record<Status, Status> = { Running: 'Paused', Paused: 'Running', Draft: 'Running', Review: 'Completed', Completed: 'Review' };
  const actionLabel: Record<Status, string> = { Running: 'Pause experiment', Paused: 'Resume experiment', Draft: 'Launch experiment', Review: 'Mark reviewed', Completed: 'Reopen review' };
  const hasResults = experiment.visitors > 0;
  const treatment = experiment.baseline * (1 + experiment.uplift / 100);
  const controlVisitors = Math.ceil(experiment.visitors / 2);
  const variantVisitors = Math.floor(experiment.visitors / 2);
  const hasPositiveLift = experiment.uplift >= 0;
  const confidenceIntent = experiment.confidence >= 95 ? 'success' : 'primary';
  const ownActivity = activity.filter(item => item.experimentId === experiment.id);

  const overview = <div className="inspector-panel-body">
    <section className="inspector-section">
      <div className="inspector-section-heading"><h3>Hypothesis</h3><Tooltip content="Click the hypothesis to edit. Save by clicking outside."><Icon icon="edit" size={13} aria-label="Editable hypothesis" /></Tooltip></div>
      <EditableText
        key={`${experiment.id}-hypothesis`}
        className="inspector-hypothesis"
        multiline minLines={3} maxLines={8} maxLength={1000}
        value={hypothesisDraft} onChange={setHypothesisDraft}
        placeholder="What change are you testing, and why?"
        customInputAttributes={{ 'aria-label': 'Experiment hypothesis' }}
        onConfirm={value => {
          const hypothesis = value.trim();
          if (hypothesis && hypothesis !== experiment.hypothesis) update({ hypothesis }, 'Hypothesis updated');
          else if (!hypothesis) { setHypothesisDraft(experiment.hypothesis); onNotify('Add a hypothesis before saving.'); }
        }}
      />
      <span className="inspector-hint">Click to edit · ⌘/Ctrl + Enter to save</span>
    </section>

    <section className="inspector-section inspector-properties" aria-label="Experiment properties">
      <div className="inspector-property"><span>Owner</span><Select<string>
        items={owners} activeItem={experiment.owner}
        itemPredicate={(query, owner) => owner.toLowerCase().includes(query.toLowerCase())}
        itemRenderer={(owner, { handleClick, handleFocus, modifiers }) => <MenuItem key={owner} text={owner} active={modifiers.active} selected={owner === experiment.owner} onClick={handleClick} onFocus={handleFocus} roleStructure="listoption" icon={owner === experiment.owner ? 'tick' : 'user'} />}
        onItemSelect={owner => update({ owner, initials: owner.split(' ').map(word => word[0]).join('') }, `Assigned to ${owner}`)}
        noResults={<MenuItem disabled text="No teammates found" roleStructure="listoption" />}
        inputProps={{ placeholder: 'Find a teammate…', 'aria-label': 'Find experiment owner' }}
        popoverProps={{ placement: 'bottom-end', minimal: true }} resetOnClose
      ><Button className="inspector-owner-button" variant="minimal" endIcon="caret-down" aria-label={`Change owner: ${experiment.owner}`}><span className="inspector-avatar">{experiment.initials}</span>{experiment.owner}</Button></Select></div>
      <div className="inspector-property"><span>Stage</span><Tag minimal>{experiment.stage}</Tag></div>
      <div className="inspector-property"><span>Schedule</span><Popover
        isOpen={calendarOpen} onInteraction={setCalendarOpen} placement="bottom-end"
        content={<div className="inspector-calendar"><div className="inspector-calendar-heading">Experiment window</div><DateRangePicker
          value={range} initialMonth={toDate(experiment.start)} singleMonthOnly shortcuts={false}
          minDate={new Date(2025, 0, 1)} maxDate={new Date(2030, 11, 31)}
          onChange={dates => {
            setRange(dates);
            if (dates[0] && dates[1]) update({ start: toISODate(dates[0]), end: toISODate(dates[1]) }, 'Experiment dates updated');
          }}
        /><p className="inspector-calendar-hint">Select a start date, then an end date.</p></div>}
      ><Button variant="minimal" size="small" icon="calendar" aria-label="Change experiment date range">{dateLabel(experiment.start)} – {dateLabel(experiment.end)}</Button></Popover></div>
      <div className="inspector-property inspector-property-metric"><span>Primary metric</span><strong>{experiment.metric}</strong></div>
    </section>

    <section className="inspector-section inspector-traffic">
      <div className="inspector-section-heading"><h3>Traffic allocation</h3><span className="inspector-value">{traffic}%</span></div>
      <p className="inspector-description">Share of eligible visitors in this experiment.</p>
      <Slider min={0} max={100} stepSize={5} labelStepSize={25} labelRenderer={value => `${value}%`} value={traffic}
        onChange={setTraffic} onRelease={value => { if (value !== experiment.traffic) update({ traffic: value }, `Traffic allocation set to ${value}%`); }}
        handleHtmlProps={{ 'aria-label': 'Traffic allocation' }} />
      <div className="inspector-allocation"><span><i className="inspector-dot inspector-dot-control" />Control 50%</span><span><i className="inspector-dot inspector-dot-variant" />Variant 50%</span></div>
    </section>

    <section className="inspector-section">
      <div className="inspector-section-heading"><h3>Confidence</h3><span className={`inspector-value ${experiment.confidence >= 95 ? 'inspector-positive' : ''}`}>{experiment.confidence.toFixed(1)}%</span></div>
      <ProgressBar aria-label={`Simulated confidence: ${experiment.confidence}%`} value={experiment.confidence / 100} intent={confidenceIntent} stripes={false} animate={false} />
      <p className="inspector-description inspector-progress-description">{!hasResults ? 'Waiting for visitors.' : experiment.confidence >= 95 ? 'Above the demo’s 95% review threshold.' : 'Below the demo’s 95% review threshold.'}</p>
    </section>

    <section className="inspector-section inspector-guardrails">
      <Button fill variant="minimal" alignText="start" icon="shield" endIcon={guardrailsOpen ? 'chevron-up' : 'chevron-down'} onClick={() => setGuardrailsOpen(value => !value)} aria-expanded={guardrailsOpen} aria-controls="inspector-guardrails-content">Guardrail metrics<Tag minimal intent="success">3 healthy</Tag></Button>
      <Collapse isOpen={guardrailsOpen}><div id="inspector-guardrails-content" className="inspector-guardrail-list">
        <div><span>Page load time</span><strong>1.2s <Icon icon="tick" size={12} /></strong></div>
        <div><span>Error rate</span><strong>0.08% <Icon icon="tick" size={12} /></strong></div>
        <div><span>Support contacts</span><strong>−0.3% <Icon icon="tick" size={12} /></strong></div>
        <p className="inspector-hint">Illustrative monitoring values.</p>
      </div></Collapse>
    </section>
    <div className="inspector-tags">{experiment.tags.map(tag => <Tag key={tag} minimal icon="tag">{tag}</Tag>)}</div>
  </div>;

  const results = <div className="inspector-panel-body">
    <section className="inspector-result-hero">
      <span className="inspector-eyebrow">RELATIVE LIFT</span>
      <strong className={hasPositiveLift ? 'inspector-positive' : 'inspector-negative'}>{hasResults ? lift(experiment.uplift) : '—'}</strong>
      <span>{experiment.metric}</span>
      <div className="inspector-result-summary"><span>{fmt(experiment.visitors)} visitors</span><span>{experiment.confidence.toFixed(1)}% confidence</span></div>
    </section>
    <section className="inspector-section"><div className="inspector-section-heading"><h3>Variant comparison</h3><Tag minimal>Simulated</Tag></div>
      {[{ name: 'Control', rate: experiment.baseline, visitors: controlVisitors, type: 'control' }, { name: 'Variant B', rate: treatment, visitors: variantVisitors, type: 'variant' }].map(variant => <div key={variant.type} className="inspector-variant">
        <div><span><i className={`inspector-dot inspector-dot-${variant.type}`} />{variant.name}</span><strong>{hasResults ? `${variant.rate.toFixed(2)}%` : '—'}</strong></div>
        <div className="inspector-variant-bar" aria-hidden="true"><span className={`inspector-bar-${variant.type}`} style={{ width: hasResults ? `${Math.min(100, variant.rate / Math.max(treatment, experiment.baseline) * 90)}%` : '0%' }} /></div>
        <small>{fmt(variant.visitors)} visitors · {fmt(Math.round(variant.visitors * variant.rate / 100))} conversions</small>
      </div>)}
    </section>
    <section className="inspector-section"><h3>Readout</h3><p className="inspector-readout">{!hasResults ? 'This experiment has no simulated visitors yet. Launch it from the action below to explore the running state.' : `${experiment.uplift >= 0 ? 'Variant B leads' : 'Control leads'} in this sample. The variant’s illustrated rate is ${treatment.toFixed(2)}%, compared with ${experiment.baseline.toFixed(2)}% for control.`}</p>
      <Callout icon="info-sign" intent="primary" className="inspector-demo-callout">Demo data only. Rates and visitor splits are illustrative; confidence is seeded, not a statistical calculation.</Callout>
    </section>
  </div>;

  const activityPanel = <div className="inspector-panel-body"><section className="inspector-section"><h3>Activity</h3><p className="inspector-description">Changes you make in this session.</p>
    {ownActivity.length > 0 ? <ol className="inspector-activity">{ownActivity.map((item, index) => <li key={`${item.time}-${index}`}><span className="inspector-activity-dot"><Icon icon="tick" size={11} /></span><div><strong>{item.message}</strong><span>You · {item.time}</span></div></li>)}</ol> : <div className="inspector-activity-empty"><Icon icon="history" size={26} /><strong>No changes yet</strong><p>Edit the hypothesis, choose an owner, or adjust traffic to see the activity here.</p></div>}
    <div className="inspector-seed-note"><Icon icon="database" size={12} /><span>Loaded from a fictional experiment dataset.</span></div>
  </section></div>;

  return <aside className="lab-inspector" aria-label={`Inspector: ${experiment.name}`}>
    <div className="inspector-topline"><span><Icon icon="panel-stats" size={14} />Experiment details</span><Button icon="cross" variant="minimal" size="small" onClick={onClose} aria-label="Close experiment inspector" /></div>
    <div className="inspector-title"><div><span className="inspector-id">{experiment.id}</span><Tag minimal intent={statusIntent(experiment.status)} round>{experiment.status}</Tag></div><h2>{experiment.name}</h2></div>
    <Tabs id="experiment-inspector" className="inspector-tabs" selectedTabId={tab} onChange={setTab} renderActiveTabPanelOnly>
      <Tab id="overview" title="Overview" panel={overview} />
      <Tab id="results" title="Results" panel={results} />
      <Tab id="activity" title="Activity" panel={activityPanel} />
    </Tabs>
    <div className="inspector-footer"><Button fill intent={experiment.status === 'Running' ? 'none' : 'primary'} icon={experiment.status === 'Running' ? 'pause' : experiment.status === 'Review' ? 'tick' : 'play'} onClick={() => update({ status: nextStatus[experiment.status] }, `${experiment.id} is now ${nextStatus[experiment.status].toLowerCase()}`)}>{actionLabel[experiment.status]}</Button><span>Demo workspace · changes save on this device</span></div>
  </aside>;
}
