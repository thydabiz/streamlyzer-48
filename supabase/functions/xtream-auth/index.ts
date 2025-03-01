
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
      console.error(`Authentication failed with status ${authResponse.status}: ${authResponse.statusText}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication failed: ${authResponse.statusText}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: authResponse.status }
      )
    }

    const authData = await authResponse.json()
    console.log('Authentication response received:', JSON.stringify(authData).substring(0, 100) + '...')

    // If user_info is present, authentication was successful
    if (authData?.user_info) {
      // Handle special action requests
      if (action === 'get_epg') {
        console.log('EPG data requested, but skipping for now')
        // Simply return success for now to fix authentication
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              programs: []  // Empty programs array for now
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // For regular authentication, return the available channels if any
      const channels = Array.isArray(authData.available_channels) ? authData.available_channels : []
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            available_channels: channels,
            user_info: authData.user_info,
            server_info: authData.server_info
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('Authentication response does not contain user_info:', authData)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid response format from provider'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
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
