import type { Experiment, Stage, Status } from './model';
export type Filters = {query:string;stage:Stage|'All';statuses:Status[];owners:string[]};
export function filterExperiments(items:Experiment[],filters:Filters):Experiment[] {
 const query=filters.query.trim().toLowerCase();
 return items.filter(e=>(!query||[e.id,e.name,e.metric,e.owner,...e.tags].join(' ').toLowerCase().includes(query))&&(filters.stage==='All'||e.stage===filters.stage)&&(!filters.statuses.length||filters.statuses.includes(e.status))&&(!filters.owners.length||filters.owners.includes(e.owner)));
}
export function csvForExperiments(items:Experiment[]):string {
 const escape=(value:unknown)=>`"${String(value).replaceAll('"','""')}"`;
 return [['ID','Experiment','Stage','Status','Owner','Metric','Visitors','Uplift %','Confidence %','Traffic %'],...items.map(e=>[e.id,e.name,e.stage,e.status,e.owner,e.metric,e.visitors,e.uplift,e.confidence,e.traffic])].map(row=>row.map(escape).join(',')).join('\r\n');
}
