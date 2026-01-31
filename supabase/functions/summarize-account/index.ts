import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS Headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { account_id } = await req.json();

        if (!account_id) {
            throw new Error("No account_id provided");
        }

        // 1. Initialize Supabase Client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Fetch Account & Recent Activities
        const { data: account, error: accError } = await supabase
            .from("accounts_master")
            .select("name")
            .eq("id", account_id)
            .single();

        if (accError) throw accError;

        const { data: activities, error: actError } = await supabase
            .from("mac_account_activities")
            .select("activity_type, activity_date, outcome, created_by")
            .eq("account_id", account_id)
            .order("activity_date", { ascending: false })
            .limit(15);

        if (actError) throw actError;

        // 3. Prepare Context for Gemini
        const activityCount = activities?.length || 0;
        const visits = activities?.filter(a => a.activity_type === 'Visit').length || 0;
        const calls = activities?.filter(a => a.activity_type === 'Call').length || 0;

        const activityLog = activities?.map((a) =>
            `- [${a.activity_date}] ${a.activity_type}: ${a.outcome || "No notes"}`
        ).join("\n");

        const prompt = `
      You are a senior Sales Strategy Analyst.
      Analyze the relationship with client "${account.name}".
      
      Metric Data:
      - Total Recent Interactions: ${activityCount}
      - Site Visits: ${visits}
      - Calls: ${calls}
      
      Recent Activity Logs (Newest First):
      ${activityLog}
      
      Instructions:
      1. Determine the Sentiment: "Positive", "Neutral", "Risk", or "Unknown".
      2. Write a 2-sentence summary of the relationship status, referencing specific outcomes.
      3. Suggest 1 concrete Next Step for the salesperson.
      
      Return JSON ONLY:
      {
        "sentiment": "Positive",
        "summary": "...",
        "next_step": "..."
      }
    `;

        // 4. Call Google Gemini API
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3, // Lower for more analytical/consistent results
                        responseMimeType: "application/json"
                    }
                }),
            }
        );

        const geminiData = await response.json();

        if (geminiData.error) {
            console.error("Gemini Error:", geminiData.error);
            throw new Error("Gemini API Error: " + geminiData.error.message);
        }

        // Parse Response
        const rawText = geminiData.candidates[0].content.parts[0].text;
        const aiResult = JSON.parse(rawText);

        // 5. Update Database Cache
        const now = new Date().toISOString();
        await supabase.from("accounts_master").update({
            ai_summary: aiResult.summary,
            ai_sentiment: aiResult.sentiment,
            ai_next_step: aiResult.next_step,
            ai_last_updated: now
        }).eq("id", account_id);

        return new Response(JSON.stringify({ success: true, ...aiResult }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
