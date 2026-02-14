
class GoogleDriveService {
  /**
   * Mengunggah file ke Google Drive melalui API Proxy internal.
   * Tidak memerlukan login user karena menggunakan Service Account di sisi server.
   */
  async uploadFile(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal mengunggah file. Pastikan Service Account sudah diatur di Vercel.');
      }

      const result = await response.json();
      if (!result.id) {
        throw new Error('ID File tidak ditemukan dalam respon API');
      }

      return result.id;
    } catch (error) {
      console.error('GoogleDriveService Error:', error);
      throw error;
    }
  }

  /**
   * Mendapatkan URL gambar publik dari ID File Google Drive.
   */
  getFileUrl(fileId: string): string {
    return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
  }
}

export const googleDriveService = new GoogleDriveService();
