export type Database = {
    public: {
      Tables: {
        users: {
          Row: {
            id: string
            email: string
            first_name: string | null
            last_name: string | null
            phone_number: string | null
            role: string
            created_at: string
            updated_at: string
          }
          Insert: {
            id: string
            email: string
            first_name?: string | null
            last_name?: string | null
            phone_number?: string | null
            role?: string
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            email?: string
            first_name?: string | null
            last_name?: string | null
            phone_number?: string | null
            role?: string
            created_at?: string
            updated_at?: string
          }
        }
      }
    }
  }