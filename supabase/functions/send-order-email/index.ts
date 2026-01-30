import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { customerName, items, sendEmail } = await req.json()

        // 0. Check Gate
        if (!sendEmail) {
            return new Response(
                JSON.stringify({ message: 'Email skipped by user preference' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const client = new SmtpClient();

        // 1. Connect to Outlook
        await client.connectTLS({
            hostname: "smtp-mail.outlook.com",
            port: 587,
            username: Deno.env.get("OUTLOOK_EMAIL"),
            password: Deno.env.get("OUTLOOK_APP_PASSWORD"),
        });

        // 2. Build HTML Content
        const terms = items.map((item: any) =>
            `<li style="margin-bottom: 5px;"><b>${item.product}</b>: ${item.qty} units</li>`
        ).join('');

        const emailBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
          <p>Dear <b>${customerName}</b>,</p>
          <p>Good day to you.</p>
          <p>Please find below the new Sales Order details for your reference:</p>
          
          <ul style="background: #f9f9f9; padding: 15px 30px; border-radius: 8px;">
            ${terms}
          </ul>

          <p>For KCG it will be the same as Inshaa Precast, an intercompany account, and the payment is processed through offsetting.</p>

          <br/>
          <p>Thanks & Regards.</p>

          <table style="margin-top: 20px;">
            <tr>
                <td style="vertical-align: top; padding-right: 15px;">
                    <!-- Placeholder Logo -->
                    <img src="https://donboscoegy.github.io/Admixtures-Buddy/pleko_logo_small.png" alt="PLEKO" width="100">
                </td>
                <td style="vertical-align: top; border-left: 2px solid #22c55e; padding-left: 15px;">
                    <strong style="color: #22c55e; font-size: 16px;">Mohamed Hassan</strong><br/>
                    <span style="color: #6b7280; font-size: 14px;">Concrete Admixtures Manager</span><br/>
                    <br/>
                    <a href="mailto:mohammed.hasan@pleko.com" style="color: #22c55e; text-decoration: none; font-size: 14px;">mohammed.hasan@pleko.com</a><br/>
                    <span style="color: #374151; font-size: 14px;">+966 563 151 328 | +966 126 278 350</span><br/>
                    <span style="color: #374151; font-size: 14px;">Eastern Province Br. PO. BOX. 6897</span><br/>
                    <span style="color: #374151; font-size: 14px;">Dammam 31452 – Saudi Arabia</span><br/>
                    <a href="http://www.pleko.com" style="color: #22c55e; text-decoration: none; font-size: 14px;">www.pleko.com</a>
                </td>
            </tr>
          </table>
          <br/>
          <div style="font-size: 12px; color: #9ca3af;">
            <a href="#" style="color: #22c55e; text-decoration: none;">Get Outlook for iOS</a>
          </div>
      </div>
    `;

        // 3. Send
        await client.send({
            from: Deno.env.get("OUTLOOK_EMAIL"),
            to: "mo.hassan.1821@gmail.com", // Keeping your test email for now
            subject: `Sales Order | ${customerName}`,
            content: "Please view this email in an HTML compatible viewer.", // Fallback
            html: emailBody,
        });

        await client.close();

        return new Response(
            JSON.stringify({ message: 'Email sent successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
