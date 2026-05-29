import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, getGoals, getSubscriptions } from '../api';
// txFetched tracks whether API call completed (even if empty array)
import { WealthIntelSidebar } from './Dashboard';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

// ── ML Allocation Engine ──────────────────────────────────────────────────────
// Benchmarks: % of income each category should ideally consume
const BENCHMARKS = {
  'Food & Dining': 0.15, 'Transport': 0.10, 'Utilities': 0.08,
  'Healthcare': 0.05, 'Education': 0.05, 'Shopping': 0.08,
  'Entertainment': 0.05, 'Personal Account': 0.10, 'Business Account': 0.05, 'Other': 0.05,
};
const NEEDS_CATS  = new Set(['Food & Dining','Transport','Utilities','Healthcare','Education']);
const CAT_ICONS   = { 'Food & Dining':'restaurant','Transport':'directions_car','Utilities':'bolt','Healthcare':'local_hospital','Education':'school','Shopping':'shopping_bag','Entertainment':'movie','Personal Account':'person','Business Account':'business','Other':'category' };
const COLORS      = ['#00355f','#006c49','#ba1a1a','#7c3aed','#b45309','#0369a1','#be123c','#0f766e'];

// ── Market Sentiment Analyser ────────────────────────────────────────────────
// Fetches Nifty 50 (^NSEI) 3-month data from Yahoo Finance and derives:
//   trend       : 'bull' | 'neutral' | 'bear'
//   volatility  : 'high' | 'moderate' | 'low'
//   investWeight: recommended % of income to invest (0.05 – 0.25)
async function fetchMarketSentiment() {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=3mo';
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean);
    if (!closes || closes.length < 10) throw new Error('no data');

    const first   = closes[0];
    const last    = closes[closes.length - 1];
    const ret3mo  = ((last - first) / first) * 100;   // 3-month return %

    // 1-month daily return std-dev for volatility
    const slice = closes.slice(-22);
    const dailyRets = slice.slice(1).map((c, i) => (c - slice[i]) / slice[i] * 100);
    const mean = dailyRets.reduce((a, v) => a + v, 0) / dailyRets.length;
    const stdDev = Math.sqrt(dailyRets.reduce((a, v) => a + (v - mean) ** 2, 0) / dailyRets.length);

    const trend = ret3mo > 4 ? 'bull' : ret3mo < -4 ? 'bear' : 'neutral';
    const volatility = stdDev > 1.8 ? 'high' : stdDev > 0.9 ? 'moderate' : 'low';

    // Investment weight: bull+low-vol → 22%, bear → 6%, high-vol always pulls down
    const baseInvest = trend === 'bull' ? 0.22 : trend === 'bear' ? 0.06 : 0.12;
    const investWeight = volatility === 'high'
      ? Math.max(0.05, baseInvest - 0.07)
      : volatility === 'moderate' ? Math.max(0.05, baseInvest - 0.03) : baseInvest;

    return { trend, volatility, ret3mo: ret3mo.toFixed(1), stdDev: stdDev.toFixed(2),
             niftyLast: Math.round(last), investWeight, loaded: true };
  } catch {
    // Fallback: neutral market, standard 10% investment weight
    return { trend: 'neutral', volatility: 'moderate', ret3mo: null, stdDev: null,
             niftyLast: null, investWeight: 0.10, loaded: false };
  }
}

