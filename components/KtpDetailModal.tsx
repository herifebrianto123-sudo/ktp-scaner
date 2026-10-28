import React, { useState, useEffect, useMemo } from "react";
import { XIcon, MapPinIcon, EyeIcon } from "./Icons";

interface Props {
  record?: any;
  data?: any;
  onClose: () => void;
}

// Helper to extract Google Drive file ID from varied URL formats
function extractDriveFileId(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) return fileDMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  return null;
}

// Generate candidate preview URLs for Google Drive or direct images
function buildImageCandidates(rawUrlOrBase64: string | undefined | null, driveUrl: string | undefined | null): string[] {
  const candidates: string[] = [];

  // Check base64 or direct image in rawUrl
  if (rawUrlOrBase64 && typeof rawUrlOrBase64 === "string") {
    const trimmed = rawUrlOrBase64.trim();
    if (trimmed.startsWith("data:image/") || trimmed.startsWith("blob:")) {
      candidates.push(trimmed);
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const driveId = extractDriveFileId(trimmed);
      if (driveId) {
        candidates.push(`https://lh3.googleusercontent.com/d/${driveId}=w1200`);
        candidates.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`);
        candidates.push(`https://drive.google.com/uc?export=view&id=${driveId}`);
      } else {
        candidates.push(trimmed);
      }
    }
  }

  // Check driveUrl
  if (driveUrl && typeof driveUrl === "string") {
    const trimmedDrive = driveUrl.trim();
    const driveId = extractDriveFileId(trimmedDrive);
    if (driveId) {
      const driveCdn = `https://lh3.googleusercontent.com/d/${driveId}=w1200`;
      const driveThumb = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
      const driveUc = `https://drive.google.com/uc?export=view&id=${driveId}`;
      if (!candidates.includes(driveCdn)) candidates.push(driveCdn);
      if (!candidates.includes(driveThumb)) candidates.push(driveThumb);
      if (!candidates.includes(driveUc)) candidates.push(driveUc);
    } else if (trimmedDrive.startsWith("http") && !candidates.includes(trimmedDrive)) {
      candidates.push(trimmedDrive);
    }
  }

  return candidates;
}

// Helper to format date into Indonesian standard
function formatIndonesianDate(dateStr: string | undefined): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "-";
  try {
    const [year, month, day] = dateStr.split("-");
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${parseInt(day, 10)} ${months[mIdx]} ${year}`;
    }
  } catch {}
  return dateStr;
}

interface ReadOnlyFieldProps {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  copyable?: boolean;
  highlight?: boolean;
  fullWidth?: boolean;
  subValue?: string;
}

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({
  label,
  value,
  mono,
  copyable,
  highlight,
  fullWidth,
  subValue,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayVal = value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : "-";

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        fullWidth ? "sm:col-span-2" : ""
      } ${
        highlight
          ? "bg-red-50/60 border-red-200"
          : "bg-gray-50/80 border-gray-200/80 hover:bg-gray-50 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
          {label}
        </span>
        {copyable && value && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-[9px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 transition"
            title="Salin teks ini"
          >
            {copied ? "✓ Tersalin" : "Salin"}
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-black text-gray-900 break-words ${
            highlight ? "text-base text-red-900" : "text-sm"
          } ${mono ? "font-mono tracking-wider" : "uppercase"}`}
        >
          {displayVal}
        </span>
        {subValue && (
          <span className="text-xs font-bold text-gray-500">
            ({subValue})
          </span>
        )}
      </div>
    </div>
  );
};

