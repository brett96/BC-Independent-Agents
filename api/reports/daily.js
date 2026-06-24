import { buildDailyReport } from '../../lib/reports.js';
import { getReportConfig } from '../../lib/report-config.js';
import { sendReportEmail } from '../../lib/email.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.authorization;
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const config = await getReportConfig();
  const recipients = config.emailRecipients;
  if (recipients.length === 0) {
    return res.status(503).json({
      error: 'No report recipients configured (set REPORT_EMAIL_TO or save recipients in admin)',
    });
  }

  const report = await buildDailyReport({ config });
  const subject = `BookCover Demo Usage — ${new Date().toLocaleDateString('en-US')}`;
  const sent = await sendReportEmail(recipients, subject, report.html);
  if (!sent.ok) {
    return res.status(500).json({ error: sent.error });
  }
  return res.status(200).json({ ok: true, sentTo: recipients });
}
