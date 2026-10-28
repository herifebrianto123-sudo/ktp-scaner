import { KtpData } from "../types";

export interface AgeStats {
  produktif: number;  // 15 - 64 tahun (BPS / BKKBN)
  pralansia: number;  // 45 - 59 tahun (Permenkes RI)
  lansia: number;     // >= 60 tahun (UU No. 13/1998 & Kemenkes RI)
  anak: number;       // < 15 tahun
  unknown: number;
}

export interface ReligionStats {
  islam: number;
  kristen: number;
  katolik: number;
  hindu: number;
  buddha: number;
  konghucu: number;
  lainnya: number;
}

export interface MaritalStats {
  kawin: number;
  belumKawin: number;
  ceraiHidup: number;
  ceraiMati: number;
  lainnya: number;
}

export interface FullDemographyStats {
  total: number;
  male: number;
  female: number;
  heads: number;
  age: AgeStats;
  religion: ReligionStats;
  marital: MaritalStats;
}

/**
 * Normalisasi nomor dusun agar formatnya seragam 3 digit (contoh: "1" -> "001", "10" -> "010").
 * Mengabaikan nilai yang bergeser ke link URL.
 */
export const normalizeDusun = (val?: string): string => {
  if (!val) return "";
  const str = String(val).trim();
  if (str.startsWith("http")) return "";
  const digits = str.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  if (num >= 1 && num <= 20) {
    return String(num).padStart(3, "0");
  }
  return str;
};

/**
 * Normalisasi nomor RT agar formatnya seragam 3 digit (contoh: "4" -> "004", "005" -> "005").
 * Mengabaikan nilai koordinat seperti "-5.425...".
 */
export const normalizeRt = (val?: string): string => {
  if (!val) return "";
  const str = String(val).trim();
  if (str.includes(".") || str.startsWith("-")) return "";
  const digits = str.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  if (num >= 1 && num <= 50) {
    return String(num).padStart(3, "0");
  }
  return str;
};

/**
 * Menghitung usia warga secara akurat dari tanggalLahir atau dari 16 digit NIK
 */
export const calculateAge = (item: KtpData): number | null => {
  let birthDate: Date | null = null;
  const now = new Date();

  // 1. Cek tanggalLahir
  if (item.tanggalLahir) {
    const raw = String(item.tanggalLahir).trim();
    // Bisa format yyyy-MM-dd
    const dateMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const day = parseInt(dateMatch[3], 10);
      if (year > 1900 && year <= now.getFullYear() && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        birthDate = new Date(year, month, day);
      }
    } else {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() <= now.getFullYear()) {
        birthDate = parsed;
      }
    }
  }

  // 2. Jika tanggalLahir tidak valid atau kosong, ambil dari NIK (digit 7 s/d 12: DDMMYY)
  if (!birthDate && item.nik) {
    const digits = String(item.nik).replace(/\D/g, "");
    if (digits.length >= 12) {
      let day = parseInt(digits.substring(6, 8), 10);
      const month = parseInt(digits.substring(8, 10), 10);
      const year2 = parseInt(digits.substring(10, 12), 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year2)) {
        if (day > 40) day -= 40; // Perempuan ditambahkan 40 di KTP Indonesia
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          const currentYear2 = now.getFullYear() % 100;
          const fullYear = year2 > currentYear2 ? 1900 + year2 : 2000 + year2;
          birthDate = new Date(fullYear, month - 1, day);
        }
      }
    }
  }

  if (!birthDate) return null;

  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 && age <= 130 ? age : null;
};

/**
 * Menghitung seluruh ringkasan demografi dari kumpulan data KTP
 */
export const calculateDemography = (data: KtpData[]): FullDemographyStats => {
  const stats: FullDemographyStats = {
    total: data.length,
    male: 0,
    female: 0,
    heads: 0,
    age: {
      produktif: 0,
      pralansia: 0,
      lansia: 0,
      anak: 0,
      unknown: 0
    },
    religion: {
      islam: 0,
      kristen: 0,
      katolik: 0,
      hindu: 0,
      buddha: 0,
      konghucu: 0,
      lainnya: 0
    },
    marital: {
      kawin: 0,
      belumKawin: 0,
      ceraiHidup: 0,
      ceraiMati: 0,
      lainnya: 0
    }
  };

  data.forEach((item) => {
    // 1. Jenis Kelamin
    const jk = String(item.jenisKelamin || "").toUpperCase();
    if (jk.includes("LAKI")) {
      stats.male++;
    } else if (jk.includes("PEREMPUAN")) {
      stats.female++;
    }

    // 2. Status Perkawinan & KK
    const statusKawin = String(item.statusPerkawinan || "").toUpperCase().trim();
    if (statusKawin.includes("BELUM")) {
      stats.marital.belumKawin++;
    } else if (statusKawin.includes("CERAI HIDUP")) {
      stats.marital.ceraiHidup++;
    } else if (statusKawin.includes("CERAI MATI")) {
      stats.marital.ceraiMati++;
    } else if (statusKawin.includes("KAWIN")) {
      stats.marital.kawin++;
      // Kepala keluarga estimasi: Laki-laki dengan status kawin
      if (jk.includes("LAKI")) {
        stats.heads++;
      }
    } else if (statusKawin) {
      stats.marital.lainnya++;
    }

    // 3. Agama
    const agama = String(item.agama || "").toUpperCase().trim();
    if (agama.includes("ISLAM")) {
      stats.religion.islam++;
    } else if (agama.includes("KRISTEN") || agama.includes("PROTESTAN")) {
      stats.religion.kristen++;
    } else if (agama.includes("KATOLIK")) {
      stats.religion.katolik++;
    } else if (agama.includes("HINDU")) {
      stats.religion.hindu++;
    } else if (agama.includes("BUDDHA") || agama.includes("BUDHA")) {
      stats.religion.buddha++;
    } else if (agama.includes("KONGHUCU") || agama.includes("KHONGHUCU")) {
      stats.religion.konghucu++;
    } else if (agama) {
      stats.religion.lainnya++;
    }

    // 4. Usia
    const age = calculateAge(item);
    if (age === null) {
      stats.age.unknown++;
    } else {
      if (age < 15) {
        stats.age.anak++;
      }
      // Usia Produktif (15 - 64 tahun)
      if (age >= 15 && age <= 64) {
        stats.age.produktif++;
      }
      // Pralansia (45 - 59 tahun)
      if (age >= 45 && age <= 59) {
        stats.age.pralansia++;
      }
      // Lansia (>= 60 tahun)
      if (age >= 60) {
        stats.age.lansia++;
      }
    }
  });

  return stats;
};

