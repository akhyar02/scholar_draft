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

function buildStatusEmail({
  scholarshipTitle,
  status,
}: {
  scholarshipTitle: string;
  status: ApplicationStatus;
}) {
  const humanStatus = STATUS_LABELS[status];
  return {
    subject: `Application update: ${humanStatus}`,
    html: `<p>Your application for <strong>${scholarshipTitle}</strong> is now <strong>${humanStatus}</strong>.</p>`,
    text: `Your application for ${scholarshipTitle} is now ${humanStatus}.`,
  };
}

function buildSubmissionEmail({ scholarshipTitle }: { scholarshipTitle: string }) {
  return {
    subject: "Application submitted successfully",
    html: `<p>We received your application for <strong>${scholarshipTitle}</strong>.</p>`,
    text: `We received your application for ${scholarshipTitle}.`,
  };
}

export async function queueAndSendSubmissionEmail(params: {
  applicationId: string;
  recipientEmail: string;
  scholarshipTitle: string;
}) {
  return queueAndSendEmail({
    ...params,
    templateKey: "application_submitted",
    content: buildSubmissionEmail({ scholarshipTitle: params.scholarshipTitle }),
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
