import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setSession, type StoredUser } from '../store/authStore';
import './Login.css';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: () => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

const Login = () => {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  // 1. Khai báo bộ nhớ
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const loginSuccess = (data: {
    accessToken: string;
    refreshToken: string;
    user: StoredUser;
  }) => {
    // Lưu accessToken vào memory + refreshToken/currentUser vào localStorage
    setSession(data);
    alert('Đăng nhập thành công');
    navigate('/profile');
  };
  // 2. Hàm xử lý logic
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message || 'Đăng nhập thất bại',
        );
      }

      loginSuccess(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Đăng nhập thất bại, vui lòng thử lại';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      alert('Thiếu VITE_GOOGLE_CLIENT_ID trong file .env của client');
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      alert('Google SDK chưa sẵn sàng, vui lòng tải lại trang');
      return;
    }

    try {
      setIsGoogleLoading(true);
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid profile email',
        callback: async (tokenResponse) => {
          try {
            if (!tokenResponse.access_token) {
              throw new Error(tokenResponse.error || 'Không lấy được access token từ Google');
            }

            const profileResponse = await fetch(
              'https://www.googleapis.com/oauth2/v3/userinfo',
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              },
            );
            const profile = await profileResponse.json();

            if (!profileResponse.ok) {
              throw new Error(profile?.error_description || 'Không lấy được thông tin Google');
            }

            const response = await fetch(`${API_BASE_URL}/auth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                googleId: profile.sub,
                email: profile.email,
                firstName: profile.given_name || profile.name || 'Google',
                lastName: profile.family_name || 'User',
                avatarUrl: profile.picture,
              }),
            });
            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                Array.isArray(data?.message)
                  ? data.message.join(', ')
                  : data?.message || 'Đăng nhập Google thất bại',
              );
            }

            loginSuccess(data);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Đăng nhập Google thất bại, vui lòng thử lại';
            alert(message);
          } finally {
            setIsGoogleLoading(false);
          }
        },
        error_callback: () => {
          alert('Không thể mở đăng nhập Google');
          setIsGoogleLoading(false);
        },
      });

      tokenClient.requestAccessToken();
    } catch {
      alert('Đăng nhập Google thất bại, vui lòng thử lại');
      setIsGoogleLoading(false);
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
              {isLoading ? 'Signing In...' : <>Sign In <span className="arrow">→</span></>}
            </button>
            
            <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
            
            <div className="divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" />
              {isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}
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