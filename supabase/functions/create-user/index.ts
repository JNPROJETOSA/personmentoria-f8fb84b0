
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify the caller is an authenticated user (basic check)
        // For robust security, we should verify specific admin role from the JWT or DB.
        // Here we rely on the client passing the user token, but we are using SERVICE_ROLE_KEY to perform the action.
        // Crucially, we check if the requester is an admin in the database.

        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // Check if user is admin in profiles or whitelist
        // We can just query public.admin_whitelist
        const { data: whitelistEntry, error: whitelistError } = await supabaseClient
            .from('admin_whitelist')
            .select('role')
            .eq('email', user.email)
            .single()

        if (whitelistError || whitelistEntry?.role !== 'admin') {
            throw new Error('Unauthorized: Only admins can create users.')
        }

        const { email, password, role, name } = await req.json()

        if (!email || !password) {
            throw new Error('Email and password are required')
        }

        // Create the user
        const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: name || '' }
        })

        if (createError) throw createError

        // Add to whitelist/profiles if needed
        // The existing triggers might handle profile creation on sign up, but since we are creating manually,
        // the triggers should still fire when the user is inserted into auth.users.

        // However, we MUST ensure the user is in the whitelist so they can log in if we have whitelist logic in RLS or App
        // Upsert into whitelist (if not exists)
        const { error: whitelistInsertError } = await supabaseClient
            .from('admin_whitelist')
            .upsert({
                email,
                role: role || 'student',
                created_by: user.id
            }, { onConflict: 'email' })

        if (whitelistInsertError) throw whitelistInsertError

        return new Response(
            JSON.stringify(userData),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        )
    }
})
