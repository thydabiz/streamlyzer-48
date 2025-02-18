
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting authentication process...');
    const credentials = await req.json() as XtreamCredentials;
    
    // Format the authentication URL
    let authUrl = credentials.url;
    if (!authUrl.endsWith('/')) {
      authUrl += '/';
    }
    authUrl += 'player_api.php';

    // Add query parameters
    const url = new URL(authUrl);
    url.searchParams.append('username', credentials.username);
    url.searchParams.append('password', credentials.password);

    console.log('Making request to:', url.toString());

    // Test authentication with the IPTV provider
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Invalid response from IPTV provider');
    }

    if (!response.ok) {
      console.error('HTTP error:', response.status, data);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!data || !data.user_info) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from IPTV provider');
    }

    console.log('Authentication successful');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: data.user_info,
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
    console.error('Authentication error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Authentication failed'
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