export type StatCardFilter =
  | "ALL"
  | "LAKI"
  | "PEREMPUAN"
  | "KEPALA_KELUARGA"
  | "PRODUKTIF"
  | "PRALANSIA"
  | "LANSIA"
  | "ANAK"
  | "AGAMA_ISLAM"
  | "AGAMA_KRISTEN"
  | "AGAMA_KATOLIK"
  | "AGAMA_HINDU"
  | "AGAMA_BUDDHA"
  | "AGAMA_KONGHUCU"
  | "KAWIN"
  | "BELUM_KAWIN"
  | "CERAI_HIDUP"
  | "CERAI_MATI";

export const getStatCardFilterLabel = (filter: StatCardFilter): string => {
  switch (filter) {
    case "LAKI":
      return "Laki-Laki";
    case "PEREMPUAN":
      return "Perempuan";
    case "KEPALA_KELUARGA":
      return "Kepala Keluarga (Status Kawin Lk)";
    case "PRODUKTIF":
      return "Usia Produktif (15 – 64 Tahun)";
    case "PRALANSIA":
      return "Pralansia (45 – 59 Tahun)";
    case "LANSIA":
      return "Lansia (≥ 60 Tahun)";
    case "ANAK":
      return "Anak & Remaja (< 15 Tahun)";
    case "AGAMA_ISLAM":
      return "Agama Islam";
    case "AGAMA_KRISTEN":
      return "Agama Kristen";
    case "AGAMA_KATOLIK":
      return "Agama Katolik";
    case "AGAMA_HINDU":
      return "Agama Hindu";
    case "AGAMA_BUDDHA":
      return "Agama Buddha";
    case "AGAMA_KONGHUCU":
      return "Agama Konghucu / Lainnya";
    case "KAWIN":
      return "Status Perkawinan: Kawin";
    case "BELUM_KAWIN":
      return "Status Perkawinan: Belum Kawin";
    case "CERAI_HIDUP":
      return "Status Perkawinan: Cerai Hidup";
    case "CERAI_MATI":
      return "Status Perkawinan: Cerai Mati";
    default:
      return "Semua Warga";
  }
};

export const matchesStatCardFilter = (item: KtpData, filter: StatCardFilter): boolean => {
  if (filter === "ALL") return true;

  const jk = String(item.jenisKelamin || "").toUpperCase();
  const statusKawin = String(item.statusPerkawinan || "").toUpperCase().trim();
  const agama = String(item.agama || "").toUpperCase().trim();
  const age = calculateAge(item);

  switch (filter) {
    case "LAKI":
      return jk.includes("LAKI");
    case "PEREMPUAN":
      return jk.includes("PEREMPUAN");
    case "KEPALA_KELUARGA":
      return jk.includes("LAKI") && statusKawin.includes("KAWIN") && !statusKawin.includes("BELUM");
    case "PRODUKTIF":
      return age !== null && age >= 15 && age <= 64;
    case "PRALANSIA":
      return age !== null && age >= 45 && age <= 59;
    case "LANSIA":
      return age !== null && age >= 60;
    case "ANAK":
      return age !== null && age < 15;
    case "AGAMA_ISLAM":
      return agama.includes("ISLAM");
    case "AGAMA_KRISTEN":
      return agama.includes("KRISTEN") || agama.includes("PROTESTAN");
    case "AGAMA_KATOLIK":
      return agama.includes("KATOLIK");
    case "AGAMA_HINDU":
      return agama.includes("HINDU");
    case "AGAMA_BUDDHA":
      return agama.includes("BUDDHA") || agama.includes("BUDHA");
    case "AGAMA_KONGHUCU":
      return (
        agama.includes("KONGHUCU") ||
        agama.includes("KHONGHUCU") ||
        (!agama.includes("ISLAM") &&
          !agama.includes("KRISTEN") &&
          !agama.includes("KATOLIK") &&
          !agama.includes("HINDU") &&
          !agama.includes("BUDDHA") &&
          agama !== "")
      );
    case "KAWIN":
      return statusKawin.includes("KAWIN") && !statusKawin.includes("BELUM");
    case "BELUM_KAWIN":
      return statusKawin.includes("BELUM");
    case "CERAI_HIDUP":
      return statusKawin.includes("CERAI HIDUP");
    case "CERAI_MATI":
      return statusKawin.includes("CERAI MATI");
    default:
      return true;
  }
};

