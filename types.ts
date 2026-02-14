
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

export type LocationInput = Omit<Location, 'id' | 'created_at' | 'updated_at' | 'search_all'>;

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
}
