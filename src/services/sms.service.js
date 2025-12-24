const axios = require("axios");
const logger = require("../utils/logger");
const env = require("../config/env");

// Eskiz.uz SMS service
let smsToken = null;

/**
 * Get SMS token from Eskiz.uz
 */
const getSMSToken = async () => {
  try {
    if (!env.SMS_EMAIL || !env.SMS_PASSWORD) {
      logger.warn("SMS credentials not configured");
      return null;
    }

    const response = await axios.post(`${env.SMS_API_URL}/auth/login`, {
      email: env.SMS_EMAIL,
      password: env.SMS_PASSWORD,
    });

    smsToken = response.data.data.token;
    logger.info("SMS token obtained successfully");
    return smsToken;
  } catch (error) {
    logger.error("Error getting SMS token:", error.message);
    return null;
  }
};

/**
 * Send SMS
 */
const sendSMS = async (phone, message) => {
  try {
    // Check if SMS is configured
    if (!env.SMS_EMAIL || !env.SMS_PASSWORD) {
      logger.warn("SMS service not configured, skipping SMS send");
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    // Get token if not exists
    if (!smsToken) {
      await getSMSToken();
    }

    if (!smsToken) {
      logger.warn("SMS token unavailable, skipping SMS");
      return {
        success: false,
        error: "SMS token unavailable",
      };
    }

    // Clean phone number (remove +, spaces, etc.)
    const cleanPhone = phone.replace(/[^\d]/g, "");

    // Send SMS
    const response = await axios.post(
      `${env.SMS_API_URL}/message/sms/send`,
      {
        mobile_phone: cleanPhone,
        message: message,
        from: "4546",
      },
      {
        headers: {
          Authorization: `Bearer ${smsToken}`,
        },
      },
    );

    logger.info(`SMS sent to ${phone}: ${response.data.message}`);

    return {
      success: true,
      messageId: response.data.id,
    };
  } catch (error) {
    // Token expired, get new one and retry
    if (error.response && error.response.status === 401) {
      smsToken = null;
      await getSMSToken();
      return sendSMS(phone, message);
    }

    logger.error("Error sending SMS:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send welcome SMS
 */
const sendWelcomeSMS = async (user, tempPassword) => {
  const message = `Assalomu alaykum ${user.firstName}! EduCRM tizimiga xush kelibsiz. Login: ${user.email}, Parol: ${tempPassword}`;
  return await sendSMS(user.phone, message);
};

/**
 * Send payment receipt SMS
 */
const sendPaymentReceiptSMS = async (student, payment) => {
  const phone = student.userId?.phone || student.phone;
  const message = `To'lovingiz qabul qilindi! Summa: ${payment.amount.toLocaleString()} UZS. Chek raqami: ${payment.receiptNumber}. Rahmat!`;
  return await sendSMS(phone, message);
};

/**
 * Send class reminder SMS
 */
const sendClassReminderSMS = async (student, group, classDate) => {
  const phone = student.userId?.phone || student.phone;
  const date = new Date(classDate).toLocaleDateString("uz-UZ");
  const message = `Eslatma: Bugun (${date}) ${group.schedule?.[0]?.startTime || "TBA"} da ${group.name} guruhida darsiz bor. Kechikmasdan keling!`;
  return await sendSMS(phone, message);
};

/**
 * Send debt reminder SMS
 */
const sendDebtReminderSMS = async (student, debtAmount, daysOverdue) => {
  const phone = student.userId?.phone || student.phone;
  const message = `Hurmatli ${student.userId?.firstName}! Sizning ${debtAmount.toLocaleString()} UZS qarzdorligingiz ${daysOverdue} kun o'tdi. Iltimos, to'lovni amalga oshiring.`;
  return await sendSMS(phone, message);
};

/**
 * Send OTP SMS
 */
const sendOTPSMS = async (phone, otp) => {
  const message = `Sizning tasdiqlash kodingiz: ${otp}. Ushbu kodni hech kimga bermang!`;
  return await sendSMS(phone, message);
};

/**
 * Send test reminder SMS
 */
const sendTestReminderSMS = async (lead, testDate, testTime) => {
  const date = new Date(testDate).toLocaleDateString("uz-UZ");
  const message = `Assalomu alaykum ${lead.firstName}! Test: ${date}, ${testTime}. Manzil: Toshkent, Yunusobod. Tel: +998901234567`;
  return await sendSMS(lead.phone, message);
};

/**
 * Send birthday SMS
 */
const sendBirthdaySMS = async (student) => {
  const phone = student.userId?.phone || student.phone;
  const message = `Tug'ilgan kuningiz bilan tabriklaymiz, ${student.userId?.firstName}! Sizga baxt, omad va muvaffaqiyatlar tilaymiz!`;
  return await sendSMS(phone, message);
};

/**
 * Send bulk SMS
 */
const sendBulkSMS = async (phones, message) => {
  const results = [];

  for (const phone of phones) {
    const result = await sendSMS(phone, message);
    results.push({
      phone,
      ...result,
    });

    // Delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
};

module.exports = {
  sendSMS,
  sendWelcomeSMS,
  sendPaymentReceiptSMS,
  sendClassReminderSMS,
  sendDebtReminderSMS,
  sendOTPSMS,
  sendTestReminderSMS,
  sendBirthdaySMS,
  sendBulkSMS,
};
