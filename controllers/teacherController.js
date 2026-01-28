import Teacher from '../models/Teacher.js';
import { sendEmail } from '../utils/emailService.js';

// Super Admin (from env or fallback)
const SUPER_ADMIN_EMAIL =
    process.env.SUPER_ADMIN_EMAIL || 'milankumar7770@gmail.com';


/**
 * @desc    Get all teacher profiles
 * @route   GET /api/teachers
 * @access  Private
 */
export const getTeachers = async (req, res) => {

    try {
        const teachers = await Teacher.find({}).sort({ fullName: 1 });
        res.status(200).json(teachers);

    } catch (error) {

        console.error('Error fetching teachers:', error);

        res.status(500).json({
            message: 'Error fetching teacher profiles.',
            error: error.message
        });
    }
};



/**
 * @desc    Verify a teacher profile
 * @route   PATCH /api/teachers/:id/verify
 * @access  Private
 */
export const verifyTeacher = async (req, res) => {

    try {

        // ===============================
        // SECURITY CHECK
        // ===============================
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === SUPER_ADMIN_EMAIL;

        if (userRole !== 'admin' && !isSuperAdmin) {
            return res.status(403).json({
                message: 'Access denied. Admin privileges required.'
            });
        }
        // ===============================


        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({
                message: 'Teacher not found'
            });
        }


        // ===============================
        // UPDATE USER
        // ===============================
        teacher.isVerified = true;
        const updatedTeacher = await teacher.save();



        // ===============================
        // 📧 SEND EMAIL
        // ===============================
        if (updatedTeacher.email) {

            const subject =
                '🎉 Congratulations! Your Alumni Network Account is Verified!';


            const html = `

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

        <h2>Hello, ${updatedTeacher.fullName}!</h2>

        <p>
            Congratulations! Your account has been verified.
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
        The IGIT MCA Alumni Network Team
    </div>

</div>
`;


            try {

                // ✅ CORRECT sendEmail FORMAT
                await sendEmail({
                    to: updatedTeacher.email,
                    subject: subject,
                    text: `Hello ${updatedTeacher.fullName}, your account has been verified.`,
                    html: html
                });

                console.log(`✅ Verification email sent to ${updatedTeacher.email}`);

            } catch (emailError) {

                console.error(
                    `❌ Failed to send verification email to ${updatedTeacher.email}:`,
                    emailError
                );
            }

        } else {

            console.warn(`User ${updatedTeacher._id} has no email.`);
        }



        // ===============================
        // RESPONSE
        // ===============================
        res.status(200).json(updatedTeacher);


    } catch (error) {

        console.error('Error verifying teacher:', error);

        res.status(500).json({
            message: 'Error verifying teacher',
            error: error.message
        });
    }
};



/**
 * @desc    Delete a teacher profile
 * @route   DELETE /api/teachers/:id
 * @access  Private
 */
export const deleteTeacher = async (req, res) => {

    try {

        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({
                message: 'Teacher not found'
            });
        }


        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === SUPER_ADMIN_EMAIL;


        // ===============================
        // SUPER ADMIN DELETE
        // ===============================
        if (isSuperAdmin) {

            await Teacher.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                message: 'Teacher profile deleted successfully'
            });
        }


        // ===============================
        // ADMIN DELETE
        // ===============================
        if (userRole === 'admin') {

            if (teacher.isVerified) {
                return res.status(403).json({
                    message: 'Admins can only delete unverified users.'
                });
            }

            await Teacher.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                message: 'Teacher profile deleted successfully'
            });
        }


        return res.status(403).json({
            message: 'Access denied.'
        });


    } catch (error) {

        console.error('Error deleting teacher:', error);

        res.status(500).json({
            message: 'Error deleting teacher',
            error: error.message
        });
    }
};
