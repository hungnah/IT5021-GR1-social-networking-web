import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import './Register.css'; 

const Register = () => {
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  return (
    <div className="register-container">
      {/* Logo ở giữa phía trên */}
      <div className="register-branding">
        <div className="logo-icon">⚡</div>
        <span className="logo-text">FeedMe</span>
      </div>

      {/* Thẻ Form Đăng ký */}
      <div className="register-card">
        <h2>Create your account</h2>
        
        <form className="register-form">
          {/* Hàng 1: Tên và Họ chia đôi */}
          <div className="input-row">
            <div className="input-group">
              <input type="text" placeholder="First name" required />
            </div>
            <div className="input-group">
              <input type="text" placeholder="Last name" required />
            </div>
          </div>

          {/* Hàng 2: Email */}
          <div className="input-group">
            <input type="email" placeholder="Email address" required />
          </div>

          {/* Hàng 3: Password */}
          <div className="input-group password-group">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              required 
            />
            <button 
              type="button" 
              className="eye-icon-button" 
              onClick={() => setShowPassword(!showPassword)} // Bật/tắt mắt
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {/* Hàng 4: Confirm Password */}
          <div className="input-group password-group">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Confirm password" 
              required 
            />
            <button 
              type="button" 
              className="eye-icon-button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)} // bật/tắt mắt
            >
              {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
          {/* Checkbox điều khoản */}
          <div className="checkbox-group">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">
              I agree to FeedMe's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </label>
          </div>

          {/* Nút Submit */}
          <button type="submit" className="btn-signup">
            Create Account <span className="arrow">→</span>
          </button>
        </form>

        {/* Link quay lại đăng nhập */}
        <p className="signin-link">
          Already have an account? <Link to="/">Sign in</Link>
        </p>
      </div>

      {/* Chọn ngôn ngữ ở đáy màn hình */}
      <div className="language-selector-bottom">
        <button>🌐 English ▾</button>
      </div>
    </div>
  );
};

export default Register;