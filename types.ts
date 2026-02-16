
export interface Location {
  id: string;
  name: string;
  location_type: string;
  address: string;
  city: string;
  province: string;
  zip_code: string;
  phone: string;
  latitude: number;
  longitude: number;
  radius: number;
  description: string;
  search_all: string;
  image_google_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LocationAdministration {
  id: string;
  location_id: string;
  admin_date: string;
  status: 'Milik Sendiri' | 'Sewa/Kontrak' | 'Kerjasama';
  due_date?: string;
  description?: string;
  file_ids: string[]; // Array ID Google Drive
  created_at?: string;
}

export interface Account {
  id: string;
  // Identitas
  full_name: string;
  nik_ktp: string;
  photo_google_id?: string;
  ktp_google_id?: string;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  dob: string;
  // Kontak & Sosial
  address: string;
  phone: string;
  email: string;
  marital_status: string;
  dependents_count: number;
  emergency_contact_name: string;
  emergency_contact_rel: string;
  emergency_contact_phone: string;
  // Pendidikan
  last_education: string;
  major: string; // Jurusan
  diploma_google_id?: string;
  // Karier & Penempatan
  internal_nik: string;
  position: string;
  grade: string;
  location_id: string; // Relasi ke Location
  employee_type: 'Tetap' | 'Kontrak' | 'Harian' | 'Magang';
  start_date: string;
  end_date?: string;
  // Pengaturan Kerja & Presensi
  schedule_type: string;
  leave_quota: number;
  is_presence_limited_checkin: boolean;
  is_presence_limited_checkout: boolean;
  is_presence_limited_ot_in: boolean;
  is_presence_limited_ot_out: boolean;
  // Keamanan & Medis
  access_code: string;
  password?: string;
  mcu_status: string;
  health_risk: string;
  
  created_at?: string;
  updated_at?: string;
  search_all?: string;
}

export interface CareerLog {
  id: string;
  account_id: string;
  position: string;
  grade: string;
  location_name: string;
  change_date: string;
}

export interface HealthLog {
  id: string;
  account_id: string;
  mcu_status: string;
  health_risk: string;
  change_date: string;
}

export type LocationInput = Omit<Location, 'id' | 'created_at' | 'updated_at' | 'search_all'>;
export type LocationAdminInput = Omit<LocationAdministration, 'id' | 'created_at'>;
export type AccountInput = Omit<Account, 'id' | 'created_at' | 'updated_at' | 'search_all'>;

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
}
