import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KtpForm } from './components/KtpForm';
import { KtpDetailModal } from './components/KtpDetailModal';
import { FactualAreaSelector } from './components/FactualAreaSelector';
import { LoginPage } from './components/LoginPage';
import { GoogleAppsScriptModal } from './components/GoogleAppsScriptModal';
import { HistoryFilter } from './components/HistoryFilter';
import { HistoryStats } from './components/HistoryStats';
import { extractKtpData } from './services/geminiService';
import { 
  calculateAge, 
  calculateDemography, 
  normalizeDusun, 
  normalizeRt, 
  StatCardFilter, 
  getStatCardFilterLabel, 
  matchesStatCardFilter 
} from './services/demographyUtils';
import { AppState, KtpData, ViewMode } from './types';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbweGLxvJScRXXfbKAqGDsmp8kXuLR-7aRm6lpq4bXBkQtXiA0uBgPh7k-NXqrmT4fZ5/exec';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pt_ktp_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [gasUrl, setGasUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('pt_gas_url') || GAS_URL;
    } catch {
      return GAS_URL;
    }
  });

  const [showGasModal, setShowGasModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const [state, setState] = useState<AppState>({
    image: null,
    extractedData: null,
    status: 'idle',
    errorMessage: null,
    viewMode: 'scanner',
    history: []
  });

  const [dusunFaktual, setDusunFaktual] = useState<string>(() => {
    const saved = localStorage.getItem('pt_dusun_faktual');
    const validDusun = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'];
    return saved && validDusun.includes(saved) ? saved : '001';
  });
  const [rtFaktual, setRtFaktual] = useState<string>(() => {
    const saved = localStorage.getItem('pt_rt_faktual');
    const validRt = ['001', '002', '003', '004', '005'];
    return saved && validRt.includes(saved) ? saved : '001';
  });

  // Filter & Search states for Riwayat
  const [filterDusun, setFilterDusun] = useState<string>('ALL');
  const [filterRt, setFilterRt] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCardFilter, setSelectedCardFilter] = useState<StatCardFilter>('ALL');

  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<KtpData | null>(null);

  const handleFileSelected = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        handleCapture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDusunChange = (val: string) => {
    setDusunFaktual(val);
    try {
      localStorage.setItem('pt_dusun_faktual', val);
    } catch {}
    if (state.extractedData) {
      setState(prev => ({
        ...prev,
        extractedData: prev.extractedData ? { ...prev.extractedData, dusunFaktual: val } : null
      }));
    }
  };

  const handleRtChange = (val: string) => {
    setRtFaktual(val);
    try {
      localStorage.setItem('pt_rt_faktual', val);
    } catch {}
    if (state.extractedData) {
      setState(prev => ({
        ...prev,
        extractedData: prev.extractedData ? { ...prev.extractedData, rtFaktual: val } : null
      }));
    }
  };

  const handleLoginSuccess = (_pwd: string) => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('pt_ktp_auth', 'true');
    } catch {}
    fetchHistory();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    try {
      localStorage.removeItem('pt_ktp_auth');
      sessionStorage.removeItem('pt_ktp_auth');
    } catch {}
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
  };

  const handleSaveGasUrl = (newUrl: string) => {
    setGasUrl(newUrl);
    try {
      localStorage.setItem('pt_gas_url', newUrl);
    } catch {}
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Geolocation denied", err)
      );
    }
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const activeUrl = gasUrl || GAS_URL;
      const cacheBuster = `t=${Date.now()}`;
      const urlWithCacheBuster = activeUrl.includes('?') 
        ? `${activeUrl}&${cacheBuster}` 
        : `${activeUrl}?${cacheBuster}`;

      const response = await fetch(urlWithCacheBuster, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const result = await response.json();
      if (result.status === 'success') {
        const cleanHistory: KtpData[] = (result.data || []).map((raw: any) => {
          const cleanNik = String(raw.nik || '').replace(/'/g, '').replace(/\D/g, '');
          let localPhoto: string | null = null;
          try {
            localPhoto = cleanNik ? localStorage.getItem(`ktp_photo_${cleanNik}`) : null;
          } catch {}
          const driveLink = typeof raw.linkFoto === 'string' ? raw.linkFoto.trim() : (raw.linkFoto ? String(raw.linkFoto).trim() : '');
          const resolvedPhoto = raw.fotoKtp || raw.image || localPhoto || '';

          return {
            ...raw,
            nik: String(raw.nik || '').replace(/'/g, ''),
            nama: String(raw.nama || ''),
            tempatLahir: String(raw.tempatLahir || ''),
            tanggalLahir: String(raw.tanggalLahir || ''),
            jenisKelamin: String(raw.jenisKelamin || ''),
            alamat: String(raw.alamat || ''),
            rt: String(raw.rt || '').replace(/'/g, ''),
            rw: String(raw.rw || '').replace(/'/g, ''),
            kelDesa: String(raw.kelDesa || ''),
            kecamatan: String(raw.kecamatan || ''),
            kotaKabupaten: String(raw.kotaKabupaten || ''),
            agama: String(raw.agama || ''),
            statusPerkawinan: String(raw.statusPerkawinan || ''),
            pekerjaan: String(raw.pekerjaan || ''),
            kewarganegaraan: String(raw.kewarganegaraan || ''),
            berlakuHingga: String(raw.berlakuHingga || ''),
            dusunFaktual: String(raw.dusunFaktual || '').replace(/'/g, ''),
            rtFaktual: String(raw.rtFaktual || '').replace(/'/g, ''),
            linkFoto: driveLink,
            fotoKtp: resolvedPhoto,
            waktuPerekaman: raw.waktuPerekaman || raw.waktuInput || '',
            latitude: typeof raw.latitude === 'number' ? raw.latitude : (raw.latitude ? parseFloat(raw.latitude) : undefined),
            longitude: typeof raw.longitude === 'number' ? raw.longitude : (raw.longitude ? parseFloat(raw.longitude) : undefined)
          };
        });
        setState(prev => ({ ...prev, history: cleanHistory }));
      } else {
        throw new Error(result.message || "Gagal mengambil data dari server.");
      }
    } catch (err: any) {
      console.error("Failed to fetch history:", err);
      setHistoryError("Gagal memuat riwayat.");
    } finally {
      setLoadingHistory(false);
    }
  }, [gasUrl]);

  const handleCapture = async (base64: string) => {
    setState(prev => ({ ...prev, image: base64, status: 'processing', errorMessage: null }));
    try {
      const data = await extractKtpData(base64);
      const formattedData: KtpData = Object.keys(data).reduce((acc, key) => {
        const val = (data as any)[key];
        (acc as any)[key] = (typeof val === 'string' && key !== 'tanggalLahir') ? val.toUpperCase() : val;
        return acc;
      }, {} as KtpData);

      // Pastikan tanggalLahir tidak kosong jika NIK valid
      if (!formattedData.tanggalLahir && formattedData.nik && formattedData.nik.length >= 12) {
        const digits = formattedData.nik.replace(/\D/g, '');
        let day = parseInt(digits.substring(6, 8), 10);
        const month = parseInt(digits.substring(8, 10), 10);
        const year2 = parseInt(digits.substring(10, 12), 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year2)) {
          if (day > 40) day -= 40;
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            const currentYear2 = new Date().getFullYear() % 100;
            const fullYear = year2 > currentYear2 ? 1900 + year2 : 2000 + year2;
            formattedData.tanggalLahir = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }
      }

      formattedData.dusunFaktual = formattedData.dusunFaktual || dusunFaktual;
      formattedData.rtFaktual = formattedData.rtFaktual || rtFaktual;

      // Cache photo to localStorage for instant cross-check
      const cleanNik = (formattedData.nik || '').replace(/\D/g, '');
      if (cleanNik) {
        try {
          localStorage.setItem(`ktp_photo_${cleanNik}`, base64);
        } catch {}
      }

      setState(prev => ({ ...prev, extractedData: formattedData, status: 'success' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        errorMessage: err.message || "Gagal mengekstrak data. Pastikan gambar jelas." 
      }));
    }
  };

  const startManualInput = () => {
    const emptyData: KtpData = {
      nik: '',
      nama: '',
      tempatLahir: '',
      tanggalLahir: '',
      jenisKelamin: '',
      alamat: '',
      rt: '',
      rw: '',
      kelDesa: '',
      kecamatan: '',
      kotaKabupaten: '',
      agama: '',
      statusPerkawinan: '',
      pekerjaan: '',
      kewarganegaraan: 'WNI',
      berlakuHingga: 'SEUMUR HIDUP',
      dusunFaktual: dusunFaktual,
      rtFaktual: rtFaktual
    };
    setState(prev => ({
      ...prev,
      image: null,
      extractedData: emptyData,
      status: 'success'
    }));
  };

  const handleSaveToSpreadsheet = async () => {
    if (!state.extractedData) return;
    
    const isDuplicate = state.history.some(item => item.nik === state.extractedData?.nik);
    if (isDuplicate) {
      alert(`⚠️ PERINGATAN: NIK ${state.extractedData.nik} sudah terdaftar.`);
      return;
    }

    setSaving(true);
    try {
      const cleanNama = (state.extractedData.nama || 'TANPA_NAMA')
        .trim()
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .replace(/\s+/g, '_')
        .toUpperCase();
      const cleanNik = (state.extractedData.nik || '').trim().replace(/\D/g, '');
      const namaFile = `KTP_${cleanNama}${cleanNik ? '_' + cleanNik : ''}.jpg`;

      // Cache locally to ensure immediate offline cross-check availability
      if (cleanNik && state.image) {
        try {
          localStorage.setItem(`ktp_photo_${cleanNik}`, state.image);
        } catch {}
      }

      const payload = {
        ...state.extractedData,
        dusunFaktual: state.extractedData.dusunFaktual || dusunFaktual,
        rtFaktual: state.extractedData.rtFaktual || rtFaktual,
        image: state.image || "", 
        fotoKtp: state.image || "", 
        fileName: namaFile,
        namaFile: namaFile,
        latitude: location?.lat,
        longitude: location?.lng,
        waktuPerekaman: new Date().toLocaleString("id-ID")
      };

      const activeUrl = gasUrl || GAS_URL;
      await fetch(activeUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setShowToast(true);
      setState(prev => ({ ...prev, status: 'saved' }));
      fetchHistory();
    } catch (err) {
      alert("Gagal simpan data.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setState(prev => ({
      ...prev,
      image: null,
      extractedData: null,
      status: 'idle',
      errorMessage: null,
    }));
    setShowToast(false);
  };

  const changeView = (mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
    if (mode === 'history') fetchHistory();
  };

  // Calculate available Dusuns & RTs from history data
  const availableDusuns = useMemo(() => {
    const set = new Set<string>(['001', '002', '003', '004', '005', '006', '007', '008', '009', '010']);
    state.history.forEach(item => {
      const norm = normalizeDusun(item.dusunFaktual);
      if (norm) set.add(norm);
    });
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [state.history]);

  const availableRts = useMemo(() => {
    const set = new Set<string>(['001', '002', '003', '004', '005']);
    state.history.forEach(item => {
      if (filterDusun !== 'ALL') {
        const itemDusun = normalizeDusun(item.dusunFaktual);
        const rawDusun = String(item.dusunFaktual || '').trim();
        const matchesDusun = itemDusun === filterDusun || rawDusun === filterDusun || rawDusun.replace(/^0+/, '') === filterDusun.replace(/^0+/, '');
        if (!matchesDusun) return;
      }
      const norm = normalizeRt(item.rtFaktual);
      if (norm) set.add(norm);
    });
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [state.history, filterDusun]);

  // Geographic & search filtered dataset (basis for stats cards)
  const geoFilteredHistory = useMemo(() => {
    return state.history.filter(item => {
      // Filter Dusun Faktual
      if (filterDusun !== 'ALL') {
        const normDusun = normalizeDusun(item.dusunFaktual);
        const rawDusun = String(item.dusunFaktual || '').trim();
        const matchesDusun = normDusun === filterDusun || rawDusun === filterDusun || rawDusun.replace(/^0+/, '') === filterDusun.replace(/^0+/, '');
        if (!matchesDusun) return false;
      }

      // Filter RT Faktual
      if (filterRt !== 'ALL') {
        const normRt = normalizeRt(item.rtFaktual);
        const rawRt = String(item.rtFaktual || '').trim();
        const matchesRt = normRt === filterRt || rawRt === filterRt || rawRt.replace(/^0+/, '') === filterRt.replace(/^0+/, '');
        if (!matchesRt) return false;
      }

      // Search Query (Nama, NIK, Alamat)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = String(item.nama || '').toLowerCase().includes(q);
        const matchNik = String(item.nik || '').includes(q);
        const matchAlamat = String(item.alamat || '').toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchAlamat) return false;
      }

      return true;
    });
  }, [state.history, filterDusun, filterRt, searchQuery]);

  // Calculate full demography statistics on the geographic scope
  const demographyStats = useMemo(() => {
    return calculateDemography(geoFilteredHistory);
  }, [geoFilteredHistory]);

  // Dataset displayed in the list below, filtered by selected card
  const displayedHistory = useMemo(() => {
    if (selectedCardFilter === 'ALL') return geoFilteredHistory;
    return geoFilteredHistory.filter(item => matchesStatCardFilter(item, selectedCardFilter));
  }, [geoFilteredHistory, selectedCardFilter]);

  const handleResetFilter = () => {
    setFilterDusun('ALL');
    setFilterRt('ALL');
    setSearchQuery('');
    setSelectedCardFilter('ALL');
  };

  // Jika belum login, tampilkan halaman Login
  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        gasUrl={gasUrl || GAS_URL}
        onSaveGasUrl={handleSaveGasUrl}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-12 pb-32 relative">
      {/* Officer Top Bar */}
      <div className="flex items-center justify-between mb-4 px-4 py-2.5 bg-white/90 backdrop-blur border border-gray-200/80 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Petugas Lapangan Aktif
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGasModal(true)}
            className="text-[11px] font-bold text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-gray-200"
            title="Pengaturan Integrasi Spreadsheet & Sandi"
          >
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span className="hidden sm:inline">Pengaturan Sheet</span>
          </button>
          <button
            onClick={handleLogoutClick}
            className="text-[11px] font-bold text-red-600 hover:text-white hover:bg-red-600 bg-red-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-red-200 cursor-pointer active:scale-95 shadow-sm"
            title="Keluar dari sesi"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* MODAL KONFIRMASI KELUAR */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100 animate-scaleUp">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">
              Keluar Sesi Petugas?
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Anda akan dialihkan ke halaman login. Anda dapat menguji kembali sandi yang terdaftar di Google Spreadsheet pada sheet <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">'sandi'</span> Kolom A.
            </p>
            <div className="flex gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-red-200"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {showGasModal && (
        <GoogleAppsScriptModal
          isOpen={showGasModal}
          onClose={() => setShowGasModal(false)}
          gasUrl={gasUrl}
          onSaveGasUrl={handleSaveGasUrl}
        />
      )}

      {selectedDetail && (
        <KtpDetailModal 
          record={selectedDetail as any} 
          data={selectedDetail} 
          onClose={() => setSelectedDetail(null)} 
        />
      )}
      
      {/* NAVIGATION TABS */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-xl p-2 rounded-[2rem] shadow-2xl flex items-center gap-2 z-50 border border-white/10">
        <button 
          onClick={() => changeView('scanner')}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all ${state.viewMode === 'scanner' ? 'bg-red-600 text-white font-black' : 'text-gray-400 font-bold hover:text-white'}`}
        >
          <span className="text-xs uppercase tracking-widest">Scanner</span>
        </button>
        <button 
          onClick={() => changeView('history')}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all ${state.viewMode === 'history' ? 'bg-red-600 text-white font-black' : 'text-gray-400 font-bold hover:text-white'}`}
        >
          <span className="text-xs uppercase tracking-widest">Riwayat</span>
        </button>
        <div className="w-[1px] h-6 bg-white/20 mx-0.5"></div>
        <button
          onClick={handleLogoutClick}
          className="p-3 rounded-full text-red-400 hover:text-white hover:bg-red-600/80 transition-all active:scale-90"
          title="Keluar dari sesi petugas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <header className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight uppercase">
          PENDATAAN KTP WARGA <span className="text-red-600">PEMATANG TAHALO</span>
        </h1>
      </header>

      <main className="w-full">
        {state.viewMode === 'scanner' ? (
          <div className="flex flex-col items-center gap-6">
            {/* Wilayah Faktual (Pilihan Petugas) - Muncul di atas & tidak berubah jika tidak diganti */}
            <FactualAreaSelector 
              dusun={dusunFaktual} 
              rt={rtFaktual} 
              onDusunChange={handleDusunChange} 
              onRtChange={handleRtChange} 
            />

            {state.status === 'idle' && (
              <div className="w-full flex flex-col items-center gap-5">
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      handleFileSelected(file);
                    }
                  }}
                  className={`w-full max-w-xl bg-white rounded-[2.5rem] p-8 sm:p-10 text-center shadow-xl border-2 transition-all duration-200 flex flex-col items-center gap-6 relative group ${
                    isDragging ? 'border-red-500 bg-red-50/40 scale-[1.01]' : 'border-gray-100 hover:border-red-300 hover:shadow-2xl'
                  }`}
                >
                  <label className="cursor-pointer w-full flex flex-col items-center gap-6">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                      }} 
                    />

                    <div className="relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-2xl shadow-red-200 group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-12 h-12 sm:w-14 sm:h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="absolute -bottom-1 -right-1 p-2 bg-white rounded-full shadow-md text-red-600 border border-gray-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                    </div>

                    <div className="space-y-2 max-w-md">
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight">
                        PILIH DARI GALERI
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                        Klik untuk memilih foto KTP dari galeri atau penyimpanan perangkat Anda untuk dipindai otomatis oleh AI
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl group-hover:from-red-700 group-hover:to-rose-700 active:scale-95 transition-all shadow-xl shadow-red-200 font-black text-sm uppercase tracking-wider">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>BUKA GALERI FOTO</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                      <span>Mendukung: JPG, JPEG, PNG, WEBP</span>
                    </div>
                  </label>
                </div>

                <button 
                  type="button"
                  onClick={startManualInput} 
                  className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] hover:text-red-600 transition-colors py-2 px-4 rounded-xl hover:bg-gray-100"
                >
                  + Input Manual Kartu Keluarga (Tanpa Foto)
                </button>
              </div>
            )}

            {state.status === 'processing' && (
              <div className="p-12 text-center bg-white rounded-[3rem] shadow-xl w-full max-w-sm border border-gray-50">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-black uppercase text-[10px] tracking-[0.3em] text-gray-400">AI Sedang Bekerja...</p>
              </div>
            )}

            {state.status === 'success' && state.extractedData && (
              <KtpForm 
                data={state.extractedData}
                image={state.image}
                onChange={(newData) => setState(prev => ({ ...prev, extractedData: newData }))}
                onSubmit={handleSaveToSpreadsheet}
                onReset={reset}
                isLoading={saving}
                history={state.history}
              />
            )}

            {state.status === 'saved' && (
              <div className="text-center p-10 bg-white rounded-[3rem] shadow-xl border-4 border-green-500">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="font-black text-xl mb-4">DATA TERSIMPAN</h2>
                <button onClick={reset} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-transform">Proses Data Baru</button>
              </div>
            )}

            {state.status === 'error' && (
              <div className="text-center p-8 bg-white rounded-[2.5rem] shadow-xl border-2 border-red-100 max-w-md w-full mx-auto space-y-4">
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Pindai KTP Belum Berhasil</h3>
                  <p className="text-red-600 font-medium text-xs mt-1.5 leading-relaxed">{state.errorMessage}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                  {state.image && (
                    <button
                      onClick={() => handleCapture(state.image!)}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-red-200"
                    >
                      Pindai Ulang Foto Ini
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-wider transition"
                  >
                    Pilih Foto Lain
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 space-y-6">
            {/* FILTER WILAYAH FAKTUAL & PENCARIAN */}
            <HistoryFilter
              selectedDusun={filterDusun}
              onDusunChange={(val) => {
                setFilterDusun(val);
                setFilterRt('ALL'); // Reset RT saat ganti dusun agar sesuai
              }}
              selectedRt={filterRt}
              onRtChange={setFilterRt}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCardFilter={selectedCardFilter}
              onClearCardFilter={() => setSelectedCardFilter('ALL')}
              totalFiltered={displayedHistory.length}
              totalAll={state.history.length}
              availableDusuns={availableDusuns}
              availableRts={availableRts}
              onReset={handleResetFilter}
            />

            {/* STATS DASHBOARD INTERAKTIF: KLIK KARTU APA SAJA UNTUK MEMFILTER LIST */}
            <HistoryStats
              stats={demographyStats}
              isFiltered={filterDusun !== 'ALL' || filterRt !== 'ALL' || searchQuery.trim() !== ''}
              selectedCardFilter={selectedCardFilter}
              onCardFilterChange={(newFilter) => {
                setSelectedCardFilter(newFilter);
                if (newFilter !== 'ALL') {
                  setTimeout(() => {
                    const listSection = document.getElementById('citizen-list-section');
                    if (listSection) {
                      listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }
              }}
            />

            {/* LIST DAFTAR WARGA (SESUAI KARTU YANG DI-KLIK) */}
            <div id="citizen-list-section" className="scroll-mt-6 space-y-4">
              {/* Active Card Filter Banner */}
              {selectedCardFilter !== 'ALL' && (
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-white/20 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-100">
                        Memfilter Sesuai Kartu:
                      </p>
                      <h4 className="text-sm sm:text-base font-black uppercase tracking-tight">
                        {getStatCardFilterLabel(selectedCardFilter)} ({displayedHistory.length} Jiwa)
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCardFilter('ALL')}
                    className="px-3.5 py-1.5 bg-white text-red-700 hover:bg-red-50 active:scale-95 rounded-xl font-black text-xs transition shadow-sm shrink-0 flex items-center gap-1.5"
                    title="Batalkan filter kartu dan tampilkan semua warga"
                  >
                    <span>Tampilkan Semua</span>
                    <span className="text-sm font-bold">×</span>
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {displayedHistory.length > 0 ? (
                  displayedHistory.map((item, idx) => {
                    const hasLocation = Boolean(item.latitude && item.longitude);
                    const cleanNik = String(item.nik || '').replace(/\D/g, '');
                    let hasLocalPhoto = false;
                    try {
                      hasLocalPhoto = Boolean(cleanNik && localStorage.getItem(`ktp_photo_${cleanNik}`));
                    } catch {}
                    const hasPhoto = Boolean(item.fotoKtp || hasLocalPhoto || (typeof item.linkFoto === 'string' && (item.linkFoto.startsWith('http://') || item.linkFoto.startsWith('https://'))));
                    
                    // Hitung usia dan format dusun/rt faktual
                    const age = calculateAge(item);
                    const dNorm = normalizeDusun(item.dusunFaktual);
                    const rtNorm = normalizeRt(item.rtFaktual);

                    return (
                      <button 
                        key={idx} 
                        onClick={() => setSelectedDetail(item)}
                        className="w-full text-left bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between group hover:shadow-xl hover:border-red-200 transition-all active:scale-[0.98]"
                      >
                        <div className="flex gap-4 sm:gap-5 items-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0">
                            {displayedHistory.length - idx}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-black text-gray-900 uppercase truncate text-sm md:text-base">{item.nama}</h4>
                              {hasPhoto && (
                                <span className="p-1 bg-red-50 text-red-600 rounded-md" title="Foto KTP Tersedia">
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-[0.15em] mb-1.5 font-mono">{item.nik}</p>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              {/* Dusun & RT Faktual Badge */}
                              {(dNorm || rtNorm || item.dusunFaktual || item.rtFaktual) && (
                                <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  📍 Faktual: Dusun {dNorm || item.dusunFaktual || '-'} {rtNorm ? `• RT ${rtNorm}` : (item.rtFaktual ? `• RT ${item.rtFaktual}` : '')}
                                </span>
                              )}

                              {/* Usia Badge */}
                              {age !== null && (
                                <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Usia: {age} Th
                                </span>
                              )}

                              {/* KTP RT/RW */}
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                KTP: RT {item.rt || '000'} / RW {item.rw || '000'}
                              </span>

                              {/* Agama & Status */}
                              {item.agama && (
                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {item.agama}
                                </span>
                              )}

                              {hasPhoto ? (
                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Foto Terarsip
                                </span>
                              ) : (
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                  Tanpa Foto
                                </span>
                              )}

                              {hasLocation && (
                                <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                                  GPS
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-center justify-end">
                          <span className="px-3 py-1.5 bg-gray-50 group-hover:bg-red-600 group-hover:text-white text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm">
                            <span>Kroscek & Detail</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-800 font-bold text-sm">
                      {selectedCardFilter !== 'ALL'
                        ? `Tidak ada warga untuk kategori "${getStatCardFilterLabel(selectedCardFilter)}" pada filter wilayah ini.`
                        : "Tidak ada data warga yang sesuai dengan filter."}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {selectedCardFilter !== 'ALL'
                        ? "Klik tombol di bawah untuk menampilkan seluruh warga di wilayah ini."
                        : "Coba ubah pilihan Dusun, RT, atau kata kunci pencarian Anda."}
                    </p>
                    <div className="flex gap-2 pt-1">
                      {selectedCardFilter !== 'ALL' && (
                        <button
                          onClick={() => setSelectedCardFilter('ALL')}
                          className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md"
                        >
                          Tampilkan Semua Kategori
                        </button>
                      )}
                      <button
                        onClick={handleResetFilter}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-red-200"
                      >
                        Reset Semua Filter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
