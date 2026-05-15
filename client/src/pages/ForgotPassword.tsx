import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import './ForgotPassword.css';

type Step = 'email' | 'otp' | 'done';

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Step 1: submit email ──────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setError('');
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      alert('Đã gửi lại mã OTP mới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi lại thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: submit OTP + new password ────────────────────────────
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otpString = otp.join('');
    if (otpString.length < 6) { setError('Vui lòng nhập đủ 6 chữ số OTP'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu mới và xác nhận không khớp'); return; }
    try {
      setLoading(true);
      await api.post('/auth/reset-password', {
        email,
        otp: otpString,
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-branding">
        <div className="logo-icon">⚡</div>
        <span className="logo-text">FeedMe</span>
      </div>

      {/* Progress steps */}
      {step !== 'done' && (
        <div className="step-indicator">
          <div className={`step-dot ${step === 'email' ? 'active' : 'done-dot'}`}>1</div>
          <div className="step-line" />
          <div className={`step-dot ${step === 'otp' ? 'active' : ''}`}>2</div>
          <div className="step-line" />
          <div className="step-dot">3</div>
        </div>
      )}

      <div className="forgot-card">

        {/* ── Step 1: Enter email ── */}
        {step === 'email' && (
          <>
            <h2>Quên mật khẩu?</h2>
            <p className="forgot-desc">
              Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi mã OTP 6 số để xác nhận.
            </p>
            {error && <div className="forgot-error">{error}</div>}
            <form onSubmit={(e) => { void handleEmailSubmit(e); }}>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi mã OTP →'}
              </button>
            </form>
            <p className="back-link">
              <Link to="/">← Quay lại đăng nhập</Link>
            </p>
          </>
        )}

        {/* ── Step 2: Enter OTP + new password ── */}
        {step === 'otp' && (
          <>
            <h2>Đặt lại mật khẩu</h2>
            <p className="forgot-desc">
              Nhập mã OTP 6 số đã gửi đến{' '}
              <strong style={{ color: 'white' }}>{email}</strong>
            </p>
            {error && <div className="forgot-error">{error}</div>}
            <form onSubmit={(e) => { void handleResetSubmit(e); }}>
              {/* OTP boxes */}
              <div className="otp-group" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    className="otp-box"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="btn-resend"
                onClick={() => { void handleResend(); }}
                disabled={loading}
              >
                Gửi lại mã OTP
              </button>

              {/* New password */}
              <label className="field-label">Mật khẩu mới</label>
              <div className="input-group password-group">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Ít nhất 8 ký tự, chữ hoa, số, ký tự đặc biệt"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              <label className="field-label">Xác nhận mật khẩu mới</label>
              <div className="input-group password-group">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="button" className="eye-btn" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                  {showConfirmPass ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              <button type="submit" className="btn-primary" disabled={loading || otp.join('').length < 6}>
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu →'}
              </button>
            </form>
            <p className="back-link">
              <button
                className="btn-link"
                onClick={() => { setStep('email'); setError(''); setOtp(['','','','','','']); }}
              >
                ← Đổi email
              </button>
            </p>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <div className="forgot-success">
            <div className="success-icon">✅</div>
            <h2>Đặt lại mật khẩu thành công!</h2>
            <p>Mật khẩu mới của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.</p>
            <Link to="/" className="btn-primary btn-block">
              Đăng nhập ngay →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
