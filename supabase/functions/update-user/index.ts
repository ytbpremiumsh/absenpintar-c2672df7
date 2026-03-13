import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is authenticated and has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error('Unauthorized');

    // Check caller has school_admin or super_admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    const callerRoles = (roles || []).map(r => r.role);
    if (!callerRoles.includes('school_admin') && !callerRoles.includes('super_admin')) {
      throw new Error('Insufficient permissions');
    }

    const { user_id, full_name, email, password, phone } = await req.json();
    if (!user_id) throw new Error('user_id is required');

    // Update profile name if provided
    if (full_name) {
      await supabaseAdmin.from('profiles').update({ full_name }).eq('user_id', user_id);
    }

    // Update auth user (email, password) if provided
    const authUpdate: any = {};
    if (email) authUpdate.email = email;
    if (password && password.length >= 6) authUpdate.password = password;
    if (phone) authUpdate.phone = phone;

    if (Object.keys(authUpdate).length > 0) {
      if (email) authUpdate.email_confirm = true;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
