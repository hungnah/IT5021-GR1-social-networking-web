import React from 'react';
import './Login.css';
import { Link } from 'react-router-dom';
const Login = () => {
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
          
          <form className="login-form">
            <div className="input-group">
              <input type="email" placeholder="Email address" required />
            </div>
            
            <div className="input-group password-group">
              <input type="password" placeholder="Password" required />
              <span className="eye-icon">👁️</span>
            </div>

            <button type="submit" className="btn-signin">
              Sign In <span className="arrow">→</span>
            </button>
            
            <a href="#" className="forgot-password">Forgot password?</a>
            
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