import Alumni from '../models/Alumni.js';
import nodemailer from "nodemailer";


// ===============================
// SMTP2GO Transporter
// ===============================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP Error:", error);
    } else {
        console.log("✅ SMTP Ready (Alumni)");
    }
});


/**
 * @desc    Get all alumni profiles
 * @route   GET /api/alumni
 * @access  Private
 */
export const getAlumni = async (req, res) => {

    try {
        const alumni = await Alumni.find({}).sort({ createdAt: -1 });
        res.status(200).json(alumni);

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching alumni',
            error: error.message
        });
    }
};


/**
 * @desc    Verify an alumni profile
 * @route   PATCH /api/alumni/:id/verify
 * @access  Private
 */
export const verifyAlumni = async (req, res) => {

    try {

        // --- SECURITY CHECK ---
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === 'milankumar7770@gmail.com';

        if (userRole !== 'admin' && !isSuperAdmin) {
            return res.status(403).json({
                message: 'Access denied. Admin privileges required.'
            });
        }
        // ----------------------


        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({
                message: 'Alumni not found'
            });
        }


        // 1. UPDATE USER
        alumni.isVerified = true;
        const updatedAlumni = await alumni.save();



        // ===============================
        // 📧 SEND EMAIL (SMTP2GO)
        // ===============================
        if (updatedAlumni.email) {

            const mailOptions = {
                from: process.env.SMTP_FROM,
                to: updatedAlumni.email,

                subject: '🎉Congratulations! Your Alumni Account is Verified!',

                html: `

<style>
    @keyframes draw-circle {
        from { stroke-dashoffset: 315; }
        to { stroke-dashoffset: 0; }
    }
    @keyframes draw-check {
        from { stroke-dashoffset: 80; }
        to { stroke-dashoffset: 0; }
    }
</style>

<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;">

    <div style="background: linear-gradient(135deg, #181be8 0%, #0d133d 100%); color: white; padding: 32px; text-align: center;">
        <h1>Account Verified!</h1>
    </div>

    <div style="padding: 40px; text-align: center; color: #333;">

        <img 
            src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762210764/logo_bh9u8i.png" 
            width="100"
            style="margin-bottom: 24px;"
        />

        <h2>Hello, ${updatedAlumni.fullName}!</h2>

        <p>
            Congratulations! Your account has been successfully verified.
        </p>

        <p>
            You can now log in and access all features.
        </p>

        <a 
            href="https://cse.igitalumni.in/login"
            style="background: #181be8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;"
        >
            Log In Now
        </a>

    </div>

    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px;">
        Best regards,<br>
        The IGIT CSE Alumni Network Team
    </div>

</div>
`
            };


            try {

                await transporter.sendMail(mailOptions);

                console.log(`✅ Verification email sent to ${updatedAlumni.email}`);

            } catch (emailError) {

                console.error(
                    `❌ Failed to send mail to ${updatedAlumni.email}:`,
                    emailError.message
                );
            }

        } else {

            console.warn(`User ${updatedAlumni._id} has no email.`);
        }


        // 2. RESPONSE
        res.status(200).json(updatedAlumni);


    } catch (error) {

        console.error('Error verifying alumni:', error);

        res.status(500).json({
            message: 'Error verifying alumni',
            error: error.message
        });
    }
};


/**
 * @desc    Delete an alumni profile
 * @route   DELETE /api/alumni/:id
 * @access  Private
 */
export const deleteAlumni = async (req, res) => {

    try {

        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({
                message: 'Alumni not found'
            });
        }


        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === 'milankumar7770@gmail.com';


        if (isSuperAdmin) {

            await Alumni.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                message: 'Alumni profile deleted successfully'
            });
        }


        if (userRole === 'admin') {

            if (alumni.isVerified) {
                return res.status(403).json({
                    message: 'Admins can only delete unverified users.'
                });
            }

            await Alumni.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                message: 'Alumni profile deleted successfully'
            });
        }


        return res.status(403).json({
            message: 'Access denied.'
        });


    } catch (error) {

        console.error('Error deleting alumni:', error);

        res.status(500).json({
            message: 'Error deleting alumni',
            error: error.message
        });
    }
};
