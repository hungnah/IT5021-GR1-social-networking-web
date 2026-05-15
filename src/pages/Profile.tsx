import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, Search, Bell, MessageCircle, Bookmark, 
  Plus, Sun, Settings, LogOut, HelpCircle, UserCircle, Zap, Grid, Tag, MapPin, Link as LinkIcon
} from 'lucide-react';
import './Profile.css'; 

const Profile = () => {
  const navigate = useNavigate();
  
  // Thông tin người dùng đồng bộ với NewsFeed
  const [currentUser] = useState({
    name: "Nguyễn Văn A",
    handle: "@nguyenvana",
    avatar: "", // Để trống để hiện avatar mặc định
    bio: "Hustler",
    location: "Hanoi, Vietnam",
    website: "alexjohnson.design",
    posts: 142,
    followers: "1.284",
    following: 487
  });

  return (
    <div className="profile-page">
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
            <div className="nav-item" onClick={() => navigate('/feed')}>
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
          
          <div className="user-account-section active" onClick={() => navigate('/profile')}>
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


      {/* NỘI DUNG CHÍNH */}
      <main className="main-content">
        <div className="profile-container">
          {/* Header Trang Cá Nhân */}
          <section className="profile-header">
            <div className="profile-avatar-large-container">
              <div className="profile-avatar-gradient-border">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="avatar" className="profile-avatar-img" />
                ) : (
                  <div className="profile-default-avatar">
                    <UserCircle size={100} strokeWidth={1} color="#94A3B8" />
                  </div>
                )}
              </div>
            </div>
              
            <div className="profile-details">
              <div className="username-row">
                <span className="username">{currentUser.handle}</span>
                <button className="btn-profile">Edit profile</button>
                <button className="btn-profile">View archive</button>
                <span className="settings-icon">⚙️</span>
              </div>
              
              <div className="stats-row">
                <span><strong>{currentUser.posts}</strong> posts</span>
                <span><strong>{currentUser.followers}</strong> followers</span>
                <span><strong>{currentUser.following}</strong> following</span>
              </div>
              
              <div className="bio-row">
                <p className="full-name">{currentUser.name}</p>
                <p className="job">{currentUser.bio}</p>
                <div className="meta-info">
                  <span className="location"><MapPin size={14} /> {currentUser.location}</span>
                  <span className="website"><LinkIcon size={14} /> <a href="#">{currentUser.website}</a></span>
                </div>
              </div>
            </div>
          </section>

          {/* Tab bài viết */}
          <div className="profile-tabs">
            <span className="tab active"><Grid size={16} /> POSTS</span>
            <span className="tab"><Bookmark size={16} /> SAVED</span>
            <span className="tab"><Tag size={16} /> TAGGED</span>
          </div>

          {/* Lưới bài viết */}
          <div className="image-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((item) => (
              <div key={item} className="grid-item">
                <img src={`https://picsum.photos/400/400?random=${item}`} alt="post" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;