/**
 * lib/resend.ts — Resend email client and transactional email helpers
 * LTSU College Event Management System — Next.js
 *
 * Resend is used for all transactional emails:
 *   - Registration confirmations
 *   - Payment status updates
 *   - Duty leave approvals / rejections
 *   - Event approval notifications
 *   - Waitlist promotions
 *   - Event reminders
 *
 * Docs: https://resend.com/docs
 */

import { Resend } from "resend";

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "noreply@ltsuevents.com";
export const FROM_NAME =
  process.env.RESEND_FROM_NAME ?? "LTSU Events";
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Send Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a transactional email via Resend.
 *
 * @param to        Recipient email address or array of addresses.
 * @param subject   Email subject line.
 * @param html      HTML body of the email.
 * @param text      Optional plain-text fallback.
 * @param replyTo   Optional reply-to address.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string,
  replyTo?: string
): Promise<SendEmailResult> {
  try {
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (text) payload.text = text;
    if (replyTo) payload.replyTo = replyTo;

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error("[Resend] Send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Resend] Unexpected error:", message);
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML Template Wrapper
// ─────────────────────────────────────────────────────────────────────────────

function emailWrapper(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif;
           background: #f4f4f5; color: #18181b; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff;
               border-radius: 12px; overflow: hidden;
               border: 1px solid #e4e4e7; }
    .header  { background: #4F46E5; color: #fff; padding: 28px 32px;
               text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header p  { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
    .body    { padding: 32px; }
    .body p  { margin: 0 0 12px; line-height: 1.6; font-size: 15px; }
    .info-card { background: #f9fafb; border: 1px solid #e4e4e7;
                 border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-card p { margin: 6px 0; font-size: 14px; }
    .info-card strong { color: #4F46E5; }
    .btn { display: inline-block; margin-top: 20px; padding: 12px 28px;
           background: #4F46E5; color: #fff; border-radius: 8px;
           text-decoration: none; font-size: 15px; font-weight: 600; }
    .status-approved { color: #16a34a; font-weight: 700; }
    .status-rejected { color: #dc2626; font-weight: 700; }
    .status-pending  { color: #d97706; font-weight: 700; }
    .footer { background: #4F46E5; color: #fff; padding: 16px 32px;
              text-align: center; font-size: 12px; opacity: 0.9; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 20px 0; }
    .muted { color: #71717a; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>LTSU Events</h1>
      <p>Lamrin Tech Skills University — Event Management System</p>
    </div>
    <div class="body">
      ${bodyHtml}
      <hr class="divider" />
      <p class="muted">
        This is an automated message from LTSU Events.
        Please do not reply to this email.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Lamrin Tech Skills University. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Registration Confirmation
// ─────────────────────────────────────────────────────────────────────────────

export interface RegistrationEmailOptions {
  to: string;
  studentName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  registrationId: string;
  qrCodeBase64?: string;   // data:image/png;base64,... — embedded in email
  appUrl?: string;
}

export async function sendRegistrationConfirmation(
  opts: RegistrationEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    studentName,
    eventTitle,
    eventDate,
    venueName,
    registrationId,
    qrCodeBase64,
    appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ltsuevents.com",
  } = opts;

  const qrSection = qrCodeBase64
    ? `<div style="text-align:center; margin: 24px 0;">
         <p style="font-weight:600; margin-bottom:8px;">Your Entry QR Code</p>
         <img src="${qrCodeBase64}" alt="QR Code"
              style="width:180px; height:180px; border:1px solid #e4e4e7; border-radius:8px;" />
         <p class="muted">Show this at the event gate for entry.</p>
       </div>`
    : "";

  const body = `
    <p>Hi <strong>${studentName}</strong>,</p>
    <p>
      Your registration for the following event has been
      <strong style="color:#16a34a;">confirmed</strong>:
    </p>
    <div class="info-card">
      <p>🎉 <strong>Event:</strong> ${eventTitle}</p>
      <p>📅 <strong>Date:</strong> ${eventDate}</p>
      <p>📍 <strong>Venue:</strong> ${venueName}</p>
      <p>🎫 <strong>Registration ID:</strong> <code>${registrationId}</code></p>
    </div>
    ${qrSection}
    <p>
      Please bring a valid college ID card to the event.
      You can view your registration and QR code in the app anytime.
    </p>
    <a class="btn" href="${appUrl}/dashboard">View My Events</a>
  `;

  return sendEmail(
    to,
    `Registration Confirmed: ${eventTitle}`,
    emailWrapper(`Registration Confirmed: ${eventTitle}`, body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Payment Status Update
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentEmailOptions {
  to: string;
  studentName: string;
  eventTitle: string;
  amount: number;
  utr: string;
  status: "approved" | "rejected" | "manual_review";
  rejectionReason?: string;
}

export async function sendPaymentStatusEmail(
  opts: PaymentEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    studentName,
    eventTitle,
    amount,
    utr,
    status,
    rejectionReason,
  } = opts;

  const statusLabel =
    status === "approved"
      ? `<span class="status-approved">APPROVED ✓</span>`
      : status === "rejected"
      ? `<span class="status-rejected">REJECTED ✗</span>`
      : `<span class="status-pending">UNDER REVIEW ⏳</span>`;

  const messageMap: Record<string, string> = {
    approved:
      "Your payment has been verified. Your registration is now fully confirmed.",
    rejected:
      "Unfortunately your payment could not be verified. Please re-submit a valid screenshot or contact your Faculty Coordinator.",
    manual_review:
      "Your payment is under manual review by the Faculty Coordinator. You will receive another update shortly.",
  };

  const reasonSection =
    status === "rejected" && rejectionReason
      ? `<p><strong>Reason:</strong> <span style="color:#dc2626;">${rejectionReason}</span></p>`
      : "";

  const body = `
    <p>Hi <strong>${studentName}</strong>,</p>
    <p>${messageMap[status]}</p>
    <div class="info-card">
      <p>🎉 <strong>Event:</strong> ${eventTitle}</p>
      <p>💰 <strong>Amount:</strong> Rs. ${amount.toFixed(2)}</p>
      <p>🔖 <strong>UTR / Reference:</strong> <code>${utr}</code></p>
      <p>📌 <strong>Status:</strong> ${statusLabel}</p>
      ${reasonSection}
    </div>
    <p>
      If you have any questions, please contact your Faculty Coordinator
      or visit the LTSU Events app.
    </p>
  `;

  const subjectMap: Record<string, string> = {
    approved: `Payment Approved: ${eventTitle}`,
    rejected: `Payment Rejected: ${eventTitle}`,
    manual_review: `Payment Under Review: ${eventTitle}`,
  };

  return sendEmail(
    to,
    subjectMap[status],
    emailWrapper(subjectMap[status], body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Event Approval Notification (for Organizers)
// ─────────────────────────────────────────────────────────────────────────────

export interface ApprovalEmailOptions {
  to: string;
  organizerName: string;
  eventTitle: string;
  stage: 1 | 2;
  status: "approved" | "rejected";
  approverRole: string;
  note?: string;
  appUrl?: string;
}

export async function sendApprovalNotificationEmail(
  opts: ApprovalEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    organizerName,
    eventTitle,
    stage,
    status,
    approverRole,
    note,
    appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ltsuevents.com",
  } = opts;

  const stageLabel = stage === 1 ? "Faculty Coordinator" : "HOD";
  const statusLabel =
    status === "approved"
      ? `<span class="status-approved">APPROVED ✓</span>`
      : `<span class="status-rejected">REJECTED ✗</span>`;

  const nextStepSection =
    status === "approved" && stage === 1
      ? `<p>Your event has advanced to <strong>Stage 2 — HOD Review</strong>. You will receive another update once the HOD reviews it.</p>`
      : status === "approved" && stage === 2
      ? `<p>🎉 <strong>Your event is now LIVE!</strong> Students can start registering. The WhatsApp message drafter is also now unlocked.</p>
         <a class="btn" href="${appUrl}/dashboard">Manage Event</a>`
      : `<p>Please review the feedback, make necessary changes, and resubmit your event proposal.</p>`;

  const noteSection = note
    ? `<div class="info-card">
         <p><strong>Feedback from ${approverRole}:</strong></p>
         <p>${note}</p>
       </div>`
    : "";

  const body = `
    <p>Hi <strong>${organizerName}</strong>,</p>
    <p>
      Your event <strong>${eventTitle}</strong> has been reviewed at
      <strong>Stage ${stage} (${stageLabel})</strong>:
    </p>
    <div class="info-card">
      <p>📋 <strong>Event:</strong> ${eventTitle}</p>
      <p>🔢 <strong>Stage:</strong> ${stage} — ${stageLabel}</p>
      <p>📌 <strong>Decision:</strong> ${statusLabel}</p>
    </div>
    ${noteSection}
    ${nextStepSection}
  `;

  const subject =
    status === "approved" && stage === 2
      ? `🎉 Event Approved & Live: ${eventTitle}`
      : status === "approved"
      ? `Event Advanced to Stage 2: ${eventTitle}`
      : `Event Rejected at Stage ${stage}: ${eventTitle}`;

  return sendEmail(to, subject, emailWrapper(subject, body));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Duty Leave Status Update
// ─────────────────────────────────────────────────────────────────────────────

export interface DutyLeaveEmailOptions {
  to: string;
  studentName: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: "approved" | "rejected";
  approvedByName?: string;
  note?: string;
}

export async function sendDutyLeaveStatusEmail(
  opts: DutyLeaveEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    studentName,
    eventTitle,
    eventDate,
    startTime,
    endTime,
    status,
    approvedByName,
    note,
  } = opts;

  const statusLabel =
    status === "approved"
      ? `<span class="status-approved">APPROVED ✓</span>`
      : `<span class="status-rejected">REJECTED ✗</span>`;

  const noteSection = note
    ? `<p><strong>Note:</strong> ${note}</p>`
    : "";

  const approverSection = approvedByName
    ? `<p>👤 <strong>Reviewed by:</strong> ${approvedByName}</p>`
    : "";

  const body = `
    <p>Hi <strong>${studentName}</strong>,</p>
    <p>Your duty leave request has been reviewed:</p>
    <div class="info-card">
      <p>📋 <strong>Event:</strong> ${eventTitle}</p>
      <p>📅 <strong>Date:</strong> ${eventDate}</p>
      <p>⏰ <strong>Time:</strong> ${startTime} – ${endTime}</p>
      <p>📌 <strong>Status:</strong> ${statusLabel}</p>
      ${approverSection}
      ${noteSection}
    </div>
    ${
      status === "approved"
        ? "<p>Your duty leave has been approved. Please carry a copy of this email or show it in the app when required.</p>"
        : "<p>Your duty leave request was not approved. Please contact your Faculty Coordinator for more information.</p>"
    }
  `;

  const subject =
    status === "approved"
      ? `Duty Leave Approved: ${eventTitle}`
      : `Duty Leave Rejected: ${eventTitle}`;

  return sendEmail(to, subject, emailWrapper(subject, body));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Waitlist Promotion
// ─────────────────────────────────────────────────────────────────────────────

export interface WaitlistEmailOptions {
  to: string;
  studentName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  registrationDeadline?: string;
  appUrl?: string;
}

export async function sendWaitlistPromotionEmail(
  opts: WaitlistEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    studentName,
    eventTitle,
    eventDate,
    venueName,
    registrationDeadline,
    appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ltsuevents.com",
  } = opts;

  const deadlineSection = registrationDeadline
    ? `<p>⚠️ <strong>Please complete your registration by ${registrationDeadline}</strong> or your spot will be given to the next person on the waitlist.</p>`
    : `<p>⚠️ <strong>Please complete your registration quickly</strong> as spots are limited.</p>`;

  const body = `
    <p>Hi <strong>${studentName}</strong>,</p>
    <p>Great news! A spot has opened up for the following event and
       you have been <strong style="color:#16a34a;">moved off the waitlist</strong>:</p>
    <div class="info-card">
      <p>🎉 <strong>Event:</strong> ${eventTitle}</p>
      <p>📅 <strong>Date:</strong> ${eventDate}</p>
      <p>📍 <strong>Venue:</strong> ${venueName}</p>
    </div>
    ${deadlineSection}
    <a class="btn" href="${appUrl}/dashboard">Complete Registration Now</a>
  `;

  return sendEmail(
    to,
    `You're Off the Waitlist: ${eventTitle}`,
    emailWrapper(`You're Off the Waitlist: ${eventTitle}`, body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Event Reminder (24 hours before)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventReminderEmailOptions {
  to: string;
  studentName: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  venueName: string;
  registrationId: string;
  appUrl?: string;
}

export async function sendEventReminderEmail(
  opts: EventReminderEmailOptions
): Promise<SendEmailResult> {
  const {
    to,
    studentName,
    eventTitle,
    eventDate,
    eventTime,
    venueName,
    registrationId,
    appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ltsuevents.com",
  } = opts;

  const timeSection = eventTime
    ? `<p>⏰ <strong>Time:</strong> ${eventTime}</p>`
    : "";

  const body = `
    <p>Hi <strong>${studentName}</strong>,</p>
    <p>
      This is a friendly reminder that you are registered for an event
      <strong>happening tomorrow</strong>!
    </p>
    <div class="info-card">
      <p>🎉 <strong>Event:</strong> ${eventTitle}</p>
      <p>📅 <strong>Date:</strong> ${eventDate}</p>
      ${timeSection}
      <p>📍 <strong>Venue:</strong> ${venueName}</p>
      <p>🎫 <strong>Registration ID:</strong> <code>${registrationId}</code></p>
    </div>
    <p>
      <strong>What to bring:</strong>
    </p>
    <ul style="padding-left:20px; line-height:1.8; font-size:14px;">
      <li>Your college ID card</li>
      <li>Your QR code (available in the LTSU Events app)</li>
      <li>Any payment receipt (if applicable)</li>
    </ul>
    <a class="btn" href="${appUrl}/dashboard">View My QR Code</a>
  `;

  return sendEmail(
    to,
    `Reminder: ${eventTitle} is Tomorrow!`,
    emailWrapper(`Reminder: ${eventTitle} is Tomorrow!`, body)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Bulk Email (e.g. event cancellation announcement)
// ─────────────────────────────────────────────────────────────────────────────

export interface BulkEmailOptions {
  recipients: Array<{ email: string; name: string }>;
  subject: string;
  htmlTemplate: (name: string) => string;
  delayMs?: number;  // delay between sends to avoid rate-limiting
}

export async function sendBulkEmail(
  opts: BulkEmailOptions
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const { recipients, subject, htmlTemplate, delayMs = 100 } = opts;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const result = await sendEmail(
      recipient.email,
      subject,
      htmlTemplate(recipient.name)
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${recipient.email}: ${result.error}`);
    }

    // Small delay to stay within Resend rate limits
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed, errors };
}

export { resend };
export default resend;
