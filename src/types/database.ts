
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          updated_at?: string
        }
      }
      stream_credentials: {
        Row: {
          id: string
          user_id: string
          type: 'xtream' | 'm3u' | 'mac'
          url: string
          username: string | null
          password: string | null
          mac_address: string | null
          serial_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'xtream' | 'm3u' | 'mac'
          url: string
          username?: string | null
          password?: string | null
          mac_address?: string | null
          serial_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'xtream' | 'm3u' | 'mac'
          url?: string
          username?: string | null
          password?: string | null
          mac_address?: string | null
          serial_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      epg_settings: {
        Row: {
          id: string
          user_id: string
          refresh_days: number
          last_refresh: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          refresh_days?: number
          last_refresh?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          refresh_days?: number
          last_refresh?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      channels: {
        Row: {
          id: string
          user_id: string
          channel_id: string
          name: string
          number: number | null
          logo: string | null
          stream_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          channel_id: string
          name: string
          number?: number | null
          logo?: string | null
          stream_url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          channel_id?: string
          name?: string
          number?: number | null
          logo?: string | null
          stream_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          user_id: string
          channel_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          category: string | null
          rating: string | null
          thumbnail: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          channel_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          category?: string | null
          rating?: string | null
          thumbnail?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          channel_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          category?: string | null
          rating?: string | null
          thumbnail?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
