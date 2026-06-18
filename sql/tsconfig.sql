-- Kích hoạt tiện ích tạo UUID (nếu cần)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Định nghĩa kiểu dữ liệu cho Quyền riêng tư [cite: 74]
CREATE TYPE privacy_level AS ENUM ('Public', 'Followers only', 'Private');

-- 2. Bảng Người dùng (Users) [cite: 48, 119]
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL, -- [cite: 50, 51]
    password_hash VARCHAR(255), -- [cite: 50]
    google_id VARCHAR(255) UNIQUE, -- Hỗ trợ đăng nhập Google [cite: 55]
    display_name VARCHAR(100) NOT NULL, -- [cite: 50, 126]
    bio TEXT, -- [cite: 125, 132]
    avatar_url VARCHAR(255), -- [cite: 123, 130]
    cover_url VARCHAR(255), -- [cite: 124, 131]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Bài viết (Posts) [cite: 66]
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- [cite: 91]
    content TEXT, -- Nội dung văn bản ngắn [cite: 68]
    privacy_status privacy_level DEFAULT 'Public' NOT NULL, -- [cite: 73, 74]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- [cite: 82, 86]
);

-- 4. Bảng Hình ảnh bài viết (Post Images) [cite: 69]
CREATE TABLE post_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, -- [cite: 70]
    image_url VARCHAR(255) NOT NULL, -- [cite: 70, 90]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Theo dõi (Follows) [cite: 111, 137]
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- [cite: 112, 140]
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- [cite: 112, 139]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- 6. Bảng Cảm xúc (Reactions) [cite: 94, 95]
CREATE TABLE reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- [cite: 98]
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, -- [cite: 98]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

-- 7. Bảng Bình luận (Comments) [cite: 99]
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, -- [cite: 102]
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- [cite: 102]
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- Phản hồi bình luận [cite: 103, 104]
    content TEXT NOT NULL, -- [cite: 102]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- [cite: 102]
);

CREATE TABLE comment_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, comment_id)
);

-- 8. Bảng Tin nhắn (Messages) [cite: 115]
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- [cite: 118]
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- [cite: 118]
    content TEXT NOT NULL, -- [cite: 117, 118]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- [cite: 118]
);

-- 9. Bảng Thông báo (Notifications) [cite: 142]
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Người nhận thông báo [cite: 144]
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Người thực hiện hành động [cite: 158]
    type VARCHAR(50) NOT NULL, -- Loại: 'FOLLOW', 'LIKE', 'COMMENT', 'REPLY', 'MESSAGE', 'NEW_POST' [cite: 147-153]
    entity_id UUID, -- ID của bài viết hoặc bình luận liên quan [cite: 157]
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- [cite: 159]
);

-- 10. Tạo các Index để tối ưu hiệu năng truy vấn cho Bảng tin (Newsfeed)
CREATE INDEX idx_posts_user_privacy ON posts(user_id, privacy_status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC); -- Ưu tiên bài mới [cite: 82, 86]
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);