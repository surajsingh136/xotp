import { useEffect } from 'react'
import { useToast } from './notify.jsx'

export const fmtINR = (n) => '\u20B9' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtDate = (iso) => {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' \u00B7 ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  )
}

export const mmss = (s) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export const copyTarget = (t) => String(t || '').replace(/^\+91\s?/, '').replace(/\s+/g, '')

export function Card({ children, className = '', pad = true, hover, accent, style }) {
  return (
    <div
      className={`card ${pad ? '' : 'card-pad-0'} ${hover ? 'card-hover' : ''} ${accent ? 'card-accent' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export function Button({ variant = '', size = '', block, loading, children, className = '', ...rest }) {
  return (
    <button
      className={`btn ${variant ? `btn-${variant}` : ''} ${size ? `btn-${size}` : ''} ${block ? 'btn-block' : ''} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <span className="btn-spin" /> : children}
    </button>
  )
}

export function Badge({ tone = 'neutral', live, children }) {
  return (
    <span className={`badge badge-${tone}`}>
      {live && <span className="dot dot-live" />}
      {children}
    </span>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="field">
      {label && <span className="label">{label}</span>}
      {children}
      {error && <span className="field-error">{error}</span>}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Input(props) {
  const { className = '', error, ...rest } = props
  return <input className={`input ${error ? 'input-error ' : ''}${className}`} {...rest} />
}

export function Select(props) {
  const { className = '', children, ...rest } = props
  return (
    <select className={`select ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function Modal({ open, onClose, title, sub, children, width }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="modal" style={width ? { width } : undefined} role="dialog" aria-modal="true">
        <div className="card-head" style={{ marginBottom: 'var(--sp-4)' }}>
          <div>
            <div className="card-title">{title}</div>
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          <button className="lnk" onClick={onClose} aria-label="Close">
            {'\u2715'}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {items.map((it) => (
        <button key={it.key} className="tab" role="tab" aria-selected={value === it.key} onClick={() => onChange(it.key)}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {children && <div>{children}</div>}
    </div>
  )
}

export function Stat({ label, value, meta }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {meta && <span className="stat-meta">{meta}</span>}
    </div>
  )
}

export function SectionHead({ eyebrow, title, sub }) {
  return (
    <div className="lp-section-head">
      {eyebrow && <div className="lp-kicker">{eyebrow}</div>}
      {title && <h2 className="lp-h2">{title}</h2>}
      {sub && <p className="lp-h2-sub">{sub}</p>}
    </div>
  )
}

export function Empty({ icon = '\uD83D\uDCA4', title, desc, children }) {
  return (
    <div className="empty">
      <div style={{ fontSize: '2rem', marginBottom: 'var(--sp-2)' }}>{icon}</div>
      <div className="empty-title">{title}</div>
      {desc && <div>{desc}</div>}
      {children && <div style={{ marginTop: 'var(--sp-4)' }}>{children}</div>}
    </div>
  )
}

export function Skeleton({ w = '100%', h = 14 }) {
  return <div className="skeleton" style={{ width: w, height: h }} />
}

export function Spinner({ label }) {
  return (
    <div className="auth">
      <div style={{ textAlign: 'center' }}>
        <span className="btn-spin" style={{ width: 26, height: 26, borderWidth: 3, display: 'inline-block' }} />
        {label && <div className="muted" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--step--1)' }}>{label}</div>}
      </div>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy', size = 'sm' }) {
  const toast = useToast()
  return (
    <Button
      size={size}
      variant="ghost"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(text)
          toast.show('success', 'Copied!')
        } catch {
          toast.show('error', 'Copy failed')
        }
      }}
    >
      {label}
    </Button>
  )
}

export function Avatar({ user, size = 30 }) {
  const initial = (user?.username || 'U').slice(0, 1).toUpperCase()
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  )
}