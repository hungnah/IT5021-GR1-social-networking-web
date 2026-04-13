// src/pages/Login.tsx
const Login = () => {
  return (
    <div>
      <h2>Đăng nhập vào Mạng Xã Hội</h2>
      
      <form>
        <div>
          <label htmlFor="email">Email: </label>
          <input type="email" id="email" placeholder="Nhập email của bạn" />
        </div>
        
        <br />

        <div>
          <label htmlFor="password">Mật khẩu: </label>
          <input type="password" id="password" placeholder="Nhập mật khẩu" />
        </div>
        
        <br />

        <button type="submit">Đăng nhập</button>
      </form>
    </div>
  );
};

export default Login;