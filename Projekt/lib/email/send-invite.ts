import { Resend } from 'resend'

interface SendInviteEmailParams {
  to: string
  subject: string
  heading: string
  body: string
  buttonLabel: string
  ignoreLabel: string
  link: string
}

export async function sendInviteEmail(params: SendInviteEmailParams) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' }
  }

  const resend = new Resend(apiKey)
  const from =
    process.env.RESEND_FROM_EMAIL || '360AITech <onboarding@resend.dev>'

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
      <h1 style="font-size: 20px;">${params.heading}</h1>
      <p style="color: #444;">${params.body}</p>
      <p style="margin: 24px 0;">
        <a
          href="${params.link}"
          style="background: #18181b; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;"
        >${params.buttonLabel}</a>
      </p>
      <p style="color: #888; font-size: 12px;">${params.ignoreLabel}</p>
    </div>
  `

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html
  })

  if (error) {
    return { sent: false, error: error.message }
  }

  return { sent: true }
}
