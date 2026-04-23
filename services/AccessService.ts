import { supabase } from './supabaseClient';

export const verifyAccessPassword = async (password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
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
