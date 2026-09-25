import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './theme.jsx'
import { ToastProvider } from './notify.jsx'
import { AuthProvider, useAuth } from './auth.jsx'
import { Spinner } from './ui.jsx'
import Shell from './components/Shell.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Verify from './pages/Verify.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Buy from './pages/Buy.jsx'
import BuyEmail from './pages/BuyEmail.jsx'
import Orders from './pages/Orders.jsx'
import Profile from './pages/Profile.jsx'

function Gate({ children, auth, guest }) {
  const { user, ready } = useAuth()
  if (!ready) return <Spinner label={'Loading\u2026'} />
  if (guest && user) return <Navigate to="/dashboard" replace />
  if (auth && !user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Gate guest><Landing /></Gate>} />
            <Route path="/login" element={<Gate guest><Login /></Gate>} />
            <Route path="/register" element={<Gate guest><Register /></Gate>} />
            <Route path="/verify" element={<Gate guest><Verify /></Gate>} />
            <Route path="/forgot-password" element={<Gate guest><ForgotPassword /></Gate>} />
            <Route path="/reset-password" element={<Gate guest><ResetPassword /></Gate>} />
            <Route path="/dashboard" element={<Gate auth><Shell><Dashboard /></Shell></Gate>} />
            <Route path="/buy" element={<Gate auth><Shell><Buy /></Shell></Gate>} />
            <Route path="/buy-email" element={<Gate auth><Shell><BuyEmail /></Shell></Gate>} />
            <Route path="/orders" element={<Gate auth><Shell><Orders /></Shell></Gate>} />
            <Route path="/profile" element={<Gate auth><Shell><Profile /></Shell></Gate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}