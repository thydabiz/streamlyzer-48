
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, username, password } = await req.json() as XtreamCredentials;
    
    // Format the authentication URL
    const authUrl = new URL('/player_api.php', url);
    authUrl.searchParams.append('username', username);
    authUrl.searchParams.append('password', password);

    // Test authentication with the IPTV provider
    const response = await fetch(authUrl.toString());
    const data = await response.json();

    if (!response.ok || data.user === undefined) {
      throw new Error('Authentication failed');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Store encrypted credentials
    const { data: encryptedData, error: encryptionError } = await supabaseClient
      .rpc('encrypt_credentials', {
        p_username: username,
        p_password: password,
        p_encryption_key: Deno.env.get('ENCRYPTION_KEY')
      })

    if (encryptionError) {
      throw encryptionError;
    }

    // Save credentials
    const { error: saveError } = await supabaseClient
      .from('stream_credentials')
      .upsert({
        type: 'xtream',
        url: url,
        encrypted_username: encryptedData.encrypted_username,
        encrypted_password: encryptedData.encrypted_password
      })

    if (saveError) {
      throw saveError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: data.user,
          server_info: data.server_info
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})
