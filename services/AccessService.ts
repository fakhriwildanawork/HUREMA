import { getSupabase } from './supabaseClient';

export const verifyAccessPassword = async (password: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { data, error } = await client
      .from('access')
      .select('password')
      .eq('uuid', 'admin-01')
      .maybeSingle();

    if (error || !data) {
       return false;
    }

    return data.password === password;
  } catch (err) {
    // Avoid logging sensitive information
    console.error("Access verification logic encountered an issue.");
    return false;
  }
};
