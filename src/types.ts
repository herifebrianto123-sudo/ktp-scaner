export interface KtpData {
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  rt: string;
  rw: string;
  kelDesa: string;
  kecamatan: string;
  kotaKabupaten?: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlakuHingga: string;
}

export interface ScannedRecord extends KtpData {
  id: string;
  dusunFaktual: string; // "001" - "010"
  rtFaktual: string;    // "001" - "005"
  fotoKtp: string;      // base64 image or url
  linkFoto?: string;    // Google Drive link
  latitude?: number;
  longitude?: number;
  waktuPerekaman: string;
  statusKirim: "Tersimpan" | "Pending" | "Gagal";
  catatanPetugas?: string;
}

export const DUSUN_OPTIONS = [
  "001", "002", "003", "004", "005",
  "006", "007", "008", "009", "010"
];

export const RT_OPTIONS = [
  "001", "002", "003", "004", "005"
];
