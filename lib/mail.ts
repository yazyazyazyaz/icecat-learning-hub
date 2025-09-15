import nodemailer from 'nodemailer'

export type MailOptions = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

function hasSmtpEnv() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM)
}

export async function sendMail(opts: MailOptions) {
  if (!hasSmtpEnv()) {
    console.warn('[mail] SMTP not configured; printing instead:', opts)
    return { ok: false, skipped: true }
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  })
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: Array.isArray(opts.to) ? opts.to.join(',') : opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  })
  return { ok: true, id: info.messageId }
}

