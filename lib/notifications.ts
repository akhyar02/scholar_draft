import nodemailer from "nodemailer";

import { ApplicationStatus, STATUS_LABELS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    const env = getEnv();
    const hasAuth = Boolean(env.SMTP_USER && env.SMTP_PASS);
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(hasAuth
        ? {
            auth: {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            },
          }
        : {}),
    });
  }

  return transporter;
}

/* ------------------------------------------------------------------ */
/*  Branded email wrapper                                              */
/* ------------------------------------------------------------------ */

function wrapInEmailLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YUM ScholarHub</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#be123c;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <img src="https://yum.mmu.edu.my/wp-content/uploads/2022/02/logo_white-eng.png" alt="YUM" height="40" style="height:40px;display:inline-block;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f5f4;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;border-top:1px solid #e7e5e4;">
              <p style="margin:0 0 8px;font-size:13px;color:#78716c;">
                &copy; ${new Date().getFullYear()} Yayasan Universiti Multimedia. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#a8a29e;">
                This is an automated email from YUM ScholarHub. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Status-specific styling helpers                                    */
/* ------------------------------------------------------------------ */

function getStatusStyle(status: ApplicationStatus): {
  color: string;
  bgColor: string;
  icon: string;
  message: string;
} {
  switch (status) {
    case "submitted":
      return {
        color: "#0284c7",
        bgColor: "#f0f9ff",
        icon: "📨",
        message: "Your application has been received and is being processed.",
      };
    case "under_review":
      return {
        color: "#d97706",
        bgColor: "#fffbeb",
        icon: "🔍",
        message: "Our team is currently reviewing your application. We'll update you once a decision is made.",
      };
    case "shortlisted":
      return {
        color: "#059669",
        bgColor: "#ecfdf5",
        icon: "⭐",
        message: "Congratulations! You've been shortlisted. We'll be in touch with next steps.",
      };
    case "rejected":
      return {
        color: "#e11d48",
        bgColor: "#fff1f2",
        icon: "📋",
        message: "Unfortunately, your application was not selected this time. We encourage you to apply for other scholarships.",
      };
    case "awarded":
      return {
        color: "#059669",
        bgColor: "#ecfdf5",
        icon: "🎉",
        message: "Congratulations! You have been awarded this scholarship! Further details will follow.",
      };
    default:
      return {
        color: "#78716c",
        bgColor: "#f5f5f4",
        icon: "📄",
        message: "Your application status has been updated.",
      };
  }
}