function runMLEngine(txs, goals, market) {
  const investWeight = market?.investWeight ?? 0.10;
  const income  = txs.filter(t => (t.amount || 0) >= 0).reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter(t => (t.amount || 0) < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
  if (txs.length === 0) return null;
  const safeIncome = income > 0 ? income : (expense > 0 ? expense : 1);

  const catSpend = {};
  txs.filter(t => (t.amount || 0) < 0).forEach(t => {
    const c = t.category || 'Other';
    catSpend[c] = (catSpend[c] || 0) + Math.abs(t.amount);
  });

  const now = new Date();
  let goalPressure = 0;
  goals.forEach(g => {
    const rem = Math.max((g.targetAmount || 0) - (g.currentAmount || 0), 0);
    if (!rem) return;
    const months = g.deadline
      ? Math.max(Math.ceil((new Date(g.deadline) - now) / (1000 * 60 * 60 * 24 * 30)), 1)
      : 12;
    goalPressure += rem / months;
  });

  let needsSpend = 0, wantsSpend = 0;
  Object.entries(catSpend).forEach(([c, v]) => {
    if (NEEDS_CATS.has(c)) needsSpend += v; else wantsSpend += v;
  });

  // ML allocation with market-adjusted investment weight
  const recNeeds      = Math.min(needsSpend, safeIncome * 0.50);
  const recSavings    = Math.max(goalPressure, safeIncome * 0.20);
  const recInvestment = Math.max(0, Math.min(safeIncome * investWeight, safeIncome - recNeeds - recSavings));
  const recWants      = Math.max(0, safeIncome - recNeeds - recSavings - recInvestment);

  const suggestions = [];
  Object.entries(catSpend).sort((a, b) => b[1] - a[1]).forEach(([cat, actual]) => {
    const bench = (BENCHMARKS[cat] || 0.05) * safeIncome;
    const overBy = actual - bench;
    if (overBy > 200) suggestions.push({ cat, actual, bench, overBy, saving: overBy * 0.6 });
  });

  const currentSavings = income - expense;
  const savingsRate    = safeIncome > 0 ? Math.max(-100, (currentSavings / safeIncome) * 100) : 0;
  const goalScore      = Math.min(100, Math.max(0, (currentSavings / Math.max(goalPressure, 1)) * 100));
  const needsScore     = Math.min(100, Math.max(0, 100 - Math.max(0, ((needsSpend / safeIncome) - 0.5) * 200)));
  const wantsScore     = Math.min(100, Math.max(0, 100 - Math.max(0, ((wantsSpend / safeIncome) - 0.30) * 200)));
  const overallScore   = income > 0
    ? Math.round(Math.max(0, savingsRate) * 0.4 + goalScore * 0.4 + needsScore * 0.1 + wantsScore * 0.1)
    : 0;

  return {
    income, expense, safeIncome, currentSavings, savingsRate,
    catSpend, needsSpend, wantsSpend, goalPressure,
    recNeeds, recSavings, recInvestment, recWants,
    suggestions: suggestions.slice(0, 4),
    overallScore: Math.min(100, Math.max(0, overallScore)),
    goalCovered: goalPressure > 0 ? Math.min(100, Math.max(0, (currentSavings / goalPressure) * 100)) : 100,
    radarData: Object.keys(BENCHMARKS).map(cat => {
      const actualAmt = catSpend[cat] || 0;
      const actualPct = safeIncome > 0 ? (actualAmt / safeIncome) * 100 : 0;
      const benchPct = BENCHMARKS[cat] * 100;
      return {
        subject: cat,
        A: Math.round(actualPct),
        B: Math.round(benchPct),
      };
    }),
  };
}

const fmt  = n => `₹${Math.abs(n || 0).toLocaleString('en-IN')}`;
const pct  = (n, d) => d > 0 ? ((n / d) * 100).toFixed(1) : '0.0';

function AllocBar({ label, current, recommended, income, color }) {
  const base = income > 0 ? income : 1;
  const cPct = Math.min(Math.max((current / base) * 100, 0), 100);
  const rPct = Math.min(Math.max((recommended / base) * 100, 0), 100);
  const over = current > recommended && recommended > 0;
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="flex gap-4 text-xs">
          <span className={`font-bold ${over ? 'text-red-600' : 'text-slate-500'}`}>Current: {fmt(current)} ({cPct.toFixed(0)}%)</span>
          <span className="font-bold text-blue-900">Target: {fmt(recommended)} ({rPct.toFixed(0)}%)</span>
        </div>
      </div>
      <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
        <div className="absolute h-full rounded-full opacity-30 transition-all duration-700" style={{ width: `${rPct}%`, backgroundColor: color }} />
        <div className="absolute h-full rounded-full transition-all duration-700" style={{ width: `${cPct}%`, backgroundColor: over ? '#ef4444' : color }} />
      </div>
    </div>
  );
}

