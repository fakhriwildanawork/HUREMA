
import { GDRIVE_FOLDER_ID } from '../constants';

export const config = {
  runtime: 'edge',
};

/**
 * Fungsi pembantu untuk membuat JWT (JSON Web Token) bagi Google OAuth2
 * menggunakan Service Account Private Key.
 */
async function getAccessToken(email: string, privateKey: string) {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  
  const payload = btoa(JSON.stringify({
    iss: email,
    // Mengubah scope menjadi full drive access untuk memastikan izin penulisan di folder yang dibagikan
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  }));

  const message = `${header}.${payload}`;
  
  // LOGIKA PEMBERSIHAN KEY
  let cleanedKey = privateKey.trim().replace(/^["']|["']$/g, '');
  cleanedKey = cleanedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/[\r\n\s]/g, '');

  try {
    const binaryDerString = atob(cleanedKey);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(message)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const jwt = `${message}.${encodedSignature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.error || 'Gagal mendapatkan access token');
    }
    return data.access_token;
  } catch (err: any) {
    throw new Error(`Format Private Key salah atau tidak valid: ${err.message}`);
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
      return new Response(JSON.stringify({ error: 'Kredensial Service Account belum diatur di Dashboard Vercel' }), { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Tidak ada file yang dikirim' }), { status: 400 });
    }

    const accessToken = await getAccessToken(serviceAccountEmail, privateKey);

    const metadata = {
      name: file.name,
      parents: [GDRIVE_FOLDER_ID],
      mimeType: file.type,
    };

    const boundary = 'hurema_boundary';
    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const mediaPart = `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`;
    const closingPart = `\r\n--${boundary}--`;

    const fileBuffer = await file.arrayBuffer();
    const body = new Uint8Array([
      ...new TextEncoder().encode(metadataPart),
      ...new TextEncoder().encode(mediaPart),
      ...new Uint8Array(fileBuffer),
      ...new TextEncoder().encode(closingPart),
    ]);

    // Menambahkan ?supportsAllDrives=true untuk mengizinkan upload ke folder yang dibagikan (Shared with me)
    const driveResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    const driveData = await driveResponse.json();

    if (!driveResponse.ok) {
      return new Response(JSON.stringify({ error: driveData.error?.message || 'Gagal upload ke Drive' }), { status: driveResponse.status });
    }

    return new Response(JSON.stringify({ id: driveData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('API Upload Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}
