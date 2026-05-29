import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadCSV, clearTransactions, getConnectedBanks, connectBank, disconnectBank, createSetuConsent, syncSetuData, scanReceiptOcr, addTransaction } from '../api';
import { WealthIntelSidebar } from './Dashboard';

const AVAILABLE_BANKS = [
  { id: 'sbi', name: 'SBI Savings Account', icon: 'account_balance', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', label: 'STATE BANK OF INDIA' },
  { id: 'hdfc', name: 'HDFC Regular Savings', icon: 'account_balance', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-800 dark:text-indigo-400', label: 'HDFC BANK' },
  { id: 'icici', name: 'ICICI Privilege Account', icon: 'account_balance', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400', label: 'ICICI BANK' },
  { id: 'citibank', name: 'Citi Suvidha Account', icon: 'credit_card', bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-400', label: 'CITIBANK' },
  { id: 'axis', name: 'Axis Easy Access Account', icon: 'account_balance', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-400', label: 'AXIS BANK' }
];

const AVAILABLE_UPI = [
  { id: 'gpay', name: 'Google Pay UPI Link', icon: 'payments', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'GOOGLE PAY' },
  { id: 'paytm', name: 'Paytm Wallet / UPI', icon: 'account_balance_wallet', bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-700 dark:text-cyan-400', label: 'PAYTM' },
  { id: 'phonepe', name: 'PhonePe UPI Link', icon: 'wallet', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700 dark:text-indigo-400', label: 'PHONEPE' },
  { id: 'bhim', name: 'BHIM UPI App', icon: 'payments', bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-700 dark:text-teal-400', label: 'BHIM UPI' }
];

export default function UploadConnectBank() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  // Bank Integration State
  const [connectedBanks, setConnectedBanks] = useState([]);
  const [activeTab, setActiveTab] = useState('banks'); // 'banks' or 'upi'
  const [showPlaid, setShowPlaid] = useState(false);
  const [plaidStep, setPlaidStep] = useState(1); // 1: Select Inst, 2: Credentials, 3: MFA, 4: Loading, 5: Success
  const [selectedInstId, setSelectedInstId] = useState(null);
  const [isUpiMode, setIsUpiMode] = useState(false);

  // AI Receipt OCR Scanner State
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrSaving, setOcrSaving] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [plaidError, setPlaidError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadConnectedBanks();
    handleSetuCallback();
  }, []);

  const loadConnectedBanks = async () => {
    try {
      const res = await getConnectedBanks();
      if (res.success) {
        setConnectedBanks(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load connected banks', err);
    }
  };

  // Handles callback query params on redirection back from Setu
  const handleSetuCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const consentId = params.get('consent_id');
    
    if (consentId) {
      // Clear URL params so reload doesn't trigger sync again
      window.history.replaceState({}, document.title, window.location.pathname);
      
      setSelectedInstId('hdfc'); // Placeholder icon for multi-bank sync
      setIsUpiMode(false);
      setShowPlaid(true);
      setPlaidStep(4); // loading sync
      
      try {
        const res = await syncSetuData(consentId);
        if (res.success) {
          setTimeout(() => {
            setPlaidStep(5); // success checkmark
            loadConnectedBanks();
          }, 2000);
        } else {
          setError(res.message || 'Setu Account Aggregator sync failed.');
          setShowPlaid(false);
        }
      } catch (err) {
        setError(err.message || 'Setu sync failed.');
        setShowPlaid(false);
      }
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(null); setProgress(0); }
    e.target.value = '';           // reset so same file can be re-selected
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setError(null); setProgress(0); }
  };

  const handleClearFile = () => {
    setFile(null);
    setError(null);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(null); setProgress(20);
    try {
      const timer = setInterval(() => setProgress(p => Math.min(p + 8, 85)), 600);
      const res = await uploadCSV(file);
      clearInterval(timer);
      setProgress(100);
      if (res.success) {
        setTimeout(() => navigate('/dashboard'), 700);
      } else {
        setError(res.message || 'Upload failed');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
      setLoading(false); setProgress(0);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('This will remove ALL uploaded transactions. Are you sure?')) return;
    setClearing(true);
    try {
      await clearTransactions();
      setCleared(true);
      setFile(null);
      setTimeout(() => setCleared(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  // Integration Flow Handlers
  const handleConnectSetu = async () => {
    setError(null);
    try {
      const res = await createSetuConsent();
      if (res.success && res.data) {
        const { url } = res.data;
        // Redirect to Setu Consent Page (Real Sandbox or Simulated Sandbox redirection link)
        window.location.href = url;
      } else {
        setError(res.message || 'Failed to initiate Setu Account Aggregator.');
      }
    } catch (err) {
      setError(err.message || 'Failed to link via Setu.');
    }
  };

  const openLinkModal = (instId = null, isUpi = false) => {
    if (!isUpi) {
      // For NetBanking Bank Accounts: Directly use the Setu Account Aggregator redirect flow
      handleConnectSetu();
      return;
    }

    // For UPI Apps: Use interactive local sandbox simulator since UPI apps are linked via mobile/VPA locally
    setSelectedInstId(instId);
    setIsUpiMode(true);
    setPlaidStep(instId ? 2 : 1);
    setUsername('');
    setPassword('');
    setUpiId('');
    setPhoneNumber('');
    setMfaCode('');
    setPlaidError(null);
    setShowPlaid(true);
  };

  const selectInstitution = (instId, isUpi) => {
    setSelectedInstId(instId);
    setIsUpiMode(isUpi);
    setPlaidStep(2);
  };

  const submitCredentials = (e) => {
    e.preventDefault();
    if (isUpiMode) {
      if (!upiId.trim() && !phoneNumber.trim()) {
        setPlaidError('Please fill in either UPI ID or Phone Number.');
        return;
      }
    } else {
      if (!username.trim() || !password.trim()) {
        setPlaidError('Please enter NetBanking credentials.');
        return;
      }
    }
    setPlaidError(null);
    setPlaidStep(3);
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    if (!mfaCode.trim() || mfaCode.trim().length !== 6) {
      setPlaidError('Please enter a valid 6-digit OTP code.');
      return;
    }
    setPlaidError(null);
    setPlaidStep(4);
    setIsSyncing(true);

    try {
      const res = await connectBank(selectedInstId);
      if (res.success) {
        setTimeout(() => {
          setPlaidStep(5);
          setIsSyncing(false);
          loadConnectedBanks();
        }, 2000);
      } else {
        setPlaidError(res.message || 'Connection failed.');
        setPlaidStep(2);
        setIsSyncing(false);
      }
    } catch (err) {
      setPlaidError(err.message || 'Connection failed.');
      setPlaidStep(2);
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnecting this institution will remove all mock transactions imported from it. Continue?')) return;
    try {
      const res = await disconnectBank(id);
      if (res.success) {
        loadConnectedBanks();
      } else {
        setError(res.message || 'Failed to disconnect.');
      }
    } catch (err) {
      setError(err.message || 'Failed to disconnect.');
    }
  };

  // OCR Helpers
  const handleOcrFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setOcrFile(f);
      setOcrError(null);
      setOcrResult(null);
    }
  };

  const handleOcrUpload = async () => {
    if (!ocrFile) return;
    setOcrLoading(true);
    setOcrError(null);
    try {
      const res = await scanReceiptOcr(ocrFile);
      if (res.success && res.data) {
        setOcrResult(res.data);
      } else {
        setOcrError(res.message || 'OCR parsing failed.');
      }
    } catch (err) {
      setOcrError(err.message || 'OCR parsing failed.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcrConfirm = async () => {
    if (!ocrResult) return;
    setOcrSaving(true);
    setOcrError(null);
    try {
      const res = await addTransaction({
        title: ocrResult.title,
        amount: -Math.abs(ocrResult.amount), // Receipts are expenses
        date: ocrResult.date || new Date().toISOString().split('T')[0],
        category: ocrResult.category || 'Expense'
      });
      if (res.success) {
        setOcrSuccess(true);
        setOcrResult(null);
        setOcrFile(null);
        setTimeout(() => setOcrSuccess(false), 3000);
      } else {
        setOcrError(res.message || 'Failed to save transaction.');
      }
    } catch (err) {
      setOcrError(err.message || 'Failed to save transaction.');
    } finally {
      setOcrSaving(false);
    }
  };

  const handleOcrFieldChange = (key, val) => {
    setOcrResult(prev => ({ ...prev, [key]: val }));
  };

  const [ocrError, setOcrError] = useState(null);

  const ACCEPT = '.csv,.pdf,.html,.htm';
  const fileIcon = file?.name.endsWith('.pdf') ? 'picture_as_pdf'
    : file?.name.endsWith('.csv') ? 'table_chart'
    : file?.name.endsWith('.html') || file?.name.endsWith('.htm') ? 'code'
    : 'insert_drive_file';

  const selectedInstInfo = isUpiMode
    ? AVAILABLE_UPI.find(u => u.id === selectedInstId)
    : AVAILABLE_BANKS.find(b => b.id === selectedInstId);

  return (
    <div className="font-['Inter'] antialiased bg-[#f8f9ff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 min-h-screen">
      <WealthIntelSidebar active="Upload" />

      <main className="ml-64 p-5 lg:h-[calc(100vh-10px)] flex flex-col justify-start lg:justify-between overflow-y-auto lg:overflow-hidden max-w-screen-xl mx-auto">
        <div className="mb-3 shrink-0">
          <h1 className="text-3xl font-black text-blue-900 dark:text-blue-400 font-manrope">Financial Data Input</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Choose your preferred method to sync your wealth data with IntelliVest.</p>
        </div>

        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <span className="material-symbols-outlined text-red-500 text-sm">error</span>{error}
          </div>
        )}
        {ocrError && (
          <div className="mb-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <span className="material-symbols-outlined text-red-500 text-sm">error</span>{ocrError}
          </div>
        )}
        {cleared && (
          <div className="mb-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <span className="material-symbols-outlined text-sm">check_circle</span>All transaction data cleared successfully.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 items-stretch">
          {/* ── Left Column: Upload slot & OCR Scanner ── */}
          <section className="lg:col-span-6 flex flex-col gap-4 h-full min-h-0">
            
            {/* statement upload */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-blue-900 dark:text-blue-400">Upload Bank Statement</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Manual import for PDF, CSV, or HTML statements.</p>
                </div>
                <span className="material-symbols-outlined text-blue-300 dark:text-blue-600 text-2xl">upload_file</span>
              </div>

              {/* Sleek drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="relative flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-4 px-3 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-900/20 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/5 dark:hover:bg-blue-950/5 transition-colors cursor-pointer group min-h-[110px]">
                <input type="file" accept={ACCEPT} onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-blue-900 dark:text-blue-450 text-xl">cloud_upload</span>
                </div>
                <p className="text-xs font-bold text-slate-850 dark:text-slate-200 text-center">Drag and drop statement here</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center">PDF, CSV, HTML up to 10 MB</p>
              </div>

              {/* Uploaded file info box */}
              {file && !loading && (
                <div className="mt-2 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg px-3 py-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-900 dark:text-blue-450 text-base">{fileIcon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-blue-900 dark:text-blue-400 truncate max-w-[160px]">{file.name}</p>
                      <p className="text-[8px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={handleClearFile}
                    className="text-[9px] font-bold text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-1.5 py-1 rounded">
                    Remove
                  </button>
                </div>
              )}

              {/* Progress bar */}
              {loading && (
                <div className="mt-2 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-blue-900 dark:text-blue-400 truncate max-w-[150px]">{file?.name}</span>
                    <span className="text-[10px] text-slate-500">{progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-900 dark:bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Upload button */}
              {file && !loading && (
                <button onClick={handleUpload}
                  className="mt-2 w-full py-2 bg-blue-900 dark:bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 dark:hover:bg-blue-600 transition-all shadow-sm flex items-center justify-center gap-1 text-xs active:scale-[0.98] shrink-0">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Start AI Analysis
                </button>
              )}
            </div>

            {/* AI Receipt OCR Scanner */}
            <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-blue-900 dark:text-blue-400">AI Receipt OCR Scanner</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Upload a receipt or invoice to parse details instantly.</p>
                </div>
                <span className="material-symbols-outlined text-blue-300 dark:text-blue-600 text-2xl">receipt_long</span>
              </div>

              {!ocrResult ? (
                <div className="flex-1 flex flex-col justify-center min-h-0">
                  <div className="relative flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-4 px-3 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-900/20 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/5 dark:hover:bg-blue-950/5 transition-colors cursor-pointer group min-h-[110px]">
                    <input type="file" accept="image/*,.pdf" onChange={handleOcrFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-blue-900 dark:text-blue-450 text-xl">camera_alt</span>
                    </div>
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-200 text-center">Upload Receipt Image / PDF</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center">Supports PNG, JPG, PDF</p>
                  </div>

                  {ocrFile && (
                    <div className="mt-2 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg px-3 py-1.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-900 dark:text-blue-450 text-base">image</span>
                        <span className="text-[10px] font-bold text-blue-900 dark:text-blue-400 truncate max-w-[160px]">{ocrFile.name}</span>
                      </div>
                      <button onClick={() => setOcrFile(null)} className="text-[9px] font-bold text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-1.5 py-1 rounded">Remove</button>
                    </div>
                  )}

                  {ocrFile && !ocrLoading && (
                    <button onClick={handleOcrUpload} className="mt-2 w-full py-2 bg-blue-900 dark:bg-blue-700 text-white font-bold rounded-lg text-xs hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors shadow-sm shrink-0">
                      Scan Receipt with AI
                    </button>
                  )}

                  {ocrLoading && (
                    <div className="mt-2 text-center py-4 text-slate-400 dark:text-slate-500 text-xs flex items-center justify-center gap-2 shrink-0">
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      <span>Parsing receipt layout...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between min-h-0 space-y-2">
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs flex-1 overflow-y-auto">
                    <p className="text-[10px] font-bold text-blue-900 dark:text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">auto_awesome</span> Verify OCR Scan Results
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">Merchant</label>
                        <input type="text" value={ocrResult.title} onChange={e => handleOcrFieldChange('title', e.target.value)}
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-800" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">Amount (₹)</label>
                        <input type="number" value={ocrResult.amount} onChange={e => handleOcrFieldChange('amount', Number(e.target.value))}
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-800" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">Date</label>
                        <input type="date" value={ocrResult.date} onChange={e => handleOcrFieldChange('date', e.target.value)}
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-800" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">Category</label>
                        <input type="text" value={ocrResult.category} onChange={e => handleOcrFieldChange('category', e.target.value)}
                          className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-800" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setOcrResult(null)} className="flex-1 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">Discard</button>
                    <button onClick={handleOcrConfirm} disabled={ocrSaving} className="flex-1 py-1.5 bg-green-700 dark:bg-green-600 hover:bg-green-800 dark:hover:bg-green-550 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors">
                      {ocrSaving ? <span className="material-symbols-outlined animate-spin text-[10px]">sync</span> : <span className="material-symbols-outlined text-[10px]">check</span>}
                      Confirm & Add
                    </button>
                  </div>
                </div>
              )}

              {ocrSuccess && (
                <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1 text-center animate-pulse flex items-center justify-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-xs">check_circle</span> Transaction saved to ledger successfully!
                </p>
              )}
            </div>

            {/* Clear All banner */}
            <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/50 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-750 shrink-0">
                  <span className="material-symbols-outlined text-base">delete_sweep</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-800 dark:text-red-400">Clear All Transaction Data</h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-450">Remove all statements to start fresh.</p>
                </div>
              </div>
              <button onClick={handleClearData} disabled={clearing}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shrink-0">
                {clearing ? <span className="material-symbols-outlined animate-spin text-xs">sync</span> : <span className="material-symbols-outlined text-xs">delete</span>}
                {clearing ? 'Clearing…' : 'Clear Data'}
              </button>
            </div>
          </section>

          {/* ── Right Column: Linked Bank Accounts & UPI apps (Tabbed) ── */}
          <section className="lg:col-span-6 h-full min-h-0">
            <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm h-full flex flex-col justify-between min-h-0">
              
              <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div>
                    <h2 className="text-base font-bold text-blue-900 dark:text-blue-400">Synchronize Accounts</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Connect secure bank statements or UPI apps.</p>
                  </div>
                  <span className="material-symbols-outlined text-green-600 dark:text-green-500 text-2xl">account_balance</span>
                </div>

                {/* Tab selectors */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 mb-3 bg-slate-50/50 dark:bg-slate-900/50 p-1 rounded-lg shrink-0">
                  <button 
                    onClick={() => setActiveTab('banks')}
                    className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'banks' 
                        ? 'bg-white dark:bg-[#1e293b] text-blue-900 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">account_balance</span>
                    Bank Accounts
                  </button>
                  <button 
                    onClick={() => setActiveTab('upi')}
                    className={`flex-1 py-1.5 text-center text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'upi' 
                        ? 'bg-white dark:bg-[#1e293b] text-emerald-800 dark:text-emerald-450 shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    UPI & Wallets
                  </button>
                </div>

                {/* Tab Items List (Scrollable) */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 py-1 space-y-2">
                  {(activeTab === 'banks' ? AVAILABLE_BANKS : AVAILABLE_UPI).map((b) => {
                    const dbConn = connectedBanks.find(cb => cb.bankName.toLowerCase() === b.id);
                    const isConnected = !!dbConn;

                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between p-2.5 border rounded-lg transition-all ${
                          isConnected ? 'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7.5 h-7.5 rounded ${b.bg} ${b.text} flex items-center justify-center border border-slate-200/30 p-1.5`}>
                            <span className="material-symbols-outlined text-sm">{b.icon}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{b.name}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">
                              {isConnected ? `Linked (${dbConn.accountNumber})` : 'Not linked'}
                            </p>
                          </div>
                        </div>

                        {isConnected ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 px-2 py-0.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-full text-[8px] font-bold">
                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                              Linked
                            </div>
                            <button
                              onClick={() => handleDisconnect(dbConn.id)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center"
                              title="Disconnect Integration"
                            >
                              <span className="material-symbols-outlined text-[10px] font-bold">logout</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openLinkModal(b.id, activeTab === 'upi')}
                            className={`text-xs font-bold hover:underline ${
                              activeTab === 'upi' ? 'text-emerald-800 dark:text-emerald-450 hover:text-emerald-600' : 'text-blue-900 dark:text-blue-400 hover:text-blue-700'
                            }`}
                          >
                            Link
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action button */}
              <div className="shrink-0 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                {activeTab === 'banks' ? (
                  <button
                    onClick={handleConnectSetu}
                    className="w-full py-2 bg-blue-900 dark:bg-blue-700 hover:bg-blue-800 dark:hover:bg-blue-600 text-white font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1 text-xs active:scale-[0.98] mb-2"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                    Connect Indian Banks via Setu AA
                  </button>
                ) : (
                  <button
                    onClick={() => openLinkModal(null, true)}
                    className="w-full py-2 bg-emerald-800 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1 text-xs active:scale-[0.98] mb-2"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Link UPI Platform (Demo Simulation)
                  </button>
                )}

                {/* Compliance footer logos */}
                <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-center">
                  {[
                    ['lock', '256-BIT'],
                    ['verified_user', 'SOC2 CO.'],
                    ['shield', 'NPCI APP'],
                    ['privacy_tip', 'READ-ONLY']
                  ].map(([icon, label]) => (
                    <div key={label} className="flex flex-col items-center justify-center opacity-80">
                      <span className="material-symbols-outlined text-xs mb-0.5">{icon}</span>
                      <span className="text-[7px] font-bold tracking-wider font-mono">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>
        </div>
      </main>

      {/* ── Simulated NetBanking / UPI Modal Overlay ── */}
      {showPlaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col min-h-[480px]">
            
            {/* Header */}
            <div className="bg-[#f3f4f6] dark:bg-[#1a2333] px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 font-bold text-[20px]">shield</span>
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 tracking-wider font-mono">
                  {isUpiMode ? 'UPI SECURE LINK' : 'NETBANKING SYNC'}
                </span>
                <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">SANDBOX</span>
              </div>
              {plaidStep !== 4 && (
                <button
                  onClick={() => setShowPlaid(false)}
                  className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-colors p-1"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Error Message */}
            {plaidError && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-6 py-3 border-b border-red-100 dark:border-red-900/50 text-xs flex items-center gap-2 font-medium">
                <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                {plaidError}
              </div>
            )}

            {/* Step Content */}
            <div className="p-8 flex-1 flex flex-col justify-between">
              
              {/* Step 1: Selection */}
              {plaidStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {isUpiMode ? 'Select UPI Platform' : 'Select Bank'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isUpiMode ? 'Link UPI wallet for instant sync' : 'Connect secure Indian NetBanking'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(isUpiMode ? AVAILABLE_UPI : AVAILABLE_BANKS).map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => selectInstitution(inst.id, isUpiMode)}
                        className="flex flex-col items-center justify-center p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all text-center group active:scale-[0.97]"
                      >
                        <div className={`w-12 h-12 rounded-full ${inst.bg} ${inst.text} flex items-center justify-center border border-slate-200/50 dark:border-slate-800 mb-3 shadow-sm group-hover:scale-105 transition-transform`}>
                          <span className="material-symbols-outlined text-[24px]">{inst.icon}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{inst.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Credentials Form */}
              {plaidStep === 2 && selectedInstInfo && (
                <form onSubmit={submitCredentials} className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-3 justify-center mb-2">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">shield</span>
                        <span className="text-slate-300 dark:text-slate-700 text-xl font-light">|</span>
                        <div className={`w-10 h-10 rounded-full ${selectedInstInfo.bg} ${selectedInstInfo.text} flex items-center justify-center border border-slate-200/50 dark:border-slate-800`}>
                          <span className="material-symbols-outlined text-xl">{selectedInstInfo.icon}</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {isUpiMode ? `Link ${selectedInstInfo.name}` : `Login to ${selectedInstInfo.name}`}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isUpiMode ? 'Authorize quick UPI link access' : 'Enter NetBanking online credentials'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      {isUpiMode ? (
                        <>
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-xs flex flex-col gap-1">
                            <span className="font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">info</span> Sandbox Simulator Note
                            </span>
                            <span>This is a simulated secure link request. Enter any dummy VPA or Phone Number to test.</span>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Virtual Payment Address (VPA)</label>
                            <input
                              type="text"
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                              placeholder="e.g. mobile@upi or name@okaxis"
                            />
                          </div>
                          <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium">OR</div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Mobile Number (Linked to UPI)</label>
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                              placeholder="e.g. 9876543210"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Customer / User ID</label>
                            <input
                              type="text"
                              required
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                              placeholder="NetBanking ID"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Password / IPIN</label>
                            <input
                              type="password"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                              placeholder="••••••••"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setPlaidStep(1)}
                      className="w-1/2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className={`w-1/2 py-3 font-bold rounded-lg transition-colors text-sm shadow-md text-white ${
                        isUpiMode ? 'bg-emerald-800 hover:bg-emerald-700' : 'bg-blue-900 hover:bg-blue-800'
                      }`}
                    >
                      Continue
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: MFA / Verification OTP */}
              {plaidStep === 3 && selectedInstInfo && (
                <form onSubmit={submitMfa} className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-4xl block mb-2">sms</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enter OTP Verification</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isUpiMode 
                          ? `A verification OTP has been sent to the mobile number registered with ${selectedInstInfo.name}.`
                          : `Please enter the 6-digit High Security Password (OTP) sent to your mobile registered with ${selectedInstInfo.name}.`
                        }
                      </p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-xs flex flex-col gap-1">
                        <span className="font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm font-semibold">sms</span> Simulated Sandbox Device
                        </span>
                        <span>Since this is a demo running locally, SMS is disabled. Enter <strong>any 6-digit OTP</strong> (e.g. <code>123456</code>) to proceed.</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 text-center font-mono">Enter 6-Digit OTP</label>
                        <input
                          type="text"
                          maxLength="6"
                          pattern="\d{6}"
                          required
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          className="w-full max-w-[200px] mx-auto block text-center px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xl font-bold tracking-[0.25em] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100"
                          placeholder="000000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setPlaidStep(2)}
                      className="w-1/2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className={`w-1/2 py-3 font-bold rounded-lg transition-colors text-sm shadow-md text-white ${
                        isUpiMode ? 'bg-emerald-800 hover:bg-emerald-700' : 'bg-blue-900 hover:bg-blue-800'
                      }`}
                    >
                      Verify & Link
                    </button>
                  </div>
                </form>
              )}

              {/* Step 4: Loading Sync */}
              {plaidStep === 4 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-6 flex-1">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="w-full h-full border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-blue-900 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <span className="material-symbols-outlined text-blue-900 dark:text-blue-400 text-3xl animate-pulse">sync</span>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Synchronizing transactions...</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px]">
                      Establishing secure NPCI link, mapping UPI QR codes, and indexing transaction history...
                    </p>
                  </div>
                </div>
              )}

              {/* Step 5: Success Checkmark */}
              {plaidStep === 5 && selectedInstInfo && (
                <div className="flex flex-col items-center justify-center py-10 space-y-6 flex-1">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-950 text-green-605 dark:text-green-400 rounded-full flex items-center justify-center shadow-inner animate-bounce">
                    <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Institution Connected!</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px]">
                      Your {selectedInstInfo.name} has been securely linked and instant transaction sync is active.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPlaid(false);
                      navigate('/dashboard');
                    }}
                    className="w-full max-w-[180px] py-3 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 transition-colors text-sm shadow-md mt-4"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
