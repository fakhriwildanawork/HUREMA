
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
  image_google_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LocationAdministration {
  id: string;
  location_id: string;
  admin_date: string;
  status: 'Milik Sendiri' | 'Sewa/Kontrak' | 'Kerjasama';
  due_date?: string | null;
  description?: string;
  file_ids: string[]; // Array ID Google Drive
  created_at?: string;
}

export interface Schedule {
  id: string;
  name: string;
  type: 1 | 2 | 3 | 4;
  tolerance_minutes: number;
  tolerance_checkin_minutes: number;
  start_date?: string | null;
  end_date?: string | null;
  excluded_account_ids: string[];
  created_at?: string;
  updated_at?: string;
  rules?: ScheduleRule[];
  location_ids?: string[];
}

export interface ScheduleRule {
  id: string;
  schedule_id: string;
  day_of_week?: number;
  check_in_time?: string | null;
  check_out_time?: string | null;
  is_holiday: boolean;
}

export interface Account {
  id: string;
  // Identitas
  full_name: string;
  nik_ktp: string;
  photo_google_id?: string | null;
  ktp_google_id?: string | null;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  dob: string | null;
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
  diploma_google_id?: string | null;
  // Karier & Penempatan
  internal_nik: string;
  position: string;
  grade: string;
  location_id: string | null; // Relasi ke Location (UUID)
  schedule_id: string | null; // Relasi ke Schedule (UUID)
  // FIX: Added location property to support joined data from Supabase
  location?: any;
  employee_type: 'Tetap' | 'Kontrak' | 'Harian' | 'Magang';
  start_date: string | null;
  end_date?: string | null;
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
  location_id?: string | null;
  location_name: string;
  schedule_id?: string | null;
  file_sk_id?: string | null;
  notes?: string | null;
  change_date: string;
}

export interface CareerLogExtended extends CareerLog {
  account?: {
    full_name: string;
    internal_nik: string;
  };
}

export interface HealthLog {
  id: string;
  account_id: string;
  mcu_status: string;
  health_risk: string;
  file_mcu_id?: string | null;
  notes?: string | null;
  change_date: string;
}

export interface HealthLogExtended extends HealthLog {
  account?: {
    full_name: string;
    internal_nik: string;
  };
}

export interface AccountContract {
  id: string;
  account_id: string;
  contract_number: string;
  contract_type: string;
  start_date: string;
  end_date?: string | null;
  file_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AccountContractExtended extends AccountContract {
  account?: {
    full_name: string;
    internal_nik: string;
  };
}

export interface AccountCertification {
  id: string;
  account_id: string;
  entry_date: string;
  cert_type: string;
  cert_name: string;
  cert_date: string;
  file_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AccountCertificationExtended extends AccountCertification {
  account?: {
    full_name: string;
    internal_nik: string;
  };
}

export interface WarningLog {
  id: string;
  account_id: string;
  warning_type: 'Teguran' | 'SP1' | 'SP2' | 'SP3';
  reason: string;
  issue_date: string;
  file_id?: string | null;
  created_at?: string;
}

export interface WarningLogExtended extends WarningLog {
  account?: {
    full_name: string;
    internal_nik: string;
  };
}

export interface TerminationLog {
  id: string;
  account_id: string;
  termination_type: 'Pemecatan' | 'Resign';
  termination_date: string;
  reason: string;
  severance_amount: number;
  penalty_amount: number;
  file_id?: string | null;
  created_at?: string;
}

export interface TerminationLogExtended extends TerminationLog {
  account?: {
    full_name: string;
    internal_nik: string;
  };
}

export interface DigitalDocument {
  id: string;
  name: string;
  doc_type: string;
  file_id: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  allowed_account_ids?: string[];
}

export type LocationInput = Omit<Location, 'id' | 'created_at' | 'updated_at' | 'search_all'>;
export type LocationAdminInput = Omit<LocationAdministration, 'id' | 'created_at'>;
export type AccountInput = Omit<Account, 'id' | 'created_at' | 'updated_at' | 'search_all' | 'location'>;
export type CareerLogInput = Omit<CareerLog, 'id'>;
export type HealthLogInput = Omit<HealthLog, 'id'>;
export type AccountContractInput = Omit<AccountContract, 'id' | 'created_at' | 'updated_at'>;
export type AccountCertificationInput = Omit<AccountCertification, 'id' | 'created_at' | 'updated_at'>;
export type WarningLogInput = Omit<WarningLog, 'id' | 'created_at'>;
export type TerminationLogInput = Omit<TerminationLog, 'id' | 'created_at'>;
export type DocumentInput = Omit<DigitalDocument, 'id' | 'created_at' | 'updated_at' | 'allowed_account_ids'> & {
  allowed_account_ids: string[];
};

export type ScheduleInput = Omit<Schedule, 'id' | 'created_at' | 'updated_at' | 'rules' | 'location_ids'> & {
  rules: Omit<ScheduleRule, 'id' | 'schedule_id'>[];
  location_ids: string[];
};

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
}