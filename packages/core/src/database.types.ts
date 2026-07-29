// Hand-authored from supabase/migrations/0001_foundation.sql through
// 0004_account.sql. See ../README.md for how to replace this with a real
// `supabase gen types typescript` output once the CLI is linked.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Required by recent @supabase/supabase-js versions for correct generic
  // resolution (matches real `supabase gen types` output).
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          unit_preference: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          unit_preference?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          unit_preference?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'households_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      household_members: {
        Row: {
          household_id: string;
          profile_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          household_id: string;
          profile_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          household_id?: string;
          profile_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          code: string;
          created_by: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          code?: string;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          code?: string;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_invites_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      units: {
        Row: {
          id: string;
          name: string;
          abbreviation: string;
          dimension: Database['public']['Enums']['dimension'];
          to_base_factor: number;
        };
        Insert: {
          id: string;
          name: string;
          abbreviation: string;
          dimension: Database['public']['Enums']['dimension'];
          to_base_factor: number;
        };
        Update: {
          id?: string;
          name?: string;
          abbreviation?: string;
          dimension?: Database['public']['Enums']['dimension'];
          to_base_factor?: number;
        };
        Relationships: [];
      };
      categories: {
        Row: { id: string; name: string; sort_order: number };
        Insert: { id: string; name: string; sort_order?: number };
        Update: { id?: string; name?: string; sort_order?: number };
        Relationships: [];
      };
      locations: {
        Row: { id: string; name: string; sort_order: number };
        Insert: { id: string; name: string; sort_order?: number };
        Update: { id?: string; name?: string; sort_order?: number };
        Relationships: [];
      };
      common_items: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          default_unit_id: string | null;
          default_location_id: string | null;
          typical_shelf_life_days: number | null;
          aliases: string[];
          calories_per_100: number | null;
          protein_g_per_100: number | null;
          carbs_g_per_100: number | null;
          fat_g_per_100: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          default_unit_id?: string | null;
          default_location_id?: string | null;
          typical_shelf_life_days?: number | null;
          aliases?: string[];
          calories_per_100?: number | null;
          protein_g_per_100?: number | null;
          carbs_g_per_100?: number | null;
          fat_g_per_100?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          category_id?: string | null;
          default_unit_id?: string | null;
          default_location_id?: string | null;
          typical_shelf_life_days?: number | null;
          aliases?: string[];
          calories_per_100?: number | null;
          protein_g_per_100?: number | null;
          carbs_g_per_100?: number | null;
          fat_g_per_100?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'common_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'common_items_default_unit_id_fkey';
            columns: ['default_unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'common_items_default_location_id_fkey';
            columns: ['default_location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      pantry_items: {
        Row: {
          id: string;
          household_id: string;
          common_item_id: string | null;
          name: string;
          category_id: string | null;
          location_id: string | null;
          tracking_mode: 'precise' | 'count' | 'approximate';
          quantity: number | null;
          unit_id: string | null;
          approximate_level: 'full' | 'half' | 'low' | null;
          expiration_date: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          common_item_id?: string | null;
          name: string;
          category_id?: string | null;
          location_id?: string | null;
          tracking_mode?: 'precise' | 'count' | 'approximate';
          quantity?: number | null;
          unit_id?: string | null;
          approximate_level?: 'full' | 'half' | 'low' | null;
          expiration_date?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          common_item_id?: string | null;
          name?: string;
          category_id?: string | null;
          location_id?: string | null;
          tracking_mode?: 'precise' | 'count' | 'approximate';
          quantity?: number | null;
          unit_id?: string | null;
          approximate_level?: 'full' | 'half' | 'low' | null;
          expiration_date?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pantry_items_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pantry_items_common_item_id_fkey';
            columns: ['common_item_id'];
            isOneToOne: false;
            referencedRelation: 'common_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pantry_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pantry_items_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pantry_items_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pantry_items_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pantry_items_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      shopping_lists: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shopping_lists_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      shopping_list_items: {
        Row: {
          id: string;
          list_id: string;
          common_item_id: string | null;
          name: string;
          category_id: string | null;
          quantity: number | null;
          unit_id: string | null;
          checked: boolean;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          common_item_id?: string | null;
          name: string;
          category_id?: string | null;
          quantity?: number | null;
          unit_id?: string | null;
          checked?: boolean;
          added_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          list_id?: string;
          common_item_id?: string | null;
          name?: string;
          category_id?: string | null;
          quantity?: number | null;
          unit_id?: string | null;
          checked?: boolean;
          added_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shopping_list_items_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'shopping_lists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_list_items_common_item_id_fkey';
            columns: ['common_item_id'];
            isOneToOne: false;
            referencedRelation: 'common_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_list_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_list_items_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_list_items_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_household: {
        Args: { p_name: string };
        Returns: string;
      };
      accept_invite: {
        Args: { p_code: string };
        Returns: string;
      };
      is_household_member: {
        Args: { h: string };
        Returns: boolean;
      };
      ensure_shopping_list: {
        Args: Record<string, never>;
        Returns: string;
      };
      delete_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      dimension: 'mass' | 'volume' | 'count';
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Functions<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