function buildStatusEmail({
  scholarshipTitle,
  status,
}: {
  scholarshipTitle: string;
  status: ApplicationStatus;
}) {
  const humanStatus = STATUS_LABELS[status];
  const style = getStatusStyle(status);

  const bodyContent = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c1917;">
      Application Update
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#78716c;">
      Here's the latest on your scholarship application.
    </p>

    <!-- Scholarship name -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fafaf9;border-radius:12px;padding:16px 20px;border-left:4px solid #be123c;">
          <p style="margin:0 0 2px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#a8a29e;">Scholarship</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#1c1917;">${scholarshipTitle}</p>
        </td>
      </tr>
    </table>

    <!-- Status badge -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:${style.bgColor};border-radius:12px;padding:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:28px;line-height:1;">${style.icon}</p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${style.color};">Current Status</p>
          <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:${style.color};">${humanStatus}</p>
          <p style="margin:0;font-size:14px;color:#57534e;line-height:1.5;">${style.message}</p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-top:8px;">
          <a href="${getEnv().NEXTAUTH_URL ?? "https://scholarhub.yum.edu.my"}/student/applications"
             style="display:inline-block;background-color:#be123c;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px;">
            View My Applications
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Application update: ${humanStatus}`,
    html: wrapInEmailLayout(bodyContent),
    text: `Your application for ${scholarshipTitle} is now ${humanStatus}. ${style.message}`,
  };
}

function buildSubmissionEmail({
  scholarshipTitle,
  tempPassword,
  setPasswordUrl,
}: {
  scholarshipTitle: string;
  tempPassword: string;
  setPasswordUrl: string;
}) {
  const baseUrl = getEnv().NEXTAUTH_URL ?? "https://scholarhub.yum.edu.my";
  const bodyContent = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c1917;">
      Application Submitted! 🎓
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#78716c;">
      Thank you for applying. Here's a summary of your submission.
    </p>

    <!-- Scholarship name -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fafaf9;border-radius:12px;padding:16px 20px;border-left:4px solid #be123c;">
          <p style="margin:0 0 2px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#a8a29e;">Scholarship</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#1c1917;">${scholarshipTitle}</p>
        </td>
      </tr>
    </table>

    <!-- Confirmation box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#ecfdf5;border-radius:12px;padding:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:28px;line-height:1;">✅</p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#059669;">Status</p>
          <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#059669;">Successfully Submitted</p>
          <p style="margin:0;font-size:14px;color:#57534e;line-height:1.5;">
            We've received your application and it's now being processed. You'll be notified when the review begins.
          </p>
        </td>
      </tr>
    </table>

    <!-- Account credentials -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#eff6ff;border-radius:12px;padding:20px;border:1px solid #bfdbfe;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1e40af;">🔑 Your Account Credentials</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1e3a5f;line-height:1.6;">
            An account has been created for you to track your application. You can log in immediately with this temporary password:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td style="background-color:#ffffff;border-radius:8px;padding:12px 16px;border:1px dashed #93c5fd;text-align:center;">
                <p style="margin:0 0 2px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Temporary Password</p>
                <p style="margin:0;font-size:18px;font-weight:700;color:#1e40af;font-family:'Courier New',monospace;letter-spacing:0.05em;">${tempPassword}</p>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#1e3a5f;line-height:1.5;">
            For security, we recommend setting your own password:
          </p>
        </td>
      </tr>
    </table>

    <!-- Set Password CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${setPasswordUrl}"
             style="display:inline-block;background-color:#1e40af;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
            🔐 Set Your Own Password
          </a>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">This link expires in 72 hours</p>
        </td>
      </tr>
    </table>

    <!-- What's next -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fafaf9;border-radius:12px;padding:20px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1c1917;">What happens next?</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#57534e;">
                <span style="margin-right:8px;">1.</span> Our team will review your application
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#57534e;">
                <span style="margin-right:8px;">2.</span> You'll receive email updates on any status changes
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#57534e;">
                <span style="margin-right:8px;">3.</span> Track progress anytime on the portal
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-top:8px;">
          <a href="${baseUrl}/student/applications"
             style="display:inline-block;background-color:#be123c;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px;">
            View My Applications
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: "Application submitted — here are your login credentials",
    html: wrapInEmailLayout(bodyContent),
    text: `We received your application for ${scholarshipTitle}. Your temporary password is: ${tempPassword}. Set your own password here: ${setPasswordUrl}`,
  };
}

export async function queueAndSendSubmissionEmail(params: {
  applicationId: string;
  recipientEmail: string;
  scholarshipTitle: string;
  tempPassword: string;
  setPasswordUrl: string;
}) {
  return queueAndSendEmail({
    ...params,
    templateKey: "application_submitted",
    content: buildSubmissionEmail({
      scholarshipTitle: params.scholarshipTitle,
      tempPassword: params.tempPassword,
      setPasswordUrl: params.setPasswordUrl,
    }),
  });
}

export async function queueAndSendStatusEmail(params: {
  applicationId: string;
  recipientEmail: string;
  scholarshipTitle: string;
  status: ApplicationStatus;
}) {
  return queueAndSendEmail({
    ...params,
    templateKey: `application_status_${params.status}`,
    content: buildStatusEmail({ scholarshipTitle: params.scholarshipTitle, status: params.status }),
  });
}

/* ------------------------------------------------------------------ */
/*  Password reset email                                               */
/* ------------------------------------------------------------------ */

function buildPasswordResetEmail({ resetUrl }: { resetUrl: string }) {
  const bodyContent = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1c1917;">
      Reset Your Password
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#78716c;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${resetUrl}"
             style="display:inline-block;background-color:#be123c;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
            🔐 Reset Password
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fafaf9;border-radius:12px;padding:20px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1c1917;">Didn't request this?</p>
          <p style="margin:0;font-size:14px;color:#57534e;line-height:1.5;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;">
      This link expires in 72 hours.
    </p>
  `;

  return {
    subject: "Reset your YUM ScholarHub password",
    html: wrapInEmailLayout(bodyContent),
    text: `Reset your password by visiting: ${resetUrl} — This link expires in 72 hours. If you didn't request this, ignore this email.`,
  };
}

export async function sendPasswordResetEmail(params: {
  recipientEmail: string;
  resetUrl: string;
}) {
  const env = getEnv();
  const content = buildPasswordResetEmail({ resetUrl: params.resetUrl });

  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: params.recipientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

async function queueAndSendEmail(params: {
  applicationId: string;
  recipientEmail: string;
  templateKey: string;
  content: {
    subject: string;
    html: string;
    text: string;
  };
}) {
  const db = getDb();
  const env = getEnv();
  const notificationId = crypto.randomUUID();

  await db
    .insertInto("email_notifications")
    .values({
      id: notificationId,
      application_id: params.applicationId,
      recipient_email: params.recipientEmail,
      template_key: params.templateKey,
      status: "queued",
      provider_message_id: null,
      error: null,
      sent_at: null,
    })
    .execute();

  try {
    const info = await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: params.recipientEmail,
      subject: params.content.subject,
      html: params.content.html,
      text: params.content.text,
    });

    await db
      .updateTable("email_notifications")
      .set({
        status: "sent",
        provider_message_id: info.messageId,
        error: null,
        sent_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", notificationId)
      .execute();
  } catch (error) {
    await db
      .updateTable("email_notifications")
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown email error",
        updated_at: new Date(),
      })
      .where("id", "=", notificationId)
      .execute();
  }
}
