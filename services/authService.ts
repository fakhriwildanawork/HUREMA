
import { supabase } from '../lib/supabase.ts';
import { AuthUser } from '../types.ts';

const SESSION_KEY = 'hurema_user_session';

/**
 * Utilitas untuk men-hash string menggunakan SHA-256 (Web Crypto API)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
  async login(accessCode: string, passwordRaw: string): Promise<AuthUser> {
    const hashedPassword = await hashPassword(passwordRaw);
    
    const { data, error } = await supabase
      .from('accounts')
      .select('id, full_name, internal_nik, access_code, photo_google_id')
      .eq('access_code', accessCode)
      .eq('password', hashedPassword)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Kode Akses atau Password salah.');

    const user: AuthUser = data as AuthUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  getCurrentUser(): AuthUser | null {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }
};
