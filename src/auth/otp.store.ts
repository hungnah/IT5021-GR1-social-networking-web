interface OtpEntry {
  otp: string;
  expiresAt: Date;
}

// In-memory OTP store. Resets on server restart (fine for development).
const store = new Map<string, OtpEntry>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setOtp(email: string, otp: string): void {
  store.set(email.toLowerCase(), {
    otp,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
}

export function verifyAndConsumeOtp(email: string, otp: string): boolean {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return false;
  if (new Date() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  if (entry.otp !== otp) return false;
  store.delete(key); // one-time use
  return true;
}
