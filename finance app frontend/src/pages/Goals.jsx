import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoals, createGoal, updateGoalProgress, updateGoal, deleteGoal, getTransactions } from '../api';
import { WealthIntelSidebar } from './Dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GOAL_ICONS  = ['savings','home','flight','directions_car','school','laptop_mac','favorite','beach_access','business_center','star'];
const GOAL_COLORS = ['#00355f','#006c49','#7c3aed','#b45309','#0369a1','#be123c','#0f766e'];
const fmt = n => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;

// ── Progress Ring ──────────────────────────────────────────────────────────
function Ring({ pct, color, size = 64 }) {
  const r = size / 2 - 6;
  const C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ display:'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={C} strokeDashoffset={C - (Math.min(pct,100)/100)*C}
        strokeLinecap="round" style={{ transition:'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

// ── Goal Card ──────────────────────────────────────────────────────────────
function GoalCard({ goal, monthlyIncome, catSpend, onAddProgress, onEdit, onDelete }) {
  const idx      = Number(goal.id) % GOAL_COLORS.length;
  const color    = GOAL_COLORS[idx];
  const icon     = GOAL_ICONS[Number(goal.id) % GOAL_ICONS.length];
  const pct      = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  const remain   = Math.max((goal.targetAmount||0) - (goal.currentAmount||0), 0);
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const monthsLeft = deadline ? Math.max(Math.ceil((deadline - new Date()) / (1000*60*60*24*30)), 1) : 12;
  const monthlyNeeded = remain / monthsLeft;
  const onTrack  = monthlyIncome > 0 && monthlyNeeded <= monthlyIncome * 0.30;

  // Spending behaviour: top category eating into this goal
  const topCat = Object.entries(catSpend).sort((a,b) => b[1]-a[1])[0];

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none overflow-hidden">
      {/* Colour header strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
      <div className="p-6 space-y-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color+'18' }}>
              <span className="material-symbols-outlined text-lg" style={{ color }}>{icon}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{goal.name}</p>
              {deadline && <p className="text-xs text-slate-400 dark:text-slate-500">Due {deadline.toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</p>}
            </div>
          </div>
          {/* Progress ring */}
          <div className="relative shrink-0" style={{ width:64, height:64 }}>
            <Ring pct={pct} color={color} size={64} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color }}>{Math.round(pct)}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
            <div className="h-full rounded-full" style={{ width:`${pct}%`, backgroundColor:color, transition:'width 0.7s ease' }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Saved: <strong className="text-slate-900 dark:text-slate-200">{fmt(goal.currentAmount)}</strong></span>
            <span>Goal: <strong className="text-slate-900 dark:text-slate-200">{fmt(goal.targetAmount)}</strong></span>
          </div>
        </div>

        {/* AI projection */}
        <div className={`rounded-xl p-3 text-xs ${onTrack ? 'bg-green-50 border border-green-100 dark:bg-green-950/20 dark:border-green-900/50' : 'bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50'}`}>
          <p className={`font-bold flex items-center gap-1 mb-1 ${onTrack ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
            <span className="material-symbols-outlined text-sm">{onTrack ? 'check_circle' : 'schedule'}</span>
            {onTrack ? 'On Track' : 'Needs Attention'}
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            {fmt(monthlyNeeded)}/mo needed · {monthsLeft} month{monthsLeft!==1?'s':''} left
            {!onTrack && monthlyIncome > 0 && ` · That's ${((monthlyNeeded/monthlyIncome)*100).toFixed(0)}% of income`}
          </p>
        </div>

        {/* Spending behaviour impact */}
        {topCat && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-xs border border-slate-100 dark:border-slate-800">
            <p className="font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1 mb-1">
              <span className="material-symbols-outlined text-sm text-blue-900 dark:text-blue-400">insights</span>
              Spending Impact
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Your <strong>{topCat[0]}</strong> spend ({fmt(topCat[1])}) could fund <strong>{((topCat[1]*0.1)/Math.max(monthlyNeeded,1)*monthsLeft).toFixed(1)} months</strong> of savings toward this goal if reduced by 10%.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button onClick={() => onAddProgress(goal)}
            className="col-span-1 py-2 bg-blue-900 dark:bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 dark:hover:bg-blue-600 flex items-center justify-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-xs">add</span>Progress
          </button>
          <button onClick={() => onEdit(goal)}
            className="col-span-1 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-xs">edit</span>Edit
          </button>
          <button onClick={() => onDelete(goal)}
            className="col-span-1 py-2 border border-red-200 dark:border-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-xs">delete</span>Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function GoalModal({ goal, onClose, onSave, saving }) {
  const isEdit = !!goal?.id;
  const [form, setForm] = useState({
    name:         goal?.name         || '',
    targetAmount: goal?.targetAmount || '',
    deadline:     goal?.deadline     ? String(goal.deadline) : '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">{isEdit ? 'Edit Goal' : 'Create New Goal'}</h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1.5">Goal Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Emergency Fund, New Laptop…"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-slate-900 dark:text-slate-100" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1.5">Target Amount (₹)</label>
            <input type="number" min="1" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)}
              placeholder="50000"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-slate-900 dark:text-slate-100" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1.5">Target Date (optional)</label>
            <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-slate-900 dark:text-slate-100" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.targetAmount}
            className="flex-1 py-3 bg-blue-900 dark:bg-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-800 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Progress Modal ──────────────────────────────────────────────────────
function ProgressModal({ goal, onClose, onSave, saving }) {
  const [amt, setAmt] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Add Progress</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Amount saved toward <strong>{goal.name}</strong></p>
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
          <input type="number" min="1" value={amt} onChange={e => setAmt(e.target.value)}
            placeholder="2000"
            className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-slate-900 dark:text-slate-100" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">Cancel</button>
          <button onClick={() => onSave(goal.id, Number(amt))} disabled={saving || !amt}
            className="flex-1 py-3 bg-green-700 dark:bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-800 dark:hover:bg-green-550 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
            {saving ? 'Saving…' : `Add ${amt ? fmt(amt) : '₹0'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectionTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
      {payload.map((p, idx) => (
        <p key={idx} style={{ color: p.stroke }} className="font-semibold">
          {p.name}: ₹{p.value.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
}

// ── Goals Page ──────────────────────────────────────────────────────────────
export default function Goals() {
  const navigate = useNavigate();
  const [goals,   setGoals]     = useState([]);
  const [txs,     setTxs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal,   setModal]     = useState(null); // null | { type:'create'|'edit'|'progress'|'delete', goal? }
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState(null);
  
  // Track dark theme state for dynamic chart styling
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    (async () => {
      try {
        const [gr, tr] = await Promise.all([
          getGoals().catch(() => ({ success:false, data:[] })),
          getTransactions().catch(() => ({ success:false, data:[] })),
        ]);
        if (gr.success) setGoals(gr.data || []);
        if (tr.success) setTxs(tr.data || []);
      } catch (e) { if (e.message?.includes('401')) navigate('/'); setError('Failed to load.'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Derived from transactions
  const monthlyIncome = useMemo(() =>
    txs.filter(t => (t.amount||0) >= 0).reduce((a,t) => a+t.amount, 0), [txs]);

  const catSpend = useMemo(() => {
    const m = {};
    txs.filter(t => (t.amount||0) < 0).forEach(t => { const c = t.category||'Other'; m[c]=(m[c]||0)+Math.abs(t.amount); });
    return m;
  }, [txs]);

  const totalSavings = useMemo(() =>
    monthlyIncome - txs.filter(t=>(t.amount||0)<0).reduce((a,t)=>a+Math.abs(t.amount),0), [txs, monthlyIncome]);

  const totalTargeted = goals.reduce((a,g) => a+(g.targetAmount||0), 0);
  const totalSaved    = goals.reduce((a,g) => a+(g.currentAmount||0), 0);

  // Calculate total monthly goal pressure
  const totalGoalPressure = useMemo(() => goals.reduce((acc, g) => {
    const rem = Math.max((g.targetAmount||0)-(g.currentAmount||0), 0);
    if (!rem) return acc;
    const deadline = g.deadline ? new Date(g.deadline) : null;
    const months = deadline ? Math.max(Math.ceil((deadline-new Date())/(1000*60*60*24*30)),1) : 12;
    return acc + rem/months;
  }, 0), [goals]);

  // Compute 12-month projections
  const projectionData = useMemo(() => {
    if (goals.length === 0) return [];
    const data = [];
    const monthlyRate = Math.max(totalSavings, 0);
    let currentAccum = totalSaved;
    let targetAccum = totalSaved;
    
    for (let i = 0; i <= 12; i++) {
      data.push({
        month: i === 0 ? 'Current' : `Month ${i}`,
        'Current Savings Path': Math.round(currentAccum),
        'Target Required Path': Math.round(targetAccum)
      });
      currentAccum += monthlyRate;
      targetAccum += totalGoalPressure;
    }
    return data;
  }, [goals, totalSaved, totalSavings, totalGoalPressure]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveGoal = async (form) => {
    setSaving(true); setError(null);
    try {
      const payload = { name: form.name, targetAmount: Number(form.targetAmount), deadline: form.deadline || null };
      if (modal.goal?.id) {
        const res = await updateGoal(modal.goal.id, payload);
        if (res.success) setGoals(prev => prev.map(g => g.id === modal.goal.id ? res.data : g));
      } else {
        const res = await createGoal(payload);
        if (res.success) setGoals(prev => [...prev, res.data]);
      }
      setModal(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleAddProgress = async (id, amount) => {
    setSaving(true);
    try {
      const res = await updateGoalProgress(id, amount);
      if (res.success) setGoals(prev => prev.map(g => g.id === id ? res.data : g));
      setModal(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete goal "${goal.name}"? This cannot be undone.`)) return;
    try {
      await deleteGoal(goal.id);
      setGoals(prev => prev.filter(g => g.id !== goal.id));
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="font-['Inter'] antialiased bg-[#f8f9ff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 min-h-screen">
      <WealthIntelSidebar active="Goals" />

      {modal?.type === 'create' && <GoalModal goal={null}        onClose={() => setModal(null)} onSave={handleSaveGoal}    saving={saving} />}
      {modal?.type === 'edit'   && <GoalModal goal={modal.goal}  onClose={() => setModal(null)} onSave={handleSaveGoal}    saving={saving} />}
      {modal?.type === 'progress' && <ProgressModal goal={modal.goal} onClose={() => setModal(null)} onSave={handleAddProgress} saving={saving} />}

      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black text-blue-900 dark:text-blue-400">Financial Goals</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Set savings targets and see how your spending habits affect your ability to reach them.</p>
            </div>
            <button onClick={() => setModal({ type:'create' })}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 dark:bg-blue-700 text-white rounded-lg font-bold text-sm hover:bg-blue-800 dark:hover:bg-blue-600 self-start md:self-center shrink-0 shadow-sm transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>New Goal
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-5 py-4 rounded-xl text-sm flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>{error}
            </div>
          )}

          {/* Summary strip */}
          {goals.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'TOTAL TARGETED', val:fmt(totalTargeted), icon:'flag',         tc:'text-blue-900 dark:text-blue-400',   bg:'bg-blue-50 dark:bg-blue-950/40' },
                { label:'TOTAL SAVED',    val:fmt(totalSaved),    icon:'savings',       tc:'text-green-700 dark:text-green-400',  bg:'bg-green-50 dark:bg-green-950/40' },
                { label:'STILL NEEDED',   val:fmt(Math.max(totalTargeted-totalSaved,0)), icon:'trending_up', tc:'text-amber-600 dark:text-amber-400',  bg:'bg-amber-50 dark:bg-amber-950/40' },
                { label:'MONTHLY NEEDED', val:fmt(totalGoalPressure), icon:'calendar_today', tc:'text-purple-700 dark:text-purple-400', bg:'bg-purple-50 dark:bg-purple-950/40' },
              ].map(c => (
                <div key={c.label} className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.tc} shrink-0`}>
                    <span className="material-symbols-outlined text-lg">{c.icon}</span>
                  </div>
                  <div><p className="text-[9px] font-bold text-slate-500 dark:text-slate-455 uppercase tracking-wider">{c.label}</p><p className="text-lg font-black text-slate-900 dark:text-slate-100">{c.val}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Spending vs Goals insight bar */}
          {goals.length > 0 && monthlyIncome > 0 && (
            <div className={`rounded-xl p-5 flex items-start gap-4 ${totalSavings >= totalGoalPressure ? 'bg-green-50 border border-green-100 dark:bg-green-950/20 dark:border-green-900/50' : 'bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50'}`}>
              <span className={`material-symbols-outlined text-2xl ${totalSavings >= totalGoalPressure ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {totalSavings >= totalGoalPressure ? 'check_circle' : 'warning'}
              </span>
              <div>
                <p className={`font-bold ${totalSavings >= totalGoalPressure ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-305'}`}>
                  {totalSavings >= totalGoalPressure
                    ? `Your current savings (${fmt(totalSavings)}/mo) cover all your goals!`
                    : `You need ${fmt(totalGoalPressure - totalSavings)} more per month to cover all goals.`}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Monthly goal pressure: <strong>{fmt(totalGoalPressure)}</strong> · Current monthly savings: <strong>{fmt(Math.max(totalSavings,0))}</strong> · Income: <strong>{fmt(monthlyIncome)}</strong>
                </p>
                {totalSavings < totalGoalPressure && (
                  <button onClick={() => navigate('/budget')} className="mt-2 text-sm font-bold text-blue-900 dark:text-blue-400 hover:underline flex items-center gap-1">
                    Open ML Budget Planner to rebalance <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Timeline Projections Chart */}
          {goals.length > 0 && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Timeline Projections & Savings Forecast</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">12-Month projection: Current Savings Path vs Target Required Path</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-900 dark:bg-blue-500"></span>Current Path</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-550"></span>Target Path</span>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projectionData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} 
                      tickFormatter={v => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<ProjectionTip />} />
                    <Line type="monotone" dataKey="Current Savings Path" stroke={isDark ? '#3b82f6' : '#00355f'} strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Target Required Path" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Goals grid */}
          {loading ? (
            <div className="py-32 text-center text-slate-400"><span className="material-symbols-outlined text-5xl animate-spin block mb-4">sync</span>Loading goals…</div>
          ) : goals.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-[#0f172a] rounded-xl border border-dashed border-slate-300 dark:border-slate-800 shadow-sm">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-blue-900 dark:text-blue-400">flag</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No goals yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-sm mx-auto">Set a financial target — a vacation, emergency fund, or gadget — and IntelliVest will project if your spending habits allow you to reach it.</p>
              <button onClick={() => setModal({ type:'create' })} className="px-8 py-3 bg-blue-900 dark:bg-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-800 dark:hover:bg-blue-650 transition-colors">Create Your First Goal</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {goals.map(g => (
                <GoalCard key={g.id} goal={g} monthlyIncome={monthlyIncome} catSpend={catSpend}
                  onAddProgress={goal => setModal({ type:'progress', goal })}
                  onEdit={goal => setModal({ type:'edit', goal })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
