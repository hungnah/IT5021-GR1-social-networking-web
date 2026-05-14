# FeedMe - Mạng xã hội (IT5021-GR1 PRJ)

Đồ án mạng xã hội cho học phần IT5021 - HEDSPI. Dự án gồm 2 phần chạy chung trong cùng repo:

- **Backend**: NestJS v11 + TypeScript + PostgreSQL + TypeORM
- **Frontend**: React v19 + TypeScript + Vite + React Router v7
- **Auth**: JWT (access token 15 phút) + **Refresh Token** (30 ngày, Rotation, bcrypt-hash trong DB)

---

## 1. Yêu cầu môi trường

Cài đặt sẵn trên máy:

| Phần mềm | Phiên bản đề nghị | Ghi chú |
|---|---|---|
| [Node.js](https://nodejs.org/) | **>= 20.x** (LTS) | Kèm theo `npm` |
| [PostgreSQL](https://www.postgresql.org/download/) | **>= 14** | Cài đặt local, biết user/password |
| [Git](https://git-scm.com/) | bất kỳ | Để clone source |

Kiểm tra:

```bash
node -v
npm -v
psql --version
```

---

## 2. Clone & cài đặt dependencies

```bash
git clone <URL_REPO>
cd IT5021-GR1-social-networking-web

# Cài dependencies cho backend
npm install

# Cài dependencies cho frontend
npm --prefix ./client install
```

---

## 3. Thiết lập PostgreSQL

### 3.1. Tạo database

Mở **psql** (hoặc pgAdmin / DBeaver) và chạy:

```sql
CREATE DATABASE feedme;
```

> Mặc định backend kết nối với user `postgres`, password `123456`, database `feedme` trên `localhost:5432`. Có thể đổi qua file `.env` ở bước **4**.

### 3.2. Tạo schema (bảng dữ liệu)

File schema có sẵn tại `sql/tsconfig.sql`. Chạy lệnh sau (Windows / Linux / macOS đều dùng được):

```bash
psql -U postgres -d feedme -f sql/tsconfig.sql
```

Hoặc nếu dùng pgAdmin: mở Query Tool trên database `feedme` → mở file `sql/tsconfig.sql` → **Execute**.

Schema sẽ tạo các bảng: `users`, `posts`, `post_images`, `follows`, `reactions`, `comments`, `messages`, `notifications` cùng các index cần thiết.

### 3.3. Các cột phát sinh thêm

Khi backend khởi động, file `src/app.module.ts` sẽ **tự động** chạy `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` để thêm các cột mới (bao gồm `refresh_token`, `refresh_token_expires_at`, `bio`, `avatar_url`, `cover_url`, `gender`, `image_url`). Không cần làm thủ công.

---

## 4. Cấu hình biến môi trường

### 4.1. Backend - file `.env` ở **thư mục gốc**

Tạo (hoặc chỉnh sửa) file `.env`:

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=123456
DB_DATABASE=feedme

# JWT (tuỳ chọn, đã có default)
JWT_SECRET=feedme-dev-secret

# SMTP cho chức năng Quên mật khẩu (tuỳ chọn).
# Để trống = OTP sẽ chỉ hiển thị trong log backend, không gửi email thật.
# Nếu dùng Gmail: bật "App Passwords" tại https://myaccount.google.com/apppasswords
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 4.2. Frontend - file `client/.env`

Tạo file `client/.env` (đã có sẵn `client/.env.example` để tham khảo):

```env
VITE_API_BASE_URL=http://localhost:3000

# Tuỳ chọn: chỉ cần khi muốn dùng Đăng nhập Google
# Lấy tại https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=
```

---

## 5. Chạy dự án

### 5.1. Chạy đồng thời cả Backend + Frontend (khuyên dùng)

Tại thư mục gốc:

```bash
npm run dev
```

Lệnh này dùng `concurrently` để chạy song song:

- Backend NestJS: <http://localhost:3000>
- Frontend Vite: <http://localhost:5173>
- Swagger API Docs: <http://localhost:3000/api>

### 5.2. Chạy riêng từng phần (nếu cần debug)

```bash
# Chỉ backend (watch mode)
npm run start:dev

# Chỉ frontend
npm run dev:client
```

---

## 6. Các lệnh hay dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy BE + FE cùng lúc (watch) |
| `npm run start:dev` | Chỉ chạy BE (watch) |
| `npm run dev:client` | Chỉ chạy FE |
| `npm run build` | Build BE ra `dist/` |
| `npm run build:client` | Build FE ra `client/dist/` |
| `npm run start:prod` | Chạy BE ở chế độ production (sau khi `build`) |
| `npm run lint` | Lint code BE |
| `npm run lint:client` | Lint code FE |
| `npm run test` | Chạy unit test BE |

---

## 7. Cấu trúc thư mục

```
.
├── src/                         # Backend (NestJS)
│   ├── auth/                    # Đăng ký/đăng nhập, JWT, Refresh Token
│   ├── users/                   # Quản lý user, profile
│   ├── posts/                   # Bài viết, comment, reaction
│   └── app.module.ts            # Module gốc, có auto-migration
├── client/                      # Frontend (React + Vite)
│   └── src/
│       ├── pages/               # Login, Register, Profile, ...
│       ├── lib/api.ts           # Axios instance + interceptors (auto refresh)
│       └── store/authStore.ts   # Quản lý accessToken (memory) + refreshToken (localStorage)
├── sql/
│   └── tsconfig.sql             # Schema PostgreSQL khởi tạo
├── uploads/                     # Ảnh user upload (avatar, post)
├── .env                         # Biến môi trường cho BE
└── package.json                 # Scripts chính của repo
```

---

## 8. Hệ thống Authentication

| Token | Thời hạn | Lưu ở đâu | Mục đích |
|---|---|---|---|
| **Access Token** (JWT) | 15 phút | Memory (FE) | Gửi kèm mỗi request qua `Authorization: Bearer ...` |
| **Refresh Token** (UUID) | 30 ngày | `localStorage` (FE) + bcrypt hash trong DB (BE) | Xin lại access token mới khi hết hạn |

**Luồng hoạt động:**

1. Login/Signup → BE trả `{ accessToken, refreshToken, user }`.
2. Axios request interceptor tự gắn `Bearer accessToken`.
3. Khi BE trả 401 → response interceptor tự gọi `POST /auth/refresh` với `{ userId, refreshToken }` → xin cặp token mới (Rotation) → retry request gốc.
4. F5 trang → `main.tsx` gọi `hydrateAuth()` để tự refresh và khôi phục phiên đăng nhập.
5. Logout → gọi `POST /auth/logout` để xoá refresh token trong DB.

API liên quan có thể test trực tiếp tại Swagger: <http://localhost:3000/api>

---

## 9. Khắc phục lỗi thường gặp

**`ECONNREFUSED 127.0.0.1:5432`** → PostgreSQL chưa chạy hoặc sai port. Kiểm tra service `postgresql` và lại `DB_*` trong `.env`.

**`password authentication failed for user "postgres"`** → Sai `DB_PASSWORD` trong `.env`.

**`database "feedme" does not exist`** → Chưa tạo database. Quay lại bước **3.1**.

**`relation "users" does not exist`** → Chưa chạy file `sql/tsconfig.sql`. Quay lại bước **3.2**.

**Đăng nhập Google không hoạt động** → Chưa cấu hình `VITE_GOOGLE_CLIENT_ID` trong `client/.env`. Vẫn có thể dùng đăng nhập thường (email/password).

**OTP quên mật khẩu không tới email** → Chưa cấu hình `SMTP_*` trong `.env`. OTP sẽ được in ra terminal của backend.

**Sau khi pull code mới gặp lỗi liên quan đến cột DB** → Khởi động lại backend (`npm run start:dev`); script auto-migration trong `app.module.ts` sẽ tự `ALTER TABLE`.

---

## 10. Tài liệu API

Sau khi backend chạy, mở **Swagger UI**: <http://localhost:3000/api>

Tại đó có thể test tất cả endpoint, bao gồm:

- `POST /auth/signup`, `POST /auth/login`, `POST /auth/google`
- `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET /users/me`, `PATCH /users/me`, `POST /users/me/avatar`
- `GET /users/:id`, `GET /users/:id/posts`
- Các API về bài viết, comment, reaction trong module `posts`
