import "dotenv/config";
import { Resend } from "resend";

// Lazily initialised — avoids crashing at startup when RESEND_API_KEY is blank.
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Email sending is unavailable."
    );
  }
  return new Resend(key);
}

export const emailUtil = {
  async sendDoctorInvitation(data: {
    to: string;
    full_name: string;
    setupToken: string;
    clinicName: string;
  }) {
    const setupLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/setup-password?token=${data.setupToken}`;

    await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: data.to,
      subject: `You have been invited to join ${data.clinicName}`,
      html: `
        <h2>Hello ${data.full_name},</h2>

        <p>
          You have been invited to join
          <strong>${data.clinicName}</strong> on MediQueue.
        </p>

        <p>
          Click the link below to set your password and activate your account:
        </p>

        <a href="${setupLink}">Set My Password</a>

        <p>
          This link expires in <strong>24 hours</strong>.
        </p>

        <br/>

        <p>
          If you did not expect this invitation, ignore this email.
        </p>
      `,
    });
  },
};
