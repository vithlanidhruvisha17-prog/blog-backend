const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: {
    type: String
},
resetPasswordExpires: {
    type: Date
},

resetOTP: {
    type: String,
    default: null
},
resetOTPExpires: {
    type: Date,
    default: null
},
isOTPVerified: {
    type: Boolean,
    default: false
},

    refreshToken: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);