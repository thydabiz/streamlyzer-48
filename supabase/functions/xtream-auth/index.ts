
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
  action?: string;
  category_id?: string;
  stream_id?: string;
}

const constructXtreamApiUrl = (
  baseUrl: string, 
  username: string, 
  password: string, 
  action?: string,
  additionalParams: Record<string, string> = {}
): string => {
  // Clean the URL
  let url = baseUrl;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  url = url.replace(/\/$/, '');

  let endpoint = '';
  let queryParams = '';

  // Construct the endpoint and query parameters based on the action
  if (!action || action === 'auth') {
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}`;
  } else if (action === 'get_live_streams') {
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}&action=get_live_streams`;
    
    // Add category_id if provided
    if (additionalParams.category_id) {
      queryParams += `&category_id=${additionalParams.category_id}`;
    }
  } else if (action === 'get_epg') {
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}&action=get_simple_data_table&stream_id=1`;
  } else if (action === 'get_live_categories') {
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}&action=get_live_categories`;
  } else if (action === 'get_vod_categories') {
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}&action=get_vod_categories`;
  } else if (action === 'get_vod_streams') {
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}&action=get_vod_streams`;
    
    // Add category_id if provided
    if (additionalParams.category_id) {
      queryParams += `&category_id=${additionalParams.category_id}`;
    }
  } else if (action === 'get_vod_info') {
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}&action=get_vod_info&vod_id=${additionalParams.stream_id || ''}`;
  } else if (action === 'panel_api') {
    endpoint = `/panel_api.php`;
    queryParams = `?username=${username}&password=${password}`;
  } else {
    // For any other action, just use the provided action
    endpoint = `/player_api.php`;
    queryParams = `?username=${username}&password=${password}&action=${action}`;
    
    // Add any additional parameters
    for (const [key, value] of Object.entries(additionalParams)) {
      if (value) {
        queryParams += `&${key}=${value}`;
      }
    }
  }

  return `${url}${endpoint}${queryParams}`;
};

const handleXtreamRequest = async (request: Request): Promise<Response> => {
  try {
    const { url, username, password, action, category_id, stream_id } = await request.json() as XtreamCredentials;
    
    console.log(`Processing Xtream request: action=${action || 'auth'}`);
    
    if (!url || !username || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: url, username, password'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 400,
        }
      );
    }

    const additionalParams: Record<string, string> = {};
    if (category_id) additionalParams.category_id = category_id;
    if (stream_id) additionalParams.stream_id = stream_id;
    
    const apiUrl = constructXtreamApiUrl(url, username, password, action, additionalParams);
    console.log(`Making request to: ${apiUrl.replace(/username=.*?&password=.*?(&|$)/, 'username=***&password=***$1')}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`HTTP error from Xtream API: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `HTTP error: ${response.status} ${response.statusText}`
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 502,
        }
      );
    }

    // Get the response data
    let responseData: any;
    try {
      responseData = await response.json();
      console.log(`Received response from Xtream API for action: ${action || 'auth'}`);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON response from server'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 502,
        }
      );
    }

    // Handle authentication response
    if (!action || action === 'auth') {
      // Check for user_info which indicates successful auth
      if (!responseData.user_info) {
        console.error('Authentication failed - no user_info in response:', responseData);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Authentication failed',
            data: responseData
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            status: 401,
          }
        );
      }

      // Fetch live streams
      const liveStreamsUrl = constructXtreamApiUrl(url, username, password, 'get_live_streams');
      console.log('Fetching live streams...');
      
      try {
        const liveStreamsResponse = await fetch(liveStreamsUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
          }
        });

        if (liveStreamsResponse.ok) {
          const liveStreamsData = await liveStreamsResponse.json();
          console.log(`Received ${Array.isArray(liveStreamsData) ? liveStreamsData.length : 'unknown'} live streams`);
          
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                user_info: responseData.user_info,
                server_info: responseData.server_info,
                available_channels: Array.isArray(liveStreamsData) ? liveStreamsData : []
              }
            }),
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              status: 200,
            }
          );
        } else {
          console.error(`Failed to fetch live streams: ${liveStreamsResponse.status} ${liveStreamsResponse.statusText}`);
          // Continue with just the authentication data
        }
      } catch (error) {
        console.error('Error fetching live streams:', error);
        // Continue with just the authentication data
      }
      
      // Return just the authentication data if we couldn't fetch live streams
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user_info: responseData.user_info,
            server_info: responseData.server_info,
            available_channels: []
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    } 
    // Handle EPG data response
    else if (action === 'get_epg') {
      // Extract EPG data based on the common formats
      let epgData = [];
      
      // Try to find EPG data in the response
      if (Array.isArray(responseData)) {
        // Some providers return EPG data as a direct array
        epgData = responseData;
      } else if (responseData.epg_listings && Array.isArray(responseData.epg_listings)) {
        epgData = responseData.epg_listings;
      } else if (responseData.programmes && Array.isArray(responseData.programmes)) {
        epgData = responseData.programmes;
      } else if (responseData.events && Array.isArray(responseData.events)) {
        epgData = responseData.events;
      } else {
        // Try to find arrays in the response that might contain EPG data
        for (const key in responseData) {
          if (Array.isArray(responseData[key]) && responseData[key].length > 0) {
            const sample = responseData[key][0];
            if (sample && (
              (sample.title && (sample.start || sample.start_time) && (sample.end || sample.end_time)) ||
              (sample.program_title && sample.program_start && sample.program_end) ||
              (sample.name && sample.start_timestamp && sample.stop_timestamp)
            )) {
              epgData = responseData[key];
              break;
            }
          }
        }
      }
      
      console.log(`Found ${epgData.length} EPG entries`);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            programs: epgData
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }
    // For all other actions, return the raw response data
    else {
      return new Response(
        JSON.stringify({
          success: true,
          data: responseData
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Handle Xtream authentication requests
  if (req.method === 'POST') {
    return handleXtreamRequest(req);
  }

  // Return method not allowed for anything else
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 405,
    }
  );
});
