import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setSession } from '../store/authStore';
import './Register.css'; 

const Register = () => {
const navigate = useNavigate();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [email, setEmail] = useState('');
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [isLoading, setIsLoading] = useState(false);

const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  try {
    setIsLoading(true);
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        ...(username.trim() ? { username: username.trim().replace(/^@+/, '') } : {}),
        password,
        confirmPassword,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'Đăng ký thất bại',
      );
    }

    // Lưu accessToken (memory) + refreshToken/currentUser (localStorage)
    setSession(data);
    alert('Đăng ký thành công');
    navigate('/profile');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Đăng ký thất bại, vui lòng thử lại';
    alert(message);
  } finally {
    setIsLoading(false);
  }
};
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
        
        <form className="register-form" onSubmit={handleRegister}>
          {/* Hàng 1: Tên và Họ chia đôi */}
          <div className="input-row">
            <div className="input-group">
              <input
                type="text"
                placeholder="First name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                placeholder="Last name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Hàng 2: Username (tùy chọn) */}
          <div className="input-group username-group">
            <span className="input-prefix">@</span>
            <input
              type="text"
              placeholder="username (e.g. dongxuan.duc)"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))
              }
              maxLength={30}
              autoComplete="username"
              spellCheck={false}
            />
          </div>

          {/* Hàng 3: Email */}
          <div className="input-group">
            <input
              type="email"
              placeholder="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Hàng 3: Password */}
          <div className="input-group password-group">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          <button type="submit" className="btn-signup" disabled={isLoading}>
            {isLoading ? 'Creating account...' : <>Create Account <span className="arrow">→</span></>}
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