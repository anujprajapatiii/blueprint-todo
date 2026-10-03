import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Breadcrumbs, Button, ButtonGroup, Callout, Checkbox, Dialog, DialogBody, DialogFooter, FormGroup, HotkeysProvider, HTMLSelect, Icon, InputGroup, KeyComboTag, Menu, MenuDivider, MenuItem, NonIdealState, NumericInput, PopoverNext as Popover, ProgressBar, Tag, TextArea, Tooltip, Tree, type TreeNodeInfo, useHotkeys } from '@blueprintjs/core';
import { MultiSelect, Omnibar } from '@blueprintjs/select';
import ExperimentGrid from './lab/ExperimentGrid';
import Inspector from './lab/Inspector';
import Analytics from './lab/Analytics';
import ComponentLab from './lab/ComponentLab';
import { fmt, LAB_STORAGE, lift, owners, readExperiments, seedExperiments, stages, statuses, statusIntent, type Experiment, type Stage, type Status } from './lab/model';
import { csvForExperiments, filterExperiments } from './lab/query';
const TodoApp = lazy(()=>import('./TodoApp'));
const stageIcons = ['globe-network','flows','repeat','dollar'] as const;

export default function App() {
 const [todo,setTodo]=useState(location.hash==='#todo');
 useEffect(()=>{const update=()=>setTodo(location.hash==='#todo');window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 if(todo) return <div className="todo-view"><a className="back-to-lab" href="#">← Back to GrowthLab</a><Suspense fallback={<p>Loading tasks…</p>}><TodoApp/></Suspense></div>;
 return <HotkeysProvider><GrowthLab/></HotkeysProvider>;
}
function GrowthLab() {
 const [experiments,setExperiments]=useState(readExperiments);
 const [dark,setDark]=useState(()=>{try{return localStorage.getItem('growth-lab.theme')==='dark';}catch{return false;}});
 const [stage,setStage]=useState<Stage|'All'>('All');
 const [selectedStatuses,setStatuses]=useState<Status[]>([]);
 const [selectedOwners,setOwners]=useState<string[]>([]);
 const [query,setQuery]=useState('');
 const [view,setView]=useState<'table'|'board'|'activity'>('table');
 const [selectedId,setSelectedId]=useState('EXP-2401');
 const [inspectorOpen,setInspectorOpen]=useState(true);
 const [range,setRange]=useState<'7d'|'14d'|'30d'>('14d');
 const [dense,setDense]=useState(true);
 const [treeExpanded,setTreeExpanded]=useState(true);
 const [commandOpen,setCommandOpen]=useState(false);
 const [newOpen,setNewOpen]=useState(false);
 const [labOpen,setLabOpen]=useState(false);
 const [shortcuts,setShortcuts]=useState(false);
 const [resetOpen,setResetOpen]=useState(false);
 const [notice,setNotice]=useState('');
 const [saveError,setSaveError]=useState('');
 const [newTitle,setNewTitle]=useState('');
 const [newStage,setNewStage]=useState<Stage>('Activation');
 const [newMetric,setNewMetric]=useState('Signup → activation');
 const [newHypothesis,setNewHypothesis]=useState('');
 const [newTraffic,setNewTraffic]=useState(50);
 const searchRef=useRef<HTMLInputElement|null>(null);
 const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const notify=useCallback((message:string)=>{setNotice(message);if(noticeTimer.current)clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),4000);},[]);
 useEffect(()=>()=>{if(noticeTimer.current)clearTimeout(noticeTimer.current);},[]);
 useEffect(()=>{document.body.classList.toggle('bp6-dark',dark);document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('growth-lab.theme',dark?'dark':'light');}catch{}return()=>{document.body.classList.remove('bp6-dark');document.documentElement.dataset.theme='light';};},[dark]);
 const save=useCallback((next:Experiment[])=>{setExperiments(next);try{localStorage.setItem(LAB_STORAGE,JSON.stringify(next));setSaveError('');}catch{setSaveError('Browser storage is unavailable. Changes last for this session.');}},[]);
 const update=useCallback((id:string,patch:Partial<Experiment>)=>{save(experiments.map(e=>e.id===id?{...e,...patch}:e));},[experiments,save]);
 const select=useCallback((id:string)=>{setSelectedId(id);setInspectorOpen(true);setView('table');},[]);
 const clear=()=>{setQuery('');setStage('All');setStatuses([]);setOwners([]);};
 const hotkeys=useMemo(()=>[
  {combo:'mod+k',global:true,label:'Find an experiment',preventDefault:true,onKeyDown:()=>setCommandOpen(true)},
  {combo:'n',global:true,label:'New experiment',onKeyDown:()=>setNewOpen(true)},
  {combo:'/',global:true,label:'Search this view',preventDefault:true,onKeyDown:()=>searchRef.current?.focus()},
  {combo:'d',global:true,label:'Toggle light / dark',onKeyDown:()=>setDark(v=>!v)},
  {combo:'l',global:true,label:'Open component lab',onKeyDown:()=>setLabOpen(true)},
 ],[]);
 useHotkeys(hotkeys);
 const filtered=useMemo(()=>filterExperiments(experiments,{query,stage,statuses:selectedStatuses,owners:selectedOwners}),[experiments,query,stage,selectedStatuses,selectedOwners]);
 const selected=experiments.find(e=>e.id===selectedId)||experiments[0];
 const running=experiments.filter(e=>e.status==='Running');
 const review=experiments.filter(e=>e.status==='Review');
 const wins=experiments.filter(e=>e.status==='Completed'&&e.uplift>0);
 const visitors=experiments.reduce((s,e)=>s+e.visitors,0);
 const averageLift=running.reduce((s,e)=>s+e.uplift,0)/Math.max(running.length,1);
 const hasFilters=Boolean(query||stage!=='All'||selectedStatuses.length||selectedOwners.length);
 const tree:TreeNodeInfo[]=[{id:'lifecycle',icon:'folder-open',label:'Customer lifecycle',isExpanded:treeExpanded,childNodes:stages.map((s,i)=>({id:s,icon:stageIcons[i],label:s,isSelected:stage===s,secondaryLabel:<span className="nav-count">{experiments.filter(e=>e.stage===s).length}</span>}))}];
 const exportCsv=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csvForExperiments(filtered)],{type:'text/csv;charset=utf-8;'}));a.download='growthlab-experiments.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);notify(`Exported ${filtered.length} experiments.`);};
 const create=(event:React.FormEvent)=>{event.preventDefault();if(!newTitle.trim())return;const e:Experiment={...seedExperiments[0],id:`EXP-${Math.max(...experiments.map(e=>Number(e.id.slice(4))),2400)+1}`,name:newTitle.trim(),stage:newStage,status:'Draft',metric:newMetric.trim()||'Activation rate',hypothesis:newHypothesis.trim()||'Add your hypothesis in the inspector.',visitors:0,uplift:0,confidence:0,traffic:newTraffic,tags:['New idea'],start:'2026-10-03',end:'2026-10-17'};save([e,...experiments]);clear();select(e.id);setNewOpen(false);setNewTitle('');setNewHypothesis('');notify(`${e.id} created. Your next good question starts here.`);};
 return <div className={`lab-app ${dark?'bp6-dark':''}`}>
  <aside className="lab-sidebar">
   <a className="lab-brand" href="#"><span className="lab-brand-symbol"><Icon icon="layers" size={21}/></span><span>Growth<span className="brand-light">Lab</span><small>EXPERIMENT WORKSPACE</small></span></a>
   <Popover placement="bottom-start" content={<Menu><MenuItem icon="office" text="Growth team" active/><MenuDivider/><MenuItem icon="info-sign" text="This is a sample workspace" onClick={()=>notify('Explore freely. All metrics and experiments are sample data.')}/></Menu>}><Button className="workspace-switcher" variant="outlined" icon="projects" endIcon="chevron-down" fill>Growth team <Tag minimal>PRO</Tag></Button></Popover>
   <div className="nav-label">WORKSPACE</div>
   <nav className="lab-nav" aria-label="Workspace navigation">
    <Button variant="minimal" icon="dashboard" active={view!=='activity'&&!hasFilters} onClick={()=>{clear();setView('table');}}>Overview<span className="nav-count">{experiments.length}</span></Button>
    <Button variant="minimal" icon="pulse" active={selectedStatuses.length===1&&selectedStatuses[0]==='Running'} onClick={()=>{clear();setStatuses(['Running']);setView('table');}}>Running now<span className="nav-count green">{running.length}</span></Button>
    <Button variant="minimal" icon="inbox" active={selectedStatuses.length===1&&selectedStatuses[0]==='Review'} onClick={()=>{clear();setStatuses(['Review']);setView('table');}}>Ready for review<span className="nav-count amber">{review.length}</span></Button>
    <Button variant="minimal" icon="history" active={view==='activity'} onClick={()=>setView('activity')}>Activity log</Button>
   </nav>
   <div className="nav-divider"/><div className="nav-label">EXPLORE</div>
   <Tree className="lab-tree" contents={tree} onNodeClick={node=>{if(stages.includes(node.id as Stage)){setStage(node.id as Stage);setView('table');}else setTreeExpanded(v=>!v);}} onNodeCollapse={()=>setTreeExpanded(false)} onNodeExpand={()=>setTreeExpanded(true)}/>
   <div className="sidebar-bottom">
    <div className="sidebar-note"><span className="sidebar-note-top"><Icon icon="cube"/> BUILT TO BE EXPLORED</span><p>Real controls.<br/>Room to experiment.</p><Button icon="control" intent="primary" fill onClick={()=>setLabOpen(true)}>Open component lab <Icon icon="arrow-top-right" size={12}/></Button></div>
    <Button variant="minimal" icon="tick-circle" fill alignText="left" onClick={()=>{location.hash='todo';}}>Original to-do app</Button>
    <div className="sidebar-person"><span className="avatar">AP</span><span>Anuj's workspace<small>Personal sandbox</small></span><Tooltip content="Keyboard shortcuts"><Button variant="minimal" icon="key-command" aria-label="Keyboard shortcuts" onClick={()=>setShortcuts(true)}/></Tooltip></div>
   </div>
  </aside>
  <div className="lab-body">
   <header className="lab-topbar"><Breadcrumbs items={[{text:'Workspace',onClick:()=>{clear();setView('table');}},{text:'Growth experiments',current:true}]}/><div className="topbar-actions"><Tag className="demo-tag" icon="lab-test" minimal intent="warning">INTERACTIVE DEMO</Tag><Button aria-label="Find an experiment" className="command-trigger" icon="search" variant="outlined" onClick={()=>setCommandOpen(true)}>Jump to experiment <kbd>⌘ K</kbd></Button><Tooltip content={dark?'Light appearance':'Dark appearance'}><Button icon={dark?'flash':'moon'} variant="minimal" aria-label="Toggle appearance" onClick={()=>setDark(v=>!v)}/></Tooltip><Button variant="minimal" icon="help" aria-label="About this demo" onClick={()=>setLabOpen(true)}/></div></header>
   <main className="lab-main">
    <div className="lab-heading"><div><div className="lab-eyebrow"><span className="signal-dot"/> FROM HYPOTHESIS TO IMPACT</div><h1>Make every experiment count<span>.</span></h1><p>Your team's growth work, from the first question to the next decision.</p></div><div className="heading-actions"><Button icon="export" variant="outlined" onClick={exportCsv}>Export</Button><Button icon="plus" intent="primary" onClick={()=>setNewOpen(true)}>New experiment</Button></div></div>
    {saveError&&<Callout intent="warning" className="save-warning">{saveError}</Callout>}
    <section className="lab-stats" aria-label="Sample experiment metrics">
     <Metric label="RUNNING EXPERIMENTS" value={String(running.length).padStart(2,'0')} note={`${review.length} ready for a decision`} icon="pulse" trend="LIVE"/>
     <Metric label="AVG. OBSERVED LIFT" value={lift(averageLift)} note="Across running experiments" icon="trending-up" trend="POSITIVE" accent/>
     <Metric label="PARTICIPANTS ENROLLED" value={fmt(visitors)} note="Across this demo portfolio" icon="people" trend="SAMPLE"/>
     <Metric label="COMPLETED WINS" value={String(wins.length).padStart(2,'0')} note="Positive observed outcomes" icon="endorsed" trend="LEARNING"/>
    </section>
    <Analytics experiments={filtered} range={range} onRangeChange={setRange}/>
    <section className="registry" aria-label="Experiment registry">
     <div className="registry-heading"><div><h2>Experiment registry <Tag minimal>{filtered.length}</Tag></h2><span>Explore, compare, and turn signals into decisions.</span></div><ButtonGroup><Button icon="th-list" active={view==='table'} aria-label="Table view" onClick={()=>setView('table')}/><Button icon="panel-table" active={view==='board'} aria-label="Board view" onClick={()=>setView('board')}/><Button icon="history" active={view==='activity'} aria-label="Activity view" onClick={()=>setView('activity')}/></ButtonGroup></div>
     <div className="registry-toolbar"><InputGroup className="registry-search" inputRef={searchRef} leftIcon="search" placeholder="Search experiments…" aria-label="Search experiments" value={query} onValueChange={setQuery} rightElement={<kbd>/</kbd>}/>
      <Popover placement="bottom-start" content={<Menu className="status-filter-menu"><MenuDivider title="Filter by status"/>{statuses.map(s=><MenuItem key={s} icon={selectedStatuses.includes(s)?'tick':'blank'} text={s} shouldDismissPopover={false} onClick={()=>setStatuses(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}/>)}<MenuDivider/><MenuItem text="Clear status filter" onClick={()=>setStatuses([])}/></Menu>}><Button icon="filter" variant="outlined" endIcon="chevron-down">Status{selectedStatuses.length?` · ${selectedStatuses.length}`:''}</Button></Popover>
      <MultiSelect<string> items={owners} selectedItems={selectedOwners} onItemSelect={o=>setOwners(prev=>prev.includes(o)?prev.filter(x=>x!==o):[...prev,o])} onRemove={o=>setOwners(prev=>prev.filter(x=>x!==o))} tagRenderer={o=>o} itemPredicate={(q,o)=>o.toLowerCase().includes(q.toLowerCase())} itemRenderer={(o,{handleClick,modifiers})=><MenuItem key={o} text={o} active={modifiers.active} icon={selectedOwners.includes(o)?'tick':'blank'} onClick={handleClick} shouldDismissPopover={false}/>} customTarget={()=><Button icon="person" variant="outlined" endIcon="chevron-down">Owner{selectedOwners.length?` · ${selectedOwners.length}`:''}</Button>} popoverProps={{placement:'bottom-start'}} placeholder="Find a teammate"/>
      <span className="toolbar-spacer"/><Tooltip content="Compact rows"><Button icon="compressed" variant="minimal" active={dense} aria-label="Toggle compact rows" onClick={()=>setDense(v=>!v)}/></Tooltip><Tooltip content={inspectorOpen?'Hide inspector':'Show inspector'}><Button icon="panel-stats" variant="minimal" active={inspectorOpen} aria-label="Toggle inspector" onClick={()=>setInspectorOpen(v=>!v)}/></Tooltip>
      <Popover placement="bottom-end" content={<Menu><MenuItem icon="export" text="Export current view as CSV" onClick={exportCsv}/><MenuItem icon="reset" text="Reset demo data" intent="danger" onClick={()=>setResetOpen(true)}/><MenuDivider/><MenuItem icon="control" text="Explore Blueprint components" onClick={()=>setLabOpen(true)}/></Menu>}><Button variant="minimal" icon="more" aria-label="More view options"/></Popover>
     </div>
     {hasFilters&&<div className="filter-chips">{stage!=='All'&&<Tag minimal onRemove={()=>setStage('All')}>{stage}</Tag>}{selectedStatuses.map(s=><Tag key={s} minimal intent={statusIntent(s)} onRemove={()=>setStatuses(v=>v.filter(x=>x!==s))}>{s}</Tag>)}{selectedOwners.map(o=><Tag key={o} minimal onRemove={()=>setOwners(v=>v.filter(x=>x!==o))}>{o}</Tag>)}{query&&<Tag minimal onRemove={()=>setQuery('')}>“{query}”</Tag>}<Button variant="minimal" size="small" onClick={clear}>Clear all</Button></div>}
     <div className={`registry-body ${inspectorOpen&&view==='table'?'with-inspector':''}`}>
      <div className="registry-content">{filtered.length===0?<NonIdealState icon="search" title="No matching experiments" description="Try another search or clear your filters." action={<Button onClick={clear}>Clear filters</Button>}/>:view==='table'?<ExperimentGrid experiments={filtered} selectedId={selectedId} onSelect={select} onUpdate={update} dense={dense}/>:view==='board'?<div className="experiment-board">{statuses.map(s=><div key={s} className="board-column" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(experiments.some(x=>x.id===id)){update(id,{status:s});notify(`Moved to ${s}.`);}}}><div className="board-column-title"><Tag minimal intent={statusIntent(s)}>{s}</Tag><span>{filtered.filter(e=>e.status===s).length}</span></div>{filtered.filter(e=>e.status===s).map(e=><article key={e.id} className="board-card" draggable onDragStart={event=>event.dataTransfer.setData('text/plain',e.id)}><small>{e.id} <span>{e.stage}</span></small><button className="board-card-title" onClick={()=>select(e.id)}>{e.name}</button><p>{e.metric}</p><div><span className={e.uplift<0?'negative':'positive'}>{e.visitors?lift(e.uplift):'Not started'}</span><Popover content={<Menu>{statuses.map(status=><MenuItem key={status} text={`Move to ${status}`} onClick={()=>{update(e.id,{status});notify(`Moved to ${status}.`);}}/>)}</Menu>} placement="bottom-end"><Button variant="minimal" size="small" icon="more" aria-label={`Move ${e.name}`}/></Popover></div></article>)}</div>)}</div>:<div className="activity-list">{filtered.slice(0,12).map((e,i)=><div className="activity-entry" key={e.id}><span className={`activity-icon ${e.status==='Completed'?'won':''}`}><Icon icon={e.status==='Completed'?'tick':'changes'}/></span><div><p><strong>{e.owner.split(' ')[0]}</strong> {e.status==='Running'?'is monitoring':e.status==='Review'?'requested a review of':e.status==='Completed'?'completed':'updated'} <button onClick={()=>select(e.id)}>{e.name}</button></p><span>{e.id} · {e.stage} · sample activity</span></div><time>{i===0?'Just now':`${i*17}m ago`}</time></div>)}</div>}</div>
      {inspectorOpen&&view==='table'&&selected&&<aside className="inspector-rail"><Inspector experiment={selected} onUpdate={update} onClose={()=>setInspectorOpen(false)} onNotify={notify}/></aside>}
     </div>
     <div className="registry-footer"><span><span className="signal-dot"/> {filtered.length} of {experiments.length} experiments <span className="footer-divider">/</span> {saveError?'Session only':'Changes saved in this browser'}</span><span>Double-click a table name to edit <span className="footer-divider">·</span> <kbd>?</kbd> shortcuts</span></div>
    </section>
    <footer className="lab-footer"><span><Icon icon="layers" size={12}/> Blueprint 6 <span>×</span> GrowthLab</span><span>Sample data. Real interactions. <button onClick={()=>setLabOpen(true)}>Explore the components <Icon icon="arrow-right" size={12}/></button></span></footer>
   </main>
  </div>
  <Omnibar<Experiment> isOpen={commandOpen} onClose={()=>setCommandOpen(false)} items={experiments} itemPredicate={(q,e)=>`${e.id} ${e.name} ${e.stage}`.toLowerCase().includes(q.toLowerCase())} itemRenderer={(e,{handleClick,modifiers})=><MenuItem key={e.id} text={e.name} label={e.id} icon="lab-test" active={modifiers.active} onClick={handleClick}/>} onItemSelect={e=>{clear();select(e.id);setCommandOpen(false);}} inputProps={{placeholder:'Find an experiment by name, ID, or stage…'}} noResults={<MenuItem disabled text="No experiments found"/>}/>
  <Dialog isOpen={newOpen} onClose={()=>setNewOpen(false)} title="New experiment" icon="lab-test" className="new-experiment-dialog"><form onSubmit={create}><DialogBody><Callout intent="primary" icon="lightbulb">Start with a question worth answering. This creates a draft in your local demo.</Callout><FormGroup label="Experiment name" labelFor="experiment-name" labelInfo="(required)"><InputGroup id="experiment-name" autoFocus value={newTitle} onValueChange={setNewTitle} maxLength={100} placeholder="What are we testing?" required/></FormGroup><div className="form-two-columns"><FormGroup label="Lifecycle stage" labelFor="experiment-stage"><HTMLSelect id="experiment-stage" fill options={stages} value={newStage} onChange={e=>setNewStage(e.target.value as Stage)}/></FormGroup><FormGroup label="Traffic allocation" labelFor="experiment-traffic"><NumericInput id="experiment-traffic" fill min={1} max={100} value={newTraffic} onValueChange={v=>setNewTraffic(Number.isFinite(v)?Math.min(100,Math.max(1,v)):50)} rightElement={<span className="input-unit">%</span>}/></FormGroup></div><FormGroup label="Primary metric" labelFor="experiment-metric"><InputGroup id="experiment-metric" value={newMetric} onValueChange={setNewMetric}/></FormGroup><FormGroup label="Hypothesis" labelFor="experiment-hypothesis"><TextArea id="experiment-hypothesis" fill rows={3} value={newHypothesis} onChange={e=>setNewHypothesis(e.target.value)} placeholder="If we… then… because…"/></FormGroup></DialogBody><DialogFooter actions={<><Button onClick={()=>setNewOpen(false)}>Cancel</Button><Button type="submit" intent="primary" icon="plus" disabled={!newTitle.trim()}>Create draft</Button></>}/></form></Dialog>
  <ComponentLab isOpen={labOpen} onClose={()=>setLabOpen(false)} onNotify={notify}/>
  <Dialog isOpen={shortcuts} onClose={()=>setShortcuts(false)} title="Move at the speed of thought" icon="key-command"><DialogBody className="shortcut-list">{[['mod+k','Find an experiment'],['n','New experiment'],['/','Search the current view'],['d','Toggle appearance'],['l','Open component lab'],['?','Blueprint shortcut guide']].map(([key,label])=><div key={key}><span>{label}</span><KeyComboTag combo={key}/></div>)}</DialogBody></Dialog>
  <Alert isOpen={resetOpen} onCancel={()=>setResetOpen(false)} onConfirm={()=>{save(seedExperiments.map(e=>({...e,tags:[...e.tags]})));clear();setSelectedId('EXP-2401');setResetOpen(false);notify('Demo restored. Your original to-do list is untouched.');}} intent="danger" icon="reset" confirmButtonText="Reset demo" cancelButtonText="Keep my changes"><p>Restore the 24 sample experiments? Changes you made to this demo will be replaced. Your original to-do list is separate.</p></Alert>
  {notice&&<div className="lab-toast" role="status"><Icon icon="tick-circle" intent="success"/><span>{notice}</span><Button variant="minimal" size="small" icon="cross" aria-label="Dismiss notification" onClick={()=>setNotice('')}/></div>}
 </div>;
}
function Metric({label,value,note,icon,trend,accent=false}:{label:string;value:string;note:string;icon:'pulse'|'trending-up'|'people'|'endorsed';trend:string;accent?:boolean}) {
 return <article className={`metric-card ${accent?'metric-accent':''}`}><div className="metric-top"><span>{label}</span><Icon icon={icon} size={16}/></div><div className="metric-value">{value}<span>{trend}</span></div><p>{note}</p></article>;
}
