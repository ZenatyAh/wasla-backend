import nodemailer from "nodemailer";

const getEmailConfig = () => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASSWORD?.trim();

  if (!user || !pass) {
    return null;
  }

  return { user, pass };
};

export const sendMessageEmail = async (
  to: string,
  senderName: string,
  preview: string,
) => {
  const config = getEmailConfig();
  if (!config) {
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `"Wasla" <${config.user}>`,
    to,
    subject: `رسالة جديدة من ${senderName}`,
    text: `${senderName}: ${preview}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color:#f6f9fc; padding:40px 0;">
        <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:30px; box-shadow:0 4px 20px rgba(0,0,0,0.05);">
          <h2 style="margin-bottom:10px; color:#333;">رسالة جديدة</h2>
          <p style="color:#555; font-size:14px; line-height:1.6;">
            <strong>${senderName}</strong> أرسل لك رسالة:
          </p>
          <p style="color:#333; font-size:14px; background:#f8fafc; padding:12px; border-radius:8px;">
            ${preview}
          </p>
          <a href="${frontendUrl}"
             style="display:inline-block; margin-top:20px; padding:12px 24px; background:#4f46e5; color:#ffffff; text-decoration:none; border-radius:8px; font-size:14px; font-weight:bold;">
            فتح وصلة
          </a>
        </div>
      </div>
    `,
  });
};
