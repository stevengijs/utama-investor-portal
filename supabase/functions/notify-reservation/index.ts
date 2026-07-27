import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Fired by a Postgres trigger (public.notify_new_reservation, see
// ../../schema.sql) whenever a new row lands in public.leads with
// type = 'reservation' or type = 'dataroom_request' - i.e. someone used the
// reservation modal or the data room request modal on the the-maison
// brochure, not just a general inquiry form. Sends:
//   1) an internal notification to Ashley and Steven with the details (for a
//      data room request, this includes the direct data room link so it's
//      handy to forward once the person is verified), and
//   2) a short confirmation email to the customer themselves, so they know
//      their request came through. For a data room request, this is
//      explicitly NOT the direct link - Ashley/Steven verify the person
//      first and send the link themselves afterwards.
//
// Deployed via the Supabase MCP tool (deploy_edge_function) - this file is
// kept in the repo for version control, but editing it here does NOT
// redeploy it. Re-run the deploy step after changing this file.
//
// Required secrets (set via `supabase secrets set` or the dashboard):
//   RESEND_API_KEY          - API key from resend.com
//   WEBHOOK_SECRET          - must match the value stored in Supabase Vault
//                             under the name 'reservation_webhook_secret'
//   NOTIFY_FROM (optional)  - verified sender, e.g. "UTAMA <info@utamabali.com>"
//                             falls back to Resend's shared sandbox sender otherwise
//   REPLY_TO (optional)     - where customer replies should land, defaults to
//                             info@utamabali.com

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") || "UTAMA Portal <onboarding@resend.dev>";
const NOTIFY_TO = ["ashley@utamabali.com", "steven@utamabali.com"];
// Address customers can reply to - defaults to the general inbox.
const REPLY_TO = Deno.env.get("REPLY_TO") || "info@utamabali.com";

function escapeHtml(s: unknown): string {
  return String(s ?? "-").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function isValidEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function formatBaliTime(iso: unknown): string {
  if (typeof iso !== "string") return escapeHtml(iso);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  try {
    const formatted = new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Asia/Makassar",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return `${formatted} (Bali-tijd)`;
  } catch {
    return escapeHtml(iso);
  }
}

async function sendEmail(payload: Record<string, unknown>): Promise<{ ok: boolean; status: number }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return { ok: res.ok, status: res.status };
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

  const projectName = escapeHtml(lead.project ?? "The Maison");
  const unitName = lead.unit ? escapeHtml(lead.unit) : null;
  const firstName = typeof lead.name === "string" && lead.name.trim()
    ? escapeHtml(lead.name).split(" ")[0]
    : null;
  const isDataroom = lead.type === "dataroom_request";

  // 1) Internal notification to Ashley & Steven.
  const internalSubject = isDataroom
    ? `Data room aangevraagd: ${lead.project ?? "The Maison"}`
    : `Nieuwe reservering: ${lead.project ?? "The Maison"}${lead.unit ? " - " + lead.unit : ""}`;
  const internalIntro = isDataroom
    ? `${escapeHtml(lead.name)} heeft zojuist de data room van ${projectName} aangevraagd via het investeerdersportaal. Verifieer diegene eerst persoonlijk - stuur daarna zelf de data room-link door. Hieronder de gegevens.`
    : `${escapeHtml(lead.name)} heeft zojuist${unitName ? " " + unitName + " van" : ""} ${projectName} gereserveerd via het investeerdersportaal. Neem snel contact op om de intentieverklaring te versturen - hieronder de gegevens.`;
  const internalHtml = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#17140F;line-height:1.6">
      <h2 style="margin:0 0 10px">${isDataroom ? "Data room aangevraagd" : "Nieuwe villareservering"}</h2>
      <p style="margin:0 0 18px">${internalIntro}</p>
      <p><b>Naam:</b> ${escapeHtml(lead.name)}</p>
      <p><b>E-mail:</b> ${escapeHtml(lead.email)}</p>
      <p><b>WhatsApp:</b> ${escapeHtml(lead.phone)}</p>
      <p><b>Project:</b> ${projectName}</p>
      ${isDataroom ? "" : `<p><b>Unit:</b> ${escapeHtml(lead.unit)}</p>`}
      <p><b>Tijdstip:</b> ${formatBaliTime(lead.created_at)}</p>
      ${isDataroom ? `<p style="margin-top:18px"><a href="https://invest.utamabali.com/the-maison/dataroom/" style="display:inline-block;background:#17140F;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Data room-link (na verificatie doorsturen)</a></p>` : ""}
      <p style="margin-top:18px;color:#5B564C;font-size:13px">Automatisch verstuurd vanuit het investeerdersportaal.</p>
    </div>`;

  let internalResult: { ok: boolean; status: number };
  try {
    internalResult = await sendEmail({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject: internalSubject,
      html: internalHtml,
    });
  } catch (err) {
    console.error("notify-reservation internal email error", err);
    internalResult = { ok: false, status: 0 };
  }

  // 2) Confirmation email to the customer, if we have a usable address.
  let customerResult: { ok: boolean; status: number } | null = null;
  if (isValidEmail(lead.email)) {
    const greeting = firstName ? `Hoi ${firstName},` : "Hoi,";
    const customerSubject = isDataroom
      ? `Je aanvraag voor de data room van ${lead.project ?? "The Maison"}`
      : `Je aanvraag voor ${lead.project ?? "The Maison"}${unitName ? " - " + unitName : ""} is binnen`;
    const customerHtml = isDataroom
      ? `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#17140F;line-height:1.6">
        <p>${greeting}</p>
        <p>Bedankt voor je interesse in ${projectName}. We hebben je aanvraag voor de data room goed ontvangen.</p>
        <p>Ashley of Steven neemt 'm persoonlijk met je door - zodra dat is gebeurd, ontvang je de link naar de due diligence-stukken en voorbeeldcontracten.</p>
        <p style="margin-top:18px">Heb je in de tussentijd een vraag? Reageer gerust op deze e-mail, of app ons direct.</p>
        <p style="margin-top:22px">Met vriendelijke groet,<br>Team UTAMA</p>
      </div>`
      : `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#17140F;line-height:1.6">
        <p>${greeting}</p>
        <p>Bedankt voor je aanvraag voor ${projectName}${unitName ? " (" + unitName + ")" : ""}. We hebben je gegevens goed ontvangen.</p>
        <p>Ashley neemt persoonlijk contact met je op om de vervolgstappen te bespreken en je de intentieverklaring toe te sturen.</p>
        <p style="margin-top:18px">Heb je in de tussentijd een vraag? Reageer gerust op deze e-mail of app Ashley direct.</p>
        <p style="margin-top:22px">Met vriendelijke groet,<br>Team UTAMA</p>
      </div>`;

    try {
      customerResult = await sendEmail({
        from: NOTIFY_FROM,
        to: [lead.email as string],
        reply_to: REPLY_TO,
        subject: customerSubject,
        html: customerHtml,
      });
    } catch (err) {
      console.error("notify-reservation customer email error", err);
      customerResult = { ok: false, status: 0 };
    }
  } else {
    console.error("notify-reservation: lead.email missing/invalid - no customer confirmation sent", lead);
  }

  return new Response(
    JSON.stringify({
      ok: internalResult.ok,
      internal: internalResult,
      customer: customerResult,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
