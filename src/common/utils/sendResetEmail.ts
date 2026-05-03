import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResetEmail = async (to: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  try {
    const response = await resend.emails.send({
      from: "Wasla <onboarding@resend.dev>", // غيّرها لاحقًا لدومينك
      to,
      subject: "Reset your password",
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

    console.log("EMAIL SENT:", response);
  } catch (err) {
    console.error("EMAIL ERROR:", err);
    throw err;
  }
};
