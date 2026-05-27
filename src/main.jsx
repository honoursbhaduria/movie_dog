import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import Logout from './components/Logout.jsx'
import AuthCallback from './components/AuthCallback.jsx'
import { initAuthListener } from './utils/auth.js'
import MovieDetails from './components/MovieDetails.jsx'
import Player from './components/Player.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/details/:type/:id" element={<MovieDetails />} />
        <Route path="/player/:type/:id" element={<Player />} />
        <Route path="/player/:type/:id/:season/:episode" element={<Player />} />
        <Route path="/login" element={<Login />} />
...

        <Route path="/register" element={<Register />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
