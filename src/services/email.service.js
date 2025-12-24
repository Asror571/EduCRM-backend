const nodemailer = require("nodemailer");
const logger = require("../utils/logger");
const env = require("../config/env");

// Create transporter
let transporter = null;

if (env.EMAIL_USER && env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: false,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
  });

  // Verify transporter
  transporter.verify((error, _success) => {
    if (error) {
      logger.error("Email transporter error:", error);
    } else {
      logger.info("Email server is ready to send messages");
    }
  });
} else {
  logger.warn("⚠️  Email credentials not configured. Email service disabled.");
}

/**
 * Send email
 */
const sendEmail = async (options) => {
  // If email not configured, just log
  if (!transporter) {
    logger.info(
      `📧 [EMAIL DISABLED] Would send to ${options.email}: ${options.subject}`,
    );
    return {
      success: true,
      messageId: "email-disabled",
      note: "Email service not configured",
    };
  }

  try {
    const mailOptions = {
      from: `${options.fromName || "EduCRM"} <${env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.email}: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error("Error sending email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (user, tempPassword) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4CAF50;">Welcome to EduCRM!</h1>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>Your account has been created successfully.</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p><strong>Role:</strong> ${user.role}</p>
        </div>
        <p><strong>⚠️ Important:</strong> Please change your password after first login.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: user.email,
    subject: "Welcome to EduCRM",
    html,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4CAF50;">Password Reset Request</h1>
        <p>Hello ${user.firstName},</p>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy this link: ${resetUrl}</p>
        <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: user.email,
    subject: "Password Reset Request",
    html,
  });
};

/**
 * Send payment receipt email
 */
const sendPaymentReceiptEmail = async (student, payment) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4CAF50;">Payment Receipt</h1>
        <p>Dear ${student.userId?.firstName},</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <p><strong>Receipt Number:</strong> ${payment.receiptNumber}</p>
          <p><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString("uz-UZ")}</p>
          <p><strong>Amount:</strong> ${payment.amount.toLocaleString()} UZS</p>
          <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
          <p><strong>Status:</strong> ${payment.status}</p>
        </div>
        <p>Thank you for your payment!</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: student.userId?.email,
    subject: `Payment Receipt - ${payment.receiptNumber}`,
    html,
  });
};

/**
 * Send class reminder email
 */
const sendClassReminderEmail = async (student, group, classDate) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Class Reminder</h2>
        <p>Hello ${student.userId?.firstName},</p>
        <p>You have a class coming up:</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <p><strong>Group:</strong> ${group.name}</p>
          <p><strong>Date:</strong> ${new Date(classDate).toLocaleDateString("uz-UZ")}</p>
          <p><strong>Time:</strong> ${group.schedule?.[0]?.startTime || "TBA"}</p>
        </div>
        <p>Please don't be late!</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: student.userId?.email,
    subject: `Reminder: ${group.name} class`,
    html,
  });
};

/**
 * Send debt reminder email
 */
const sendDebtReminderEmail = async (student, debtAmount, daysOverdue) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #d9534f;">Outstanding Balance Notice</h2>
        <p>Dear ${student.userId?.firstName},</p>
        <p>You have an outstanding balance in your account:</p>
        <div style="background: #fff3cd; padding: 15px; margin: 20px 0;">
          <p><strong>Outstanding Amount:</strong> ${debtAmount.toLocaleString()} UZS</p>
          <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
        </div>
        <p>Please settle your balance at your earliest convenience to avoid interruption of services.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: student.userId?.email,
    subject: "Outstanding Balance Notice",
    html,
  });
};

/**
 * Send announcement email
 */
const sendAnnouncementEmail = async (recipients, announcement) => {
  const results = [];

  for (const recipient of recipients) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${announcement.title}</h2>
          <p>${announcement.content}</p>
          <p style="color: #999; font-size: 12px;">Sent: ${new Date().toLocaleDateString("uz-UZ")}</p>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      email: recipient.email,
      subject: announcement.title,
      html,
    });

    results.push({
      email: recipient.email,
      ...result,
    });
  }

  return results;
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentReceiptEmail,
  sendClassReminderEmail,
  sendDebtReminderEmail,
  sendAnnouncementEmail,
};
