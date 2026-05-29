import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions } from '../api';
import { WealthIntelSidebar } from './Dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const COLORS = ['#00355f','#006c49','#ba1a1a','#7c3aed','#b45309','#0369a1','#be123c','#0f766e','#c2410c'];

// amount>=0 = credit
const isCredit = t => (t.amount || 0) >= 0;
const absAmt   = t => Math.abs(t.amount || 0);
const fmtShort = n => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;
const trunc    = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '—');

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 text-xs max-w-[220px]">
      <p className="font-bold text-slate-900 dark:text-slate-100 mb-1 break-all">{label}</p>
      <p className="text-blue-900 dark:text-blue-400 font-semibold">{fmtShort(payload[0].value)}</p>
      <p className="text-slate-400 dark:text-slate-500">{payload[0].payload.count} transaction{payload[0].payload.count > 1 ? 's' : ''}</p>
    </div>
  );
}

const FILTER_OPTS = [
  { value: 'upi',  label: 'UPI ID / Payee' },
  { value: 'desc', label: 'Description / Note' },
];

export default function Insights() {
  const navigate = useNavigate();
  const [txs, setTxs]           = useState([]);
  const [loading, setLoading]    = useState(true);
  const [filterType, setFType]   = useState('upi');
  const [filterValue, setFValue] = useState('');
  
  // Track dark theme state for dynamic chart styling
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    (async () => {
      try {
        const r = await getTransactions();
        if (r.success) setTxs(r.data || []);
      } catch (e) { if (e.message?.includes('401')) navigate('/'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  useEffect(() => {
    // Observe class changes to update chart grid colors on theme switch
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // filtered set
  const filtered = useMemo(() => {
    if (!filterValue.trim()) return txs;
    const q = filterValue.toLowerCase();
    return txs.filter(t => {
      if (filterType === 'upi')  return (t.title || '').toLowerCase().includes(q);
      if (filterType === 'desc') return (t.note || '').toLowerCase().includes(q);
      return true;
    });
  }, [txs, filterType, filterValue]);

  // ── Vertical bar chart: group debits by title (UPI/Payee), top 8 ─────────
  const barData = useMemo(() => {
    const map = {};
    filtered.filter(t => !isCredit(t)).forEach(t => {
      const key = t.title || 'Unknown';
      if (!map[key]) map[key] = { name: trunc(key, 20), fullName: key, value: 0, count: 0 };
      map[key].value += absAmt(t);
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtered]);

  // ── Frequency table: group ALL txs by title ───────────────────────────────
  const freqTable = useMemo(() => {
    const map = {};
    txs.forEach(t => {
      const key = t.title;
      if (!key) return;
      if (!map[key]) map[key] = { id: key, type: key.includes('@') ? 'UPI' : 'Account/Payee', count: 0, total: 0, debit: 0, credit: 0 };
      map[key].count++;
      if (isCredit(t)) map[key].credit += t.amount;
      else map[key].debit += absAmt(t);
      map[key].total += absAmt(t);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [txs]);

  const debitFreq = useMemo(() => freqTable.filter(r => r.debit > 0), [freqTable]);
  const highFreq  = debitFreq[0] || null;
  const topBene   = [...debitFreq].sort((a, b) => b.debit - a.debit)[0] || null;

  const totalExp = txs.filter(t => !isCredit(t)).reduce((a, t) => a + absAmt(t), 0);
  const totalInc = txs.filter(isCredit).reduce((a, t) => a + t.amount, 0);
  const sr = totalInc > 0 ? ((totalInc - totalExp) / totalInc * 100) : 0;

  const catMap = {};
  txs.filter(t => !isCredit(t)).forEach(t => { const c = t.category || 'Other'; catMap[c] = (catMap[c] || 0) + absAmt(t); });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  const weekendSpendPct = useMemo(() => {
    const debits = txs.filter(t => !isCredit(t));
    const total = debits.reduce((sum, t) => sum + absAmt(t), 0);
    if (total === 0) return 0;
    const wk = debits.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      const day = d.getDay();
      return day === 0 || day === 6;
    }).reduce((sum, t) => sum + absAmt(t), 0);
    return (wk / total) * 100;
  }, [txs]);

  const potentialSubscriptions = useMemo(() => {
    const map = {};
    txs.filter(t => !isCredit(t)).forEach(t => {
      const title = t.title || 'Other';
      const amt = absAmt(t);
      const key = `${title}_${Math.round(amt)}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.values(map)
      .filter(list => list.length >= 2)
      .map(list => ({ title: list[0].title, amount: absAmt(list[0]), count: list.length }))
      .sort((a, b) => (b.amount * b.count) - (a.amount * a.count));
  }, [txs]);

  return (
    <div className="font-['Inter'] antialiased bg-[#f8f9ff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 min-h-screen">
      <WealthIntelSidebar active="Insights" />

      <main className="ml-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto space-y-8">

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-4xl font-black text-blue-900 dark:text-blue-400">Financial Intelligence</h2>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Personalised spending patterns and capital optimisation strategies.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg text-blue-900 dark:text-blue-450 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm shadow-sm transition-colors">
                <span className="material-symbols-outlined text-sm">calendar_today</span>All Time
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 dark:bg-blue-700 text-white rounded-lg font-medium hover:opacity-90 text-sm shadow-sm transition-colors">
                <span className="material-symbols-outlined text-sm">download</span>Export Report
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-3">Customise Graph View</p>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-xs font-bold shadow-sm">
                {FILTER_OPTS.map(o => (
                  <button key={o.value} onClick={() => { setFType(o.value); setFValue(''); }}
                    className={`px-4 py-2 transition-colors ${filterType === o.value ? 'bg-blue-900 dark:bg-blue-750 text-white' : 'bg-white dark:bg-[#1a2333] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-550 text-sm">filter_alt</span>
                <input className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-850 placeholder:text-slate-400"
                  placeholder={`Filter by ${FILTER_OPTS.find(o => o.value === filterType)?.label}…`}
                  value={filterValue} onChange={e => setFValue(e.target.value)} />
              </div>
              {filterValue && (
                <button onClick={() => setFValue('')} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">close</span>Clear
                </button>
              )}
              {filterValue && <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">{filtered.length} match</p>}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400"><span className="material-symbols-outlined text-5xl animate-spin block mb-4">sync</span><p>Analysing…</p></div>
          ) : (
            <>
              {/* Row 1: Vertical Bar Chart + Frequency Table */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Vertical Bar Chart */}
                <div className="lg:col-span-3 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Spending by UPI / Payee</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-450 mb-5">Top debit transactions grouped by receiver — hover for details</p>
                  {barData.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-slate-400 text-sm text-center">
                      <div><span className="material-symbols-outlined text-4xl block mb-2">bar_chart</span>No debit data for this filter</div>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={barData} margin={{ top: 20, right: 10, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false}
                            interval={0} angle={-35} textAnchor="end" height={70} />
                          <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false}
                            tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                          <Tooltip content={<BarTip />} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                            {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {/* View buttons below chart */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {barData.slice(0, 4).map((d, i) => (
                          <button key={i} onClick={() => navigate(`/transactions?search=${encodeURIComponent(d.fullName)}`)}
                            className="flex items-center gap-1 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-semibold text-blue-900 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                            {d.name} ({d.count})
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Frequency Table */}
                <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none flex flex-col">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Payments by UPI / Account</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-450 mb-4">Most frequent counterparts across all transactions</p>
                  {freqTable.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm text-center">
                      <div><span className="material-symbols-outlined text-3xl block mb-2">table_chart</span>Upload transactions to see data</div>
                    </div>
                  ) : (
                    <div className="overflow-y-auto max-h-[280px]">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white dark:bg-[#0f172a]">
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                            <th className="pb-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payee / UPI ID</th>
                            <th className="pb-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase text-center">Txns</th>
                            <th className="pb-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Total</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                          {freqTable.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="py-2.5 pr-2">
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-400 truncate max-w-[130px]" title={row.id}>{trunc(row.id, 20)}</p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">{row.type}</span>
                              </td>
                              <td className="py-2.5 text-sm font-bold text-slate-900 dark:text-slate-105 text-center">{row.count}</td>
                              <td className="py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 text-right">{fmtShort(row.total)}</td>
                              <td className="py-2.5 pl-2">
                                <button onClick={() => navigate(`/transactions?search=${encodeURIComponent(row.id)}`)}
                                  className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center gap-1 transition-colors">
                                  <span className="material-symbols-outlined text-xs">open_in_new</span>View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: High Frequency Receiver + Top Beneficiary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-900 dark:text-blue-400 mb-4">
                    <span className="material-symbols-outlined">sync_alt</span>
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">High Frequency Receiver</h4>
                  {highFreq ? (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-350 mb-4 leading-relaxed">
                        You made <strong className="text-blue-900 dark:text-blue-400">{highFreq.count} transactions</strong> to <strong className="text-blue-900 dark:text-blue-400 break-all">{trunc(highFreq.id, 40)}</strong> totalling <strong>{fmtShort(highFreq.debit)}</strong>. Consider auto-pay or consolidating.
                      </p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/transactions?search=${encodeURIComponent(highFreq.id)}`)}
                          className="flex items-center gap-1 text-sm font-bold text-blue-900 dark:text-blue-400 hover:underline">
                          View Transactions <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 text-xs font-bold rounded-full">{highFreq.type}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Upload transactions to see your most frequent payee.</p>
                  )}
                </div>

                <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-350 mb-4">
                    <span className="material-symbols-outlined">account_balance</span>
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Top Beneficiary</h4>
                  {topBene ? (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-350 mb-4 leading-relaxed">
                        Your highest cumulative spend was to <strong className="text-blue-900 dark:text-blue-400 break-all">{trunc(topBene.id, 40)}</strong> — total <strong>{fmtShort(topBene.debit)}</strong> across {topBene.count} payment{topBene.count > 1 ? 's' : ''}.
                      </p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => navigate(`/transactions?search=${encodeURIComponent(topBene.id)}`)}
                          className="flex items-center gap-1 text-sm font-bold text-blue-900 dark:text-blue-400 hover:underline">
                          View Transactions <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-full">{topBene.type}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Upload transactions to see your top beneficiary.</p>
                  )}
                </div>
              </div>

              {/* Row 3: Trend Analysis + Actionable Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Trend Analysis</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">TOTAL DEBITED</p>
                      <p className="text-2xl font-black text-red-600 dark:text-red-400">{fmtShort(totalExp)}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">TOTAL CREDITED</p>
                      <p className="text-2xl font-black text-green-700 dark:text-green-400">{fmtShort(totalInc)}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">TOP CATEGORY</p>
                      <p className="text-base font-bold text-blue-900 dark:text-blue-400">{topCat ? topCat[0] : 'N/A'}</p>
                      {topCat && <p className="text-sm text-slate-500 dark:text-slate-400">{fmtShort(topCat[1])}</p>}
                    </div>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">SAVINGS RATE</p>
                      <p className={`text-2xl font-black ${sr >= 20 ? 'text-green-600 dark:text-green-450' : 'text-red-500 dark:text-red-400'}`}>{sr.toFixed(1)}%</p>
                      <div className="mt-2 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${sr >= 20 ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${Math.min(Math.abs(sr), 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Actionable Recommendations</h3>
                  {txs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Card 1: Capital Growth / Savings Rules */}
                      {totalInc > 0 && sr >= 20 ? (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-850 flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 flex items-center justify-center mb-3">
                              <span className="material-symbols-outlined">trending_up</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-sm">Capital Deployment Opportunity</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Your savings rate is healthy at <strong>{sr.toFixed(1)}%</strong>. Consider allocating some of your ₹{(totalInc - totalExp).toLocaleString('en-IN')} surplus into mutual funds or index tracking.</p>
                          </div>
                          <button onClick={() => navigate('/budget')}
                            className="text-xs font-bold text-blue-900 dark:text-blue-450 hover:underline flex items-center gap-1 mt-4 self-start">
                            Go to Budget Planner <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-850 flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3">
                              <span className="material-symbols-outlined">savings</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-sm">Emergency Fund & Savings Rule</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Your savings rate is <strong>{sr.toFixed(1)}%</strong> (below the recommended 20%). Try setting up an automatic transfer of 20% of your deposits immediately on salary day.</p>
                          </div>
                          <button onClick={() => navigate('/goals')}
                            className="text-xs font-bold text-blue-900 dark:text-blue-450 hover:underline flex items-center gap-1 mt-4 self-start">
                            Set Savings Goals <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </button>
                        </div>
                      )}

                      {/* Card 2: Expense Control (Category, Weekend, or Subscription) */}
                      {topCat && (topCat[1] / (totalExp || 1)) * 100 > 25 ? (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-850 flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-450 flex items-center justify-center mb-3">
                              <span className="material-symbols-outlined">shopping_bag</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-sm">Targeted Category Control</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Spending on <strong>{topCat[0]}</strong> makes up <strong>{((topCat[1]/totalExp)*100).toFixed(1)}%</strong> of your expenses. Trimming this by 15% would save <strong>{fmtShort(topCat[1]*0.15)}</strong> per month.</p>
                          </div>
                          <button onClick={() => navigate(`/transactions?search=${encodeURIComponent(topCat[0])}`)}
                            className="text-xs font-bold text-blue-900 dark:text-blue-450 hover:underline flex items-center gap-1 mt-4 self-start">
                            Filter Transactions <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </button>
                        </div>
                      ) : weekendSpendPct > 35 ? (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-850 flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-400 flex items-center justify-center mb-3">
                              <span className="material-symbols-outlined">local_activity</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-sm">Weekend Spend Regulation</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">You spend <strong>{weekendSpendPct.toFixed(1)}%</strong> of your budget on weekends. Consider setting a Friday-Sunday spending cap to curb impulse buys.</p>
                          </div>
                          <button onClick={() => navigate('/transactions')}
                            className="text-xs font-bold text-blue-900 dark:text-blue-450 hover:underline flex items-center gap-1 mt-4 self-start">
                            View All Transactions <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </button>
                        </div>
                      ) : potentialSubscriptions.length > 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-850 flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-3">
                              <span className="material-symbols-outlined">calendar_today</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-sm">Recurring Expense Review</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">We detected repeating charges of <strong>{fmtShort(potentialSubscriptions[0].amount)}</strong> to <strong>{trunc(potentialSubscriptions[0].title, 20)}</strong>. Verify if this subscription is still utilized.</p>
                          </div>
                          <button onClick={() => navigate(`/transactions?search=${encodeURIComponent(potentialSubscriptions[0].title)}`)}
                            className="text-xs font-bold text-blue-900 dark:text-blue-450 hover:underline flex items-center gap-1 mt-4 self-start">
                            View Payments <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-850 flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
                              <span className="material-symbols-outlined">receipt_long</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 text-sm">Clean Account Statements</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">You have <strong>{txs.length}</strong> transactions recorded. Try reducing low-value UPI transactions to keep statements concise and budget-friendly.</p>
                          </div>
                          <button onClick={() => navigate('/transactions')}
                            className="text-xs font-bold text-blue-900 dark:text-blue-450 hover:underline flex items-center gap-1 mt-4 self-start">
                            View All Transactions <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-400 text-sm text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <div><span className="material-symbols-outlined text-3xl block mb-2">insights</span>Upload transactions to see recommendations</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
