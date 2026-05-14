"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtp = generateOtp;
exports.setOtp = setOtp;
exports.verifyAndConsumeOtp = verifyAndConsumeOtp;
// In-memory OTP store. Resets on server restart (fine for development).
var store = new Map();
var OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function setOtp(email, otp) {
    store.set(email.toLowerCase(), {
        otp: otp,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
}
function verifyAndConsumeOtp(email, otp) {
    var key = email.toLowerCase();
    var entry = store.get(key);
    if (!entry)
        return false;
    if (new Date() > entry.expiresAt) {
        store.delete(key);
        return false;
    }
    if (entry.otp !== otp)
        return false;
    store.delete(key); // one-time use
    return true;
}
