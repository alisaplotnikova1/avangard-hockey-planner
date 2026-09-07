import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, team, can_manage_exercises } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email и пароль обязательны" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Сервер не настроен" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      }),
    });

    const adminData = await adminRes.json();

    if (!adminRes.ok) {
      return new Response(JSON.stringify({ error: adminData.message || adminData.msg || "Ошибка создания пользователя" }), {
        status: adminRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = adminData.id;

    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        email,
        full_name: full_name || null,
        role: role || "coach",
        team: team || null,
        can_manage_exercises: can_manage_exercises || false,
      }),
    });

    if (!profileRes.ok) {
      const profileErr = await profileRes.json();
      return new Response(JSON.stringify({ error: "Пользователь создан, но профиль не обновлён", detail: profileErr }), {
        status: 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: userId, email, message: "Пользователь создан" }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
