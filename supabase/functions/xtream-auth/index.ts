
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, username, password, action = 'authenticate' } = await req.json() as XtreamAuthRequest;
    console.log('Processing request:', { url, username, action });

    const baseUrl = url.replace(/\/$/, '');

    // Authentication request
    if (action === 'authenticate') {
      const response = await fetch(`${baseUrl}/player_api.php?username=${username}&password=${password}`);
      
      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Authentication successful');

      return new Response(JSON.stringify({ 
        success: true, 
        data: {
          ...data,
          available_channels: await getChannels(baseUrl, username, password)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // EPG data request
    if (action === 'get_epg') {
      const epgResponse = await fetch(`${baseUrl}/xmltv.php?username=${username}&password=${password}`);
      
      if (!epgResponse.ok) {
        throw new Error(`Failed to fetch EPG data: ${epgResponse.statusText}`);
      }

      const epgData = await epgResponse.text();
      const parsedEPG = await parseEPGData(epgData);

      return new Response(JSON.stringify({ 
        success: true, 
        data: parsedEPG 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
});

async function getChannels(baseUrl: string, username: string, password: string) {
  const response = await fetch(`${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch channels');
  }

  return await response.json();
}

async function parseEPGData(xmlData: string) {
  // Here we would parse the XML EPG data and store it in the database
  // For now, we'll just return a success message
  return {
    message: 'EPG data processed successfully',
    timestamp: new Date().toISOString()
  };
}
