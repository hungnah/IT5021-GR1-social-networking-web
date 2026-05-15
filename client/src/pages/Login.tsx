import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { setSession, type StoredUser } from '../store/authStore';
import './Login.css';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const data = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      setSession(data);
      navigate('/feed');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Đăng nhập thất bại, vui lòng thử lại';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Phần bên trái: Giới thiệu */}
      <div className="left-panel">
        <div className="branding">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">FeedMe</span>
        </div>
        
        <div className="hero-content">
          <h1>Connect. Share. Belong.</h1>
          <p className="description">
            Join millions of people discovering content, sharing moments, 
            and building real connections every day.
          </p>
          <ul className="features-list">
            <li>• Connect with the world</li>
            <li>• Share your best moments</li>
            <li>• Real-time conversations</li>
            <li>• Discover trending content</li>
          </ul>
        </div>
      </div>

      {/* Phần bên phải: Form đăng nhập */}
      <div className="right-panel">
        <div className="login-card">
          <h2>Sign in to FeedMe</h2>
          
          {/* Form đăng nhập */}
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Email address" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
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
                onClick={() => setShowPassword(!showPassword)}
              >
               {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            <button type="submit" className="btn-signin" disabled={isLoading}>
              {isLoading ? 'Signing in…' : (
                <>
                  Sign In <span className="arrow">→</span>
                </>
              )}
            </button>

            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
            
            <div className="divider">
              <span>OR</span>
            </div>

            <button type="button" className="btn-google">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" />
              Continue with Google
            </button>
          </form>

          <p className="signup-link">
           New to FeedMe? <Link to="/register">Create an account</Link>
          </p>
        </div>

        <div className="language-selector">
          <button>🌐 English ▾</button>
        </div>
      </div>
    </div>
  );
};

export default Login;