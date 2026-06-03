import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  private getAppUrl() {
    const rawAppUrl = this.configService.get('APP_URL') || 'https://www.lpticket.com';
    return rawAppUrl.startsWith('http://') || rawAppUrl.startsWith('https://')
      ? rawAppUrl.replace(/\/$/, '')
      : `https://${rawAppUrl.replace(/\/$/, '')}`;
  }

  private escapeHtml(value?: string | null) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private normalizeMarketingUrl(value: string | undefined, fallback: string) {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return `${fallback}${raw}`;
    return `https://${raw}`;
  }

  async sendTicketEmail(
    to: string,
    userName: string,
    eventTitle: string,
    tickets: any[],
    eventInfo?: {
      venueName?: string | null;
      venueAddress?: string | null;
      eventDate?: string;
      eventTimezone?: string;
      currency?: string;
      subtotal?: number;
      lpFee?: number;
      processingFee?: number;
      total?: number;
      organizerEmail?: string | null;
    },
  ) {
    const appUrl = this.getAppUrl();
    const eventAddress = [eventInfo?.venueName, eventInfo?.venueAddress].filter(Boolean).join(' — ');
    const currency = eventInfo?.currency || 'USD';
    const hasPaymentSummary = eventInfo?.total !== undefined;
    const money = (value?: number) => `${Number(value || 0).toFixed(2)} ${currency}`;
    const moneyFromCents = (value: number) => `${(value / 100).toFixed(2)} ${currency}`;

    const eventDateFormatted = eventInfo?.eventDate && eventInfo?.eventTimezone
      ? (() => {
          const date = new Date(eventInfo.eventDate);
          const tz = eventInfo.eventTimezone || 'UTC';
          const dayName = date.toLocaleDateString('es', { weekday: 'long', timeZone: tz });
          const dateStr = date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz });
          const timeStr = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz });
          const tzName = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'short' })
            .formatToParts(date)
            .find((p: any) => p.type === 'timeZoneName')?.value || '';
          return `${dayName}, ${dateStr} — ${timeStr} ${tzName}`;
        })()
      : '';
    const ticketSubtotalCents = tickets.map((ticket) => Math.round(Number(ticket.price || 0) * 100));
    const orderSubtotalCents = Math.round(Number(eventInfo?.subtotal || 0) * 100);
    const allocateCents = (totalCents: number) => {
      if (tickets.length === 0) return [];
      if (orderSubtotalCents <= 0) {
        const base = Math.floor(totalCents / tickets.length);
        return tickets.map((_, index) => index === tickets.length - 1 ? totalCents - base * (tickets.length - 1) : base);
      }

      let used = 0;
      return ticketSubtotalCents.map((subtotalCents, index) => {
        if (index === ticketSubtotalCents.length - 1) return totalCents - used;
        const value = Math.round((totalCents * subtotalCents) / orderSubtotalCents);
        used += value;
        return value;
      });
    };

    const ticketLpFeeCents = allocateCents(Math.round(Number(eventInfo?.lpFee || 0) * 100));
    const ticketProcessingFeeCents = allocateCents(Math.round(Number(eventInfo?.processingFee || 0) * 100));
    const ticketTotalCents = ticketSubtotalCents.map((subtotalCents, index) =>
      subtotalCents + (ticketLpFeeCents[index] || 0) + (ticketProcessingFeeCents[index] || 0)
    );

    const ticketDetails = tickets.map((t, index) => {
      const row = t.rowLabel || '';
      const num = t.seatNumber;
      const section = t.sectionName || '';
      const sectionType = t.sectionType || '';

      const mesaMatch = row.match(/^(mesa|table)\s*(\d+)$/i);
      const seatMesaMatch = String(num || '').trim().match(/^(mesa|table)\s*(\d+)$/i);
      let details = '';

      // Detect table sections by sectionType
      if (sectionType === 'table' || /^(mesa|table)\b/i.test(String(row).trim())) {
        const hasTableWord = /^(mesa|table)\b/i.test(String(section).trim()) || /^\d+$/.test(String(section).trim()) === false && !section;
        const tableLabel = /^\d+$/.test(String(section).trim())
          ? `Mesa ${section}`
          : /^(mesa|table)\b/i.test(String(section).trim())
            ? section
            : section || 'Mesa';
        details = `${tableLabel} - Silla ${num}`;
      } else if (seatMesaMatch) {
        const tableNum = row;
        const chairNum = seatMesaMatch[2];
        const hasTableWord = /^(mesa|table)\b/i.test(String(tableNum));
        details = `${hasTableWord ? tableNum : `Mesa ${tableNum}`} - Silla ${chairNum}`;
      } else if (mesaMatch) {
        details = `Mesa ${mesaMatch[2]} - Silla ${num}`;
      } else if (row === 'GA') {
        details = `Entrada General`;
      } else {
        details = `Fila ${row}, Asiento ${num}`;
      }

      // For table sections, don't show section separately (it's already in "Ubicación")
      const cleanSection = section.trim();
      const isTableSection = sectionType === 'table' || /^(mesa|table)\b/i.test(String(row).trim());
      const shouldShowSection = !isTableSection && cleanSection &&
        !['general', 'general admission', 'ga', 'default', 'default section', 'null', 'undefined', 'sección única', 'seccion unica'].includes(cleanSection.toLowerCase()) &&
        !/^\d+$/.test(cleanSection); // hide purely numeric section names

      const qrCid = `qr-${t.ticketCode}`;
      const ticketUrl = `${appUrl}/verify/${t.ticketCode}`;
      const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Mi entrada para ${eventTitle}: ${ticketUrl}`)}`;
      const ticketSubtotal = Number(t.price || 0);
      const orderSubtotal = Number(eventInfo?.subtotal || 0);
      const ticketShare = orderSubtotal > 0 ? ticketSubtotal / orderSubtotal : 1 / Math.max(tickets.length, 1);
      const ticketLpFee = Number(eventInfo?.lpFee || 0) * ticketShare;
      const ticketProcessingFee = Number(eventInfo?.processingFee || 0) * ticketShare;
      const ticketTotal = ticketSubtotal + ticketLpFee + ticketProcessingFee;

      return `
      <div bgcolor="#ffffff" style="background:#ffffff !important; background-color:#ffffff !important; color:#0f172a !important; border:1px solid #e2e8f0; border-radius:20px; padding:25px; margin-bottom:20px; box-shadow:0 4px 12px rgba(0,0,0,0.03); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <!-- Card branding header -->
        <div bgcolor="#ffffff" style="background:#ffffff !important; background-color:#ffffff !important; border-bottom:2px solid #f1f5f9; padding:12px 12px 14px 12px; margin-bottom:18px; display:table; width:100%; box-sizing:border-box;">
          <div bgcolor="#ffffff" style="display:table-cell; vertical-align:middle; background:#ffffff !important; background-color:#ffffff !important;">
            <img src="${appUrl}/logo-email-orange.png" alt="LPTicket" width="220" style="display:block; width:220px; max-width:220px; height:auto; border:0; outline:none; text-decoration:none;" />
          </div>
          <div bgcolor="#ffffff" style="display:table-cell; text-align:right; font-size:9px; font-weight:bold; color:#94a3b8 !important; text-transform:uppercase; letter-spacing:1px; vertical-align:middle; background:#ffffff !important; background-color:#ffffff !important;">
            Digital Ticket
          </div>
        </div>

        <h3 style="margin-top: 0; margin-bottom: 8px; color: #0A375A; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px;">${eventTitle}</h3>

        <!-- Info labels -->
        <div style="margin-bottom: 15px; font-size: 12px; color: #475569; line-height: 1.6;">
          <p style="margin: 4px 0;"><strong>Comprador:</strong> ${userName}</p>
          ${eventDateFormatted ? `<p style="margin: 4px 0;"><strong>Fecha y Hora:</strong> ${eventDateFormatted}</p>` : ''}
          ${shouldShowSection ? `<p style="margin: 4px 0;"><strong>Sección:</strong> ${t.sectionName}</p>` : ''}
          <p style="margin: 4px 0;"><strong>Ubicación:</strong> ${details}</p>
          <p style="margin: 4px 0; font-family: monospace;"><strong>Código:</strong> <span style="color: #F97316; font-weight: bold;">${t.ticketCode}</span></p>
          ${hasPaymentSummary ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;margin:10px 0 0 0;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
            <tr>
              <td style="padding:9px 11px 4px 11px;">
                <p style="margin:0;color:#0A375A;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">Resumen de esta entrada</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 11px 9px 11px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:12px;color:#334155;">
                  <tr>
                    <td style="padding:3px 0;border-bottom:1px solid #f1f5f9;">Subtotal de esta entrada:</td>
                    <td align="right" style="padding:3px 0;border-bottom:1px solid #f1f5f9;font-weight:800;color:#0f172a;">${moneyFromCents(ticketSubtotalCents[index] || 0)}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;border-bottom:1px solid #f1f5f9;">Cargo por servicio:</td>
                    <td align="right" style="padding:3px 0;border-bottom:1px solid #f1f5f9;font-weight:800;color:#0f172a;">${moneyFromCents(ticketLpFeeCents[index] || 0)}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;border-bottom:1px solid #f1f5f9;">Tarifa de procesamiento:</td>
                    <td align="right" style="padding:3px 0;border-bottom:1px solid #f1f5f9;font-weight:800;color:#0f172a;">${moneyFromCents(ticketProcessingFeeCents[index] || 0)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0 0 0;font-weight:900;color:#0A375A;">Total de esta entrada:</td>
                    <td align="right" style="padding:6px 0 0 0;font-weight:900;color:#F97316;font-size:14px;">${moneyFromCents(ticketTotalCents[index] || 0)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          ` : ''}
        </div>

        <!-- Center QR (CID inline image) -->
        <div style="text-align: center; margin: 20px 0;">
          <img src="cid:${qrCid}" alt="QR Code" width="160" height="160" style="border: 1px solid #e2e8f0; padding: 8px; border-radius: 12px; background: #ffffff;" />
          <span style="display: block; font-size: 10px; color: #94a3b8; margin-top: 8px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">Presentar este código QR en el acceso</span>
        </div>

                <div style="text-align: center; margin: 18px 0 6px 0;">
          <a href="${ticketUrl}" target="_blank" style="display: inline-block; background: #F97316; color: #ffffff; text-decoration: none; border-radius: 14px; padding: 12px 18px; font-size: 12px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;">
            Compartir
          </a>
        </div>

<!-- Footer terms info -->    <div style="border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 15px; font-size: 9px; color: #94a3b8; text-align: center; line-height: 1.4; text-transform: uppercase; font-weight: bold;">
          LPTICKET.COM — TUS TICKETS. TUS EVENTOS.
        </div>
      </div>
      </body>
      </html>
    `;
    }).join('');

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
          :root { color-scheme: light; supported-color-schemes: light; }
          body, table, td, div, p, span { color-scheme: light !important; }
          body { background: #ffffff !important; background-color: #ffffff !important; }
          [data-ogsc] body, [data-ogsc] div, [data-ogsb] body, [data-ogsb] div {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
        </style>
      </head>
      <body bgcolor="#ffffff" style="margin:0; padding:0; background:#ffffff !important; background-color:#ffffff !important; color:#0f172a !important;">
      <div bgcolor="#ffffff" style="background:#ffffff !important; background-color:#ffffff !important; padding:30px 15px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width: 560px; margin: 0 auto;">
          <div style="margin-bottom: 25px; text-align: center;">
            <h1 style="color: #0A375A; font-size: 24px; font-weight: 850; margin: 0; letter-spacing: -0.5px;">¡Hola, ${userName}! 👋</h1>
            <p style="color: #475569; font-size: 14px; margin-top: 6px; margin-bottom: 0;">Gracias por tu compra. Aquí tienes tus entradas listas para el evento:</p>
          </div>
          
          ${hasPaymentSummary ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 16px 0;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:14px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="font-size:13px;font-weight:900;color:#0A375A;text-transform:uppercase;letter-spacing:0.7px;">Total cobrado:</td>
                    <td align="right" style="font-size:17px;font-weight:900;color:#F97316;">${money(eventInfo?.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          ` : ''}
          
          ${ticketDetails}
          
          <div style="text-align: center; margin-top: 25px;">
            <p style="color: #64748b; font-size: 11px; margin: 0;">Este correo sirve como comprobante de pago oficial y boleto de acceso.</p>
            <p style="color: #64748b; font-size: 11px; margin: 4px 0 0 0;">Si tienes dudas o inquietudes, por favor contáctanos respondiendo a este email.</p>
          </div>
        </div>
      </div>
    `;

    // Build CID inline attachments from base64 qrData
    const attachments = tickets
      .filter(t => t.qrData)
      .map(t => {
        const base64 = String(t.qrData).replace(/^data:image\/png;base64,/, '');
        return {
          filename: `qr-${t.ticketCode}.png`,
          content: Buffer.from(base64, 'base64'),
          cid: `qr-${t.ticketCode}`,
          contentType: 'image/png',
          contentDisposition: 'inline' as const,
        };
      });

    const bccRecipients = Array.from(new Set([
      this.configService.get('ADMIN_EMAIL'),
      eventInfo?.organizerEmail,
    ]
      .filter((email): email is string => Boolean(email && email.trim()))
      .map((email) => email.trim())))
      .filter((email) => email.toLowerCase() !== String(to || '').trim().toLowerCase());

    try {
      await this.transporter.sendMail({
        from: `"LPTicket" <${this.configService.get('SMTP_FROM')}>`,
        to,
        ...(bccRecipients.length > 0 ? { bcc: bccRecipients } : {}),
        subject: `Tus tickets para ${eventTitle} — LPTicket`,
        html,
        attachments,
      });
    } catch (err) {
      console.error('Error sending email:', err);
    }
  }
  /**
   * Sends a branded event reminder email to a list of attendees.
   * Sent from info@lpticket.com
   */
  async sendReminderEmail(
    to: string,
    userName: string,
    eventTitle: string,
    eventDate: string,
    venueName: string,
    venueAddress: string,
    daysUntilEvent: number,
    customMessage?: string,
  ) {
    const appUrl = this.getAppUrl();

    const isHours = daysUntilEvent < 0;
    let urgencyLabel = '';
    if (isHours) {
      const hours = Math.abs(daysUntilEvent);
      urgencyLabel = `Faltan ${hours} hora${hours !== 1 ? 's' : ''} para el evento`;
    } else if (daysUntilEvent === 0) {
      urgencyLabel = '¡Hoy es el gran día del evento!';
    } else if (daysUntilEvent === 1) {
      urgencyLabel = '¡Mañana es el gran día del evento!';
    } else {
      urgencyLabel = `Faltan ${daysUntilEvent} días para el evento`;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f1f5f9;color:#334155;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
        <div style="background-color:#f1f5f9;padding:40px 12px;min-height:100%;">
          <div style="max-width:560px;margin:0 auto;box-shadow:0 10px 25px rgba(0,0,0,0.05);border-radius:16px;overflow:hidden;">

            <!-- Header / Logo -->
            <div style="background-color:#ffffff;padding:24px 28px;text-align:center;">
              <img src="${appUrl}/logo-email-orange.png" alt="LPTicket" width="180" style="display:block;margin:0 auto 8px auto;max-width:180px;height:auto;" />
              <p style="margin:0;font-size:10px;color:#0A375A;text-transform:uppercase;letter-spacing:2px;font-weight:700;">
                Recordatorio de Evento
              </p>
            </div>

            <!-- Urgency Banner -->
            <div style="background-color:#f97316;padding:14px 28px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">
                ⏰ ${urgencyLabel}
              </p>
            </div>

            <!-- Main Card -->
            <div style="background-color:#ffffff;padding:32px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

              <!-- Greeting -->
              <p style="margin:0 0 8px 0;font-size:18px;color:#0A375A;font-weight:800;">
                ¡Hola, ${userName}! 👋
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#475569;line-height:1.6;">
                Te recordamos que tienes una entrada confirmada para el siguiente evento:
              </p>

              <!-- Event Info Box -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:24px;margin-bottom:24px;">
                <h3 style="margin:0 0 10px 0;font-size:20px;font-weight:800;color:#0A375A;line-height:1.3;text-transform:uppercase;letter-spacing:-0.5px;">
                  ${eventTitle}
                </h3>
                <div style="width:60px;height:3px;background-color:#f97316;margin-bottom:18px;"></div>
                
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="width:28px;font-size:16px;vertical-align:top;padding:4px 0;">📅</td>
                    <td style="font-size:13px;color:#1e293b;font-weight:600;padding:4px 0;">
                      ${eventDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="width:28px;font-size:16px;vertical-align:top;padding:8px 0 4px 0;">📍</td>
                    <td style="font-size:13px;color:#1e293b;padding:8px 0 4px 0;line-height:1.4;">
                      <strong>${venueName}</strong>
                      ${venueAddress ? `<br/><span style="color:#64748b;font-size:12px;">${venueAddress}</span>` : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Custom message / Greeting Body -->
              ${customMessage ? `
              <div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;font-style:italic;white-space:pre-line;">
                  ${customMessage}
                </p>
              </div>
              ` : ''}

              <!-- Recommendations -->
              <div style="margin-bottom:28px;">
                <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Recomendaciones para tu ingreso:</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="width:24px;font-size:14px;vertical-align:top;padding:4px 0;">✅</td>
                    <td style="font-size:13px;color:#374151;padding:4px 0;line-height:1.4;">Lleva tu entrada digital (código QR disponible en el dashboard de LPTicket).</td>
                  </tr>
                  <tr>
                    <td style="width:24px;font-size:14px;vertical-align:top;padding:4px 0;">✅</td>
                    <td style="font-size:13px;color:#374151;padding:4px 0;line-height:1.4;">Lleva una identificación oficial con fotografía.</td>
                  </tr>
                  <tr>
                    <td style="width:24px;font-size:14px;vertical-align:top;padding:4px 0;">✅</td>
                    <td style="font-size:13px;color:#374151;padding:4px 0;line-height:1.4;">Te recomendamos llegar 30 minutos antes para agilizar el registro.</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button inside Event Box -->
              <div style="text-align:center;margin-bottom:8px;">
                <a href="${appUrl}/dashboard" target="_blank"
                  style="display:inline-block;background-color:#f97316;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 36px;font-size:13px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 4px 14px rgba(249,115,22,0.3);">
                  Ver Entrada →
                </a>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 28px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:800;color:#f97316;letter-spacing:0.5px;">lpticket.com</p>
              <p style="margin:0;font-size:11px;color:#64748b;">Tus tickets. Tus eventos.</p>
              <p style="margin:16px 0 0 0;font-size:10px;color:#94a3b8;line-height:1.4;">
                Este recordatorio fue enviado por info@lpticket.com · LPTicket Platform.<br/>
                Por favor, no respondas directamente a este correo.
              </p>
            </div>

          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"LPTicket" <info@lpticket.com>`,
        to,
        subject: `🎟️ Recordatorio: ${eventTitle} — ${urgencyLabel}`,
        html,
      });
    } catch (err) {
      console.error('Error sending reminder email:', err);
      throw err;
    }
  }

  async sendContactEmail(name: string, email: string, subject: string, message: string) {
    const adminEmail = this.configService.get('ADMIN_EMAIL');
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px;">
        <h2 style="color: #0A375A; margin-top: 0;">Nuevo mensaje de contacto</h2>
        <p style="color: #475569; font-size: 14px;">Has recibido una nueva consulta desde el Centro de Soporte:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Nombre:</strong> ${name}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0 0 10px 0;"><strong>Asunto:</strong> ${subject}</p>
          <p style="margin: 0; border-top: 1px solid #e2e8f0; pt-10; margin-top: 10px; padding-top: 10px;">
            <strong>Mensaje:</strong><br/>
            ${message}
          </p>
        </div>
        
        <p style="color: #94a3b8; font-size: 11px;">Este correo fue enviado automáticamente por el sistema de LPTicket.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"LPTicket Support" <${this.configService.get('SMTP_FROM')}>`,
        to: adminEmail,
        replyTo: email,
        subject: `Soporte: ${subject}`,
        html,
      });
    } catch (err) {
      console.error('Error sending contact email:', err);
    }
  }

  /** Marketing campaign email (approved preview design). */
  async sendMarketingEmail(
    to: string,
    opts: { subject: string; title?: string; preheader?: string; imageData?: string | null; link?: string },
  ) {
    const appUrl = this.getAppUrl();
    const ctaUrl = this.normalizeMarketingUrl(opts.link, appUrl);
    const year = new Date().getFullYear();
    const safeTitle = this.escapeHtml(opts.title || 'Vive tu próxima experiencia con LPTicket');
    const safePreheader = this.escapeHtml(opts.preheader || 'Eventos, experiencias y entradas seguras en un solo lugar.');
    const safeCtaUrl = this.escapeHtml(ctaUrl);
    const safeAppUrl = this.escapeHtml(appUrl);
    const supportPhone = '832.379.0809';
    const supportPhoneHref = '+18323790809';
    const supportAddress = '1325 Main St Suite 203, Katy, TX 77494';
    const websiteLabel = 'lpticket.com';
    const websiteUrl = this.escapeHtml('https://www.lpticket.com');
    const instagramUrl = this.escapeHtml('https://www.instagram.com/lpticket');
    const facebookUrl = this.escapeHtml('https://www.facebook.com/profile.php?id=61590380706527');
    const whatsappUrl = this.escapeHtml('https://wa.me/18323790809');

    const attachments: nodemailer.SendMailOptions['attachments'] = [];
    let artTag = '';
    if (opts.imageData) {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(opts.imageData.trim());
      if (match) {
        const contentType = match[1];
        const ext = (contentType.split('/')[1] || 'png').replace('+xml', '');
        const cid = 'marketing-art';
        attachments.push({
          filename: `art.${ext}`,
          content: Buffer.from(match[2], 'base64'),
          contentType,
          cid,
        });
        artTag = `<img src="cid:${cid}" alt="" width="560" style="display:block; width:100%; max-width:560px; height:auto; border:0; outline:none; text-decoration:none;" />`;
      } else {
        artTag = `<img src="${this.escapeHtml(opts.imageData)}" alt="" width="560" style="display:block; width:100%; max-width:560px; height:auto; border:0; outline:none; text-decoration:none;" />`;
      }
    }

    const preheaderText = this.escapeHtml((opts.preheader || opts.title || 'Novedades de LPTicket').replace(/<[^>]+>/g, ''));

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background:#07131f; -webkit-font-smoothing:antialiased;">
  <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">${preheaderText}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07131f; padding:32px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%; max-width:680px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:30px; padding:16px;">
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1b2b; border:1px solid #17344f; border-radius:24px; overflow:hidden;">
                <tr>
                  <td style="background:#06111d; padding:24px; border-bottom:1px solid #17344f;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="left" style="vertical-align:middle;">
                          <img src="${safeAppUrl}/logo-email-orange.png" alt="LPTicket" width="176" style="display:block; width:176px; max-width:176px; height:auto; border:0;" />
                        </td>
                        <td align="right" style="vertical-align:middle; font-family:Arial,Helvetica,sans-serif; color:#f97316; font-size:10px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">
                          Eventos selectos
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:54px 24px 44px; background:#0a375a; background-image:linear-gradient(135deg, rgba(10,55,90,0.82), rgba(7,19,31,0.9)); border-bottom:1px solid #17344f;">
                    <p style="margin:0 0 14px; color:#f97316; font-family:Arial,Helvetica,sans-serif; font-size:11px; font-weight:900; letter-spacing:2.4px; text-transform:uppercase;">LPTicket presenta</p>
                    <h1 style="max-width:520px; margin:0 auto; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:42px; line-height:1.05; font-weight:900; letter-spacing:0;">${safeTitle}</h1>
                    <p style="max-width:460px; margin:18px auto 0; color:#a9b8ca; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.65;">${safePreheader}</p>
                    ${artTag ? `
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:28px auto 0; border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,0.12);">
                      <tr>
                        <td style="font-size:0; line-height:0; background:#081827;">${artTag}</td>
                      </tr>
                    </table>` : ''}
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                      <tr>
                        <td align="center" style="border-radius:14px; background:#f97316;">
                          <a href="${safeCtaUrl}" target="_blank" style="display:inline-block; padding:16px 40px; color:#ffffff; font-size:13px; font-weight:900; text-decoration:none; font-family:Arial,Helvetica,sans-serif; letter-spacing:1.8px; text-transform:uppercase;">Ver detalles</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#071827; border:1px solid #17344f; border-radius:18px;">
                      <tr>
                        <td align="center" width="33.33%" style="padding:17px 10px; font-family:Arial,Helvetica,sans-serif; border-right:1px solid #17344f;">
                          <p style="margin:0; color:#ffffff; font-size:13px; font-weight:900;">Pago seguro</p>
                          <p style="margin:5px 0 0; color:#7f93aa; font-size:11px;">Protegido por Stripe</p>
                        </td>
                        <td align="center" width="33.33%" style="padding:17px 10px; font-family:Arial,Helvetica,sans-serif; border-right:1px solid #17344f;">
                          <p style="margin:0; color:#ffffff; font-size:13px; font-weight:900;">Tickets al instante</p>
                          <p style="margin:5px 0 0; color:#7f93aa; font-size:11px;">QR listo para entrar</p>
                        </td>
                        <td align="center" width="33.33%" style="padding:17px 10px; font-family:Arial,Helvetica,sans-serif;">
                          <p style="margin:0; color:#ffffff; font-size:13px; font-weight:900;">Soporte dedicado</p>
                          <p style="margin:5px 0 0; color:#7f93aa; font-size:11px;">Estamos para ayudarte</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 22px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b2236; background-image:linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.035)); border:1px solid rgba(255,255,255,0.10); border-radius:22px;">
                      <tr>
                        <td style="padding:14px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="50%" valign="top" style="padding:18px; background:#0a375a; background-image:linear-gradient(145deg, rgba(10,55,90,0.78), rgba(7,19,31,0.86)); border:1px solid rgba(255,255,255,0.10); border-radius:18px; font-family:Arial,Helvetica,sans-serif;">
                                <p style="margin:0; color:#f97316; font-size:10px; font-weight:900; letter-spacing:1.8px; text-transform:uppercase;">Atención al cliente</p>
                                <p style="margin:10px 0 0; font-size:22px; font-weight:900; line-height:1.2;">
                                  <a href="tel:${supportPhoneHref}" style="color:#ffffff; text-decoration:none;">${supportPhone}</a>
                                </p>
                                <p style="margin:10px 0 0; color:#a9b8ca; font-size:12px; line-height:1.55;">${supportAddress}</p>
                              </td>
                              <td width="12" style="font-size:0; line-height:0;">&nbsp;</td>
                              <td width="50%" valign="top" style="padding:18px; background:#10263a; background-image:linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025)); border:1px solid rgba(255,255,255,0.10); border-radius:18px; font-family:Arial,Helvetica,sans-serif;">
                                <p style="margin:0; color:#f97316; font-size:10px; font-weight:900; letter-spacing:1.8px; text-transform:uppercase;">Conecta con LPTicket</p>
                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:13px;">
                                  <tr>
                                    <td align="center" width="42" height="42" style="border-radius:42px; border:1px solid rgba(255,255,255,0.14);">
                                      <a href="${facebookUrl}" target="_blank" style="display:block; color:#ffffff; font-size:20px; font-weight:900; line-height:42px; text-decoration:none; font-family:Arial,Helvetica,sans-serif;">f</a>
                                    </td>
                                    <td width="10">&nbsp;</td>
                                    <td align="center" width="42" height="42" style="border-radius:42px; border:1px solid rgba(255,255,255,0.14);">
                                      <a href="${instagramUrl}" target="_blank" style="display:block; color:#ffffff; font-size:18px; font-weight:900; line-height:42px; text-decoration:none; font-family:Arial,Helvetica,sans-serif;">◎</a>
                                    </td>
                                    <td width="10">&nbsp;</td>
                                    <td align="center" width="42" height="42" style="border-radius:42px; border:1px solid rgba(255,255,255,0.14);">
                                      <a href="${whatsappUrl}" target="_blank" style="display:block; color:#ffffff; font-size:18px; font-weight:900; line-height:42px; text-decoration:none; font-family:Arial,Helvetica,sans-serif;">☎</a>
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin:16px 0 0; font-size:14px; font-weight:900;">
                                  <a href="${websiteUrl}" target="_blank" style="color:#ffffff; text-decoration:none;">${websiteLabel}</a>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px; background:#06111d; border-top:1px solid #17344f; font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0 0 6px; color:#7f93aa; font-size:12px;">© ${year} LPTicket · <a href="${safeAppUrl}" style="color:#f97316; text-decoration:none; font-weight:900;">${websiteLabel}</a></p>
                    <p style="margin:0; color:#52667d; font-size:11px; line-height:1.5;">Recibiste este correo porque tienes una cuenta en LPTicket.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: `"LPTicket" <${this.configService.get('SMTP_FROM')}>`,
      to,
      subject: opts.subject || 'LP Ticket',
      html,
      attachments,
    });
  }

}
