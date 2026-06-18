# FeedMe - Social Networking Website

## Tổng quan dự án
FeedMe là nền tảng mạng xã hội tối giản dạng website, cho phép người dùng chia sẻ nội dung ngắn kèm hình ảnh, theo dõi nhau, tương tác và nhắn tin.

## Stack công nghệ
- **Backend** (branch `Phong`): NestJS + TypeScript + SQL
  - Entry point: `src/main.ts`
  - Port mặc định: `3000`
  - Cấu trúc: `src/`, `sql/`, `test/`, `client/`
- **Frontend** (branch `gr1`): React + Vite + TypeScript
  - Entry point: `src/main.tsx`
  - Port mặc định: `5173`
  - Cấu trúc: `src/`, `public/`, `index.html`

## Chạy project
```bash
# Backend
npm install
npm run start:dev

# Frontend
npm install
npm run dev
```

## Các chức năng chính

### 1. Xác thực & Tài khoản
- Đăng ký: tên hiển thị + email + mật khẩu
- Đăng nhập: email/mật khẩu hoặc Google OAuth
- Đăng xuất, quên mật khẩu (reset qua email), đổi mật khẩu

### 2. Bài viết & Bảng tin
- Tạo bài viết: văn bản ngắn + nhiều hình ảnh
- Quyền riêng tư: `Public` | `Followers only` | `Private`
- Newsfeed: hiển thị bài viết từ người đang follow, sắp xếp mới → cũ
- Xem chi tiết bài viết: nội dung, ảnh, cảm xúc, bình luận

### 3. Tương tác
- Thả cảm xúc bài viết
- Bình luận & phản hồi bình luận (reply)
- Xóa bình luận (chủ bình luận hoặc chủ bài viết)
- Follow / Unfollow người dùng
- Nhắn tin 1-1 (real-time hoặc gần real-time, lưu lịch sử)

### 4. Trang cá nhân
- Hiển thị: ảnh đại diện, ảnh bìa, tiểu sử (bio), tên hiển thị
- Chỉnh sửa hồ sơ
- Danh sách bài viết đã đăng
- Danh sách followers / following

### 5. Thông báo
Hệ thống tạo thông báo khi:
- Có người follow mình
- Có người thả cảm xúc / bình luận / reply bài viết của mình
- Có tin nhắn mới
- Người mình follow đăng bài mới

## Quy tắc code
- Ngôn ngữ: TypeScript (strict mode)
- Tên biến/hàm: `camelCase`
- Tên component React: `PascalCase`
- Tên class/module NestJS: `PascalCase`
- API endpoint: `kebab-case` (ví dụ: `/api/user-profile`)

## Cấu trúc API (Backend → Frontend)
- Base URL: `http://localhost:3000`
- Frontend gọi API qua: `http://localhost:3000/api/...`
- Xác thực: JWT token (Bearer)

## Phạm vi KHÔNG triển khai
- Livestream, gọi video
- Thuật toán đề xuất nâng cao
- Video ngắn (short video)
