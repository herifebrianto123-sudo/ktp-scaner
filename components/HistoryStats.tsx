import React, { useState } from "react";
import { FullDemographyStats, StatCardFilter } from "../services/demographyUtils";

interface HistoryStatsProps {
  stats: FullDemographyStats;
  isFiltered?: boolean;
  selectedCardFilter: StatCardFilter;
  onCardFilterChange: (filter: StatCardFilter) => void;
}

export const HistoryStats: React.FC<HistoryStatsProps> = ({
  stats,
  isFiltered = false,
  selectedCardFilter,
  onCardFilterChange
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "age" | "religion" | "marital">("all");

  const calcPct = (val: number, total: number) => {
    if (!total || total === 0) return "0%";
    return `${Math.round((val / total) * 100)}%`;
  };

  const handleCardClick = (targetFilter: StatCardFilter) => {
    if (selectedCardFilter === targetFilter) {
      onCardFilterChange("ALL");
    } else {
      onCardFilterChange(targetFilter);
    }
  };

  const getCardClasses = (filter: StatCardFilter, defaultBorder: string) => {
    const isSelected = selectedCardFilter === filter;
    return `cursor-pointer transition-all duration-200 select-none group relative overflow-hidden ${
      isSelected
        ? "ring-2 ring-white shadow-2xl scale-[1.02] bg-white/15 " + defaultBorder.replace("border-", "ring-")
        : "hover:scale-[1.01] hover:bg-white/10 active:scale-[0.98] " + defaultBorder
    }`;
  };

  return (
    <div className="bg-gray-900 rounded-[2.5rem] p-6 sm:p-8 mb-8 shadow-2xl border border-white/10 relative overflow-hidden text-white space-y-6">
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
              Statistik Demografi Kependudukan
            </h3>
            {isFiltered && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Sesuai Filter Wilayah
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>💡 <strong>Klik kartu apa saja</strong> untuk memfilter daftar warga di bawah sesuai kategori kartu.</span>
            {selectedCardFilter !== "ALL" && (
              <button
                onClick={() => onCardFilterChange("ALL")}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 underline ml-1"
              >
                Reset Filter Kartu (Tampilkan Semua)
              </button>
            )}
          </p>
        </div>

        {/* Tab Filters for stats */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === "all" ? "bg-red-600 text-white font-black shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setActiveTab("age")}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === "age" ? "bg-red-600 text-white font-black shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Usia
          </button>
          <button
            onClick={() => setActiveTab("religion")}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === "religion" ? "bg-red-600 text-white font-black shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Agama
          </button>
          <button
            onClick={() => setActiveTab("marital")}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === "marital" ? "bg-red-600 text-white font-black shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Nikah
          </button>
        </div>
      </div>

      {/* 1. PRIMARY CARDS: Total Jiwa, Laki-Laki, Perempuan, Kepala Keluarga */}
      {(activeTab === "all" || activeTab === "age") && (
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Total Jiwa */}
          <div
            onClick={() => handleCardClick("ALL")}
            className={`bg-gradient-to-br from-red-950/60 to-red-900/30 backdrop-blur p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${getCardClasses(
              "ALL",
              "border-red-500/30"
            )}`}
            title="Klik untuk menampilkan semua warga"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Total Jiwa</span>
              {selectedCardFilter === "ALL" ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white text-red-950 font-mono">
                  Aktif
                </span>
              ) : (
                <span className="p-1.5 bg-red-500/20 text-red-300 rounded-lg group-hover:scale-110 transition-transform">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
              )}
            </div>
            <div>
              <h4 className="text-2xl sm:text-3xl font-black text-white leading-none">{stats.total}</h4>
              <p className="text-[10px] text-red-300 font-semibold mt-1.5">Semua Warga</p>
            </div>
          </div>

          {/* Laki-Laki */}
          <div
            onClick={() => handleCardClick("LAKI")}
            className={`bg-gradient-to-br from-blue-950/60 to-blue-900/30 backdrop-blur p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${getCardClasses(
              "LAKI",
              "border-blue-500/30"
            )}`}
            title="Klik untuk hanya menampilkan warga Laki-Laki"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Laki-Laki</span>
              <div className="flex items-center gap-1">
                {selectedCardFilter === "LAKI" && (
                  <span className="text-[8px] font-black px-1 rounded bg-blue-400 text-slate-900">
                    Dipilih
                  </span>
                )}
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {calcPct(stats.male, stats.total)}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-2xl sm:text-3xl font-black text-white leading-none">{stats.male}</h4>
              <p className="text-[10px] text-blue-300 font-semibold mt-1.5">Klik filter Laki-Laki</p>
            </div>
          </div>

          {/* Perempuan */}
          <div
            onClick={() => handleCardClick("PEREMPUAN")}
            className={`bg-gradient-to-br from-pink-950/60 to-pink-900/30 backdrop-blur p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${getCardClasses(
              "PEREMPUAN",
              "border-pink-500/30"
            )}`}
            title="Klik untuk hanya menampilkan warga Perempuan"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-pink-400">Perempuan</span>
              <div className="flex items-center gap-1">
                {selectedCardFilter === "PEREMPUAN" && (
                  <span className="text-[8px] font-black px-1 rounded bg-pink-400 text-slate-900">
                    Dipilih
                  </span>
                )}
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">
                  {calcPct(stats.female, stats.total)}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-2xl sm:text-3xl font-black text-white leading-none">{stats.female}</h4>
              <p className="text-[10px] text-pink-300 font-semibold mt-1.5">Klik filter Perempuan</p>
            </div>
          </div>

          {/* Kepala Keluarga */}
          <div
            onClick={() => handleCardClick("KEPALA_KELUARGA")}
            className={`bg-gradient-to-br from-emerald-950/60 to-emerald-900/30 backdrop-blur p-4 sm:p-5 rounded-2xl border flex flex-col justify-between ${getCardClasses(
              "KEPALA_KELUARGA",
              "border-emerald-500/30"
            )}`}
            title="Klik untuk menampilkan Kepala Keluarga (Status Kawin Lk)"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Kepala Keluarga</span>
              {selectedCardFilter === "KEPALA_KELUARGA" ? (
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-400 text-slate-900">
                  Dipilih
                </span>
              ) : (
                <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg group-hover:scale-110 transition-transform">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
              )}
            </div>
            <div>
              <h4 className="text-2xl sm:text-3xl font-black text-white leading-none">{stats.heads}</h4>
              <p className="text-[10px] text-emerald-300 font-semibold mt-1.5">Status Kawin Lk</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. KELOMPOK USIA: Produktif, Pralansia, Lansia, Anak-Anak */}
      {(activeTab === "all" || activeTab === "age") && (
        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <span>⏳</span> Kelompok Usia Kependudukan
            </p>
            <span className="text-[10px] text-gray-400 font-medium">Klik salah satu kelompok usia untuk memfilter</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Usia Produktif */}
            <div
              onClick={() => handleCardClick("PRODUKTIF")}
              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                selectedCardFilter === "PRODUKTIF"
                  ? "bg-amber-500/20 ring-2 ring-amber-400 border-amber-400 scale-[1.02]"
                  : "bg-white/5 hover:bg-white/10 border-amber-500/30"
              } cursor-pointer transition-all active:scale-[0.98]`}
              title="Klik untuk memfilter usia 15 – 64 tahun"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Usia Produktif</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {selectedCardFilter === "PRODUKTIF" ? "✓ Dipilih" : calcPct(stats.age.produktif, stats.total)}
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-white leading-tight">{stats.age.produktif}</h4>
                <p className="text-[10px] text-amber-200/80 font-medium mt-0.5">Rentang 15 – 64 Tahun</p>
              </div>
            </div>

            {/* Pralansia */}
            <div
              onClick={() => handleCardClick("PRALANSIA")}
              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                selectedCardFilter === "PRALANSIA"
                  ? "bg-purple-500/20 ring-2 ring-purple-400 border-purple-400 scale-[1.02]"
                  : "bg-white/5 hover:bg-white/10 border-purple-500/30"
              } cursor-pointer transition-all active:scale-[0.98]`}
              title="Klik untuk memfilter usia 45 – 59 tahun"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">Pralansia</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {selectedCardFilter === "PRALANSIA" ? "✓ Dipilih" : calcPct(stats.age.pralansia, stats.total)}
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-white leading-tight">{stats.age.pralansia}</h4>
                <p className="text-[10px] text-purple-200/80 font-medium mt-0.5">Rentang 45 – 59 Tahun</p>
              </div>
            </div>

            {/* Lansia */}
            <div
              onClick={() => handleCardClick("LANSIA")}
              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                selectedCardFilter === "LANSIA"
                  ? "bg-teal-500/20 ring-2 ring-teal-400 border-teal-400 scale-[1.02]"
                  : "bg-white/5 hover:bg-white/10 border-teal-500/30"
              } cursor-pointer transition-all active:scale-[0.98]`}
              title="Klik untuk memfilter usia ≥ 60 tahun"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-teal-400">Lansia</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                  {selectedCardFilter === "LANSIA" ? "✓ Dipilih" : calcPct(stats.age.lansia, stats.total)}
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-white leading-tight">{stats.age.lansia}</h4>
                <p className="text-[10px] text-teal-200/80 font-medium mt-0.5">Usia ≥ 60 Tahun</p>
              </div>
            </div>

            {/* Anak & Remaja */}
            <div
              onClick={() => handleCardClick("ANAK")}
              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                selectedCardFilter === "ANAK"
                  ? "bg-sky-500/20 ring-2 ring-sky-400 border-sky-400 scale-[1.02]"
                  : "bg-white/5 hover:bg-white/10 border-sky-500/30"
              } cursor-pointer transition-all active:scale-[0.98]`}
              title="Klik untuk memfilter usia < 15 tahun"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-sky-400">Anak & Remaja</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  {selectedCardFilter === "ANAK" ? "✓ Dipilih" : calcPct(stats.age.anak, stats.total)}
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-black text-white leading-tight">{stats.age.anak}</h4>
                <p className="text-[10px] text-sky-200/80 font-medium mt-0.5">Usia &lt; 15 Tahun</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DISTRIBUSI AGAMA & STATUS PERKAWINAN */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel Agama */}
        {(activeTab === "all" || activeTab === "religion") && (
          <div className="bg-white/5 backdrop-blur p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>🕌</span> Berdasarkan Agama
              </p>
              <span className="text-[10px] text-gray-400 font-bold">Klik kotak untuk memfilter</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Islam */}
              <div
                onClick={() => handleCardClick("AGAMA_ISLAM")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "AGAMA_ISLAM"
                    ? "bg-emerald-500/25 ring-2 ring-emerald-400 border-emerald-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Islam</span>
                  <span>{calcPct(stats.religion.islam, stats.total)}</span>
                </div>
                <div className="text-lg font-black text-white">{stats.religion.islam}</div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: calcPct(stats.religion.islam, stats.total) }}
                  />
                </div>
              </div>

              {/* Kristen */}
              <div
                onClick={() => handleCardClick("AGAMA_KRISTEN")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "AGAMA_KRISTEN"
                    ? "bg-blue-500/25 ring-2 ring-blue-400 border-blue-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Kristen</span>
                  <span>{calcPct(stats.religion.kristen, stats.total)}</span>
                </div>
                <div className="text-lg font-black text-white">{stats.religion.kristen}</div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-blue-400 h-full rounded-full"
                    style={{ width: calcPct(stats.religion.kristen, stats.total) }}
                  />
                </div>
              </div>

              {/* Katolik */}
              <div
                onClick={() => handleCardClick("AGAMA_KATOLIK")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "AGAMA_KATOLIK"
                    ? "bg-indigo-500/25 ring-2 ring-indigo-400 border-indigo-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Katolik</span>
                  <span>{calcPct(stats.religion.katolik, stats.total)}</span>
                </div>
                <div className="text-lg font-black text-white">{stats.religion.katolik}</div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-400 h-full rounded-full"
                    style={{ width: calcPct(stats.religion.katolik, stats.total) }}
                  />
                </div>
              </div>

              {/* Hindu */}
              <div
                onClick={() => handleCardClick("AGAMA_HINDU")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "AGAMA_HINDU"
                    ? "bg-amber-500/25 ring-2 ring-amber-400 border-amber-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Hindu</span>
                  <span>{calcPct(stats.religion.hindu, stats.total)}</span>
                </div>
                <div className="text-lg font-black text-white">{stats.religion.hindu}</div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: calcPct(stats.religion.hindu, stats.total) }}
                  />
                </div>
              </div>

              {/* Buddha */}
              <div
                onClick={() => handleCardClick("AGAMA_BUDDHA")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "AGAMA_BUDDHA"
                    ? "bg-yellow-500/25 ring-2 ring-yellow-400 border-yellow-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Buddha</span>
                  <span>{calcPct(stats.religion.buddha, stats.total)}</span>
                </div>
                <div className="text-lg font-black text-white">{stats.religion.buddha}</div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full rounded-full"
                    style={{ width: calcPct(stats.religion.buddha, stats.total) }}
                  />
                </div>
              </div>

              {/* Konghucu / Lainnya */}
              <div
                onClick={() => handleCardClick("AGAMA_KONGHUCU")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "AGAMA_KONGHUCU"
                    ? "bg-rose-500/25 ring-2 ring-rose-400 border-rose-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Konghucu/Lain</span>
                  <span>{calcPct(stats.religion.konghucu + stats.religion.lainnya, stats.total)}</span>
                </div>
                <div className="text-lg font-black text-white">{stats.religion.konghucu + stats.religion.lainnya}</div>
                <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-rose-400 h-full rounded-full"
                    style={{ width: calcPct(stats.religion.konghucu + stats.religion.lainnya, stats.total) }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel Status Perkawinan */}
        {(activeTab === "all" || activeTab === "marital") && (
          <div className="bg-white/5 backdrop-blur p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <p className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <span>💍</span> Status Perkawinan
              </p>
              <span className="text-[10px] text-gray-400 font-bold">Klik kotak untuk memfilter</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Kawin */}
              <div
                onClick={() => handleCardClick("KAWIN")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "KAWIN"
                    ? "bg-emerald-500/25 ring-2 ring-emerald-400 border-emerald-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Kawin</span>
                  <span className="text-emerald-400 font-bold">{calcPct(stats.marital.kawin, stats.total)}</span>
                </div>
                <div className="text-xl font-black text-white">{stats.marital.kawin}</div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: calcPct(stats.marital.kawin, stats.total) }}
                  />
                </div>
              </div>

              {/* Belum Kawin */}
              <div
                onClick={() => handleCardClick("BELUM_KAWIN")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "BELUM_KAWIN"
                    ? "bg-blue-500/25 ring-2 ring-blue-400 border-blue-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Belum Kawin</span>
                  <span className="text-blue-400 font-bold">{calcPct(stats.marital.belumKawin, stats.total)}</span>
                </div>
                <div className="text-xl font-black text-white">{stats.marital.belumKawin}</div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-blue-400 h-full rounded-full"
                    style={{ width: calcPct(stats.marital.belumKawin, stats.total) }}
                  />
                </div>
              </div>

              {/* Cerai Hidup */}
              <div
                onClick={() => handleCardClick("CERAI_HIDUP")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "CERAI_HIDUP"
                    ? "bg-amber-500/25 ring-2 ring-amber-400 border-amber-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Cerai Hidup</span>
                  <span className="text-amber-400 font-bold">{calcPct(stats.marital.ceraiHidup, stats.total)}</span>
                </div>
                <div className="text-xl font-black text-white">{stats.marital.ceraiHidup}</div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: calcPct(stats.marital.ceraiHidup, stats.total) }}
                  />
                </div>
              </div>

              {/* Cerai Mati */}
              <div
                onClick={() => handleCardClick("CERAI_MATI")}
                className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-95 ${
                  selectedCardFilter === "CERAI_MATI"
                    ? "bg-purple-500/25 ring-2 ring-purple-400 border-purple-400"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                  <span className="font-bold text-gray-300">Cerai Mati</span>
                  <span className="text-purple-400 font-bold">{calcPct(stats.marital.ceraiMati, stats.total)}</span>
                </div>
                <div className="text-xl font-black text-white">{stats.marital.ceraiMati}</div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full"
                    style={{ width: calcPct(stats.marital.ceraiMati, stats.total) }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
