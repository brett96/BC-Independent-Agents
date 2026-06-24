import nodemailer from 'nodemailer';

let transporter;

export function getSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const user =
    process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim() || '';
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '')
    .replace(/\s/g, '')
    .trim();

  if (!user || !pass) return null;

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || '465');
    const secure =
      process.env.SMTP_SECURE !== undefined
        ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
        : port === 465;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return transporter;
}

export function getSmtpFromAddress() {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.OTP_EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    'BookCover Demo <notifications@cercalabs.com>'
  );
}

export function isSmtpConfigured() {
  return getSmtpTransport() !== null;
}

async function sendHtmlEmail(to, subject, html) {
  const transport = getSmtpTransport();
  if (!transport) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[dev] Email to ${Array.isArray(to) ? to.join(',') : to}: ${subject}`);
      console.info(html);
      return { ok: true };
    }
    return { ok: false, error: 'SMTP is not configured' };
  }
  try {
    await transport.sendMail({
      from: getSmtpFromAddress(),
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to send email',
    };
  }
}

export async function sendReportEmail(to, subject, html) {
  return sendHtmlEmail(to, subject, html);
}
