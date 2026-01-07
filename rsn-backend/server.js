// ===============================
// BASIC SETUP
// ===============================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({ origin: '*' }));
app.use(express.json());

// ===============================
// MULTER CONFIG (FILE UPLOAD)
// ===============================
const uploadDir = 'uploads';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// ===============================
// NODEMAILER CONFIG (GMAIL)
// ===============================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ===============================
// VERIFY SMTP ON STARTUP
// ===============================
transporter.verify((error) => {
    if (error) {
        console.error('❌ SMTP ERROR:', error);
    } else {
        console.log('✅ SMTP READY');
    }
});

// ===============================
// API ROUTE
// ===============================
app.post('/api/careers/apply', upload.single('resume'), async (req, res) => {
    try {
        console.log('📩 FORM DATA:', req.body);
        console.log('📎 FILE:', req.file);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Resume file missing'
            });
        }

        const {
            name,
            email,
            phone,
            position,
            message
        } = req.body;
        const formattedPosition = formatPosition(position);


        // ===============================
        // EMAIL CONTENT
        // ===============================
        const mailOptions = {
            from: `"Career Portal" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL,
            subject: `RSN & Co New Job Application – ${formattedPosition}`,
            html: `
 <div style="
  max-width: 680px;
  margin: 0 auto;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  background: #ffffff;
  border: 1px solid #e5e7eb;
">

  <!-- HEADER -->
  <div style="
    padding: 24px 32px;
    border-bottom: 3px solid #000000;
    display: flex;
    align-items: center;
    gap: 16px;
  ">
    <!-- LOGO -->
<!--    <img-->
<!--      src="assets/images/logo.png"-->
<!--      alt="Company Logo"-->
<!--      style="height: 48px; object-fit: contain;"-->
<!--    />-->

    <div>
      <h2 style="
        margin: 0;
        font-size: 20px;
        color: #000000;
        letter-spacing: 0.5px;
      ">
        New Job Application
      </h2>
      <p style="
        margin: 4px 0 0;
        font-size: 13px;
        color: #555555;
      ">
        RSN & Co Careers Portal Submission
      </p>
    </div>
  </div>

  <!-- BODY -->
  <div style="padding: 28px 32px; color: #111111;">

    <!-- DETAILS TABLE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; width: 35%; color: #555555;"><strong>Name</strong></td>
        <td style="padding: 10px 0;">${name}</td>
      </tr>

      <tr>
        <td style="padding: 10px 0; color: #555555;"><strong>Email</strong></td>
        <td style="padding: 10px 0;">${email}</td>
      </tr>

      <tr>
        <td style="padding: 10px 0; color: #555555;"><strong>Phone</strong></td>
        <td style="padding: 10px 0;">${phone}</td>
      </tr>

      <tr>
        <td style="padding: 10px 0; color: #555555;"><strong>Position</strong></td>
        <td style="padding: 10px 0;">${formattedPosition}</td>
      </tr>
    </table>

    <!-- MESSAGE -->
    <div style="margin-top: 28px;">
      <p style="
        margin: 0 0 10px;
        font-weight: 600;
        color: #000000;
        text-transform: uppercase;
        font-size: 13px;
        letter-spacing: 0.6px;
      ">
        Cover Letter / Message
      </p>

      <div style="
        background: #f8f8f8;
        border-left: 4px solid #000000;
        padding: 18px;
        line-height: 1.7;
        color: #222222;
        white-space: pre-line;
      ">
        ${message}
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="
    background: #fafafa;
    border-top: 1px solid #e5e7eb;
    padding: 16px 32px;
    font-size: 12px;
    color: #666666;
    text-align: center;
  ">
    This email was generated automatically from the Careers Portal.<br/>
    © ${new Date().getFullYear()} RSN & Co. All rights reserved.
  </div>

</div>

      `,
            attachments: [
                {
                    filename: req.file.originalname,
                    path: req.file.path
                }
            ]
        };

        // ===============================
        // SEND EMAIL
        // ===============================
        await transporter.sendMail(mailOptions);

        console.log('✅ EMAIL SENT SUCCESSFULLY');

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully'
        });

    } catch (err) {
        console.error('❌ SERVER ERROR:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to send email'
        });
    }
});
app.post('/api/contact', async (req, res) => {
    try {
        console.log('📩 CONTACT FORM RECEIVED:', req.body);

        const { name, email, phone, subject,preferredContact, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // ✅ EMAIL CONTENT
        const mailOptions = {
            from: `"Website Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL,
            replyTo: email,
            subject: `Contact Form: ${subject}`,
            html: `
      <div style="
  max-width: 700px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  font-family: 'FiraSans-Regular;
  color: #111111;
">

  <!-- HEADER -->
  <div style="
    padding: 24px 32px;
    border-bottom: 3px solid #000000;
    display: flex;
    align-items: center;
    gap: 16px;
  ">
    <!-- LOGO -->
<!--    <img-->
<!--       src="assets/images/logo.png"-->
<!--      alt="Company Logo"-->
<!--      style="height: 44px; object-fit: contain;"-->
<!--    />-->

    <div>
      <h2 style="
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0.4px;
      ">
        Contact
      </h2>
      <p style="
        margin: 4px 0 0;
        font-size: 13px;
        color: #666666;
      ">
        Inquiry Form Submission
      </p>
    </div>
  </div>

  <!-- BODY -->
  <div style="padding: 28px 32px;">

    <!-- DETAILS TABLE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; width: 35%; color: #555555;"><strong>Name</strong></td>
        <td style="padding: 10px 0;">${name}</td>
      </tr>

      <tr>
        <td style="padding: 10px 0; color: #555555;"><strong>Email</strong></td>
        <td style="padding: 10px 0;">${email}</td>
      </tr>

      <tr>
        <td style="padding: 10px 0; color: #555555;"><strong>Phone</strong></td>
        <td style="padding: 10px 0;">${phone || '-'}</td>
      </tr>
       <tr>
        <td style="padding: 10px 0; color: #555555;"><strong>Preferred Contact</strong></td>
        <td style="padding: 10px 0;">${preferredContact || '-'}</td>
      </tr>

      <tr>
        <td style="padding: 10px 0; color: #555555;"><strong>Subject</strong></td>
        <td style="padding: 10px 0;">${subject}</td>
      </tr>
    </table>

    <!-- MESSAGE -->
    <div style="margin-top: 26px;">
      <p style="
        margin: 0 0 10px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #000000;
      ">
        Message
      </p>

      <div style="
        background: #f8f8f8;
        border-left: 4px solid #000000;
        padding: 16px;
        line-height: 1.7;
        color: #222222;
        white-space: pre-line;
      ">
        ${message}
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="
    border-top: 1px solid #e5e5e5;
    background: #fafafa;
    padding: 16px 32px;
    font-size: 12px;
    color: #777777;
    text-align: center;
  ">
    This email was generated from the website contact form.<br/>
    © ${new Date().getFullYear()} RSN & co. All rights reserved.
  </div>

</div>

      `
        };

        // ✅ SEND MAIL
        await transporter.sendMail(mailOptions);

        console.log('✅ CONTACT EMAIL SENT');

        return res.status(200).json({
            success: true,
            message: 'Contact message sent successfully'
        });

    } catch (err) {
        console.error('❌ CONTACT ERROR:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to send contact email'
        });
    }
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});


function formatPosition(value) {
    const map = {
        chartered_accountant: 'Chartered Accountant',
        articleship: 'Articleship',
        others: 'Others'
    };

    return map[value] || value;
}
