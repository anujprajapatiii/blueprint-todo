import { useState, type ReactNode } from 'react';
import {
  Alert, Button, ButtonGroup, Callout, Checkbox, Collapse, Dialog, DialogBody,
  DialogFooter, Divider, Drawer, EditableText, FormGroup, HTMLSelect, Icon,
  InputGroup, Menu, MenuDivider, MenuItem, NonIdealState, NumericInput, PopoverNext as Popover,
  ProgressBar, Radio, RadioGroup, SegmentedControl, Slider, Spinner, Switch,
  Tab, Tabs, Tag, TagInput, TextArea, Tooltip,
} from '@blueprintjs/core';
import type { Intent } from '@blueprintjs/core';
import './component-lab.css';

type Props = { isOpen: boolean; onClose: () => void; onNotify: (message: string) => void };
type Tone = 'primary' | 'success' | 'warning' | 'danger';

function Demo({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return <section className="component-demo"><div className="component-demo-heading"><h3>{title}</h3><span>{note}</span></div>{children}</section>;
}

export default function ComponentLab({ isOpen, onClose, onNotify }: Props) {
  const [tab, setTab] = useState<string | number>('controls');
  const [action, setAction] = useState('Try any button');
  const [autoLaunch, setAutoLaunch] = useState(true);
  const [guardrail, setGuardrail] = useState(true);
  const [audience, setAudience] = useState('new');
  const [traffic, setTraffic] = useState(50);
  const [sample, setSample] = useState(2500);
  const [platform, setPlatform] = useState('desktop');
  const [tags, setTags] = useState<ReactNode[]>(['Activation', 'High impact']);
  const [tone, setTone] = useState<Tone>('success');
  const [running, setRunning] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('A better first impression');
  const [menuChoice, setMenuChoice] = useState('Choose an action');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [presetName, setPresetName] = useState('Onboarding experiment');
  const [presetNote, setPresetNote] = useState('');
  const [savedPreset, setSavedPreset] = useState('No presets saved yet');
  const [empty, setEmpty] = useState(true);

  function reset() {
    setAction('Controls reset'); setAutoLaunch(true); setGuardrail(true); setAudience('new');
    setTraffic(50); setSample(2500); setPlatform('desktop'); setTags(['Activation', 'High impact']);
    setTone('success'); setRunning(true); setExpanded(false); setName('A better first impression');
    setMenuChoice('Choose an action'); setSavedPreset('No presets saved yet'); setEmpty(true);
    setPresetName('Onboarding experiment'); setPresetNote(''); setResetOpen(false);
    onNotify('Component lab reset. Your experiments are unchanged.');
  }

  const controls = <div className="component-demo-grid">
    <Demo title="A button for every moment" note="Button · ButtonGroup · Tooltip">
      <div className="component-demo-row">
        {(['primary', 'success', 'warning', 'danger'] as const).map(intent => <Button key={intent} intent={intent} onClick={() => setAction(`${intent[0].toUpperCase() + intent.slice(1)} action selected`)}>{intent === 'primary' ? 'Launch' : intent === 'success' ? 'Approve' : intent === 'warning' ? 'Review' : 'Stop'}</Button>)}
      </div>
      <div className="component-demo-row">
        <Button variant="outlined" icon="duplicate" onClick={() => setAction('Experiment duplicated')}>Outlined</Button>
        <Button variant="minimal" icon="pin" onClick={() => setAction('Experiment pinned')}>Minimal</Button>
        <Tooltip content="A tooltip adds context without taking up space."><Button icon="info-sign" variant="minimal" aria-label="Show tooltip" onClick={() => setAction('Tooltip explains this icon-only button')} /></Tooltip>
        <ButtonGroup><Button icon="undo" aria-label="Undo example" onClick={() => setAction('Example undone')} /><Button icon="redo" aria-label="Redo example" onClick={() => setAction('Example redone')} /></ButtonGroup>
      </div>
      <output className="component-demo-output" aria-live="polite">{action}</output>
    </Demo>
    <Demo title="Fine-tune the rollout" note="Slider · NumericInput · FormGroup">
      <div className="component-demo-label"><span>Traffic allocation</span><strong>{traffic}%</strong></div>
      <Slider min={0} max={100} stepSize={5} labelStepSize={25} value={traffic} onChange={setTraffic} labelRenderer={value => `${value}%`} handleHtmlProps={{ 'aria-label': 'Lab traffic allocation' }} />
      <FormGroup label="Minimum sample size" labelFor="lab-sample"><NumericInput id="lab-sample" min={100} max={100000} stepSize={100} majorStepSize={1000} value={sample} onValueChange={value => { if (Number.isFinite(value)) setSample(Math.min(100000, Math.max(100, value))); }} fill /></FormGroup>
      <output className="component-demo-output">{traffic}% traffic · {sample.toLocaleString()} participants</output>
    </Demo>
    <Demo title="Small choices, clear states" note="Switch · Checkbox · RadioGroup">
      <Switch label="Automatically launch when ready" checked={autoLaunch} onChange={event => setAutoLaunch(event.currentTarget.checked)} />
      <Checkbox label="Protect the retention guardrail" checked={guardrail} onChange={event => setGuardrail(event.currentTarget.checked)} />
      <Divider />
      <RadioGroup label="Audience" inline selectedValue={audience} onChange={event => setAudience(event.currentTarget.value)}><Radio label="New users" value="new" /><Radio label="Everyone" value="all" /></RadioGroup>
      <output className="component-demo-output">{autoLaunch ? 'Automatic' : 'Manual'} launch · {guardrail ? 'Guardrail on' : 'Guardrail off'} · {audience === 'new' ? 'New users' : 'Everyone'}</output>
    </Demo>
    <Demo title="Structure the input" note="SegmentedControl · TagInput · Tag">
      <FormGroup label="Platform"><SegmentedControl fill value={platform} onValueChange={setPlatform} options={[{ label: 'Desktop', value: 'desktop', icon: 'desktop' }, { label: 'Mobile', value: 'mobile', icon: 'mobile-phone' }, { label: 'All', value: 'all', icon: 'globe' }]} /></FormGroup>
      <FormGroup label="Labels" labelFor="lab-tags" helperText="Type a label and press Enter."><TagInput fill values={tags} onChange={values => setTags(values)} inputProps={{ id: 'lab-tags', 'aria-label': 'Experiment labels' }} placeholder="Add a label…" tagProps={{ minimal: true, intent: 'primary' }} /></FormGroup>
      <output className="component-demo-output">{platform === 'all' ? 'All platforms' : platform[0].toUpperCase() + platform.slice(1)} · {tags.length} labels</output>
    </Demo>
  </div>;

  const feedback = <div className="component-demo-grid">
    <Demo title="Meaning through color" note="Callout · HTMLSelect · Icon">
      <FormGroup label="Change the message" labelFor="lab-tone"><HTMLSelect id="lab-tone" fill value={tone} onChange={event => setTone(event.currentTarget.value as Tone)} options={[{ label: 'Success', value: 'success' }, { label: 'Information', value: 'primary' }, { label: 'Warning', value: 'warning' }, { label: 'Danger', value: 'danger' }]} /></FormGroup>
      <Callout intent={tone} title={tone === 'success' ? 'Ready for launch' : tone === 'primary' ? 'A little context' : tone === 'warning' ? 'Worth a closer look' : 'Launch is blocked'}>{tone === 'success' ? 'Your audience and guardrails are configured.' : tone === 'primary' ? 'This example changes intent, icon, color, and message together.' : tone === 'warning' ? 'The sample is small. Give the experiment more time.' : 'Choose an audience before starting the experiment.'}</Callout>
    </Demo>
    <Demo title="Show what is happening" note="ProgressBar · Spinner · Button">
      <div className="component-demo-label"><span>Sample collection</span><strong>{traffic}%</strong></div>
      <ProgressBar value={traffic / 100} intent={traffic === 100 ? 'success' : 'primary'} animate={running} stripes={running} />
      <div className="component-loading-row"><div role="status" aria-label={running ? 'Demo is collecting data' : 'Demo collection is paused'}><Spinner size={30} intent={running ? 'primary' : 'none'} value={running ? undefined : traffic / 100} /></div><span>{running ? 'Collecting sample data…' : 'Collection paused'}</span><Button size="small" onClick={() => setRunning(!running)} icon={running ? 'pause' : 'play'}>{running ? 'Pause' : 'Resume'}</Button></div>
      <Button fill variant="outlined" icon="add" disabled={traffic === 100} onClick={() => setTraffic(Math.min(100, traffic + 10))}>{traffic === 100 ? 'Sample complete' : 'Add 10% to the sample'}</Button>
    </Demo>
    <Demo title="Status at a glance" note="Tag · Divider · Toast">
      <div className="component-demo-row"><Tag intent="success" icon="play" minimal>Running</Tag><Tag intent="warning" icon="time" minimal>In review</Tag><Tag intent="primary" icon="tick" minimal>Complete</Tag><Tag icon="edit" minimal>Draft</Tag></div>
      <Divider />
      <p className="component-demo-copy">Notifications stay out of the way until you need them.</p>
      <Button icon="notifications" onClick={() => onNotify('A real Blueprint toast. Changes are saved, and you can keep working.')}>Show a notification</Button>
    </Demo>
    <Demo title="Give an empty state a next step" note="NonIdealState · Button">
      {empty ? <NonIdealState className="component-empty" icon="search" title="No saved views" description="Save a useful combination of filters to revisit later." action={<Button intent="primary" icon="add" onClick={() => setEmpty(false)}>Create a sample view</Button>} /> : <div className="component-saved-view"><Icon icon="saved" intent="success" size={28} /><strong>Your first view is ready</strong><p>Running experiments · Activation · All owners</p><Button variant="minimal" onClick={() => setEmpty(true)}>Show the empty state again</Button></div>}
    </Demo>
  </div>;

  const patterns = <div className="component-demo-grid">
    <Demo title="Edit right where you are" note="EditableText · Collapse">
      <span className="component-demo-field-label">Experiment title · click to edit</span>
      <EditableText className="component-editable" value={name} onChange={setName} placeholder="Name this experiment" maxLength={80} confirmOnEnterKey />
      <Button variant="minimal" icon={expanded ? 'chevron-down' : 'chevron-right'} onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="lab-hypothesis">{expanded ? 'Hide hypothesis' : 'Reveal hypothesis'}</Button>
      <Collapse isOpen={expanded}><div id="lab-hypothesis" className="component-collapse-copy">If we help new teams reach their first useful result sooner, more will return next week. Measure activation alongside retention.</div></Collapse>
      <output className="component-demo-output">Title: {name || 'Untitled experiment'}</output>
    </Demo>
    <Demo title="Actions in the right place" note="Popover · Menu · MenuItem">
      <p className="component-demo-copy">Menus put related actions beside the object they affect.</p>
      <Popover placement="bottom-start" content={<Menu aria-label="Example experiment actions"><MenuItem icon="duplicate" text="Duplicate experiment" onClick={() => setMenuChoice('A copy is ready to edit')} /><MenuItem icon="pin" text="Pin to workspace" onClick={() => setMenuChoice('Pinned to your workspace')} /><MenuDivider title="Share" /><MenuItem icon="link" text="Create example link" onClick={() => setMenuChoice('Example link: growth-lab / EXP-2401')} /><MenuDivider /><MenuItem icon="archive" intent="warning" text="Archive example" onClick={() => setMenuChoice('Example archived')} /></Menu>}><Button icon="more" endIcon="chevron-down">Experiment actions</Button></Popover>
      <output className="component-demo-output" aria-live="polite">{menuChoice}</output>
    </Demo>
    <Demo title="A focused moment" note="Dialog · InputGroup · TextArea">
      <p className="component-demo-copy">A modal form can capture a decision without leaving your workspace.</p>
      <Button intent="primary" icon="add" onClick={() => setDialogOpen(true)}>Create a preset</Button>
      <output className="component-demo-output" aria-live="polite">{savedPreset}</output>
    </Demo>
    <Demo title="Pause before a destructive action" note="Alert · Intent">
      <p className="component-demo-copy">Resetting these examples opens a confirmation. Your experiment data stays as it is.</p>
      <Button intent="danger" variant="outlined" icon="reset" onClick={() => setResetOpen(true)}>Reset the component lab</Button>
    </Demo>
  </div>;

  return <>
    <Drawer isOpen={isOpen} onClose={onClose} title="The component lab" icon="applications" size="min(820px, 100vw)" className="component-lab-drawer">
      <div className="component-lab-intro"><Tag minimal intent="primary">30+ real components</Tag><p>Touch everything. This is Blueprint, in its element.</p><span>Blueprint handles the controls. Charts and layouts are custom.</span></div>
      <div className="component-lab-body"><Tabs id="component-lab-tabs" selectedTabId={tab} onChange={setTab} renderActiveTabPanelOnly><Tab id="controls" title="Controls" panel={controls} /><Tab id="feedback" title="Feedback" panel={feedback} /><Tab id="patterns" title="Patterns" panel={patterns} /></Tabs></div>
      <div className="component-lab-footer"><Icon icon="hand" size={14} /><span>Changes here are a safe, temporary playground.</span><Button variant="minimal" size="small" onClick={onClose}>Back to the workspace</Button></div>
    </Drawer>
    <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="Create a preset" icon="saved" className="component-lab-dialog">
      <form onSubmit={event => { event.preventDefault(); if (!presetName.trim()) return; setSavedPreset(`Saved: ${presetName.trim()}${presetNote.trim() ? ' · with notes' : ''}`); setDialogOpen(false); onNotify(`Preset “${presetName.trim()}” saved in the component lab.`); }}>
        <DialogBody><FormGroup label="Preset name" labelFor="lab-preset-name" labelInfo="(required)"><InputGroup id="lab-preset-name" value={presetName} onChange={event => setPresetName(event.currentTarget.value)} placeholder="e.g. Activation experiments" autoFocus maxLength={80} required /></FormGroup><FormGroup label="Notes" labelFor="lab-preset-note" labelInfo="(optional)"><TextArea id="lab-preset-note" fill autoResize value={presetNote} onChange={event => setPresetNote(event.currentTarget.value)} placeholder="When would you use this view?" rows={3} /></FormGroup><Callout icon="info-sign" compact>This preset lives only in the component playground.</Callout></DialogBody>
        <DialogFooter actions={<><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" intent="primary" disabled={!presetName.trim()}>Save preset</Button></>} />
      </form>
    </Dialog>
    <Alert isOpen={resetOpen} onCancel={() => setResetOpen(false)} onConfirm={reset} icon="reset" intent={'danger' as Intent} cancelButtonText="Keep my changes" confirmButtonText="Reset lab" canEscapeKeyCancel canOutsideClickCancel><p>Reset every control in the component lab to its starting state?</p><p>Your experiments and to-do tasks will not change.</p></Alert>
  </>;
}
