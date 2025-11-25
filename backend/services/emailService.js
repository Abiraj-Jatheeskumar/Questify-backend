const nodemailer = require('nodemailer');
const config = require('../config');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS
  }
});

// Send password email to student
const sendPasswordEmail = async (email, name, password) => {
  try {
    const mailOptions = {
      from: config.EMAIL_USER,
      to: email,
      subject: 'Your Student Account Credentials - MCQ System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Student Engagement MCQ System</h2>
          <p>Hello ${name},</p>
          <p>Your student account has been created. Please use the following credentials to log in:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p>Please change your password after your first login for security purposes.</p>
          <p>Best regards,<br>Admin Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
};

module.exports = { sendPasswordEmail };

