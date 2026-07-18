import { getSetting } from "./settings";

/**
 * Envío de emails transaccionales.
 *
 * El proveedor está desacoplado a propósito: hoy hay una implementación con
 * Resend (una variable de entorno y listo) y un modo local que no envía nada.
 * Integrar SMTP u otro proveedor es agregar una rama en `sendMail` sin tocar
 * a quien lo llama.
 *
 * En local, si no hay proveedor configurado, `sendMail` devuelve `delivered:
 * false` y quien llama muestra el enlace en pantalla. Así el circuito completo
 * se puede probar sin cuenta de correo y sin dejar a nadie sin poder entrar.
 */

export type MailResult = { delivered: boolean; error?: string };

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.MAIL_FROM ?? "Better Work <onboarding@resend.dev>";
}

export async function sendMail(to: string, subject: string, html: string): Promise<MailResult> {
  if (!mailConfigured()) {
    // Sin proveedor: no es un error, es el modo local.
    return { delivered: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress(), to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { delivered: false, error: `El proveedor de email respondió ${res.status}. ${detail.slice(0, 200)}` };
    }
    return { delivered: true };
  } catch (e) {
    return { delivered: false, error: e instanceof Error ? e.message : "No se pudo contactar al proveedor de email." };
  }
}

/** Plantilla mínima, en blanco y negro, coherente con la app. */
function layout(title: string, body: string, cta?: { href: string; label: string }): string {
  return `
  <div style="background:#f5f5f5;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
      <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#0a0a0a">Better Work</p>
      <h1 style="margin:0 0 12px;font-size:20px;color:#0a0a0a">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#525252">${body}</div>
      ${
        cta
          ? `<a href="${cta.href}" style="display:inline-block;margin-top:24px;background:#0a0a0a;color:#fff;
             text-decoration:none;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600">${cta.label}</a>
             <p style="margin-top:20px;font-size:12px;color:#a3a3a3;word-break:break-all">
               Si el botón no funciona, copiá este enlace:<br>${cta.href}
             </p>`
          : ""
      }
    </div>
  </div>`;
}

export async function sendVerificationEmail(to: string, name: string, url: string): Promise<MailResult> {
  return sendMail(
    to,
    "Confirmá tu email — Better Work",
    layout(
      `Hola ${name}, confirmá tu email`,
      "<p>Para empezar a usar Better Work necesitamos verificar que esta dirección es tuya. El enlace vence en 24 horas.</p>",
      { href: url, label: "Confirmar mi email" }
    )
  );
}

export async function sendPlanApprovedEmail(to: string, planName: string, until: Date): Promise<MailResult> {
  return sendMail(
    to,
    "Tu membresía está activa — Better Work",
    layout(
      `Plan ${planName} activado`,
      `<p>Aprobamos tu comprobante y tu membresía ya está activa hasta el
        <strong>${until.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</strong>.
        Ya podés publicar empleos y aparecer en las búsquedas.</p>`
    )
  );
}

export async function sendPlanRejectedEmail(to: string, reason: string): Promise<MailResult> {
  return sendMail(
    to,
    "No pudimos validar tu comprobante — Better Work",
    layout(
      "Necesitamos revisar tu pago",
      `<p>No pudimos validar el comprobante que enviaste.</p>
       ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
       <p>Podés volver a enviarlo desde la sección Membresía de tu panel.</p>`
    )
  );
}

/** URL pública de la app, para armar los enlaces de los emails. */
export async function siteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const stored = await getSetting("site_url", "");
  if (stored) return stored.replace(/\/$/, "");
  return "http://localhost:3001";
}
