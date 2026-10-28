import React, { useState } from 'react';

interface FactualAreaSelectorProps {
  dusun: string;
  rt: string;
  onDusunChange: (dusun: string) => void;
  onRtChange: (rt: string) => void;
}

export const DUSUN_OPTIONS = [
  '001',
  '002',
  '003',
  '004',
  '005',
  '006',
  '007',
  '008',
  '009',
  '010',
];

export const RT_OPTIONS = [
  '001',
  '002',
  '003',
  '004',
  '005',
];

export const FactualAreaSelector: React.FC<FactualAreaSelectorProps> = ({
  dusun,
  rt,
  onDusunChange,
  onRtChange,
}) => {
  const [isCustomDusun, setIsCustomDusun] = useState(!DUSUN_OPTIONS.includes(dusun) && dusun !== '');
  const [isCustomRt, setIsCustomRt] = useState(!RT_OPTIONS.includes(rt) && rt !== '');

  const handleDusunSelect = (val: string) => {
    if (val === '__custom__') {
      setIsCustomDusun(true);
    } else {
      setIsCustomDusun(false);
      onDusunChange(val);
    }
  };

  const handleRtSelect = (val: string) => {
    if (val === '__custom__') {
      setIsCustomRt(true);
    } else {
      setIsCustomRt(false);
      onRtChange(val);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-[2rem] p-5 sm:p-6 shadow-xl border border-red-400/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/15">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm text-white shadow-inner">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm tracking-wider uppercase text-white">
                Wilayah Faktual Petugas
              </h3>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                Dusun {dusun || '001'} / RT {rt || '001'}
              </span>
            </div>
            <p className="text-[10px] text-white/80 font-bold tracking-wide mt-0.5">
              Tersimpan otomatis & tidak berubah sebelum diganti petugas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-black/25 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-200 border border-emerald-400/30 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Terkunci Otomatis
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Dusun Selector: 001 - 010 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/90 flex items-center justify-between">
            <span>Dusun Faktual (Pilihan Petugas)</span>
            {isCustomDusun && (
              <button 
                type="button" 
                onClick={() => { setIsCustomDusun(false); onDusunChange('001'); }}
                className="text-[9px] underline hover:text-white"
              >
                Pilih dari daftar (001-010)
              </button>
            )}
          </label>

          {isCustomDusun ? (
            <input
              type="text"
              value={dusun}
              onChange={(e) => onDusunChange(e.target.value.toUpperCase())}
              placeholder="Contoh: 001"
              className="px-4 py-3 bg-white text-gray-900 rounded-2xl font-black text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
            />
          ) : (
            <div className="relative">
              <select
                value={dusun}
                onChange={(e) => handleDusunSelect(e.target.value)}
                className="w-full px-4 py-3 bg-white text-gray-900 rounded-2xl font-black text-sm focus:outline-none focus:ring-2 focus:ring-white cursor-pointer shadow-inner appearance-none pr-10"
              >
                {DUSUN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="text-gray-900 font-bold">
                    {opt}
                  </option>
                ))}
                <option value="__custom__" className="text-red-600 font-black">
                  + Ketik Dusun Lainnya...
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          <span className="text-[9px] text-white/70 font-bold ml-1">
            Pilihan dusun: 001 s/d 010
          </span>
        </div>

        {/* RT Selector: 001 - 005 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/90 flex items-center justify-between">
            <span>RT Faktual (Pilihan Petugas)</span>
            {isCustomRt && (
              <button 
                type="button" 
                onClick={() => { setIsCustomRt(false); onRtChange('001'); }}
                className="text-[9px] underline hover:text-white"
              >
                Pilih dari daftar (001-005)
              </button>
            )}
          </label>

          {isCustomRt ? (
            <input
              type="text"
              value={rt}
              onChange={(e) => onRtChange(e.target.value.toUpperCase())}
              placeholder="Contoh: 001"
              className="px-4 py-3 bg-white text-gray-900 rounded-2xl font-black text-sm focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
            />
          ) : (
            <div className="relative">
              <select
                value={rt}
                onChange={(e) => handleRtSelect(e.target.value)}
                className="w-full px-4 py-3 bg-white text-gray-900 rounded-2xl font-black text-sm focus:outline-none focus:ring-2 focus:ring-white cursor-pointer shadow-inner appearance-none pr-10"
              >
                {RT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="text-gray-900 font-bold">
                    {opt}
                  </option>
                ))}
                <option value="__custom__" className="text-red-600 font-black">
                  + Ketik RT Lainnya...
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          <span className="text-[9px] text-white/70 font-bold ml-1">
            Pilihan RT: 001 s/d 005
          </span>
        </div>
      </div>
    </div>
  );
};
