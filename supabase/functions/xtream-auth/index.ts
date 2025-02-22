
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StreamResponse {
  user_info: {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
  };
  available_channels: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, username, password, action } = await req.json()
    console.log('Received request:', { url, username, action })

    if (!url || !username || !password) {
      throw new Error('Missing required parameters')
    }

    // Create authentication URL
    const authUrl = `${url}/player_api.php?username=${username}&password=${password}`
    console.log('Authenticating with:', authUrl)

    // Fetch authentication data
    const authResponse = await fetch(authUrl)
    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.statusText}`)
    }

    const authData: StreamResponse = await authResponse.json()
    console.log('Authentication successful')

    if (action === 'get_epg') {
      // Fetch EPG data for each channel
      console.log('Fetching EPG data for channels...')
      const programs = []

      // Get current date in YYYY-MM-DD format
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]

      // Only process the first 10 channels for testing
      const channels = authData.available_channels.slice(0, 10)
      
      for (const channel of channels) {
        const epgUrl = `${url}/player_api.php?username=${username}&password=${password}&action=get_simple_data_table&stream_id=${channel.stream_id}`
        console.log(`Fetching EPG for channel ${channel.stream_id}`)
        
        try {
          const epgResponse = await fetch(epgUrl)
          if (epgResponse.ok) {
            const epgData = await epgResponse.json()
            if (Array.isArray(epgData)) {
              // Map EPG data to our program format
              const channelPrograms = epgData.map((program: any) => ({
                title: program.title || 'Unknown Program',
                description: program.description || '',
                start_time: new Date(program.start_timestamp * 1000).toISOString(),
                end_time: new Date(program.stop_timestamp * 1000).toISOString(),
                channel_id: channel.stream_id.toString(),
                category: program.category || 'Uncategorized',
                rating: null,
                thumbnail: program.image_path || null
              }))
              programs.push(...channelPrograms)
            }
          }
        } catch (error) {
          console.error(`Error fetching EPG for channel ${channel.stream_id}:`, error)
          // Continue with other channels even if one fails
          continue
        }
      }

      console.log(`Total programs fetched: ${programs.length}`)

      // Return both auth data and EPG data
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...authData,
            programs
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return just auth data for normal authentication
    return new Response(
      JSON.stringify({
        success: true,
        data: authData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
