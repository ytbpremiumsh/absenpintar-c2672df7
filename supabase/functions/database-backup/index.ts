import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TABLES = [
  'schools', 'profiles', 'user_roles', 'students', 'classes', 'class_teachers',
  'attendance_logs', 'pickup_logs', 'pickup_settings', 'school_integrations',
  'school_subscriptions', 'subscription_plans', 'payment_transactions',
  'notifications', 'support_tickets', 'ticket_replies', 'wa_message_logs',
  'landing_content', 'landing_testimonials', 'landing_trusted_schools',
  'platform_settings', 'referrals', 'point_transactions', 'rewards',
  'reward_claims', 'affiliates', 'affiliate_commissions', 'affiliate_withdrawals',
  'login_logs', 'promo_content', 'qr_instructions', 'school_groups',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check super_admin role
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle()
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'export') {
      // Export all tables data
      const backup: Record<string, any[]> = {}
      const stats: Record<string, number> = {}

      for (const table of TABLES) {
        const { data, error } = await supabase.from(table).select('*').limit(10000)
        if (error) {
          console.error(`Error exporting ${table}:`, error.message)
          backup[table] = []
          stats[table] = 0
        } else {
          backup[table] = data || []
          stats[table] = (data || []).length
        }
      }

      const totalRows = Object.values(stats).reduce((a, b) => a + b, 0)

      // Store backup metadata in platform_settings
      await supabase.from('platform_settings').upsert({
        key: 'last_backup_at',
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

      await supabase.from('platform_settings').upsert({
        key: 'last_backup_stats',
        value: JSON.stringify({ tables: Object.keys(stats).length, totalRows, stats }),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

      return new Response(JSON.stringify({
        success: true,
        backup,
        meta: {
          exported_at: new Date().toISOString(),
          tables: Object.keys(stats).length,
          total_rows: totalRows,
          stats,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'stats') {
      // Just return backup stats without downloading full data
      const stats: Record<string, number> = {}
      for (const table of TABLES) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
        stats[table] = count || 0
      }
      const totalRows = Object.values(stats).reduce((a, b) => a + b, 0)

      // Get last backup info
      const [lastBackup, lastStats] = await Promise.all([
        supabase.from('platform_settings').select('value').eq('key', 'last_backup_at').maybeSingle(),
        supabase.from('platform_settings').select('value').eq('key', 'last_backup_stats').maybeSingle(),
      ])

      return new Response(JSON.stringify({
        success: true,
        current: { tables: Object.keys(stats).length, total_rows: totalRows, stats },
        last_backup_at: lastBackup.data?.value || null,
        last_backup_stats: lastStats.data?.value ? JSON.parse(lastStats.data.value) : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "export" or "stats"' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
