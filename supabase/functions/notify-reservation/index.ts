import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Fired by a Postgres trigger (public.notify_new_reservation, see
// ../../schema.sql) whenever a new row lands in public.leads with
// type = 'reservation' - i.e. someone used the reservation modal on the
// the-maison brochure, not just a general inquiry form. Sends one email to
// both Ashley and Steven with the reservation details.
//
// Deployed via the Supabase MCP tool (deploy_edge_function) - this file is
// kept in the repo for version control, but editing it here does NOT
// redeploy it. Re-run the deploy step after changing this file.
//
// Required secrets (set via `supabase secrets set` or the dashboard):
//   RESEND_API_KEY          - API key from resend.com
//   WEBHOOK_SECRET          - must match the value stored in Supabase Vault
//                             under the name 'reservation_webhook_secret'
//   NOTIFY_FROM (optional)  - verified sender, e.g. "UTAMA <reserveringen@utamabali.com>"
//                             falls back to Resend's shared sandbox sender otherwise

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") || "UTAMA Portal <onboarding@resend.dev>";
const NOTIFY_TO = ["ashley@utamabali.com", "steven@utamabali.com"];

function escapeHtml(s: unknown): string {
  return String(s ?? "-").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let lead: Record<string, unknown>;
  try {
    lead = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set - reservation email not sent", lead);
    return new Response(JSON.stringify({ ok: false, reason: "not-configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subject = `Nieuwe reservering: ${lead.project ?? "The Maison"}${lead.unit ? " - " + lead.unit : ""}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#17140F;line-height:1.6">
      <h2 style="margin:0 0 14px">Nieuwe villareservering</h2>
      <p><b>Naam:</b> ${escapeHtml(lead.name)}</p>
      <p><b>E-mail:</b> ${escapeHtml(lead.email)}</p>
      <p><b>WhatsApp:</b> ${escapeHtml(lead.phone)}</p>
      <p><b>Project:</b> ${escapeHtml(lead.project)}</p>
      <p><b>Unit:</b> ${escapeHtml(lead.unit)}</p>
      <p><b>Tijdstip:</b> ${escapeHtml(lead.created_at)}</p>
      <p style="margin-top:18px;color:#5B564C;font-size:13px">Automatisch verstuurd vanuit het investeerdersportaal zodra iemand de reserveringsflow afrondt.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_TO,
        subject,
        html,
      }),
    });
    const ok = res.ok;
    if (!ok) console.error("Resend error", res.status, await res.text());
    return new Response(JSON.stringify({ ok }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-reservation error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