export const KtpDetailModal: React.FC<Props> = ({ record, data, onClose }) => {
  const activeRecord = record || data;
  if (!activeRecord) return null;

  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const [copiedNik, setCopiedNik] = useState<boolean>(false);

  // Lightbox Zoom & Inspection state
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Local storage cached image for this NIK if available
  const localCachedPhoto = useMemo(() => {
    const nik = (activeRecord.nik || "").toString().replace(/\D/g, "");
    if (!nik) return null;
    try {
      return localStorage.getItem(`ktp_photo_${nik}`) || null;
    } catch {
      return null;
    }
  }, [activeRecord.nik]);

  // Build candidate image list
  const imageCandidates = useMemo(() => {
    const primary = activeRecord.fotoKtp || activeRecord.image || localCachedPhoto;
    const driveLink = activeRecord.linkFoto;
    const list = buildImageCandidates(primary, driveLink);
    if (localCachedPhoto && !list.includes(localCachedPhoto)) {
      list.unshift(localCachedPhoto);
    }
    return list;
  }, [activeRecord.fotoKtp, activeRecord.image, activeRecord.linkFoto, localCachedPhoto]);

  const currentImageUrl = imageCandidates[candidateIndex] || null;

  useEffect(() => {
    setCandidateIndex(0);
    setImageLoading(true);
    setImageFailed(false);
    setZoomScale(1);
    setRotation(0);
    setHighContrast(false);
  }, [activeRecord]);

  const handleImageError = () => {
    if (candidateIndex < imageCandidates.length - 1) {
      setCandidateIndex((prev) => prev + 1);
      setImageLoading(true);
    } else {
      setImageFailed(true);
      setImageLoading(false);
    }
  };

  const handleImageLoaded = () => {
    setImageLoading(false);
    setImageFailed(false);
  };

  const handleCopyNik = () => {
    if (activeRecord.nik) {
      navigator.clipboard.writeText(String(activeRecord.nik));
      setCopiedNik(true);
      setTimeout(() => setCopiedNik(false), 2000);
    }
  };

  const hasDriveLink = typeof activeRecord.linkFoto === "string" && activeRecord.linkFoto.trim().startsWith("http");

  return (
    <>
      {/* Lightbox / Zoom Fullscreen Modal */}
      {isLightboxOpen && currentImageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Top Control Toolbar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between gap-2 px-4 py-3 bg-gray-900/90 rounded-2xl border border-white/10 text-white mb-3 shadow-2xl z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-red-600 rounded-lg text-xs font-black">KTP</span>
              <div>
                <h4 className="text-xs font-black tracking-wider uppercase truncate max-w-[200px] sm:max-w-xs">
                  {activeRecord.nama || "FOTO KTP"}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono">NIK: {activeRecord.nik || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Rotate 90 deg */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                title="Putar 90 Derajat"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Putar</span>
              </button>

              {/* High Contrast Filter */}
              <button
                type="button"
                onClick={() => setHighContrast((c) => !c)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 ${
                  highContrast ? "bg-amber-500 text-gray-900 font-black" : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title="Tingkatkan Kontras untuk Membaca Teks Pudar"
              >
                <span>☀️</span>
                <span className="hidden sm:inline">Kontras</span>
              </button>

              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(s - 0.25, 0.5))}
                className="p-1.5 sm:px-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-xs font-bold transition"
                title="Perkecil"
              >
                ➖
              </button>

              <span className="text-[11px] font-mono text-gray-400 px-1">{Math.round(zoomScale * 100)}%</span>

              {/* Zoom In */}
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(s + 0.25, 3.5))}
                className="p-1.5 sm:px-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-xs font-bold transition"
                title="Perbesar"
              >
                ➕
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={() => {
                  setZoomScale(1);
                  setRotation(0);
                  setHighContrast(false);
                }}
                className="px-2 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-[10px] font-bold text-gray-300 transition hidden sm:inline"
              >
                Reset
              </button>

              {/* Close Lightbox */}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-1.5 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black transition ml-1"
                title="Tutup Preview"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Lightbox Main Image Area */}
          <div
            className="flex-1 w-full flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImageUrl}
              alt={`KTP ${activeRecord.nama}`}
              className="max-h-[82vh] max-w-[94vw] object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                filter: highContrast ? "contrast(1.4) brightness(1.08)" : "none",
              }}
              onClick={() => setZoomScale((s) => (s >= 2 ? 1 : s + 0.5))}
            />
          </div>

          <p className="text-gray-400 text-[11px] text-center mt-2">
            Klik gambar untuk zoom bertahap • Putar atau naikkan kontras untuk membaca tulisan yang samar
          </p>
        </div>
      )}

      {/* Main KTP Detail Modal (READ ONLY) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[94vh] flex flex-col border border-gray-100">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 bg-gray-900 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center font-black text-white text-lg shadow-md shrink-0">
                🪪
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                    Detail Arsip Digital & Kroscek KTP
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Hanya Lihat (Read-Only)
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-gray-300 font-mono font-bold tracking-wider">
                    NIK: {activeRecord.nik || "-"}
                  </p>
                  {activeRecord.nik && (
                    <button
                      type="button"
                      onClick={handleCopyNik}
                      className="text-[10px] text-red-400 hover:text-red-300 underline font-bold transition flex items-center gap-1"
                    >
                      {copiedNik ? "✓ NIK Tersalin!" : "Salin NIK"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-white rounded-2xl hover:bg-gray-800 transition active:scale-95"
              title="Tutup"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: KTP PHOTO DISPLAY & CROSS-CHECK PANEL */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                
                {/* PHOTO CONTAINER CARD */}
                <div className="bg-slate-900 rounded-[2rem] p-4 sm:p-5 text-white shadow-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-red-600 text-white rounded-xl text-xs font-black">
                        📸
                      </span>
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-wider text-white">
                          Foto KTP Asli Warga
                        </h4>
                        <p className="text-[9px] text-gray-400 font-bold">
                          Gunakan foto untuk kroscek data fisik
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {currentImageUrl && (
                        <button
                          type="button"
                          onClick={() => setIsLightboxOpen(true)}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition shadow-md"
                          title="Perbesar Layar Penuh"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>Perbesar</span>
                        </button>
                      )}

                      {hasDriveLink && (
                        <a
                          href={activeRecord.linkFoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-blue-300 rounded-xl text-[10px] font-bold flex items-center gap-1 transition border border-white/10"
                          title="Buka Arsip Foto Digital"
                        >
                          <span>Arsip Foto ↗</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Image Display Box */}
                  <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[220px] max-h-[360px] border border-white/10 group">
                    {imageLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10 gap-2">
                        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Memuat Foto KTP...
                        </span>
                      </div>
                    )}

                    {currentImageUrl && !imageFailed ? (
                      <>
                        <img
                          src={currentImageUrl}
                          alt={`KTP ${activeRecord.nama}`}
                          onLoad={handleImageLoaded}
                          onError={handleImageError}
                          onClick={() => setIsLightboxOpen(true)}
                          className="w-full h-full object-contain max-h-[350px] cursor-zoom-in group-hover:scale-102 transition duration-300"
                        />
                        <div
                          onClick={() => setIsLightboxOpen(true)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in"
                        >
                          <span className="px-3.5 py-2 bg-white/95 backdrop-blur text-gray-900 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xl">
                            <EyeIcon className="w-4 h-4 text-red-600" />
                            Klik untuk Zoom & Putar
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-2xl">
                          📷
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-300">Foto KTP Belum Tersedia di Arsip</p>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-xs">
                            {hasDriveLink
                              ? "Berkas foto tersimpan di Cloud Storage terenkripsi namun membutuhkan otorisasi akses."
                              : "Data dicatat tanpa lampiran foto fisik."}
                          </p>
                        </div>

                        {hasDriveLink && (
                          <a
                            href={activeRecord.linkFoto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg mt-1"
                          >
                            Buka Arsip Foto di Tab Baru ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Image Footer Info */}
                  <div className="mt-3 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${currentImageUrl ? "bg-emerald-400" : "bg-gray-500"}`}></span>
                      {localCachedPhoto ? "Foto Tersimpan (Perangkat)" : (currentImageUrl ? "Foto Terarsip" : "Tanpa Lampiran Foto")}
                    </span>

                    {currentImageUrl && (
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="text-gray-400 hover:text-white underline font-semibold flex items-center gap-1 transition"
                      >
                        🔍 Tinjau Detail Foto
                      </button>
                    )}
                  </div>
                </div>

                {/* WILAYAH FAKTUAL (READ ONLY BADGES) */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-[2rem] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-900 flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-red-600" />
                      Wilayah Faktual (Pilihan Petugas)
                    </h4>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                      Tercatat
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-red-200 rounded-xl">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                        Dusun Faktual
                      </span>
                      <span className="text-sm font-black text-gray-900 uppercase">
                        Dusun {activeRecord.dusunFaktual || "-"}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-red-200 rounded-xl">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                        RT Faktual
                      </span>
                      <span className="text-sm font-black text-gray-900 uppercase">
                        RT {activeRecord.rtFaktual || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* METADATA RECORD & GPS */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-[2rem] text-xs space-y-2.5 text-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Waktu Perekaman</span>
                    <span className="font-bold text-gray-900">{activeRecord.waktuPerekaman || activeRecord.waktuInput || "-"}</span>
                  </div>

                  {activeRecord.latitude && activeRecord.longitude && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Koordinat GPS</span>
                      <a
                        href={`https://www.google.com/maps?q=${activeRecord.latitude},${activeRecord.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                      >
                        📍 {activeRecord.latitude.toFixed(6)}, {activeRecord.longitude.toFixed(6)}
                      </a>
                    </div>
                  )}

                  {hasDriveLink && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cloud Storage</span>
                      <a
                        href={activeRecord.linkFoto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:underline truncate max-w-[180px]"
                      >
                        Lihat Berkas Asli ↗
                      </a>
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: READ-ONLY STRUCTURED DATA */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* READ-ONLY NOTICE BANNER */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3 shadow-md border border-slate-800">
                  <span className="text-xl">🔒</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Mode Arsip Resmi (Hanya Lihat / Read-Only)
                    </h4>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                      Data di halaman ini dilindungi dari perubahan tidak sengaja. Untuk mengedit atau memperbaiki data warga, silakan ubah langsung melalui sistem basis data master oleh admin.
                    </p>
                  </div>
                </div>

                {/* STRUCTURED READ-ONLY GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* NIK */}
                  <ReadOnlyField
                    label="NIK (Nomor Induk Kependudukan)"
                    value={activeRecord.nik}
                    mono
                    copyable
                    highlight
                    fullWidth
                    subValue={`${String(activeRecord.nik || "").replace(/\D/g, "").length} Digit`}
                  />

                  {/* NAMA LENGKAP */}
                  <ReadOnlyField
                    label="Nama Lengkap (Sesuai KTP)"
                    value={activeRecord.nama}
                    copyable
                    highlight
                    fullWidth
                  />

                  {/* TEMPAT LAHIR */}
                  <ReadOnlyField
                    label="Tempat Lahir"
                    value={activeRecord.tempatLahir}
                  />

                  {/* TANGGAL LAHIR */}
                  <ReadOnlyField
                    label="Tanggal Lahir"
                    value={activeRecord.tanggalLahir}
                    mono
                    subValue={formatIndonesianDate(activeRecord.tanggalLahir)}
                  />

                  {/* JENIS KELAMIN */}
                  <ReadOnlyField
                    label="Jenis Kelamin"
                    value={activeRecord.jenisKelamin}
                  />

                  {/* AGAMA */}
                  <ReadOnlyField
                    label="Agama"
                    value={activeRecord.agama}
                  />

                  {/* ALAMAT */}
                  <ReadOnlyField
                    label="Alamat Sesuai KTP"
                    value={activeRecord.alamat}
                    copyable
                    fullWidth
                  />

                  {/* RT KTP */}
                  <ReadOnlyField
                    label="RT KTP"
                    value={activeRecord.rt}
                  />

                  {/* RW KTP */}
                  <ReadOnlyField
                    label="RW KTP"
                    value={activeRecord.rw}
                  />

                  {/* KEL / DESA */}
                  <ReadOnlyField
                    label="Kelurahan / Desa"
                    value={activeRecord.kelDesa || "PEMATANG TAHALO"}
                  />

                  {/* KECAMATAN */}
                  <ReadOnlyField
                    label="Kecamatan"
                    value={activeRecord.kecamatan}
                  />

                  {/* KOTA / KABUPATEN */}
                  <ReadOnlyField
                    label="Kota / Kabupaten"
                    value={activeRecord.kotaKabupaten}
                  />

                  {/* STATUS PERKAWINAN */}
                  <ReadOnlyField
                    label="Status Perkawinan"
                    value={activeRecord.statusPerkawinan}
                  />

                  {/* PEKERJAAN */}
                  <ReadOnlyField
                    label="Pekerjaan"
                    value={activeRecord.pekerjaan}
                  />

                  {/* KEWARGANEGARAAN */}
                  <ReadOnlyField
                    label="Kewarganegaraan"
                    value={activeRecord.kewarganegaraan || "WNI"}
                  />

                  {/* BERLAKU HINGGA */}
                  <ReadOnlyField
                    label="Berlaku Hingga"
                    value={activeRecord.berlakuHingga || "SEUMUR HIDUP"}
                    fullWidth
                  />

                </div>

              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 bg-gray-50 border-t border-gray-200 shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span>💡 Kroscek selesai?</span>
              <span className="hidden sm:inline">Klik tombol Tutup untuk kembali ke daftar riwayat.</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="px-8 py-3 text-xs font-black uppercase tracking-wider text-white bg-gray-900 hover:bg-black active:scale-95 rounded-2xl shadow-lg transition flex items-center gap-2"
              >
                <span>Tutup Arsip</span>
                <span className="text-gray-400 text-[10px]">✕</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
