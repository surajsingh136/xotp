import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { post } from '../api.js'
import { useToast } from '../notify.jsx'
import AuthShell from '../components/AuthShell.jsx'
import { Field, Input, Button } from '../ui.jsx'

export default function ForgotPassword() {
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await post('/auth/forgot-password', { email })
      toast.show('success', 'Reset code sent to your email.')
      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err.message || 'Unable to send reset code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Reset your password" sub="We'll email you a reset code.">
      {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: 'var(--sp-3)' }}>{error}</div>}
      <form className="stack" onSubmit={submit}>
        <Field label="Registered email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Button type="submit" block variant="accent" loading={busy} disabled={!email}>
          Send reset code
        </Button>
      </form>
      <div className="auth-foot">
        Remembered it? <Link to="/login">Sign in</Link>
      </div>
    </AuthShell>
  )
}