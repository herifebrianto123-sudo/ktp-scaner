
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
  kotaKabupaten: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlakuHingga: string;
  dusunFaktual?: string;
  rtFaktual?: string;
  latitude?: number;
  longitude?: number;
  waktuInput?: string;
  waktuPerekaman?: string;
  linkFoto?: string;
  fotoKtp?: string;
  image?: string;
  statusKirim?: string;
}

export type ExtractionStatus = 'idle' | 'processing' | 'success' | 'error' | 'saved';
export type ViewMode = 'scanner' | 'history';

export interface AppState {
  image: string | null;
  extractedData: KtpData | null;
  status: ExtractionStatus;
  errorMessage: string | null;
  viewMode: ViewMode;
  history: KtpData[];
}
