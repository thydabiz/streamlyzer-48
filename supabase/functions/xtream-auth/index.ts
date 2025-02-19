
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface XtreamAuthRequest {
  url: string;
  username: string;
  password: string;
  action?: 'authenticate' | 'get_epg';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, username, password, action = 'authenticate' } = await req.json() as XtreamAuthRequest;
    console.log('Processing request:', { url, username, action });

    const baseUrl = url.replace(/\/$/, '');
    let apiEndpoint = '';

    if (action === 'authenticate') {
      apiEndpoint = `/player_api.php?username=${username}&password=${password}`;
    } else if (action === 'get_epg') {
      apiEndpoint = `/xmltv.php?username=${username}&password=${password}`;
    }

    const response = await fetch(`${baseUrl}${apiEndpoint}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    let data;
    if (action === 'authenticate') {
      data = await response.json();
      console.log('Authentication successful');
    } else {
      const xmlData = await response.text();
      // Process EPG XML data here if needed
      data = { success: true, data: xmlData };
      console.log('EPG data fetched successfully');
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
