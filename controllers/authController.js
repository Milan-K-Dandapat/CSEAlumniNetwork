import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

const OTP_EXPIRY_MINUTES = 10;

// ===============================
// JWT SECRET
// ===============================

const getSecret = () =>
  process.env.JWT_SECRET ||
  'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1';

// ===============================
// SUPER ADMIN
// ===============================

const getSuperAdminEmail = () =>
  process.env.SUPER_ADMIN_EMAIL ||
  process.env.REACT_APP_SUPER_ADMIN_EMAIL ||
  'milankumar7770@gmail.com';

const DEFAULT_ADMIN_PASSWORD = 'igit@cse';


// ===============================
// ✅ SMTP CONFIG (FIXED)
// ===============================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // eg: smtp.zoho.in
  port: Number(process.env.SMTP_PORT), // 465 / 587
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


// ===============================
// VERIFY SMTP ON START
// ===============================

transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP CONFIG ERROR:', err);
  } else {
    console.log('✅ SMTP Server Ready');
  }
});


// ===============================
// HELPERS
// ===============================

const findUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  let user = await Alumni.findById(id).select('+password +role +isVerified');

  if (!user) {
    user = await Teacher.findById(id).select('+password +role +isVerified');
  }

  return user;
};


const findUserByIdAndUpdate = async (id, update, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  let user = await Alumni.findByIdAndUpdate(id, update, {
    new: true,
    ...options,
  });

  if (!user) {
    user = await Teacher.findByIdAndUpdate(id, update, {
      new: true,
      ...options,
    });
  }

  return user;
};


// ===============================
// ✅ EMAIL FUNCTION
// ===============================

