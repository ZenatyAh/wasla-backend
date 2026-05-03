import nodemailer from "nodemailer";

const getEmailConfig = () => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASSWORD?.trim();

  if (!user || !pass) {
    throw new Error(
      "Missing EMAIL_USER or EMAIL_PASSWORD environment variable",
    );
  }

  return { user, pass };
};

export const sendResetEmail = async (to: string, token: string) => {
  const { user, pass } = getEmailConfig();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"Wasla" <${user}>`,
    to,
    subject: "Reset your password",
    text: `Reset your password: ${resetLink}`,
    html: `
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
};
