import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { account_id } = await req.json();

        // 1. Supabase Init
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 2. Fetch Data
        const { data: account } = await supabase.from("accounts_master").select("name").eq("id", account_id).single();

        // Get Activities
        const { data: activities } = await supabase
            .from("mac_account_activities")
            .select("activity_type, outcome, activity_date")
            .eq("account_id", account_id)
            .order("activity_date", { ascending: false })
            .limit(15);

        const activityLog = activities?.map(a => `${a.activity_type}: ${a.outcome}`).join("\n") || "No recent activity.";

        // 3. Call OpenAI (GPT-4o-mini)
        console.log("Calling OpenAI (gpt-4o-mini)...");
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing in Secrets!");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a sales assistant. Respond in JSON only: { \"sentiment\": \"Positive\"|\"Neutral\"|\"Risk\", \"summary\": \"string\", \"next_step\": \"string\" }."
                    },
                    {
                        role: "user",
                        content: `Analyze client ${account.name}.\nActivities:\n${activityLog}`
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        const aiData = await response.json();

        if (aiData.error) {
            console.error("OpenAI Error:", aiData.error);
            throw new Error(`OpenAI Error: ${aiData.error.message}`);
        }

        const result = JSON.parse(aiData.choices[0].message.content);

        // 4. Update DB
        await supabase.from("accounts_master").update({
            ai_summary: result.summary,
            ai_sentiment: result.sentiment,
            ai_next_step: result.next_step,
            ai_last_updated: new Date().toISOString()
        }).eq("id", account_id);

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
