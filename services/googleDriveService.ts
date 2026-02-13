
import { GDRIVE_FOLDER_ID } from '../constants';

// Add global declaration for 'google' which is provided by the Google Identity Services script
declare var google: any;

class GoogleDriveService {
  private accessToken: string | null = null;

  async initAuth(): Promise<string> {
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

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Gagal mengunggah file ke Google Drive');
    }

    const result = await response.json();
    return result.id;
  }

  getFileUrl(fileId: string): string {
    // In a real scenario, you might need a public proxy or specific drive link
    return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
  }
}

export const googleDriveService = new GoogleDriveService();
