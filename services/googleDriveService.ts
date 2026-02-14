
import { GDRIVE_FOLDER_ID } from '../constants';

// Add global declaration for 'google' which is provided by the Google Identity Services script
declare var google: any;

class GoogleDriveService {
  private accessToken: string | null = null;

  async initAuth(): Promise<string> {
    if (typeof google === 'undefined') {
      throw new Error('Google Identity Services (GSI) belum dimuat. Silakan muat ulang halaman atau tunggu sebentar.');
    }

    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: (import.meta as any).env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            reject(response);
          }
          this.accessToken = response.access_token;
          resolve(response.access_token);
        },
      });
      client.requestAccessToken();
    });
  }

  async uploadFile(file: File): Promise<string> {
    if (!this.accessToken) {
      await this.initAuth();
    }

    const metadata = {
      name: file.name,
      mimeType: file.type,
      parents: [GDRIVE_FOLDER_ID],
    };

    // Constructing manual multipart/related body for Google Drive API v3
    const boundary = 'hurema_upload_boundary';
    const header = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;

    const body = new Blob([header, file, footer], { type: 'multipart/related; boundary=' + boundary });

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: body,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Gagal mengunggah file ke Google Drive');
    }

    const result = await response.json();
    return result.id;
  }

  getFileUrl(fileId: string): string {
    // URL format used for direct image preview from Google Drive
    return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
  }
}

export const googleDriveService = new GoogleDriveService();
