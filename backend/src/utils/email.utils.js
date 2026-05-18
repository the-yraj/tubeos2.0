// src/utils/email.utils.js
// Email sending via Gmail SMTP using nodemailer

const nodemailer = require('nodemailer');
const { config } = require('../config/env');

// ==================== TRANSPORTER ====================
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ==================== SEND EMAIL ====================
const sendEmail = async ({ to, subject, html, name }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER or EMAIL_PASS not set — skipping email send');
    return;
  }

  const transporter = createTransporter();
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

  const info = await transporter.sendMail({
    from: `"TubeOS" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  console.log(`✅ Email sent to ${to} | MessageId: ${info.messageId}`);
  return info;
};

// ==================== SEND OTP EMAIL ====================
const sendOTPEmail = async (user, otp) => {
  await sendEmail({
    to: user.email,
    name: user.name,
    subject: `${otp} is your TubeOS verification code`,
    html: `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8f9ff;">
        <div style="background:#1A1A2E;padding:30px;border-radius:12px;text-align:center;">
          <h1 style="color:#4F46E5;margin:0;font-size:32px;">TubeOS</h1>
          <p style="color:#888;font-size:14px;margin:5px 0;">Creator Command Center</p>
        </div>
        <div style="background:white;padding:40px;border-radius:12px;margin-top:20px;border:1px solid #e5e7eb;">
          <h2 style="color:#1A1A2E;margin-top:0;">Your Verification Code</h2>
          <p style="color:#555;">Hi ${user.name}, use this OTP to verify your TubeOS account:</p>
          <div style="text-align:center;margin:30px 0;">
            <div style="background:#EEF2FF;border:2px dashed #4F46E5;border-radius:12px;padding:20px;display:inline-block;">
              <span style="font-size:42px;font-weight:bold;color:#4F46E5;letter-spacing:12px;">${otp}</span>
            </div>
          </div>
          <p style="color:#888;font-size:13px;text-align:center;">This OTP expires in <strong>10 minutes</strong>.</p>
          <p style="color:#aaa;font-size:12px;text-align:center;">If you did not request this, please ignore this email.</p>
        </div>
        <div style="text-align:center;padding:20px;color:#aaa;font-size:12px;"><p>TubeOS — Elevate Your Creator Journey</p></div>
      </body></html>
    `,
  });
};

// ==================== SEND VERIFICATION EMAIL ====================
const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${config.cors.clientUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    name: user.name,
    subject: '✅ Verify your TubeOS account',
    html: `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8f9ff;">
        <div style="background:#1A1A2E;padding:30px;border-radius:12px;text-align:center;">
          <h1 style="color:#4F46E5;margin:0;font-size:32px;">TubeOS</h1>
        </div>
        <div style="background:white;padding:40px;border-radius:12px;margin-top:20px;border:1px solid #e5e7eb;">
          <h2 style="color:#1A1A2E;margin-top:0;">Welcome, ${user.name}! 🎉</h2>
          <p style="color:#555;line-height:1.6;">Click below to verify your email.</p>
          <div style="text-align:center;margin:35px 0;">
            <a href="${verifyUrl}" style="background:#4F46E5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">Verify My Email ✅</a>
          </div>
          <p style="color:#888;font-size:13px;">This link expires in 24 hours.</p>
        </div>
      </body></html>
    `,
  });
};

// ==================== SEND PASSWORD RESET ====================
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${config.cors.clientUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    name: user.name,
    subject: '🔒 Reset your TubeOS password',
    html: `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8f9ff;">
        <div style="background:#1A1A2E;padding:30px;border-radius:12px;text-align:center;">
          <h1 style="color:#4F46E5;margin:0;font-size:32px;">TubeOS</h1>
        </div>
        <div style="background:white;padding:40px;border-radius:12px;margin-top:20px;border:1px solid #e5e7eb;">
          <h2 style="color:#1A1A2E;margin-top:0;">Password Reset Request 🔒</h2>
          <p style="color:#555;line-height:1.6;">Hi ${user.name}, click below to reset your password.</p>
          <div style="text-align:center;margin:35px 0;">
            <a href="${resetUrl}" style="background:#DC2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">Reset My Password</a>
          </div>
          <div style="background:#FFF7ED;border:1px solid #FED7AA;padding:15px;border-radius:8px;">
            <p style="color:#92400E;margin:0;font-size:14px;">⚠️ This link expires in <strong>10 minutes</strong>.</p>
          </div>
        </div>
      </body></html>
    `,
  });
};

// ==================== SEND WELCOME EMAIL ====================
const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    name: user.name,
    subject: '🚀 Welcome to TubeOS — Your YouTube AI is ready!',
    html: `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8f9ff;">
        <div style="background:#1A1A2E;padding:30px;border-radius:12px;text-align:center;">
          <h1 style="color:#4F46E5;margin:0;font-size:32px;">TubeOS</h1>
        </div>
        <div style="background:white;padding:40px;border-radius:12px;margin-top:20px;">
          <h2 style="color:#1A1A2E;">You are in, ${user.name}! 🎉</h2>
          <p style="color:#555;">Your TubeOS account is verified and ready.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${config.cors.clientUrl}/dashboard" style="background:#4F46E5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Open My Dashboard 🚀</a>
          </div>
        </div>
      </body></html>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendOTPEmail };

