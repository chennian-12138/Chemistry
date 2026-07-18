import nodemailer from "nodemailer";

/**
 * 邮件发信封装（QQ 邮箱 SMTP）。
 *
 * 发件人是我们自己的 QQ 邮箱（SMTP_USER），收件人是用户注册时填的任意邮箱。
 * 凭据来自 .env 的 SMTP_* 变量，其中 SMTP_PASS 是 QQ 邮箱的「授权码」，
 * 不是登录密码。
 *
 * QQ 个人邮箱外发有每日限额（约 50 封/天），仅适合小范围使用。
 */

const port = Number(process.env.SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port,
  secure: port === 465, // 465 用 SSL，587 用 STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const info = await transporter.sendMail({ from, to, subject, html });
  return info;
}

/** 验证码邮件模板：突出展示 6 位 OTP，5 分钟有效。 */
export function renderOtpEmail(opts: {
  title: string;
  intro: string;
  otp: string;
}) {
  const { title, intro, otp } = opts;
  return `
  <div style="max-width:480px;margin:0 auto;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <h2 style="font-size:20px;margin:0 0 16px;">${title}</h2>
    <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 24px;">${intro}</p>
    <div style="background:#f3f4f6;border-radius:10px;padding:20px;text-align:center;margin:0 0 24px;">
      <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;">${otp}</span>
    </div>
    <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
      验证码 5 分钟内有效，请勿泄露给他人。如果这不是你本人操作，请忽略此邮件。<br/>
      本邮件由系统自动发送，请勿直接回复。
    </p>
  </div>`;
}
