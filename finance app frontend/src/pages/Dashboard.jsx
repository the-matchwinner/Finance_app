import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboard, getTransactions } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ── Sidebar ──────────────────────────────────────────────────────────────────
export function WealthIntelSidebar({ active }) {
  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const nav = [
    { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { to: '/upload', icon: 'cloud_upload', label: 'Upload' },
    { to: '/transactions', icon: 'receipt_long', label: 'Transactions' },
    { to: '/insights', icon: 'lightbulb', label: 'Insights' },
    { to: '/budget', icon: 'savings', label: 'Budget' },
    { to: '/goals', icon: 'flag', label: 'Goals' },
    { to: '/assistant', icon: 'smart_toy', label: 'AI Assistant' },
  ];
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] z-50 flex flex-col overflow-y-auto font-['Inter']">
      <div className="px-6 py-8">
        <h1 className="text-2xl font-black text-blue-900 dark:text-blue-400">IntelliVest</h1>
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">invest with intelligence</p>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {nav.map(({ to, icon, label }) => {
          const on = active === label;
          return (
            <Link key={to} to={to} className={`flex items-center gap-3 px-4 py-3 rounded-l-lg transition-all ${on ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-400 border-r-4 border-blue-900 dark:border-blue-500 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-blue-900 dark:hover:text-blue-400'}`}>
              <span className="material-symbols-outlined" style={on ? { fontVariationSettings: '"FILL" 1' } : {}}>{icon}</span>
              <span className="text-sm">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 space-y-1">
        <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
          <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          <span className="text-sm">{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
        </button>
        <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
          <span className="material-symbols-outlined">settings</span><span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}

const PIE_COLORS = ['#00355f','#006c49','#ba1a1a','#7c3aed','#b45309','#0369a1','#be123c'];

function TrendTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const cr = payload.find(p => p.dataKey === 'credited')?.value || 0;
  const db = payload.find(p => p.dataKey === 'debited')?.value || 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-xs min-w-[180px]">
      <p className="font-bold text-slate-800 mb-2">{label}</p>
      <p className="text-green-600 font-semibold">↑ Credited: ₹{cr.toLocaleString('en-IN')}</p>
      <p className="text-red-500 font-semibold">↓ Debited: ₹{db.toLocaleString('en-IN')}</p>
      <p className={`font-bold mt-1 pt-1 border-t border-slate-100 ${cr - db >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
        Net: ₹{(cr - db).toLocaleString('en-IN')}
      </p>
      {payload[0]?.payload?.top && <p className="text-slate-400 mt-1">Top: {payload[0].payload.top}</p>}
    </div>
  );
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-slate-900">{d.name}</p>
      <p className="text-slate-600">₹{d.value.toLocaleString('en-IN')}</p>
      <p className="text-slate-400">{d.payload.pct}% of total</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dash, setDash] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('monthly');

  useEffect(() => {
    (async () => {
      try {
        const [dr, tr] = await Promise.all([getDashboard(), getTransactions().catch(() => ({ success: false, data: [] }))]);
        if (dr.success) setDash(dr.data);
        if (tr.success) setTxs(tr.data || []);
      } catch (e) { if (e.message?.includes('401')) navigate('/'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  // amount >= 0 means credit, < 0 means debit
  const isCredit = t => (t.amount || 0) >= 0;

  const trendData = useMemo(() => {
    const b = {};
    txs.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const sortKey = mode === 'monthly'
        ? d.getFullYear() * 100 + d.getMonth()
        : d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      const label = mode === 'monthly'
        ? d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
        : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (!b[sortKey]) b[sortKey] = { label, sortKey, credited: 0, debited: 0, tops: {} };
      if (isCredit(t)) b[sortKey].credited += t.amount;
      else {
        b[sortKey].debited += Math.abs(t.amount);
        const key = t.title || 'Other';
        b[sortKey].tops[key] = (b[sortKey].tops[key] || 0) + Math.abs(t.amount);
      }
    });
    return Object.values(b)
      .sort((a, z) => a.sortKey - z.sortKey)
      .map(b => ({ ...b, top: Object.entries(b.tops).sort((a, c) => c[1] - a[1])[0]?.[0]?.slice(0, 25) || null }))
      .slice(-20);
  }, [txs, mode]);

  const pieData = useMemo(() => {
    const cats = {};
    txs.filter(t => !isCredit(t)).forEach(t => { const c = t.category || 'Other'; cats[c] = (cats[c] || 0) + Math.abs(t.amount); });
    const tot = Object.values(cats).reduce((a, v) => a + v, 0) || 1;
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([name, value]) => ({ name, value, pct: ((value / tot) * 100).toFixed(1) }));
  }, [txs]);

  const insights = useMemo(() => {
    const debits = txs.filter(t => !isCredit(t));
    const credits = txs.filter(t => isCredit(t));
    const totalExp = debits.reduce((a, t) => a + Math.abs(t.amount), 0);
    const totalInc = credits.reduce((a, t) => a + t.amount, 0);
    const sr = totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;
    const cats = {};
    debits.forEach(t => { const c = t.category || 'Other'; cats[c] = (cats[c] || 0) + Math.abs(t.amount); });
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    const upiMap = {};
    debits.forEach(t => { const k = t.title || ''; if (k.includes('@')) upiMap[k] = (upiMap[k] || 0) + 1; });
    const topUpi = Object.entries(upiMap).sort((a, b) => b[1] - a[1])[0];
    const res = [];
    if (topCat) res.push({ color: 'red', icon: 'warning', title: `High Spend: ${topCat[0]}`, message: `₹${topCat[1].toLocaleString('en-IN')} spent in ${topCat[0]}. Your largest category — review it for savings.`, link: '/insights', cta: 'VIEW INSIGHTS' });
    if (totalInc > 0) res.push({ color: sr >= 20 ? 'green' : 'blue', icon: sr >= 20 ? 'savings' : 'trending_down', title: sr >= 20 ? 'Good Savings Rate' : 'Low Savings Rate', message: `Your savings rate is ${sr.toFixed(1)}%. ${sr >= 20 ? 'You are on track!' : 'Recommended minimum is 20%.'}`, link: '/budget', cta: 'BUDGET PLANNER' });
    if (topUpi) res.push({ color: 'blue', icon: 'tips_and_updates', title: 'Frequent Payee', message: `You paid ${topUpi[0].slice(0, 35)} ${topUpi[1]} times. Consider consolidating.`, link: `/transactions?search=${encodeURIComponent(topUpi[0])}`, cta: 'VIEW PAYMENTS' });
    if (!res.length) res.push({ color: 'blue', icon: 'upload_file', title: 'No Data Yet', message: 'Upload your bank statement to see AI-powered insights.', link: '/upload', cta: 'UPLOAD NOW' });
    return res.slice(0, 3);
  }, [txs]);

  const fmt = n => `₹${Math.abs(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const C = 2 * Math.PI * 58;
  const totalInc = txs.filter(t => isCredit(t)).reduce((a, t) => a + t.amount, 0);
  const totalExp = txs.filter(t => !isCredit(t)).reduce((a, t) => a + Math.abs(t.amount), 0);
  const balance = totalInc - totalExp;
  const score = Math.min(100, Math.max(0, totalInc > 0 ? Math.round(((totalInc - totalExp) / totalInc) * 100 + 50) : 0));
  const colors = {
    red:   { bg: 'bg-red-50',   txt: 'text-red-650', bdr: 'border-l-red-500' },
    blue:  { bg: 'bg-blue-50',  txt: 'text-blue-900', bdr: 'border-l-blue-900' },
    green: { bg: 'bg-green-50', txt: 'text-green-700', bdr: 'border-l-green-700' },
  };

  return (
    <div className="font-['Inter'] antialiased bg-[#f8f9ff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 min-h-screen">
      <WealthIntelSidebar active="Dashboard" />
      <main className="ml-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
          {loading ? (
            <div className="py-32 text-center text-slate-400"><span className="material-symbols-outlined text-5xl animate-spin block mb-4">sync</span><p>Loading financial intelligence...</p></div>
          ) : (
            <>
              {/* Health Score + Cards */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <span className="material-symbols-outlined text-[120px] text-blue-900 dark:text-blue-500">verified_user</span>
                  </div>
                  <div className="flex flex-col h-full justify-between relative z-10">
                    <div><h2 className="text-2xl font-bold text-blue-900 dark:text-blue-400 mb-2">Financial Health Score</h2><p className="text-sm text-slate-500 dark:text-slate-400">Based on savings rate, credit vs debit balance, and spending patterns.</p></div>
                    <div className="mt-8 flex items-end gap-6">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle className="text-slate-100 dark:text-slate-800" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="10" />
                          <circle className={score >= 70 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'} cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray={C} strokeDashoffset={C - (score / 100) * C} strokeWidth="10" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                        </svg>
                        <span className={`absolute font-black text-3xl ${score >= 70 ? 'text-green-600 dark:text-green-400' : score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{score}</span>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{score >= 70 ? 'Excellent' : score >= 50 ? 'Good' : score >= 30 ? 'Fair' : 'Needs Attention'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{txs.length} transactions analysed.</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Credits: ₹{totalInc.toLocaleString('en-IN')} | Debits: ₹{totalExp.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <Link to="/insights" className="mt-8 bg-blue-900 dark:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 inline-flex items-center gap-2 text-sm max-w-max">
                      View Detailed Report <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { icon: 'payments', bg: 'bg-blue-100 dark:bg-blue-950/40', tc: 'text-blue-900 dark:text-blue-400', label: 'TOTAL INCOME', val: fmt(totalInc), vc: 'text-slate-900 dark:text-slate-100' },
                    { icon: 'shopping_cart', bg: 'bg-red-100 dark:bg-red-950/40', tc: 'text-red-700 dark:text-red-400', label: 'TOTAL EXPENSES', val: fmt(totalExp), vc: 'text-slate-900 dark:text-slate-100' },
                    { icon: 'savings', bg: 'bg-green-100 dark:bg-green-950/40', tc: 'text-green-700 dark:text-green-400', label: 'NET BALANCE', val: fmt(balance), vc: balance >= 0 ? 'text-green-750 dark:text-green-450' : 'text-red-700 dark:text-red-400' },
                  ].map(c => (
                    <div key={c.label} className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center ${c.tc}`}><span className="material-symbols-outlined text-lg">{c.icon}</span></div>
                      <div><p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{c.label}</p><p className={`text-xl font-black ${c.vc}`}>{c.val}</p></div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Charts */}
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Line chart */}
                <div className="xl:col-span-2 bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-[0px_4px_12px_rgba(15,76,129,0.05)]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400">Spending Trends</h3>
                      <div className="flex gap-4 mt-1">
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><span className="inline-block w-4 h-0.5 bg-green-500 rounded"></span>Credited</span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><span className="inline-block w-4 h-0.5 bg-red-500 rounded"></span>Debited</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {['daily','monthly'].map(m => (
                        <button key={m} onClick={() => setMode(m)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize ${mode === m ? 'bg-blue-900 dark:bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                  {trendData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-sm text-center"><div><span className="material-symbols-outlined text-4xl block mb-2">upload_file</span>Upload transactions to see trends</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={256}>
                      <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/50" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <Tooltip content={<TrendTip />} />
                        <Line type="monotone" dataKey="credited" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="debited" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Pie chart */}
                <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-[0px_4px_12px_rgba(15,76,129,0.05)]">
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400 mb-1">Expense Allocation</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">By category (hover to explore)</p>
                  {pieData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm text-center"><div><span className="material-symbols-outlined text-3xl block mb-2">donut_large</span>No expense data yet</div></div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<PieTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {pieData.slice(0, 5).map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                              <span className="text-slate-700 dark:text-slate-350 truncate max-w-[120px]">{d.name}</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{d.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Insights */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-450">Intelligence Insights</h2>
                  <Link to="/insights" className="text-blue-900 dark:text-blue-500 font-semibold text-sm hover:underline">View All</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {insights.map((ins, i) => {
                    const c = colors[ins.color];
                    const darkBdr = ins.color === 'red' ? 'dark:border-l-red-500' : ins.color === 'green' ? 'dark:border-l-green-500' : 'dark:border-l-blue-500';
                    const darkBg = ins.color === 'red' ? 'dark:bg-red-950/20' : ins.color === 'green' ? 'dark:bg-green-950/20' : 'dark:bg-blue-950/20';
                    return (
                      <div key={i} className={`bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] border-l-4 ${c.bdr} ${darkBdr}`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full ${c.bg} ${darkBg} ${c.txt} flex items-center justify-center shrink-0`}><span className="material-symbols-outlined">{ins.icon}</span></div>
                          <div>
                            <h4 className={`font-semibold mb-1 ${c.txt}`}>{ins.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-450 mb-4">{ins.message}</p>
                            <Link to={ins.link} className="text-blue-900 dark:text-blue-450 font-bold text-xs hover:underline uppercase tracking-wider">{ins.cta}</Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
        <div className="fixed bottom-8 right-8 z-50">
          <Link to="/assistant" className="w-16 h-16 bg-blue-900 dark:bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">smart_toy</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