const sendVerificationEmail = async (toEmail, otp, subject) => {

  const mailOptions = {
    from: `"IGIT CSE Alumni" <${process.env.SMTP_FROM}>`,
    to: toEmail,
    subject,

    html: `
      <div style="font-family:Arial">
        <h2>IGIT CSE Alumni Network</h2>

        <p>Your OTP is:</p>

        <h1 style="color:#2563eb">${otp}</h1>

        <p>Valid for ${OTP_EXPIRY_MINUTES} minutes.</p>

        <p>Do not share this code.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ OTP MAIL SENT:', info.messageId);

  } catch (error) {
    console.error('❌ SMTP SEND ERROR:', error);
    throw error;
  }
};


// ===============================
// GENERATE ID
// ===============================

const getHighestNumericalID = async () => {

  const alumniCodeQuery = await Alumni.findOne({
    alumniCode: { $ne: null, $ne: '' },
  }).sort({ alumniCode: -1 }).select('alumniCode');

  const teacherCodeQuery = await Teacher.findOne({
    teacherCode: { $ne: null, $ne: '' },
  }).sort({ teacherCode: -1 }).select('teacherCode');

  let highestNumber = 999;

  const extractNumber = (code) => {
    const match = code ? code.match(/^CSE(\d{4})[AF]$/) : null;
    return match ? parseInt(match[1], 10) : 0;
  };

  const alumniNumber = extractNumber(alumniCodeQuery?.alumniCode);
  const teacherNumber = extractNumber(teacherCodeQuery?.teacherCode);

  highestNumber = Math.max(highestNumber, alumniNumber, teacherNumber);

  return String(highestNumber + 1).padStart(4, '0');
};


// =========================================================================
// REGISTRATION OTP (ALUMNI)
// =========================================================================

export const sendOtp = async (req, res) => {

  const { email, fullName, batch, phoneNumber, location, company, position } =
    req.body;

  if (!email || !fullName || !batch || !location) {
    return res.status(400).json({ message: 'All required fields must be filled.' });
  }

  try {

    let alumni = await Alumni.findOne({ email });

    const otp = crypto.randomInt(100000, 999999).toString();

    const otpExpires = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    const alumniData = {
      fullName,
      email,
      location,
      batch,
      otp,
      otpExpires,
      isVerified: false,
    };

    if (phoneNumber) alumniData.phoneNumber = phoneNumber;
    if (company) alumniData.company = company;
    if (position) alumniData.position = position;

    if (alumni) {
      alumni.set(alumniData);
      await alumni.save();
    } else {
      await Alumni.create(alumniData);
    }

    await sendVerificationEmail(
      email,
      otp,
      'Your Alumni Registration OTP'
    );

    res.json({ message: 'OTP sent successfully' });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'OTP sending failed' });
  }
};


// =========================================================================
// VERIFY REGISTER (ALUMNI)
// =========================================================================

export const verifyOtpAndRegister = async (req, res) => {

  const { email, otp } = req.body;

  try {

    const alumni = await Alumni.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!alumni)
      return res.status(400).json({ message: 'Invalid OTP' });

    if (!alumni.alumniCode) {
      alumni.alumniCode = `CSE${await getHighestNumericalID()}A`;
    }

    alumni.otp = undefined;
    alumni.otpExpires = undefined;

    await alumni.save();

    res.json({ message: 'Registration successful', user: alumni });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Verification failed' });
  }
};

// =========================================================================
// REGISTRATION OTP (TEACHER)
// =========================================================================

export const sendOtpTeacher = async (req, res) => {
  const { email, fullName, location } = req.body;

  if (!email || !fullName || !location) {
    return res.status(400).json({ message: 'All required fields must be filled.' });
  }

  try {
    let teacher = await Teacher.findOne({ email });
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const teacherData = {
      ...req.body,
      otp,
      otpExpires,
      isVerified: false,
    };

    if (teacher) {
      teacher.set(teacherData);
      await teacher.save();
    } else {
      await Teacher.create(teacherData);
    }

    await sendVerificationEmail(email, otp, 'Teacher Registration OTP');
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'OTP sending failed' });
  }
};

// =========================================================================
// VERIFY REGISTER (TEACHER)
// =========================================================================

export const verifyOtpAndRegisterTeacher = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const teacher = await Teacher.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!teacher) return res.status(400).json({ message: 'Invalid OTP' });

    if (!teacher.teacherCode) {
      teacher.teacherCode = `CSE${await getHighestNumericalID()}F`;
    }

    teacher.otp = undefined;
    teacher.otpExpires = undefined;
    await teacher.save();

    res.json({ message: 'Teacher registration successful', user: teacher });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
};


// =========================================================================
// LOGIN OTP SEND (ALUMNI)
// =========================================================================

export const loginOtpSend = async (req, res) => {

  const { identifier } = req.body;

  try {

    const user = await Alumni.findOne({ email: identifier });

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    if (!user.isVerified)
      return res.status(403).json({ message: 'Not approved yet' });

    const otp = crypto.randomInt(100000, 999999).toString();

    const otpExpires = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    user.otp = otp;
    user.otpExpires = otpExpires;

    await user.save();

    await sendVerificationEmail(
      user.email,
      otp,
      'Login OTP'
    );

    res.json({ message: 'OTP sent' });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'OTP failed' });
  }
};

// =========================================================================
// LOGIN OTP SEND (TEACHER)
// =========================================================================

export const loginOtpSendTeacher = async (req, res) => {
  const { identifier } = req.body;
  try {
    const user = await Teacher.findOne({ email: identifier });
    if (!user) return res.status(404).json({ message: 'Teacher not found' });
    if (!user.isVerified) return res.status(403).json({ message: 'Not approved yet' });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendVerificationEmail(user.email, otp, 'Teacher Login OTP');
    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'OTP failed' });
  }
};


// =========================================================================
// LOGIN VERIFY (ALUMNI)
// =========================================================================

export const loginOtpVerify = async (req, res) => {

  const { identifier, otp } = req.body;

  try {

    const user = await Alumni.findOne({
      email: identifier,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: 'Invalid OTP' });

    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.json({ token, user });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Login failed' });
  }
};

// =========================================================================
// LOGIN VERIFY (TEACHER)
// =========================================================================

export const loginOtpVerifyTeacher = async (req, res) => {
  const { identifier, otp } = req.body;
  try {
    const user = await Teacher.findOne({
      email: identifier,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid OTP' });

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
};


// =========================================================================
// PASSWORD LOGIN
// =========================================================================

export const login = async (req, res) => {

  const { email, password } = req.body;

  try {

    const user = await Alumni.findOne({ email }).select('+password');

    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);

    if (!ok)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { _id: user._id, email, role: user.role },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.json({ token, user });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Login failed' });
  }
};


// =========================================================================
// FORGOT PASSWORD
// =========================================================================

export const forgotPassword = async (req, res) => {

  const { email } = req.body;

  try {

    const otp = crypto.randomInt(100000, 999999).toString();

    const otpExpires = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    let user = await Alumni.findOneAndUpdate(
      { email },
      { otp, otpExpires }
    );

    if (!user) {
      user = await Teacher.findOneAndUpdate(
        { email },
        { otp, otpExpires }
      );
    }

    if (user) {
      await sendVerificationEmail(
        email,
        otp,
        'Password Reset OTP'
      );
    }

    res.json({ message: 'If email exists, OTP sent' });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Reset failed' });
  }
};


// =========================================================================
// RESET PASSWORD
// =========================================================================

export const resetPassword = async (req, res) => {

  const { email, otp, newPassword } = req.body;

  try {

    const hash = await bcrypt.hash(newPassword, 10);

    let user = await Alumni.findOneAndUpdate(
      { email, otp, otpExpires: { $gt: Date.now() } },
      { password: hash, otp: null, otpExpires: null }
    );

    if (!user) {
      user = await Teacher.findOneAndUpdate(
        { email, otp, otpExpires: { $gt: Date.now() } },
        { password: hash, otp: null, otpExpires: null }
      );
    }

    if (!user)
      return res.status(400).json({ message: 'Invalid OTP' });

    res.json({ message: 'Password updated' });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Reset failed' });
  }
};