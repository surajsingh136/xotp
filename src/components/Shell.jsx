import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { ThemeToggle } from '../theme.jsx'
import { Button, Avatar, fmtINR } from '../ui.jsx'
import RechargeDialog from './RechargeDialog.jsx'
import { get } from '../api.js'

const NAV = [
  { to: '/dashboard', icon: '\uD83D\uDCCA', label: 'Dashboard' },
  { to: '/buy', icon: '\uD83D\uDCF1', label: 'Buy number' },
  { to: '/buy-email', icon: '\u2709\uFE0F', label: 'Buy email' },
  { to: '/orders', icon: '\uD83E\uDDFE', label: 'Orders' },
  { to: '/profile', icon: '\uD83D\uDC64', label: 'Profile' },
]

export default function Shell({ children }) {
  const { user, overview, refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const addFunds = async () => {
    setAdding(true)
    try {
      await get('/payments/config')
      setOpen(true)
    } catch {
      /* keep dialog config fetch inside dialog */
    }
    setAdding(false)
  }

  const onRecharged = () => {
    refresh()
  }

  const doSignOut = () => {
    signOut()
    navigate('/')
  }

  const balance = overview?.balance

  return (
    <div className="shell">
      <button
        className="btn btn-icon rail-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {'\u2630'}
      </button>

      <aside className={`rail ${open ? 'open' : ''}`}>
        <a href="/dashboard" className="brand">
          <span className="brand-mark">{'\u2713'}</span>
          <span>
            <span className="brand-name">xOTP</span>
            <span className="brand-tag">otp</span>
          </span>
        </a>

        <button className="btn btn-accent btn-block btn-sm" onClick={addFunds} disabled={adding}>
          {adding ? <span className="btn-spin" /> : '\u2795 Add funds'}
        </button>

        <div className="rail-balance">
          <div className="rail-balance-label">Balance</div>
          <div className="rail-balance-value tabular">{fmtINR(balance)}</div>
          <div style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
            Pay per delivered code {'\u00B7'} auto refund
          </div>
        </div>

        <nav className="nav" style={{ flex: 1 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="nav-link">
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rail-foot">
          <div className="rail-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <Avatar user={user} />
            <div style={{ minWidth: 0 }}>
              <div className="rail-user-name">{user?.username}</div>
              <div className="rail-user-role">{user?.role || 'user'}</div>
            </div>
          </div>
          <div className="row">
            <ThemeToggle grow />
            <Button variant="ghost" size="sm" onClick={doSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {open && <div className="rail-scrim" onClick={() => setOpen(false)} />}

      <main className="content">{children}</main>

      <RechargeDialog open={open} onClose={() => setOpen(false)} onSuccess={onRecharged} />
    </div>
  )
}