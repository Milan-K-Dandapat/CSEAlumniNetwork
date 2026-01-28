import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // ✅ Load env here

// ===============================
// ZOHO SMTP TRANSPORTER
// ===============================
const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",          // ✅ Force Zoho Host
    port: 465,                    // ✅ SSL Port
    secure: true,                 // ✅ Required
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


// ===============================
// VERIFY CONNECTION
// ===============================
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP Error:", error);
    } else {
        console.log("✅ Zoho SMTP Connected Successfully");
    }
});


// ===============================
// DATE FORMATTER
// ===============================
const formatEventDate = (date) => {
    if (!date) return 'Date TBD';

    try {
        return new Date(date).toLocaleString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
    } catch (e) {
        return 'Date TBD';
    }
};


// ===============================
// PAYMENT EMAIL
// ===============================
export const sendPaymentConfirmationEmail = async (details) => {

    const {
        email,
        fullName,
        eventTitle,
        amount,
        eventDate,
        eventLocation,
        paymentId,
        pdfAttachment
    } = details;

    const formattedDate = formatEventDate(eventDate);

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,

        subject: `✔ Registration Confirmed for ${eventTitle}!`,

        text: `Hi ${fullName},

Payment Successful.

₹${amount}
Payment ID: ${paymentId}

Event: ${eventTitle}
Date: ${formattedDate}
Location: ${eventLocation}

IGIT Alumni Team`,
        
        attachments: [
            {
                filename: `receipt-${paymentId}.pdf`,
                content: Buffer.from(pdfAttachment, "base64"),
                contentType: "application/pdf"
            }
        ]
    };

    await transporter.sendMail(mailOptions);
};


// ===============================
// DONATION EMAIL
// ===============================
export const sendDonationEmail = async (details) => {

    const { email, fullName, amount, paymentId, pdfAttachment } = details;

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,

        subject: "Thank You For Your Donation",

        text: `Hi ${fullName},

Thank you for donating ₹${amount}

Payment ID: ${paymentId}

IGIT Alumni Team`,

        attachments: [
            {
                filename: `donation-${paymentId}.pdf`,
                content: Buffer.from(pdfAttachment, "base64"),
                contentType: "application/pdf"
            }
        ]
    };

    await transporter.sendMail(mailOptions);
};


// ===============================
// FREE EVENT EMAIL
// ===============================
export const sendFreeEventEmail = async (details) => {

    const {
        email,
        fullName,
        eventTitle,
        eventDate,
        eventLocation,
        receiptId,
        pdfAttachment
    } = details;

    const formattedDate = formatEventDate(eventDate);

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,

        subject: `🎉 Event Confirmed - ${eventTitle}`,

        text: `Hi ${fullName},

You are registered.

${eventTitle}
${formattedDate}
${eventLocation}

IGIT Alumni Team`,

        attachments: [
            {
                filename: `event-${receiptId}.pdf`,
                content: Buffer.from(pdfAttachment, "base64"),
                contentType: "application/pdf"
            }
        ]
    };

    await transporter.sendMail(mailOptions);
};


// ===============================
// GENERIC EMAIL (OTP / RESET)
// ===============================
export const sendEmail = async ({ to, subject, text, html }) => {

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html
    };

    await transporter.sendMail(mailOptions);
};


export default transporter;
