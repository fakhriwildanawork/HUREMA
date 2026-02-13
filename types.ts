
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  zip_code: string;
  description: string;
  image_google_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type LocationInput = Omit<Location, 'id' | 'created_at' | 'updated_at'>;

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
}
