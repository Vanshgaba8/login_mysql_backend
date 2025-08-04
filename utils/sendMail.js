const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = async ({ to, subject, text }) => {
  await transporter.sendMail({
    from: `"Auth App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};
