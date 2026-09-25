import { ThemeToggle } from '../theme.jsx'

export default function AuthShell({ title, sub, children, width = 400 }) {
  return (
    <div className="auth">
      <ThemeToggle fixed />
      <div className="auth-pane" style={{ width: `min(${width}px,100%)` }}>
        <div className="auth-brand">
          <div className="auth-mark">{'\u2713'}</div>
          <div className="auth-title">{title}</div>
          {sub && <div className="auth-sub">{sub}</div>}
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  )
}