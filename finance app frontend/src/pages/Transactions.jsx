import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTransactions, updateTransaction } from '../api';
import { WealthIntelSidebar } from './Dashboard';

// ── helpers ──────────────────────────────────────────────────────────────────
const isCredit = t => (t.amount || 0) >= 0;
const absAmt   = t => Math.abs(t.amount || 0);
const fmtAmt   = n => `₹${Math.abs(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// Decide icon based on title content
function receiverInfo(tx) {
  const title = tx.title || '';
  if (title.includes('@')) return { label: title, sub: 'UPI ID', icon: 'qr_code_scanner' };
  if (/^\d{9,18}$/.test(title.replace(/\s/g, ''))) return { label: title, sub: 'Account No.', icon: 'account_balance' };
  return { label: title || '—', sub: 'Payee', icon: 'payments' };
}

// ── Detail Popup ──────────────────────────────────────────────────────────────
function TxModal({ tx, onClose, onSave }) {
  const [note, setNote] = useState(tx.note || '');
  const [saving, setSaving] = useState(false);
  const credit = isCredit(tx);
  const { label: receiver, sub: receiverType } = receiverInfo(tx);

  const save = async () => {
    setSaving(true);
    await onSave(tx.id, note);
    setSaving(false);
  };

  const rows = [
    ['Transaction ID', tx.id ? `#${tx.id}` : '—'],
    ['Date', tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
    ['Type', credit ? '↑ Credit (Received)' : '↓ Debit (Sent)'],
    ['Amount', (credit ? '+' : '-') + fmtAmt(tx.amount)],
    [receiverType, receiver],
    ['Category', tx.category || '—'],
    ['Description / Note (Saved)', tx.note || 'None'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`p-6 rounded-t-2xl ${credit ? 'bg-green-50 dark:bg-green-950/30 border-b border-green-100 dark:border-green-900/50' : 'bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${credit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{credit ? '↑ CREDIT' : '↓ DEBIT'}</p>
              <p className={`text-3xl font-black ${credit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{credit ? '+' : '-'}{fmtAmt(tx.amount)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 break-all">{receiver}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 ml-4 shrink-0">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-1">
          {rows.map(([label, val]) => (
            <div key={label} className="flex justify-between items-start py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
              <span className="text-slate-500 dark:text-slate-400 text-sm font-medium shrink-0 w-36">{label}</span>
              <span className={`text-sm font-semibold text-right break-all ml-2 ${label === 'Amount' ? (credit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-slate-900 dark:text-slate-100'}`}>{val}</span>
            </div>
          ))}
          <div className="pt-4">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Add / Edit Description</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a personal note for this transaction…"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 text-slate-900 dark:text-slate-100 resize-none" />
            <button onClick={save} disabled={saving}
              className="mt-2 w-full py-2.5 bg-blue-900 dark:bg-blue-700 text-white font-bold rounded-xl text-sm hover:bg-blue-800 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">save</span>}
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Transactions Page ─────────────────────────────────────────────────────────
export default function Transactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dash, setDash]       = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [txs, setTxs]         = useState([]);
  const [loading, setLoading]  = useState(true);
  const [search, setSearch]    = useState('');
  const [selCat, setSelCat]    = useState('All Categories');
  const [selected, setSelected]= useState(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('search');
    if (p) setSearch(p);
  }, [location]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getTransactions();
        if (res.success) setTxs(res.data || []);
      } catch (e) { if (e.message?.includes('401')) navigate('/'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  const saveNote = async (id, note) => {
    try {
      await updateTransaction(id, note);
      setTxs(prev => prev.map(t => t.id === id ? { ...t, note } : t));
      setSelected(prev => prev ? { ...prev, note } : null);
    } catch (e) { console.error(e); }
  };

  const cats = ['All Categories', ...new Set(txs.map(t => t.category).filter(Boolean))];

  const filtered = txs.filter(t => {
    const q = search.toLowerCase();
    const ok = !q || (t.title || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q);
    return ok && (selCat === 'All Categories' || t.category === selCat);
  });

  const totalInc = txs.filter(isCredit).reduce((a, t) => a + t.amount, 0);
  const totalExp = txs.filter(t => !isCredit(t)).reduce((a, t) => a + Math.abs(t.amount), 0);

  return (
    <div className="font-['Inter'] antialiased bg-[#f8f9ff] dark:bg-[#0b0f19] min-h-screen text-slate-900 dark:text-slate-100">
      <WealthIntelSidebar active="Transactions" />
      {selected && <TxModal tx={selected} onClose={() => setSelected(null)} onSave={saveNote} />}

      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-10">
          {/* Header stats */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="text-4xl font-black text-blue-900 dark:text-blue-400">Transactions</h2>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Real-time oversight of your financial velocity.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm min-w-[140px]">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">TOTAL DEBIT</p>
                <p className="text-xl font-black text-red-600 dark:text-red-400">{fmtAmt(totalExp)}</p>
              </div>
              <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm min-w-[140px]">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">TOTAL CREDIT</p>
                <p className="text-xl font-black text-green-700 dark:text-green-400">{fmtAmt(totalInc)}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-sm flex flex-wrap items-center gap-4">
            <div className="relative w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-850"
                placeholder="Search by UPI ID, category, note…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg gap-2 border border-slate-200 dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-lg">category</span>
              <select value={selCat} onChange={e => setSelCat(e.target.value)}
                className="text-sm text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none appearance-none cursor-pointer pr-6 dark:bg-slate-900">
                {cats.map(c => <option key={c} className="dark:bg-slate-900">{c}</option>)}
              </select>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg absolute right-2 pointer-events-none">expand_more</span>
            </div>
            <div className="flex-1"></div>
            <button className="bg-blue-900 dark:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-sm hover:opacity-90 uppercase">EXPORT CSV</button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0px_4px_12px_rgba(15,76,129,0.05)] dark:shadow-none overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-slate-400"><span className="material-symbols-outlined text-4xl animate-spin block mb-4">sync</span><p>Loading…</p></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    {['DATE', 'RECEIVER UPI / PAYEE', 'DESCRIPTION / NOTE', 'CATEGORY', 'AMOUNT'].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                      {search ? `No results for "${search}"` : 'No transactions yet — upload a bank statement to get started.'}
                    </td></tr>
                  ) : filtered.map((tx, i) => {
                    const credit = isCredit(tx);
                    const { label, sub, icon } = receiverInfo(tx);
                    return (
                      <tr key={tx.id || i} onClick={() => setSelected(tx)}
                        className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors cursor-pointer group">
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-700 dark:text-slate-350 whitespace-nowrap">
                            {tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${credit ? 'bg-green-50 dark:bg-green-950/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              <span className={`material-symbols-outlined text-base ${credit ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>{icon}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-400 truncate max-w-[220px]" title={label}>{label}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{sub}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {tx.note
                            ? <p className="text-sm text-slate-700 dark:text-slate-350 max-w-[180px] truncate">{tx.note}</p>
                            : <span className="text-xs text-slate-300 dark:text-slate-650 italic group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors">Click to add note…</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              credit ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-450'
                              : tx.category === 'Personal Account' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                              : tx.category === 'Business Account' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>{tx.category || (credit ? 'Income' : 'Expense')}</span>
                            {tx.aiCategorized && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50 text-[10px] font-bold" title="AI Categorized">
                                <span className="material-symbols-outlined !text-[12px]" style={{ fontVariationSettings: '"FILL" 1' }}>auto_awesome</span>
                                AI
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold text-sm whitespace-nowrap ${credit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {credit ? '+' : '-'}{fmtAmt(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">Showing {filtered.length} of {txs.length} transactions</p>
              <div className="flex gap-2">
                <button disabled className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-400 dark:text-slate-600 disabled:opacity-40">
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850">
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
