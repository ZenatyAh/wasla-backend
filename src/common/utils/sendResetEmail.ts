import nodemailer from "nodemailer";
import { Resend } from "resend";

const buildResetEmailContent = (resetLink: string) => ({
  subject: "Reset your password",
  text: `Reset your password: ${resetLink}`,
  html: `
      <div style="font-family: Arial, sans-serif; background-color:#f6f9fc; padding:40px 0;">
        <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:30px; box-shadow:0 4px 20px rgba(0,0,0,0.05); text-align:center;">
          
          <h2 style="margin-bottom:10px; color:#333;">Reset your password</h2>
          
          <p style="color:#555; font-size:14px; line-height:1.6;">
            We received a request to reset your password. Click the button below to proceed.
          </p>

          <a href="${resetLink}" 
             style="display:inline-block; margin-top:20px; padding:12px 24px; background:#4f46e5; color:#ffffff; text-decoration:none; border-radius:8px; font-size:14px; font-weight:bold;">
            Reset Password
          </a>

          <p style="margin-top:25px; font-size:12px; color:#888;">
            This link will expire in 15 minutes.
          </p>

          <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

          <p style="font-size:12px; color:#aaa;">
            If you didn’t request this, you can safely ignore this email.
          </p>

        </div>
      </div>
      `,
});

const sendViaResend = async (
  to: string,
  content: ReturnType<typeof buildResetEmailContent>,
) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return false;
  }

  const from =
    process.env.RESEND_FROM?.trim() || "Wasla <onboarding@resend.dev>";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

const sendViaGmail = async (
  to: string,
  content: ReturnType<typeof buildResetEmailContent>,
) => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASSWORD?.trim();

  if (!user || !pass) {
    throw new Error(
      "Missing email provider. Set RESEND_API_KEY or EMAIL_USER and EMAIL_PASSWORD.",
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Wasla" <${user}>`,
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
};

export const sendResetEmail = async (to: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;
  const content = buildResetEmailContent(resetLink);

  const sentViaResend = await sendViaResend(to, content);
  if (!sentViaResend) {
    await sendViaGmail(to, content);
  }
};
