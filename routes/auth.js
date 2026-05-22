const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { googleLogin, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware'); 

router.post('/google-login', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// SIGNUP ROUTE
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ username, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error during signup" });
    }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // TOKEN mein 'id' pass kar rahe hain (Most Important)
        const token = jwt.sign(
            { id: user._id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({
            accessToken: token,
            user: { id: user._id, username: user.username }
        });
    } catch (err) {
        res.status(500).json({ message: "Server error during login" });
    }
});

// PROFILE ROUTE
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); 
        res.json(user);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;