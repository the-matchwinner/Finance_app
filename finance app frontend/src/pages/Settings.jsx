import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
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

  return (
<>
  <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-[4px_0_12px_rgba(15,76,129,0.02)] flex flex-col z-50">
    <div className="px-6 py-8">
      <h1 className="text-2xl font-black text-blue-900 dark:text-blue-400 tracking-tight">IntelliVest</h1>
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">invest with intelligence</p>
    </div>
    <nav className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-1">
        <Link className="text-slate-500 dark:text-slate-400 flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all" to="/dashboard">
          <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
          <span className="font-body-md">Dashboard</span>
        </Link>
        <Link className="bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-400 border-r-4 border-blue-900 dark:border-blue-500 font-semibold flex items-center gap-3 px-6 py-3 transition-all" to="/settings">
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
          <span className="font-body-md">Settings</span>
        </Link>
      </div>
    </nav>
    <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto space-y-1">
      <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
        <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
        <span className="text-sm">{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
      </button>
    </div>
  </aside>

  <main className="ml-64 min-h-screen bg-slate-50/30 dark:bg-[#0b0f19] p-8 pt-8 text-slate-900 dark:text-slate-100">
    <div className="max-w-2xl mx-auto bg-white dark:bg-[#131b2e] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
      <h1 className="font-h1 text-blue-900 dark:text-blue-400 mb-6">Settings</h1>
      <button 
        onClick={() => { localStorage.removeItem('token'); navigate('/'); }}
        className="bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-6 py-2 rounded-xl font-semibold hover:bg-rose-200 dark:hover:bg-rose-900/30 transition-colors"
      >
        Logout
      </button>
    </div>
  </main>
</>
  );
}
