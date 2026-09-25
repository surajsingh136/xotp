import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { post } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../notify.jsx'
import AuthShell from '../components/AuthShell.jsx'
import { Input, Button } from '../ui.jsx'

const COOL = 60

export default function Verify() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [search] = useSearchParams()

  const purpose = search.get('purpose') || 'signup'
  const email = search.get('email') || ''
  const identifier = search.get('identifier') || ''
  const password = search.get('password') || ''
  const username = search.get('username') || ''

  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cool, setCool] = useState(COOL)

  useEffect(() => {
    const t = setInterval(() => setCool((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (purpose === 'signup') {
        const v = await post('/auth/verify-signup-otp', { email, otp })
        const r = await post('/auth/register', { username, email, password, emailToken: v.emailToken || '' })
        signIn(r.token, r.user)
        navigate('/dashboard')
      } else {
        const r = await post('/auth/verify-email', { email, otp })
        signIn(r.token, r.user)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Invalid code.')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setCool(COOL)
    try {
      await post('/auth/resend-otp', { email, purpose })
      toast.show('success', 'Code resent.')
    } catch (err) {
      toast.show('error', err.message)
    }
  }

  return (
    <AuthShell title="Enter your code" sub={purpose === 'signup' ? 'Verify your email to finish creating your account.' : 'Verify your email before signing in.'}>
      <form className="stack" onSubmit={submit}>
        <div className="otp-sent-to">
          Sent to <strong>{email || identifier}</strong>
        </div>
        <Input
          className="otp-input"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoFocus
          placeholder={'\u2022 \u2022 \u2022 \u2022 \u2022 \u2022'}
        />
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        <Button type="submit" block variant="accent" loading={busy} disabled={otp.length !== 6}>
          Verify
        </Button>
        <div className="row-between">
          <button type="button" className="lnk" onClick={resend} disabled={cool > 0}>
            {cool > 0 ? `Resend in ${cool}s` : 'Resend code'}
          </button>
          <Link to="/login" className="lnk">Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  )
}