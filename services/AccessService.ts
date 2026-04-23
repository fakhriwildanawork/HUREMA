import { getSupabase } from './supabaseClient';

export const verifyAccessPassword = async (password: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { data, error } = await client
      .from('access')
      .select('password')
      .eq('password', password)
      .single();

    if (error) {
       return false;
    }

    return data !== null;
  } catch (err) {
    console.error("Error verifying access:", err);
    return false;
  }
};
