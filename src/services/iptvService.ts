
import { supabase } from '@/integrations/supabase/client';

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export const authenticateXtream = async (credentials: XtreamCredentials) => {
  const { data, error } = await supabase.functions.invoke('xtream-auth', {
    body: credentials
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);

  return data.data;
};

export const getStoredCredentials = async () => {
  const { data, error } = await supabase
    .from('stream_credentials')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};
