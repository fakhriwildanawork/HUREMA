import { GDRIVE_FOLDER_ID } from '../constants';

export const config = {
  runtime: 'edge',
};

/**
 * Mendapatkan Access Token baru menggunakan Refresh Token secara otomatis.
 */
async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  // Ambil teks mentah dulu untuk jaga-jaga jika bukan JSON (misal 401 HTML)
  const responseText = await res.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    data = { error: 'Invalid JSON response', raw: responseText };
  }
  
  if (!res.ok) {
    // LOG UNTUK VERCEL DASHBOARD > LOGS
    console.error(`GOOGLE_TOKEN_EXCHANGE_FAILURE [Status: ${res.status}]:`, responseText);
    
    // Memberikan informasi yang lebih spesifik ke UI
    const detail = data.error_description || data.error || `HTTP ${res.status}`;
    throw new Error(`Google Auth Error: ${detail}`);
  }
  return data.access_token;
}

/**
 * Mengatur izin file menjadi publik.
 */
async function setFilePermission(fileId: string, accessToken: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('SET_PERMISSION_ERROR:', JSON.stringify(errorData));
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // Pengambilan variabel dengan Trimming ekstra dan logging keberadaan variabel
    const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET || '').trim();
    const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || process.env.VITE_GOOGLE_REFRESH_TOKEN || '').trim();

    if (!clientId || !clientSecret || !refreshToken) {
      console.error('MISSING_ENV_VARS:', { 
        hasId: !!clientId, 
        hasSecret: !!clientSecret, 
        hasToken: !!refreshToken 
      });
      return new Response(JSON.stringify({ 
        error: 'Kredensial OAuth2 belum lengkap di Vercel. Pastikan redeploy sudah dilakukan.' 
      }), { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Tidak ada file yang dikirim' }), { status: 400 });
    }

    // Mendapatkan token akses
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

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

    const driveResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    const driveData = await driveResponse.json();

    if (!driveResponse.ok) {
      console.error('DRIVE_UPLOAD_ERROR:', JSON.stringify(driveData));
      return new Response(JSON.stringify({ error: driveData.error?.message || 'Gagal upload ke Drive' }), { status: driveResponse.status });
    }


    await setFilePermission(driveData.id, accessToken);

    return new Response(JSON.stringify({ id: driveData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('API Upload Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
}