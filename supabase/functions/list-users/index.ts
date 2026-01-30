import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the calling user from the JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Check if calling user is admin
    const { data: adminCheck, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // Get all users from auth.users using admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      throw rolesError;
    }

    // Get all profiles with usernames
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Combine users with their roles and usernames
    const usersWithRoles = users.map(user => {
      const userRoles = roles?.filter(r => r.user_id === user.id).map(r => r.role) || [];
      const userProfile = profiles?.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email || "",
        created_at: user.created_at,
        roles: userRoles,
        username: userProfile?.username || null
      };
    });

    return new Response(
      JSON.stringify({ users: usersWithRoles }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in list-users function:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
