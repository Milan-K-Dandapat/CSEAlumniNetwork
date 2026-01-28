import nodemailer from "nodemailer";

// ===============================
// SMTP2GO Transporter Setup
// ===============================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true only for 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify SMTP Connection
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP Error:", error);
    } else {
        console.log("✅ SMTP Server Ready");
    }
});

// ===============================
// Helper: Format Event Date
// ===============================
const formatEventDate = (date) => {
    if (!date) return 'Date TBD';
    try {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: 'numeric', 
            timeZone: 'Asia/Kolkata'
        };
        return new Date(date).toLocaleString('en-IN', options);
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'Date TBD';
    }
};


// ===============================
// PAYMENT CONFIRMATION EMAIL
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

Registration Confirmed!

Thank you for registering. Your payment of ₹${amount} was successful.

Payment ID: ${paymentId}

Event: ${eventTitle}
When: ${formattedDate}
Where: ${eventLocation}

Best,
The Alumni Network Team`,

        html: `

${details.html || ''}

`,

        attachments: [
            {
                filename: `receipt-${paymentId || 'event'}.pdf`,
                content: Buffer.from(pdfAttachment, "base64"),
                contentType: "application/pdf"
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Payment confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        throw error;
    }
};


// ===============================
// DONATION EMAIL
// ===============================
export const sendDonationEmail = async (details) => {

    const {
        email,
        fullName,
        amount,
        paymentId,
        pdfAttachment
    } = details;

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Thank You for Your Generous Donation!',

        text: `Hi ${fullName},

Thank you for your donation of ₹${amount}.

Payment ID: ${paymentId}

Best,
The Alumni Network Team`,

        html: `

${details.html || ''}

`,

        attachments: [
            {
                filename: `donation-receipt-${paymentId}.pdf`,
                content: Buffer.from(pdfAttachment, "base64"),
                contentType: "application/pdf"
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Donation confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Error sending donation email:', error);
        throw error;
    }
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
        subject: `🎉 Congratulations! Your Spot is Confirmed for ${eventTitle}!`,

        text: `Hi ${fullName},

Your spot is confirmed for ${eventTitle}.

When: ${formattedDate}
Where: ${eventLocation}

Best,
The Alumni Network Team`,

        html: `

${details.html || ''}

`,

        attachments: [
            {
                filename: `confirmation-${receiptId}.pdf`,
                content: Buffer.from(pdfAttachment, "base64"),
                contentType: "application/pdf"
            }
        ]
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Free event confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Error sending free event email:', error);
        throw error;
    }
};


// ===============================
// ✅ GENERIC EMAIL FUNCTION (ADDED)
// ===============================
export const sendEmail = async ({ to, subject, text, html }) => {

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`General email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};


// ===============================
// DEFAULT EXPORT (OPTIONAL SAFETY)
// ===============================
export default transporter;
