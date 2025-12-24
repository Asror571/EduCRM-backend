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
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Password Reset Request</h1>
        <p>Hello ${user.firstName},</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; display: inline-block;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
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
        <h1>Payment Receipt</h1>
        <p>Dear ${student.user.firstName} ${student.user.lastName},</p>
        <p>Thank you for your payment.</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <p><strong>Receipt Number:</strong> ${payment.receiptNumber}</p>
          <p><strong>Amount:</strong> ${payment.amount.toLocaleString()} ${payment.currency}</p>
          <p><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</p>
          <p><strong>Method:</strong> ${payment.paymentMethod}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: student.user.email,
    subject: `Payment Receipt - ${payment.receiptNumber}`,
    html,
  });
};

/**
 * Send class reminder email
 */
const sendClassReminderEmail = async (student, group, _classDate) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>⏰ Class Reminder</h1>
        <p>Hello ${student.user.firstName},</p>
        <p>Reminder: You have class today!</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <p><strong>Group:</strong> ${group.name}</p>
          <p><strong>Time:</strong> ${group.schedule[0]?.startTime}</p>
          <p><strong>Room:</strong> ${group.roomNumber}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: student.user.email,
    subject: `Class Reminder - ${group.name}`,
    html,
  });
};

/**
 * Send debt reminder email
 */
const sendDebtReminderEmail = async (student, debtAmount) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>💳 Payment Reminder</h1>
        <p>Dear ${student.user.firstName} ${student.user.lastName},</p>
        <p>You have an outstanding balance of ${debtAmount.toLocaleString()} UZS.</p>
        <p>Please make payment soon to avoid interruption in classes.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    email: student.user.email,
    subject: "Payment Reminder",
    html,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentReceiptEmail,
  sendClassReminderEmail,
  sendDebtReminderEmail,
};
