const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User'); 
const jwt = require('jsonwebtoken'); 
const crypto = require('crypto'); // Built-in crypto helper
const nodemailer = require('nodemailer'); 
const bcrypt = require('bcryptjs'); 

const client = new OAuth2Client(process.env.REACT_APP_GOOGLE_CLIENT_ID || "1019401085962-s7jkvt87ap1b72r8ie8hjdqtvig6504l.apps.googleusercontent.com");

// 1. GOOGLE LOGIN

exports.googleLogin = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Google token is missing!" });

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.REACT_APP_GOOGLE_CLIENT_ID || "1019401085962-s7jkvt87ap1b72r8ie8hjdqtvig6504l.apps.googleusercontent.com",
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;
        let user = await User.findOne({ email });

        if (!user) {
            const uniqueUsername = name.replace(/\s+/g, '').toLowerCase() + Math.floor(100 + Math.random() * 900);
            user = new User({
                username: uniqueUsername,
                email: email,
                password: Math.random().toString(36).slice(-8), 
            });
            await user.save();
        }

        const accessToken = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || 'your_jwt_secret_key',
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: "Google Login Successful",
            accessToken: accessToken,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error("Google Auth Error:", error);
        return res.status(500).json({ message: "Google verification failed on backend!" });
    }
};

// 2. FORGOT PASSWORD - SEND 6-DIGIT OTP 

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "This email address is not registered." });
        }

        // 6-Digit Secure Random OTP Generate karna
        const otp = crypto.randomInt(100000, 999999).toString();

        // Save hashed OTP, 5 mins validity and reset verification flag
        user.resetOTP = crypto.createHash('sha256').update(otp).digest('hex');
        user.resetOTPExpires = Date.now() + 5 * 60 * 1000; // 5 Minutes Expiry
        user.isOTPVerified = false; 
        await user.save();

        const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,         
    secure: false,     
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    },
    tls: {
        rejectUnauthorized: false 
    }
});

        const mailOptions = {
            from: `"BlogHub PRO" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'BlogHub PRO - Password Reset Verification Code 🔑',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h2 style="color: #0f172a; text-align: center; font-size: 22px; margin-bottom: 5px;">Verification Code</h2>
                    <p style="color: #64748b; text-align: center; font-size: 14px; margin-top: 0;">Account Password Recovery</p>
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                    
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">You requested a password reset for your BlogHub PRO account. Please use the following One-Time Password (OTP) to verify your identity:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background-color: #f4f4f5; color: #4f46e5; padding: 12px 30px; font-weight: 700; font-size: 26px; letter-spacing: 6px; border-radius: 12px; border: 1px dashed #4f46e5; display: inline-block;">${otp}</span>
                    </div>
                    
                    <p style="color: #ef4444; font-size: 12px; font-weight: 500; text-align: center;">⚠️ This verification code is valid for 5 minutes only.</p>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 25px;">If you did not initiate this request, you can safely ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; text-align: center;">BlogHub PRO Security System</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "A 6-digit OTP has been sent to your email address." });

    } catch (error) {
        console.error("Forgot Password OTP Error:", error);
        res.status(500).json({ message: "Server error! Failed to send OTP." });
    }
};

// 3. VERIFY OTP

exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP parameters are required." });
    }

    try {
        const user = await User.findOne({ email });
        if (!user || !user.resetOTP) {
            return res.status(400).json({ message: "Invalid request or session expired." });
        }

        // Check if OTP has expired
        if (Date.now() > user.resetOTPExpires) {
            user.resetOTP = undefined;
            user.resetOTPExpires = undefined;
            await user.save();
            return res.status(400).json({ message: "The OTP has expired. Please request a new one." });
        }

        const hashedInputOTP = crypto.createHash('sha256').update(otp.trim()).digest('hex');

        if (hashedInputOTP !== user.resetOTP) {
            return res.status(400).json({ message: "Incorrect OTP. Please check and try again." });
        }

        // Verification successful, lock it down true for the next step
        user.isOTPVerified = true;
        await user.save();

        res.status(200).json({ message: "OTP Verified successfully!", verified: true });

    } catch (error) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ message: "Server error during OTP verification." });
    }
};

// 4. RESET PASSWORD AFTER OTP VERIFICATION

exports.resetPassword = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and new password are required." });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User session not found." });
        }

        if (!user.isOTPVerified) {
            return res.status(403).json({ message: "Unauthorized access. Please verify your OTP first." });
        }

        // Hash and Save the new password
        user.password = await bcrypt.hash(password, 10);

        // Clean up everything from database record
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        user.isOTPVerified = false; 
        await user.save();

        res.status(200).json({ message: "Your password has been changed successfully. You can now log in." });

    } catch (error) {
        console.error("Password Update Error:", error);
        res.status(500).json({ message: "Server error while updating password." });
    }
};