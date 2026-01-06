// ===============================
// BASIC SETUP
// ===============================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
const allowedOrigins = [
    'http://localhost:4200',
    'https://rsn-frontend.vercel.app',
    'https://rsn-omega.vercel.app',
    'https://rsn-production-07e6.up.railway.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            console.warn('❌ CORS Blocked:', origin);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// NODEMAILER CONFIG (FIXED FOR RAILWAY)
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
// FILE UPLOAD CONFIG FOR RAILWAY (CLOUD STORAGE)
// ===============================
// Railway has read-only filesystem - use cloud storage or memory storage
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(), // Store in memory, not disk
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ===============================
// HEALTH CHECK ENDPOINT
// ===============================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Backend is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'RSN Backend API',
        endpoints: {
            health: '/api/health',
            careers: '/api/careers/apply',
            contact: '/api/contact'
        }
    });
});

// ===============================
// CAREERS API ROUTE (FIXED FOR RAILWAY)
// ===============================
app.post('/api/careers/apply', upload.single('resume'), async (req, res) => {
    try {
        console.log('📩 FORM DATA RECEIVED');

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Resume file is required'
            });
        }

        const { name, email, phone, position, message } = req.body;
        const formattedPosition = formatPosition(position);

        // Validate required fields
        if (!name || !email || !phone || !position) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // ===============================
        // EMAIL CONTENT
        // ===============================
        const mailOptions = {
            from: `"RSN Career Portal" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL || process.env.EMAIL_USER,
            subject: `Job Application: ${name} - ${formattedPosition}`,
            html: `
                <div style="max-width: 700px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                    <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
                        New Job Application - ${formattedPosition}
                    </h2>
                    <div style="margin: 20px 0;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <p><strong>Position:</strong> ${formattedPosition}</p>
                        <p><strong>Message:</strong></p>
                        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #000; margin: 10px 0;">
                            ${message || 'No message provided'}
                        </div>
                    </div>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This application was submitted via RSN Career Portal
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: req.file.originalname || 'resume.pdf',
                    content: req.file.buffer // Use buffer from memory storage
                }
            ]
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log('✅ Application email sent successfully');

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully'
        });

    } catch (err) {
        console.error('❌ Application Error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to process application',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ===============================
// CONTACT API ROUTE
// ===============================
app.post('/api/contact', async (req, res) => {
    try {
        console.log('📩 Contact form received');

        const { name, email, phone, subject, preferredContact, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }

        const mailOptions = {
            from: `"RSN Website Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL || process.env.EMAIL_USER,
            replyTo: email,
            subject: `Contact Form: ${subject || 'New Inquiry'}`,
            html: `
                <div style="max-width: 700px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                    <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
                        New Contact Form Submission
                    </h2>
                    <div style="margin: 20px 0;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                        <p><strong>Preferred Contact:</strong> ${preferredContact || 'Email'}</p>
                        <p><strong>Message:</strong></p>
                        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #000; margin: 10px 0;">
                            ${message}
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Contact email sent successfully');

        res.status(200).json({
            success: true,
            message: 'Message sent successfully'
        });

    } catch (err) {
        console.error('❌ Contact Error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

// ===============================
// ERROR HANDLING MIDDLEWARE
// ===============================
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// ===============================
// START SERVER FOR RAILWAY
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Email User: ${process.env.EMAIL_USER ? 'Configured' : 'NOT SET'}`);
    console.log(`🎯 HR Email: ${process.env.HR_EMAIL || 'Using default'}`);
});

function formatPosition(value) {
    const map = {
        chartered_accountant: 'Chartered Accountant',
        articleship: 'Articleship',
        others: 'Others'
    };
    return map[value] || value;
}