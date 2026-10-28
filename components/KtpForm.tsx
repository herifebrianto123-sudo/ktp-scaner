import React, { useState } from 'react';
import { KtpData } from '../types';
import { DUSUN_OPTIONS, RT_OPTIONS } from './FactualAreaSelector';

interface KtpFormProps {
  data: KtpData;
  image?: string | null;
  onChange: (newData: KtpData) => void;
  onSubmit: () => void;
  onReset: () => void;
  isLoading: boolean;
  history: KtpData[];
}

// Helper to format date into readable Indonesian text
function formatIndonesianDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '';
  try {
    const [year, month, day] = dateStr.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${parseInt(day, 10)} ${months[mIdx]} ${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

// Helper to infer birth date from NIK if needed
function inferBirthDateFromNik(nik: string): string {
  const digits = nik.replace(/\D/g, '');
  if (digits.length < 12) return '';
  let day = parseInt(digits.substring(6, 8), 10);
  const month = parseInt(digits.substring(8, 10), 10);
  const year2 = parseInt(digits.substring(10, 12), 10);

  if (isNaN(day) || isNaN(month) || isNaN(year2)) return '';
  if (day > 40) day -= 40; // female format in Indonesian NIK
  if (day < 1 || day > 31 || month < 1 || month > 12) return '';

  const currentYear2 = new Date().getFullYear() % 100;
  const fullYear = year2 > currentYear2 ? 1900 + year2 : 2000 + year2;
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const KtpForm: React.FC<KtpFormProps> = ({ 
  data, 
  image, 
  onChange, 
  onSubmit, 
  onReset, 
  isLoading, 
  history 
}) => {
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isNikValid = data.nik.length === 16;
  const isDuplicate = history.some(item => item.nik === data.nik && data.nik !== "");
  
  const requiredFields: (keyof KtpData)[] = [
    'dusunFaktual', 'rtFaktual',
    'nik', 'nama', 'tempatLahir', 'tanggalLahir', 'jenisKelamin', 
    'alamat', 'rt', 'rw', 'kelDesa', 'kecamatan', 'kotaKabupaten', 
    'agama', 'statusPerkawinan', 'pekerjaan', 'kewarganegaraan', 'berlakuHingga'
  ];

  const isFormComplete = requiredFields.every(field => {
    const value = data[field];
    return value !== undefined && value.toString().trim() !== '';
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'nik') {
      formattedValue = value.replace(/\D/g, '').slice(0, 16);
      // Auto-suggest birth date if empty and NIK is 16 digits
      if (formattedValue.length === 16 && !data.tanggalLahir) {
        const inferred = inferBirthDateFromNik(formattedValue);
        if (inferred) {
          onChange({ ...data, nik: formattedValue, tanggalLahir: inferred });
          return;
        }
      }
    } else if (e.target.type !== 'date') {
      formattedValue = value.toUpperCase();
    }
    
    onChange({ ...data, [name]: formattedValue });
  };

  const handleApplyNikDate = () => {
    if (data.nik && data.nik.length >= 12) {
      const inferred = inferBirthDateFromNik(data.nik);
      if (inferred) {
        onChange({ ...data, tanggalLahir: inferred });
      }
    }
  };

  const fieldConfigs = [
    { label: 'NIK (16 Digit)', name: 'nik', type: 'text', placeholder: '16 angka NIK' },
    { label: 'Nama Lengkap', name: 'nama', type: 'text' },
    { label: 'Tempat Lahir', name: 'tempatLahir', type: 'text' },
    { label: 'Tanggal Lahir', name: 'tanggalLahir', type: 'date' },
    { label: 'Jenis Kelamin', name: 'jenisKelamin', type: 'select', options: ['', 'LAKI-LAKI', 'PEREMPUAN'] },
    { label: 'Alamat', name: 'alamat', type: 'text' },
    { label: 'RT', name: 'rt', type: 'text', placeholder: '000' },
    { label: 'RW', name: 'rw', type: 'text', placeholder: '000' },
    { label: 'Kel/Desa', name: 'kelDesa', type: 'text' },
    { label: 'Kecamatan', name: 'kecamatan', type: 'text' },
    { label: 'Kota/Kabupaten', name: 'kotaKabupaten', type: 'text' },
    { label: 'Agama', name: 'agama', type: 'text' },
    { label: 'Status Perkawinan', name: 'statusPerkawinan', type: 'text' },
    { label: 'Pekerjaan', name: 'pekerjaan', type: 'text' },
    { label: 'Kewarganegaraan', name: 'kewarganegaraan', type: 'text' },
    { label: 'Berlaku Hingga', name: 'berlakuHingga', type: 'text' },
  ];

  return (
    <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
      {/* Lightbox / Zoom Modal */}
      {isPhotoZoomed && image && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setIsPhotoZoomed(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
              title="Putar Foto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={() => setZoomScale(s => Math.min(s + 0.3, 3))}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
              title="Perbesar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button 
              onClick={() => setZoomScale(s => Math.max(s - 0.3, 0.7))}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
              title="Perkecil"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button 
              onClick={() => setIsPhotoZoomed(false)}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition font-bold"
              title="Tutup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div 
            className="max-w-4xl max-h-[85vh] overflow-auto flex items-center justify-center cursor-zoom-out"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={image} 
              alt="Foto KTP Full" 
              className="rounded-2xl shadow-2xl transition-transform duration-200 object-contain max-h-[80vh]"
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`
              }}
            />
          </div>
          <p className="text-gray-400 text-xs mt-3">Klik tombol di kanan atas untuk memutar / zoom, atau klik latar belakang untuk menutup</p>
        </div>
      )}

      {/* Main Container: Two-column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Photo Preview Panel */}
        {image && (
          <div className="lg:col-span-5 lg:sticky lg:top-6 bg-white rounded-[2.5rem] p-5 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <h4 className="font-black text-gray-900 text-sm tracking-wide">FOTO KTP ASLI</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Periksa tulisan pada foto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoZoomed(true)}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                Perbesar
              </button>
            </div>

            <div 
              onClick={() => setIsPhotoZoomed(true)}
              className="relative group rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-900 cursor-pointer aspect-[16/10] flex items-center justify-center shadow-inner"
            >
              <img 
                src={image} 
                alt="Foto KTP Dipindai" 
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-4 py-2 bg-white/90 backdrop-blur rounded-full text-xs font-black text-gray-900 flex items-center gap-2 shadow-lg">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Klik untuk Zoom / Putar
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="text-amber-600 font-bold text-sm">💡</span>
              <p className="leading-tight">
                <strong>Tips Koreksi:</strong> Bandingkan kolom di samping dengan foto asli. Anda dapat memperbesar foto jika teks kurang terbaca.
              </p>
            </div>
          </div>
        )}

        {/* Verification Form Card */}
        <div className={`${image ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-gray-100`}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                Verifikasi & Koreksi Data
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-12">Pastikan semua data sesuai KTP sebelum disimpan</p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {!isNikValid && data.nik.length > 0 && (
                <span className="bg-red-50 text-red-600 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-red-100 animate-pulse">
                  NIK HARUS 16 DIGIT ({data.nik.length}/16)
                </span>
              )}
              {isDuplicate && (
                <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-amber-100">
                  ⚠️ NIK SUDAH ADA DI RIWAYAT
                </span>
              )}
            </div>
          </div>

          {/* WILAYAH FAKTUAL BANNER */}
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-100 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-red-600 text-white rounded-lg text-xs font-black">📍</span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Wilayah Faktual (Pilihan Petugas)
                  </h4>
                  <p className="text-[10px] text-gray-500 font-bold">
                    KTP ini akan dicatat ke wilayah berikut di Spreadsheet
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black text-red-700 bg-red-100 px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-200">
                Wajib Terisi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">
                  Dusun Faktual (Pilihan Petugas) *
                </label>
                <div className="relative">
                  <select
                    name="dusunFaktual"
                    value={data.dusunFaktual || '001'}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-red-200 rounded-xl font-black text-gray-800 text-xs focus:outline-none focus:border-red-500 shadow-sm appearance-none pr-8 cursor-pointer"
                    required
                  >
                    {DUSUN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">
                  RT Faktual (Pilihan Petugas) *
                </label>
                <div className="relative">
                  <select
                    name="rtFaktual"
                    value={data.rtFaktual || '001'}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-red-200 rounded-xl font-black text-gray-800 text-xs focus:outline-none focus:border-red-500 shadow-sm appearance-none pr-8 cursor-pointer"
                    required
                  >
                    {RT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {fieldConfigs.map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <span>{field.label}</span>
                    <span className="text-red-400">*</span>
                  </label>
                  {field.name === 'tanggalLahir' && data.nik.length >= 12 && !data.tanggalLahir && (
                    <button
                      type="button"
                      onClick={handleApplyNikDate}
                      className="text-[9px] font-black text-red-600 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded-md transition"
                    >
                      + Isi dari NIK
                    </button>
                  )}
                </div>
                
                {field.type === 'select' ? (
                  <select
                    name={field.name}
                    value={(data as any)[field.name] || ''}
                    onChange={handleChange}
                    className={`px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all font-bold text-gray-800 appearance-none cursor-pointer ${
                      isDuplicate && field.name === 'nik' ? 'border-amber-400' : ''
                    }`}
                    disabled={isLoading}
                  >
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt === '' ? '-- PILIH --' : opt}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type={field.type}
                      name={field.name}
                      value={(data as any)[field.name] || ''}
                      onChange={handleChange}
                      placeholder={field.placeholder || "Isi data..."}
                      className={`w-full px-4 py-3.5 bg-gray-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-bold text-gray-800 ${
                        (data as any)[field.name]?.toString().trim() === '' 
                          ? 'border-amber-200 bg-amber-50/30' 
                          : 'border-gray-100 focus:border-red-500'
                      } ${
                        field.name === 'nik' && !isNikValid && data.nik.length > 0 ? 'border-red-200 focus:border-red-500' : ''
                      } ${
                        field.name === 'nik' && isDuplicate ? 'border-amber-400 ring-2 ring-amber-100' : ''
                      }`}
                      disabled={isLoading}
                      required
                    />
                    {field.name === 'tanggalLahir' && data.tanggalLahir && (
                      <p className="text-[10px] text-gray-500 font-bold mt-1 ml-1 flex items-center gap-1">
                        <span>🗓️</span> {formatIndonesianDate(data.tanggalLahir)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
            <button
              onClick={onReset}
              className="flex-1 py-4 px-6 border-2 border-gray-100 rounded-2xl text-gray-400 font-black hover:bg-gray-50 transition active:scale-95 uppercase tracking-widest text-xs"
              disabled={isLoading}
            >
              Batal / Foto Ulang
            </button>
            <button
              onClick={onSubmit}
              disabled={isLoading || !isNikValid || !isFormComplete || isDuplicate}
              className={`flex-[2] py-4 px-6 rounded-2xl font-black transition shadow-xl flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-xs ${
                !isNikValid || !isFormComplete || isDuplicate
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' 
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-red-100'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isDuplicate ? (
                    <span>NIK Sudah Ada di Riwayat</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isFormComplete ? 'Simpan ke Google Drive & Sheet' : 'Lengkapi Kolom Kosong'}
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
