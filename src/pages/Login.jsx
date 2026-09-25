import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { get, post } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../notify.jsx'
import { ApiError } from '../api.js'
import AuthShell from '../components/AuthShell.jsx'
import { Field, Input, Button } from '../ui.jsx'

function PwField({ value, onChange, placeholder = 'Password', autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="pw-field">
      <Input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} />
      <button className="pw-toggle" type="button" onClick={() => setShow((s) => !s)} tabIndex={-1} aria-label="Toggle password">
        {show ? '\uD83D\uDE48' : '\uD83D\uDE47'}
      </button>
    </div>
  )
}

function Turnstile({ siteKey, onToken }) {
  const [hostId, setHostId] = useState(null)
  useEffect(() => {
    if (!siteKey) return
    const id = 'ts-host-' + Math.random().toString(36).slice(2)
    setHostId(id)
  }, [siteKey])

  useEffect(() => {
    if (!siteKey || !hostId) return
    let render = true
    const cb = `tscb${Math.random().toString(36).slice(2)}`
    window[cb] = (token) => {
      if (render) onToken(token)
    }
    const heartbeat = () => {
      if (!render) return
      setTimeout(() => {
        const host = document.getElementById(hostId)
        if (!host || host.childElementCount > 0) return
        if (window.turnstile) {
          window.turnstile.render(host, { sitekey: siteKey, callback: window[cb] })
          return
        }
        const s = document.createElement('script')
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        s.async = true
        s.onload = () => window.turnstile?.render(host, { sitekey: siteKey, callback: window[cb] })
        document.head.appendChild(s)
      }, 400)
    }
    return () => {
      render = false
      delete window[cb]
    }
  }, [siteKey, hostId])

  if (!siteKey || !hostId) return null
  return <div id={hostId} onLoad={heartbeat} />
}

export default function Login() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [search] = useSearchParams()

  const [identifier, setIdentifier] = useState(search.get('u') || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [config, setConfig] = useState({ turnstile: { enabled: false } })
  const [notice, setNotice] = useState(null)
  const [tok, setTok] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    get('/auth/config').then(setConfig).catch(() => {})
    get('/auth/notice').then(setNotice).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const r = await post('/auth/login', {
        identifier,
        password,
        ...(config.turnstile?.enabled ? { turnstileToken: tok || undefined } : {}),
      })
      signIn(r.token, r.user)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        navigate(`/verify?email=${encodeURIComponent(identifier)}&purpose=email_verify&identifier=${encodeURIComponent(identifier)}&password=${encodeURIComponent(password)}`)
        return
      }
      if (err.status === 400 && err.details === 'captcha') {
        setError('Please complete the security check.')
      } else {
        setError(err.message || 'Unable to sign in.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" sub="Sign in to buy numbers and run verifications.">
      {notice?.title && (
        <div className="auth-notice">
          <strong>{notice.title}</strong>
          <p>{notice.body}</p>
        </div>
      )}
      {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 'var(--sp-3)' }}>{error}</div>}
      <form className="stack" onSubmit={submit}>
        <Field label="Username or email">
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="suraj136" autoCapitalize="none" autoCorrect="off" required />
        </Field>
        <Field label="Password">
          <PwField value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {config.turnstile?.enabled && (
          <Turnstile siteKey={config.turnstile.siteKey} onToken={(t) => setTok(t)} />
        )}
        <Button type="submit" block variant="accent" loading={busy} disabled={!identifier || !password}>
          Sign in
        </Button>
      </form>
      <div className="row-between" style={{ marginTop: 'var(--sp-4)' }}>
        <Link to="/forgot-password" className="muted" style={{ fontSize: 'var(--step--1)' }}>
          Forgot password?
        </Link>
        <Link to="/register" className="muted" style={{ fontSize: 'var(--step--1)' }}>
          Create account
        </Link>
      </div>
    </AuthShell>
  )
}