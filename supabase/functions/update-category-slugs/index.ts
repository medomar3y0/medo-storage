import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all categories without slugs
    const { data: categories, error: fetchError } = await supabase
      .from("categories")
      .select("id, name")
      .or("slug.is.null,slug.eq.");

    if (fetchError) throw fetchError;

    if (!categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ message: "No categories need updating" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let updated = 0;
    let failed = 0;

    for (const category of categories) {
      try {
        // Translate name to slug using AI
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a translator. Translate the given Arabic text to English and return ONLY the translated text in lowercase, replace spaces with hyphens, and remove any special characters. Keep numbers and English text as is. Example: 'محاسبة 101' -> 'accounting-101', 'برمجة' -> 'programming'"
              },
              {
                role: "user",
                content: category.name
              }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`Failed to translate ${category.name}:`, aiResponse.status);
          failed++;
          continue;
        }

        const aiData = await aiResponse.json();
        const slug = aiData.choices[0].message.content.trim();

        // Update category with new slug
        const { error: updateError } = await supabase
          .from("categories")
          .update({ slug })
          .eq("id", category.id);

        if (updateError) {
          console.error(`Failed to update category ${category.id}:`, updateError);
          failed++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error(`Error processing category ${category.id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Updated ${updated} categories, ${failed} failed`,
        updated,
        failed
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in update-category-slugs function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
