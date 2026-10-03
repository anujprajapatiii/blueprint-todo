export type Stage = 'Acquisition' | 'Activation' | 'Retention' | 'Monetization';
export type Status = 'Running' | 'Review' | 'Draft' | 'Completed' | 'Paused';
export type Experiment = {
  id: string; name: string; stage: Stage; status: Status; owner: string; initials: string;
  metric: string; hypothesis: string; visitors: number; baseline: number; uplift: number;
  confidence: number; traffic: number; start: string; end: string; tags: string[]; priority: number;
};
export const statuses: Status[] = ['Running','Review','Draft','Completed','Paused'];
export const stages: Stage[] = ['Acquisition','Activation','Retention','Monetization'];
export const owners = ['Anuj Prajapati','Maya Chen','Jordan Lee','Priya Shah','Alex Rivera'];
export const statusIntent = (status: Status): 'success' | 'warning' | 'primary' | 'none' => status === 'Running' ? 'success' : status === 'Review' ? 'warning' : status === 'Completed' ? 'primary' : 'none';
const specs: [string, Stage, Status, string, number, number, number][] = [
 ['One-click workspace setup','Activation','Running','Signup → activation',12.8,98.4,28450],
 ['Pricing page value anchors','Monetization','Review','Visitor → trial',8.4,96.2,19230],
 ['A shorter path to first value','Activation','Running','Time to first value',18.6,99.1,16780],
 ['Social proof near the CTA','Acquisition','Running','Landing conversion',6.2,91.8,42360],
 ['A friendlier empty state','Activation','Running','First project created',9.3,94.6,12890],
 ['Annual plan, clearer savings','Monetization','Review','Annual plan selection',14.1,98.9,8430],
 ['Your weekly progress digest','Retention','Running','Week 4 retention',4.7,82.5,21890],
 ['Role-based onboarding','Activation','Draft','Signup → activation',0,0,0],
 ['A contextual upgrade moment','Monetization','Running','Free → paid',-2.1,76.4,6970],
 ['Template gallery in search','Acquisition','Running','Visitor → signup',7.6,93.7,35620],
 ['Welcome back, pick up here','Retention','Paused','Reactivation rate',3.2,71.2,13210],
 ['Show the product before signup','Acquisition','Completed','Landing conversion',11.4,99.3,58240],
 ['Invite a teammate earlier','Activation','Completed','Team activation',16.7,99.7,30280],
 ['Flexible seats at checkout','Monetization','Draft','Checkout completion',0,0,0],
 ['Progressive signup fields','Acquisition','Running','Signup completion',5.9,88.1,24670],
 ['A nudge at the right moment','Retention','Review','Feature adoption',8.8,97.3,17640],
 ['Compare plans in context','Monetization','Completed','Upgrade conversion',7.2,96.8,19940],
 ['Customer stories by industry','Acquisition','Draft','Demo requests',0,0,0],
 ['Save your first workflow','Activation','Paused','Workflow creation',-0.8,63.4,10870],
 ['A simpler cancellation flow','Retention','Completed','Save rate',6.4,95.8,7540],
 ['Interactive ROI calculator','Acquisition','Draft','Qualified leads',0,0,0],
 ['Usage milestones that matter','Retention','Running','Weekly active teams',3.6,84.2,18290],
 ['Regional payment options','Monetization','Draft','Payment success',0,0,0],
 ['A guided first project','Activation','Completed','First project created',21.3,99.8,37460],
];
export const seedExperiments: Experiment[] = specs.map((s, i) => ({
 id: `EXP-${String(2401+i)}`, name:s[0], stage:s[1], status:s[2], owner:owners[i%owners.length],
 initials:owners[i%owners.length].split(' ').map(x=>x[0]).join(''), metric:s[3], uplift:s[4], confidence:s[5], visitors:s[6],
 baseline: Number((4.2+(i%7)*1.3).toFixed(1)), traffic:i===0?50:i%3===0?25:50,
 start:`2026-09-${String(8+i%16).padStart(2,'0')}`, end:`2026-10-${String(8+i%16).padStart(2,'0')}`,
 hypothesis:i===0 ? 'If we remove the manual configuration step, new teams will reach their first successful workspace faster and more of them will activate.' : `If we introduce ${s[0].toLowerCase()}, more people will reach the next meaningful step. We expect a positive change in ${s[3].toLowerCase()} without hurting downstream quality.`,
 tags:i%3===0?['Onboarding','High impact']:i%3===1?['Conversion','UX improvement']:['Experiment','Quick win'], priority: [85,92,78,67,74][i%5],
}));
export const LAB_STORAGE = 'blueprint-growth-lab.v1';
export function readExperiments(): Experiment[] {
 try { const parsed=JSON.parse(localStorage.getItem(LAB_STORAGE)||'null'); if(Array.isArray(parsed)&&parsed.length&&parsed.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&statuses.includes(x.status)&&stages.includes(x.stage)&&typeof x.visitors==='number'&&typeof x.hypothesis==='string'&&Array.isArray(x.tags))) return parsed; } catch { /* demo falls back safely; no task data is read */ }
 return seedExperiments.map(x=>({...x,tags:[...x.tags]}));
}
export const fmt = (n:number) => new Intl.NumberFormat('en',{notation:n>=10000?'compact':'standard',maximumFractionDigits:1}).format(n);
export const lift = (n:number) => `${n>0?'+':''}${n.toFixed(1)}%`;