export default function BudgetPlanner() {
  const navigate = useNavigate();
  const [txs,      setTxs]      = useState([]);
  const [goals,    setGoals]    = useState([]);
  const [subs,     setSubs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [txFetched,setTxFetched]= useState(false);
  const [market,   setMarket]   = useState({ trend:'neutral', volatility:'moderate', ret3mo:null, niftyLast:null, investWeight:0.10, loaded:false, fetching:true });
  
  // Track dark theme state for dynamic chart styling
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [tr, gr, sr] = await Promise.all([
          getTransactions().catch(() => ({ success: false, data: [] })),
          getGoals().catch(() => ({ success: false, data: [] })),
          getSubscriptions().catch(() => ({ success: false, data: [] })),
        ]);
        if (tr.success) { setTxs(tr.data || []); setTxFetched(true); }
        else setTxFetched(true);
        if (gr.success) setGoals(gr.data || []);
        if (sr.success) setSubs(sr.data || []);
      } catch (e) { setTxFetched(true); if (e.message?.includes('401')) navigate('/'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  // Fetch live Nifty 50 market data independently
  useEffect(() => {
    fetchMarketSentiment().then(m => setMarket({ ...m, fetching: false }));
  }, []);

  const ml = useMemo(() => runMLEngine(txs, goals, market), [txs, goals, market]);

  const pieData = ml ? Object.entries(ml.catSpend).sort((a, b) => b[1] - a[1]).slice(0, 7)
    .map(([name, value]) => ({ name, value, pct: ((value / (ml.expense || 1)) * 100).toFixed(1) })) : [];

  const scoreColor = ml ? (ml.overallScore >= 70 ? '#16a34a' : ml.overallScore >= 45 ? '#b45309' : '#dc2626') : '#94a3b8';

  const mktConfig = {
    bull:    { label:'Bull Market 🐂', dot:'bg-green-500', tc:'text-green-800', tip:'Markets are rising. Higher investment allocation recommended.' },
    neutral: { label:'Neutral Market ⚖️', dot:'bg-blue-400', tc:'text-blue-800', tip:'Markets are stable. Balanced allocation recommended.' },
    bear:    { label:'Bear Market 🐻', dot:'bg-red-500', tc:'text-red-800', tip:'Markets are declining. Reduce investment, increase cash savings.' },
  };
  const mktC = mktConfig[market.trend] || mktConfig.neutral;
  const volConfig = { high:'⚡ High Volatility', moderate:'〜 Moderate Volatility', low:'✓ Low Volatility' };

  return (
    <div className="font-['Inter'] antialiased bg-[#f8f9ff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 min-h-screen">
      <WealthIntelSidebar active="Budget" />

      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black text-blue-900 dark:text-blue-400">AI Allocation Engine</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Based on your actual spending patterns, goals, and income — here's how you should allocate your money to live a balanced life.</p>
          </div>

          {loading ? (
            <div className="py-32 text-center text-slate-400"><span className="material-symbols-outlined text-5xl animate-spin block mb-4">sync</span>Running ML analysis…</div>
          ) : !ml && txFetched && txs.length === 0 ? (
            <div className="py-24 text-center bg-white dark:bg-[#131b2e] rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 block mb-4">upload_file</span>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">No transaction data found</p>
              <p className="text-sm text-slate-400 dark:text-slate-400 mb-6">Upload your bank statement so the ML engine can analyse your spending patterns.</p>
              <button onClick={() => navigate('/upload')} className="px-8 py-3 bg-blue-900 dark:bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-800">Upload Statement</button>
            </div>
          ) : (
            <>
              {ml.income === 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-5 flex items-start gap-3 shadow-sm">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-500">warning</span>
                  <div>
                    <p className="font-bold text-amber-800 dark:text-amber-400 text-sm">No Income Detected</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                      Your uploaded transactions only contain debits (expenses). To help you plan, we are using your total monthly spending of <strong>{fmt(ml.expense)}</strong> as a temporary income baseline. For accurate budgeting and goal-aligned savings plans, please upload a statement that includes credit (income/salary) transactions.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Live Market Context Banner ── */}
              <div className={`rounded-xl border p-5 ${market.trend === 'bull' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50' : market.trend === 'bear' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <span className={`w-3 h-3 rounded-full inline-block ${mktC.dot}`} />
                      <span className={`absolute inset-0 rounded-full animate-ping ${mktC.dot} opacity-60`} />
                    </div>
                    <div>
                      <p className={`font-black text-lg ${mktC.tc} dark:text-blue-300`}>{mktC.label}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{mktC.tip}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    {market.niftyLast && (
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nifty 50</p>
                        <p className={`font-black text-lg ${mktC.tc} dark:text-blue-300`}>{market.niftyLast.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {market.ret3mo && (
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">3-Month Return</p>
                        <p className={`font-black text-lg ${Number(market.ret3mo) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {Number(market.ret3mo) >= 0 ? '+' : ''}{market.ret3mo}%
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volatility</p>
                      <p className="font-black text-base dark:text-slate-300">{volConfig[market.volatility]}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Investment Weight</p>
                      <p className="font-black text-lg dark:text-slate-300">{(market.investWeight * 100).toFixed(0)}% of income</p>
                    </div>
                  </div>
                  {!market.loaded && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">info</span>
                      Live data unavailable — using neutral defaults
                    </div>
                  )}
                </div>
              </div>

              {/* Row 1: Score + Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Financial Balance Score</p>
                  <div className="relative w-36 h-36 mb-4">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" className="dark:stroke-slate-800" strokeWidth="12" />
                      <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="12"
                        strokeDasharray={`${2 * Math.PI * 52}`}
                        strokeDashoffset={`${2 * Math.PI * 52 * (1 - ml.overallScore / 100)}`}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-4xl font-black" style={{ color: scoreColor }}>{ml.overallScore}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1">{ml.overallScore >= 70 ? 'Excellent Balance' : ml.overallScore >= 45 ? 'Moderately Balanced' : 'Imbalanced Budget'}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-400">Based on your savings buffer and benchmarks alignment</p>
                </div>

                <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-[0px_4px_12px_rgba(15,76,129,0.05)] lg:col-span-2 flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Benchmark Alignment</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">How your actual spend distribution matches recommended splits.</p>
                  </div>
                  <div className="h-64 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={ml.radarData}>
                        <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: isDark ? '#94a3b8' : '#64748b' }} />
                        <Radar name="Actual %" dataKey="A" stroke={isDark ? '#3b82f6' : '#00355f'} fill={isDark ? '#3b82f6' : '#00355f'} fillOpacity={0.25} />
                        <Radar name="Benchmark %" dataKey="B" stroke={isDark ? '#a855f7' : '#7c3aed'} fill={isDark ? '#a855f7' : '#7c3aed'} fillOpacity={0.05} />
                        <Tooltip formatter={v => `${v}%`} contentStyle={isDark ? { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' } : {}} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 2: ML Insights Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {(() => {
                  const actualWants = Math.max(0, ml.wantsSpend - (ml.catSpend['Investment'] || 0));
                  const budgetCards = [
                    { title: 'ESSENTIALS (NEEDS)', current: ml.needsSpend, target: ml.safeIncome * 0.50, icon: 'bolt', bg: 'bg-blue-50 dark:bg-blue-950/20', tc: 'text-blue-700 dark:text-blue-400', barColor: '#3b82f6', type: 'expense', subText: '50% maximum limit' },
                    { title: 'LIFESTYLE (WANTS)', current: actualWants, target: ml.recWants, icon: 'shopping_bag', bg: 'bg-purple-50 dark:bg-purple-950/20', tc: 'text-purple-700 dark:text-purple-400', barColor: '#a855f7', type: 'expense', subText: '30% flexible spending' },
                    { title: 'SAVINGS TARGET', current: ml.currentSavings, target: ml.recSavings, icon: 'savings', bg: 'bg-green-50 dark:bg-green-950/20', tc: 'text-green-700 dark:text-green-400', barColor: '#22c55e', type: 'wealth', subText: '20% to reach goals' },
                    { title: 'INVESTMENT TARGET', current: ml.catSpend['Investment'] || 0, target: ml.recInvestment, icon: 'trending_up', bg: 'bg-indigo-50 dark:bg-indigo-950/20', tc: 'text-indigo-700 dark:text-indigo-400', barColor: '#6366f1', type: 'wealth', subText: `${(market.investWeight*100).toFixed(0)}% based on market` }
                  ];
                  return budgetCards.map(c => {
                    const isExpense = c.type === 'expense';
                    const currentVal = c.current;
                    const targetVal = c.target;
                    const pct = targetVal > 0 ? (currentVal / targetVal) * 100 : 0;
                    const cappedPct = Math.min(Math.max(pct, 0), 100);
                    const isBreached = isExpense && currentVal > targetVal;
                    const isAchieved = !isExpense && currentVal >= targetVal;
                    return (
                      <div key={c.title} className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-[0px_4px_12px_rgba(15,76,129,0.03)] flex flex-col justify-between h-full transition-all duration-300 hover:shadow-md">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{c.title}</span>
                            <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.tc} flex items-center justify-center`}><span className="material-symbols-outlined text-sm">{c.icon}</span></div>
                          </div>
                          <div className="space-y-1 mb-4">
                            <div className="flex justify-between items-baseline">
                              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{fmt(currentVal)}</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">/ {fmt(targetVal)}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-tight">{c.subText}</p>
                          </div>
                        </div>
                        <div className="space-y-2 mt-auto">
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cappedPct}%`, backgroundColor: isBreached ? '#ef4444' : isAchieved ? '#22c55e' : c.barColor }} />
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-semibold">
                            {isExpense ? (
                              isBreached ? (
                                <>
                                  <span className="text-red-650 dark:text-red-400 flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">error</span> Over Limit</span>
                                  <span className="text-red-500 font-bold">+{fmt(currentVal - targetVal)}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                                  <span className="text-slate-700 dark:text-slate-350">{fmt(targetVal - currentVal)}</span>
                                </>
                              )
                            ) : (
                              isAchieved ? (
                                <>
                                  <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">check_circle</span> Target Met</span>
                                  <span className="text-green-500 font-bold">{pct.toFixed(0)}%</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-amber-600 dark:text-amber-500 font-bold">Shortfall</span>
                                  <span className="text-slate-700 dark:text-slate-350">{fmt(targetVal - currentVal)}</span>
                                </>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Row 3: ML Actionable Alerts */}
              <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-[0px_4px_12px_rgba(15,76,129,0.05)]">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-blue-950 dark:text-blue-400">tips_and_updates</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI Rebalancing Suggestions</h3>
                </div>
                {ml.suggestions.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span> Perfect! Your current category distribution matches all benchmarks.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ml.suggestions.map(s => (
                      <div key={s.cat} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="material-symbols-outlined text-amber-600 dark:text-amber-500 text-sm">{CAT_ICONS[s.cat] || 'category'}</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.cat}</p>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Spending {fmt(s.actual)} vs {fmt(s.bench)} benchmark — {fmt(s.overBy)} over.
                        </p>
                        <p className="text-xs font-bold text-green-700 dark:text-green-400">
                          → Cut by 60% → Save {fmt(s.saving)}/mo
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 4: Goal Savings Plan */}
              {goals.length > 0 && (
                <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-[0px_4px_12px_rgba(15,76,129,0.05)]">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-blue-900 dark:text-blue-400">flag</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Goal-Aligned Savings Plan</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {goals.map((g, i) => {
                      const rem = Math.max((g.targetAmount || 0) - (g.currentAmount || 0), 0);
                      const months = g.deadline ? Math.max(Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30)), 1) : 12;
                      const monthly = rem / months;
                      const feasible = monthly <= ml.income * 0.30;
                      const color = COLORS[i % COLORS.length];
                      return (
                        <div key={g.id} className="rounded-xl border p-5" style={{ borderColor: color + '40', backgroundColor: color + '08' }}>
                          <p className="font-bold text-slate-900 dark:text-slate-100 mb-3">{g.title || g.name}</p>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Remaining</span><span className="font-bold">{fmt(rem)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Need/month</span><span className="font-bold" style={{ color }}>{fmt(monthly)}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 5: Subscriptions */}
              {subs.length > 0 && (
                <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-[0px_4px_12px_rgba(15,76,129,0.05)]">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">sync_alt</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recurring Subscriptions</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subs.map((s, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.name}</p>
                        </div>
                        <p className="text-lg font-black text-blue-900 dark:text-blue-400">{fmt(s.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
