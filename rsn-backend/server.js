// ===============================
// BASIC SETUP
// ===============================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');

const app = express();

// ===============================
// CORS CONFIG
// ===============================
const allowedOrigins = [
    'http://localhost:4200',
    'https://rsn-frontend.vercel.app',
    'https://rsn-omega.vercel.app',
    'https://rsn-production-07e6.up.railway.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (!allowedOrigins.includes(origin)) {
            console.warn('❌ CORS Blocked:', origin);
            return callback(new Error('CORS not allowed'), false);
        }
        callback(null, true);
    },
    credentials: true
}));

app.options('*', cors()); // IMPORTANT for Railway

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// NODEMAILER (GMAIL - RAILWAY SAFE)
// ===============================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify SMTP (non-blocking)
transporter.verify((err) => {
    if (err) {
        console.error('❌ SMTP ERROR:', err.message);
    } else {
        console.log('✅ SMTP READY');
    }
});

// ===============================
// FILE UPLOAD (MEMORY STORAGE)
// ===============================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ===============================
// HEALTH + ROOT
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
// CAREERS API
// ===============================
app.post('/api/careers/apply', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Resume required' });
        }

        const { name, email, phone, position, message } = req.body;

        if (!name || !email || !phone || !position) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const mailOptions = {
            from: `"RSN Career Portal" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL || process.env.EMAIL_USER,
            subject: `Job Application: ${name} - ${formatPosition(position)}`,
            html: `<p><strong>Name:</strong> ${name}</p>
                   <p><strong>Email:</strong> ${email}</p>
                   <p><strong>Phone:</strong> ${phone}</p>
                   <p>${message || ''}</p>`,
            attachments: [{
                filename: req.file.originalname,
                content: req.file.buffer
            }]
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'Application submitted' });

    } catch (err) {
        console.error('❌ Career Error:', err);
        res.status(500).json({ success: false, message: 'Application failed' });
    }
});

// ===============================
// CONTACT API
// ===============================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, preferredContact, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Required fields missing' });
        }

        const mailOptions = {
            from: `"RSN Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.HR_EMAIL || process.env.EMAIL_USER,
            replyTo: email,
            subject: subject || 'New Contact',
            html: `<p><strong>Name:</strong> ${name}</p>
                   <p><strong>Email:</strong> ${email}</p>
                   <p><strong>Phone:</strong> ${phone || '-'}</p>
                   <p><strong>Preferred:</strong> ${preferredContact || 'Email'}</p>
                   <p>${message}</p>`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'Message sent' });

    } catch (err) {
        console.error('❌ Contact Error:', err);
        res.status(500).json({ success: false, message: 'Message failed' });
    }
});

// ===============================
// ERROR HANDLING
// ===============================
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ===============================
// START SERVER (RAILWAY)
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Email User: ${process.env.EMAIL_USER ? 'Configured' : 'NOT SET'}`);
});

// ===============================
// HELPERS
// ===============================
function formatPosition(value) {
    const map = {
        chartered_accountant: 'Chartered Accountant',
        articleship: 'Articleship',
        others: 'Others'
    };
    return map[value] || value;
}
