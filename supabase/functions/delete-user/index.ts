import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DeleteUserRequest {
  password?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with anon key for user verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Create client with anon key to verify the user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body for optional password verification
    const body: DeleteUserRequest = await req.json().catch(() => ({}))

    // Optional: Verify password if provided
    if (body.password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: body.password,
      })

      if (signInError) {
        return new Response(
          JSON.stringify({ error: 'Invalid password' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Delete user's storage files (if any)
    try {
      // List all files in user's storage bucket
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('user-files')
        .list(`${user.id}/`, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (!listError && files && files.length > 0) {
        // Delete all user files
        const filePaths = files.map(file => `${user.id}/${file.name}`)
        const { error: deleteFilesError } = await supabaseAdmin.storage
          .from('user-files')
          .remove(filePaths)

        if (deleteFilesError) {
          console.error('Error deleting user files:', deleteFilesError)
          // Continue with user deletion even if file deletion fails
        }
      }
    } catch (storageError) {
      console.error('Error handling user storage:', storageError)
      // Continue with user deletion even if storage handling fails
    }

    // Delete the user from auth.users (this will cascade to related tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the deletion for audit purposes
    console.log(`User account deleted: ${user.id} (${user.email})`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User account successfully deleted' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})