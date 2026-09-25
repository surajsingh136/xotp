import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { get, post } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../notify.jsx'
import AuthShell from '../components/AuthShell.jsx'
import { Field, Input, Button } from '../ui.jsx'

export default function Register() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [config, setConfig] = useState({ turnstile: { enabled: false } })
  const [tok, setTok] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    get('/auth/config').then(setConfig).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const otp = await post('/auth/send-signup-otp', {
        email,
        ...(config.turnstile?.enabled ? { turnstileToken: tok || undefined } : {}),
      })
      if (otp.otpDisabled || otp.emailToken) {
        const r = await post('/auth/register', {
          username,
          email,
          password,
          emailToken: otp.emailToken || '',
        })
        signIn(r.token, r.user)
        navigate('/dashboard')
        return
      }
      navigate(`/verify?purpose=signup&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`)
    } catch (err) {
      setError(err.message || 'Unable to register.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your account" sub="Buy numbers and start receiving codes.">
      {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 'var(--sp-3)' }}>{error}</div>}
      <form className="stack" onSubmit={submit}>
        <Field label="Username" hint={'3\u201350 characters, lowercase'}>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={50} required autoCapitalize="none" />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Password" hint="8+ characters, at least one letter and one number">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
        </Field>
        <Field label="Confirm password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </Field>
        <Button type="submit" block variant="accent" loading={busy} disabled={!username || !email || !password || !confirm}>
          Create account
        </Button>
      </form>
      <div className="auth-foot">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthShell>
  )
}