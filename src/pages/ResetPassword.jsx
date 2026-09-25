import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { post } from '../api.js'
import { useToast } from '../notify.jsx'
import AuthShell from '../components/AuthShell.jsx'
import { Field, Input, Button } from '../ui.jsx'

export default function ResetPassword() {
  const toast = useToast()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const email = search.get('email') || ''

  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await post('/auth/reset-password', { email, otp, password })
      toast.show('success', 'Password updated. You can sign in now.')
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Unable to reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Set a new password" sub="Enter the code from your email and a fresh password.">
      {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 'var(--sp-3)' }}>{error}</div>}
      <form className="stack" onSubmit={submit}>
        <Field label="Reset code">
          <Input
            className="otp-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder={'\u2022 \u2022 \u2022 \u2022 \u2022 \u2022'}
            required
          />
        </Field>
        <Field label="New password" hint="8+ characters, letters and numbers">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
        </Field>
        <Button type="submit" block variant="accent" loading={busy} disabled={otp.length !== 6 || password.length < 8}>
          Set new password
        </Button>
      </form>
      <div className="auth-foot">
        Try signing in instead? <Link to="/login">Sign in</Link>
      </div>
    </AuthShell>
  )
}