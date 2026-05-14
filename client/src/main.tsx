import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { hydrateAuth } from './store/authStore'
import './index.css'

// Sau F5: nếu localStorage còn refreshToken thì xin access token mới
// rồi mới render App. Dùng .finally để app vẫn render kể cả khi refresh fail.
hydrateAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
