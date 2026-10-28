import React from "react";
import { StatCardFilter, getStatCardFilterLabel } from "../services/demographyUtils";

interface HistoryFilterProps {
  selectedDusun: string;
  onDusunChange: (val: string) => void;
  selectedRt: string;
  onRtChange: (val: string) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCardFilter?: StatCardFilter;
  onClearCardFilter?: () => void;
  totalFiltered: number;
  totalAll: number;
  availableDusuns: string[];
  availableRts: string[];
  onReset: () => void;
}

export const HistoryFilter: React.FC<HistoryFilterProps> = ({
  selectedDusun,
  onDusunChange,
  selectedRt,
  onRtChange,
  searchQuery,
  onSearchChange,
  selectedCardFilter = "ALL",
  onClearCardFilter,
  totalFiltered,
  totalAll,
  availableDusuns,
  availableRts,
  onReset
}) => {
  const isFiltered =
    selectedDusun !== "ALL" ||
    selectedRt !== "ALL" ||
    searchQuery.trim() !== "" ||
    selectedCardFilter !== "ALL";

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 mb-6 shadow-sm border border-gray-100 space-y-4">
      {/* Header and counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-gray-900 tracking-tight">
              Filter Wilayah Faktual & Pencarian
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Saring data dan statistik berdasarkan Dusun, RT, atau klik kartu statistik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
            {totalFiltered} dari {totalAll} Jiwa
          </span>
          {isFiltered && (
            <button
              onClick={onReset}
              className="text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-gray-100 px-3 py-1 rounded-full transition flex items-center gap-1"
              title="Reset semua filter"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Dusun Faktual Filter */}
        <div className="sm:col-span-4 space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Dusun Faktual (Petugas)
          </label>
          <div className="relative">
            <select
              value={selectedDusun}
              onChange={(e) => onDusunChange(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 transition pr-9 cursor-pointer"
            >
              <option value="ALL">Semua Dusun</option>
              {availableDusuns.map((d) => (
                <option key={d} value={d}>
                  Dusun {d}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* RT Faktual Filter */}
        <div className="sm:col-span-3 space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
            RT Faktual (Petugas)
          </label>
          <div className="relative">
            <select
              value={selectedRt}
              onChange={(e) => onRtChange(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 transition pr-9 cursor-pointer"
            >
              <option value="ALL">Semua RT</option>
              {availableRts.map((r) => (
                <option key={r} value={r}>
                  RT {r}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="sm:col-span-5 space-y-1">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500">
            Cari Nama / NIK
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ketik nama atau 16 digit NIK..."
              className="w-full px-3.5 py-2.5 pl-9 pr-8 text-xs font-medium bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 transition"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Filter Aktif:</span>
          {selectedDusun !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-800 rounded-lg font-bold">
              <span>📍 Dusun {selectedDusun}</span>
              <button onClick={() => onDusunChange("ALL")} className="hover:text-red-950 font-black">×</button>
            </span>
          )}
          {selectedRt !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold">
              <span>📍 RT {selectedRt}</span>
              <button onClick={() => onRtChange("ALL")} className="hover:text-blue-950 font-black">×</button>
            </span>
          )}
          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold">
              <span>🔍 "{searchQuery}"</span>
              <button onClick={() => onSearchChange("")} className="hover:text-amber-950 font-black">×</button>
            </span>
          )}
          {selectedCardFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg font-black border border-purple-200">
              <span>🏷️ Kartu: {getStatCardFilterLabel(selectedCardFilter)}</span>
              {onClearCardFilter && (
                <button
                  onClick={onClearCardFilter}
                  className="hover:text-purple-950 font-black text-xs"
                  title="Hapus filter kartu"
                >
                  ×
                </button>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
