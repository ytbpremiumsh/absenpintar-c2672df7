import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "schools", "profiles", "user_roles", "students", "classes", "class_teachers",
  "attendance_logs", "pickup_logs", "pickup_settings", "school_integrations",
  "school_subscriptions", "subscription_plans", "payment_transactions",
  "notifications", "support_tickets", "ticket_replies", "wa_message_logs",
  "landing_content", "landing_testimonials", "landing_trusted_schools",
  "platform_settings", "referrals", "point_transactions", "rewards",
  "reward_claims", "affiliates", "affiliate_commissions", "affiliate_withdrawals",
  "login_logs", "promo_content", "qr_instructions", "school_groups",
];

async function getAccessToken(serviceAccount: any): Promise<string> {
  // Create JWT for Google OAuth2
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const b64url = (data: Uint8Array) => {
    let binary = "";
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const b64urlStr = (str: string) => b64url(encoder.encode(str));

  const headerB64 = b64urlStr(JSON.stringify(header));
  const claimB64 = b64urlStr(JSON.stringify(claim));
  const signInput = `${headerB64}.${claimB64}`;

  // Import private key
  const pemContent = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signInput))
  );

  const jwt = `${signInput}.${b64url(signature)}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get Google access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

async function findOrCreateFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  // Search for existing folder
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  // Create folder
  const metadata: any = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });
  const createData = await createRes.json();
  if (!createData.id) throw new Error("Failed to create folder: " + JSON.stringify(createData));
  return createData.id;
}

async function uploadFile(accessToken: string, folderId: string, fileName: string, content: string): Promise<any> {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/json",
  };

  const boundary = "backup_boundary_" + Date.now();
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Check if Google Drive is configured
    const gdriveKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");

    if (action === "check-config") {
      return new Response(JSON.stringify({
        configured: !!gdriveKeyRaw,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "backup-now") {
      if (!gdriveKeyRaw) {
        return new Response(JSON.stringify({
          error: "Google Service Account belum dikonfigurasi. Silakan tambahkan secret GOOGLE_SERVICE_ACCOUNT_KEY.",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceAccount = JSON.parse(gdriveKeyRaw);
      const accessToken = await getAccessToken(serviceAccount);

      // Export all tables
      const backup: Record<string, any[]> = {};
      const stats: Record<string, number> = {};
      for (const table of TABLES) {
        const { data, error } = await supabase.from(table).select("*").limit(10000);
        if (error) {
          console.error(`Error exporting ${table}:`, error.message);
          backup[table] = [];
          stats[table] = 0;
        } else {
          backup[table] = data || [];
          stats[table] = (data || []).length;
        }
      }

      const totalRows = Object.values(stats).reduce((a, b) => a + b, 0);
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0]; // e.g., 2026-04-10

      // Create folder structure: ATSkolla Backup / 2026-04-10
      const rootFolderId = await findOrCreateFolder(accessToken, "ATSkolla Backup");
      const dayFolderId = await findOrCreateFolder(accessToken, dateStr, rootFolderId);

      // Upload file
      const timeStr = now.toISOString().replace(/[:.]/g, "-");
      const fileName = `backup_${timeStr}.json`;
      const content = JSON.stringify({ backup, meta: { exported_at: now.toISOString(), tables: Object.keys(stats).length, total_rows: totalRows, stats } }, null, 2);

      const uploadResult = await uploadFile(accessToken, dayFolderId, fileName, content);

      // Save metadata
      await supabase.from("platform_settings").upsert({
        key: "last_gdrive_backup_at",
        value: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "key" });

      await supabase.from("platform_settings").upsert({
        key: "last_gdrive_backup_info",
        value: JSON.stringify({
          file_name: fileName,
          folder: dateStr,
          file_id: uploadResult.id,
          web_link: uploadResult.webViewLink,
          total_rows: totalRows,
          tables: Object.keys(stats).length,
        }),
        updated_at: now.toISOString(),
      }, { onConflict: "key" });

      return new Response(JSON.stringify({
        success: true,
        file_name: fileName,
        folder: dateStr,
        file_id: uploadResult.id,
        web_link: uploadResult.webViewLink,
        total_rows: totalRows,
        tables: Object.keys(stats).length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-status") {
      const [lastAt, lastInfo] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "last_gdrive_backup_at").maybeSingle(),
        supabase.from("platform_settings").select("value").eq("key", "last_gdrive_backup_info").maybeSingle(),
      ]);

      return new Response(JSON.stringify({
        configured: !!gdriveKeyRaw,
        last_backup_at: lastAt.data?.value || null,
        last_backup_info: lastInfo.data?.value ? JSON.parse(lastInfo.data.value) : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "check-config", "backup-now", or "get-status"' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[backup-gdrive] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
