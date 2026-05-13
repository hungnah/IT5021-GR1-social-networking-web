import React from 'react';
import { 
  Home, Search, Bell, Bookmark, 
  MoreHorizontal, Heart, MessageCircle, Send, 
  UserCircle, Zap, Settings, LogOut, Plus,
  Sun, HelpCircle, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './NewsFeed.css';

const NewsFeed = () => {
  const navigate = useNavigate();
  const currentUser = {
    name: "Nguyễn Văn A",
    handle: "@nguyenvana",
    avatar: null
  };

  return (
    <div className="newsfeed-page">
      {/* SIDEBAR TRÁI */}
      <aside className="left-sidebar">
        <div className="sidebar-top">
          <div className="brand-container" onClick={() => navigate('/feed')}>
            <div className="icon-box">
              <Zap size={22} fill="white" color="white" />
            </div>
            <span className="brand-name">FeedMe</span>
          </div>

          <nav className="nav-menu">
            <div className="nav-item active" onClick={() => navigate('/feed')}>
              <div className="sidebar-icon-wrapper">
                <Home size={24} />
              </div>
              <span className="nav-text">Home</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <Search size={24} />
              </div>
              <span className="nav-text">Search</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <Bell size={24} />
                <span className="count-badge">3</span>
              </div>
              <span className="nav-text">Notifications</span>
              <span className="nav-badge-right">3</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <MessageCircle size={24} />
              </div>
              <span className="nav-text">Messages</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <Bookmark size={24} />
              </div>
              <span className="nav-text">Saved</span>
            </div>
            <div className="nav-item">
              <div className="sidebar-icon-wrapper">
                <Plus size={24} />
              </div>
              <span className="nav-text">Create</span>
            </div>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="divider"></div>
          <div className="nav-item">
            <div className="sidebar-icon-wrapper">
              <Sun size={24} className="theme-icon-sun" />
            </div>
            <span className="nav-text">Light Mode</span>
          </div>
          <div className="nav-item">
            <div className="sidebar-icon-wrapper">
              <Settings size={24} />
            </div>
            <span className="nav-text">Settings</span>
          </div>
          <div className="nav-item">
            <div className="sidebar-icon-wrapper">
              <HelpCircle size={24} />
            </div>
            <span className="nav-text">Help</span>
          </div>

          
          <div className="user-account-section" onClick={() => navigate('/profile')}>
            <div className="avatar-wrapper">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Me" className="avatar-img-sidebar" />
              ) : (
                <div className="default-avatar-box-small">
                  <UserCircle size={24} color="#94A3B8" />
                </div>
              )}
              <div className="status-dot"></div>
            </div>
            <div className="user-info-sidebar">
              <span className="sidebar-user-name">{currentUser.name}</span>
              <span className="sidebar-user-handle">{currentUser.handle}</span>
            </div>
            <div className="sidebar-logout-icon">
              <LogOut size={18} />
            </div>
          </div>
        </div>
      </aside>

      {/* CỘT GIỮA: NỘI DUNG CHÍNH */}
      <main className="main-content">
        {[1, 2, 3].map((post) => (
          <article key={post} className="post-container">
            <header className="post-header">
              <div className="post-user">
                <div className="post-user-avatar">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User${post}`} alt="User" />
                </div>
                <div className="user-meta">
                  <span className="user-name">Marcus Rivera</span>
                  <span className="post-time">{post} hours ago</span>
                </div>
              </div>
              <button className="more-btn"><MoreHorizontal size={20} /></button>
            </header>

            <div className="post-content">
              <img src={`https://picsum.photos/800/800?random=${post + 100}`} alt="Post content" />
            </div>

            <footer className="post-footer">
              <div className="interaction-bar">
                <div className="left-actions">
                  <Heart size={24} className="action-icon" />
                  <MessageCircle size={24} className="action-icon" />
                  <Send size={24} className="action-icon" />
                </div>
                <Bookmark size={24} className="action-icon" />
              </div>
              <div className="likes-count">247 likes</div>
              <div className="caption-section">
                <p><strong>Marcus Rivera</strong> Just wrapped up an amazing hike through the national park! The views were absolutely breathtaking.</p>
              </div>
            </footer>
          </article>
        ))}
      </main>

      {/* CỘT PHẢI: WIDGETS */}
      <aside className="right-sidebar">
        <div className="right-user-header">
          <div className="right-user-info">
            <div className="right-avatar">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Me" className="avatar-img-sidebar" />
              ) : (
                <div className="default-avatar-box-small" style={{width: '32px', height: '32px'}}>
                  <UserCircle size={24} color="#94A3B8" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="right-name-box">
              <span className="right-full-name">{currentUser.name}</span>
              <span className="right-handle">{currentUser.handle}</span>
            </div>
          </div>

          <button className="logout-btn">
             <LogOut size={16} /> <span>Log out</span>
          </button>
        </div>

        <div className="suggestions-section">
          <div className="sugg-header">
            <span>Suggested for you</span>
            <button className="see-all">See all</button>
          </div>
          
          {[
            { name: 'Marcus Rivera', mutual: '12 mutual follows' },
            { name: 'Priya Sharma', mutual: '8 mutual follows' },
            { name: 'James Carter', mutual: '5 mutual follows' }
          ].map((user, i) => (
            <div key={i} className="suggestion-item">
              <div className="sugg-user-info">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="" className="sugg-avatar" />
                <div className="sugg-text">
                  <span className="sugg-name">{user.name}</span>
                  <span className="sugg-mutual">{user.mutual}</span>
                </div>
              </div>
              <button className="follow-btn">Follow</button>
            </div>
          ))}
        </div>

        <div className="right-sidebar-footer">
          <div className="footer-links">
            <Globe size={12} style={{marginRight: '6px', verticalAlign: 'middle'}} />
            <span>Tiếng Việt</span>
            <span className="dot-sep">·</span>
            <span className="active-lang-blue">English</span>
            <span className="dot-sep">·</span>
            <span>日本語</span>
          </div>
          <div className="footer-links secondary">
            <span>About</span> <span className="dot-sep">·</span>
            <span>Help</span> <span className="dot-sep">·</span>
            <span>Privacy</span> <span className="dot-sep">·</span>
            <span>Terms</span> <span className="dot-sep">·</span>
            <span>Advertising</span> <span className="dot-sep">·</span>
            <span>More</span>
          </div>
          <div className="footer-copyright-main">
            FeedMe © 2026
          </div>
        </div>
      </aside>
    </div>
  );
};

export default NewsFeed;