import { Home, Bell, MessageCircle, Moon, Settings, HelpCircle, Search, Grid, Bookmark, Tag } from 'lucide-react';
import React from 'react';
import './Profile.css'; 
import avt from '../assets/images/avt.webp';
const Profile = () => {
  return (
    <div className="profile-page">
      {/* 1. Sidebar bên trái */}
      <aside className="sidebar">
  <div className="side-logo">⚡</div>
  <nav className="side-nav">
    <div className="nav-item active"><Home size={24} color="white" /></div>
    <div className="nav-item">
      <Bell size={24} color="white" />
      <span className="badge">3</span>
    </div>
    <div className="nav-item"><MessageCircle size={24} color="white" /></div>
  </nav>
  <div className="side-bottom">
    <div className="nav-item"><Moon size={24} color="white" /></div>
    <div className="nav-item"><Settings size={24} color="white" /></div>
    <div className="nav-item"><HelpCircle size={24} color="white" /></div>
    <div className="user-avatar-mini">G</div>
  </div>
      </aside>

      {/* 2. Nội dung chính bên phải */}
      <main className="main-content">
        {/* Thanh tìm kiếm */}
        <header className="top-search">
          <div className="search-bar">
            <span>🔍</span>
            <input type="text" placeholder="Search FeedMe..." />
          </div>
        </header>

        <div className="profile-container">
        {/* Thông tin cá nhân */}
        <section className="profile-header">
          <div className="profile-avatar-large">
            <img src={avt} alt="avatar" />
          </div>
            
          <div className="profile-details">
            <div className="username-row">
              <span className="username">@giangnguyen</span>
                <button className="btn-profile">Edit profile</button>
                <button className="btn-profile">View archive</button>
                <span className="settings-icon">⚙️</span>
              </div>
              
              <div className="stats-row">
                <span><strong>142</strong> posts</span>
                <span><strong>1,284</strong> followers</span>
                <span><strong>487</strong> following</span>
              </div>
              
              <div className="bio-row">
                <p className="full-name">Nguyễn Thị Hương Giang</p>
                <p className="job">Student</p>
                <p className="location">📍 Hanoi, Vietnam</p>
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
            {[1, 2, 3, 4, 5, 6].map((item) => (
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