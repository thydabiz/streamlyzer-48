
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create authentication URL
    const authUrl = `${url}/player_api.php?username=${username}&password=${password}`
    console.log('Authenticating with:', authUrl)

    // Fetch authentication data
    const authResponse = await fetch(authUrl)
    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication failed: ${authResponse.statusText}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: authResponse.status }
      )
    }

    const authData = await authResponse.json()
    console.log('Authentication response received')

    // Validate the auth response structure
    if (!authData || !Array.isArray(authData?.available_channels)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid response format from provider'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (action === 'get_epg') {
      console.log('Fetching EPG data for channels...')
      const programs = []
      const channels = authData.available_channels.slice(0, 10)

      for (const channel of channels) {
        if (!channel.stream_id) {
          console.log('Skipping channel without stream_id:', channel)
          continue
        }

        const epgUrl = `${url}/player_api.php?username=${username}&password=${password}&action=get_simple_data_table&stream_id=${channel.stream_id}`
        console.log(`Fetching EPG for channel ${channel.stream_id}`)
        
        try {
          const epgResponse = await fetch(epgUrl)
          if (!epgResponse.ok) {
            console.error(`Failed to fetch EPG for channel ${channel.stream_id}:`, epgResponse.statusText)
            continue
          }

          const epgData = await epgResponse.json()
          if (!Array.isArray(epgData)) {
            console.error(`Invalid EPG data format for channel ${channel.stream_id}`)
            continue
          }

          const channelPrograms = epgData.map((program: any) => ({
            title: program.title || 'Unknown Program',
            description: program.description || '',
            start_time: new Date(program.start_timestamp * 1000).toISOString(),
            end_time: new Date(program.stop_timestamp * 1000).toISOString(),
            channel_id: channel.stream_id.toString(),
            category: program.category || 'Uncategorized',
            rating: null,
            thumbnail: program.image_path || null
          })).filter(program => 
            program.title && 
            !isNaN(new Date(program.start_time).getTime()) && 
            !isNaN(new Date(program.end_time).getTime())
          )

          programs.push(...channelPrograms)
          console.log(`Added ${channelPrograms.length} programs for channel ${channel.stream_id}`)
        } catch (error) {
          console.error(`Error processing EPG for channel ${channel.stream_id}:`, error)
          continue
        }
      }

      console.log(`Total programs processed: ${programs.length}`)
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            available_channels: authData.available_channels,
            programs
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          available_channels: authData.available_channels
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in edge function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
