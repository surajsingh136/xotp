import { useState } from 'react'
import { get, patch, post } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../notify.jsx'
import { Card, PageHead, Field, Input, Button, Modal, Avatar, Badge, fmtDate } from '../ui.jsx'

export default function Profile() {
  const { user, reloadUser } = useAuth()
  const toast = useToast()

  const [emailOpen, setEmailOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailPw, setEmailPw] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const changeEmail = async (e) => {
    e.preventDefault()
    setEmailBusy(true)
    try {
      await post('/auth/change-verify-email', { identifier: user.username, password: emailPw, newEmail })
      const r = await patch('/profile', { email: newEmail })
      toast.show('success', `Email updated to ${r.email}. Verify on next sign in.`)
      setEmailOpen(false)
      setNewEmail('')
      setEmailPw('')
      reloadUser()
    } catch (err) {
      toast.show('error', err.message)
    }
    setEmailBusy(false)
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwBusy(true)
    try {
      const r = await post('/auth/change-password', { currentPassword: curPw, newPassword: newPw })
      if (r.token) localStorage.setItem('xotp_token', r.token)
      toast.show('success', 'Password changed. Other devices signed out.')
      setPwOpen(false)
      setCurPw('')
      setNewPw('')
    } catch (err) {
      toast.show('error', err.message)
    }
    setPwBusy(false)
  }

  return (
    <div>
      <PageHead title="Profile" sub="Your account details and security." />

      <div className="stack">
        <Card>
          <div className="row" style={{ gap: 'var(--sp-4)' }}>
            <Avatar user={user} size={54} />
            <div>
              <div className="card-title">{user?.username}</div>
              <div className="card-sub">{user?.email}</div>
              <div style={{ marginTop: 6 }}>
                <Badge tone="violet">{user?.role || 'user'}</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-head">
            <div>
              <div className="card-title">Email</div>
              <div className="card-sub">Used for sign in and verification codes.</div>
            </div>
            <Button size="sm" onClick={() => setEmailOpen(true)}>Change email</Button>
          </div>
          <div className="mono" style={{ fontSize: 'var(--step--1)' }}>{user?.email}</div>
        </Card>

        <Card>
          <div className="card-head">
            <div>
              <div className="card-title">Password</div>
              <div className="card-sub">Change it any time {'\u2014'} other sessions get signed out.</div>
            </div>
            <Button size="sm" onClick={() => setPwOpen(true)}>Change password</Button>
          </div>
          <div className="faint" style={{ fontSize: 'var(--step--1)' }}>Last secured {'\u00B7'} keep it unique</div>
        </Card>

        <Card>
          <div className="card-head" style={{ marginBottom: 0 }}>
            <div>
              <div className="card-title">Account created</div>
              <div className="card-sub">{fmtDate(user?.createdAt)}</div>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Change email" sub="Confirm your password first.">
        <form className="stack" onSubmit={changeEmail}>
          <Field label="New email">
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          </Field>
          <Field label="Current password">
            <Input type="password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} required />
          </Field>
          <Button type="submit" block variant="accent" loading={emailBusy} disabled={!newEmail || !emailPw}>
            Update email
          </Button>
        </form>
      </Modal>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password" sub="Choose a strong new password.">
        <form className="stack" onSubmit={changePassword}>
          <Field label="Current password">
            <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
          </Field>
          <Field label="New password" hint={'8+ characters, letters and numbers'}>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} required />
          </Field>
          <Button type="submit" block variant="accent" loading={pwBusy} disabled={!curPw || newPw.length < 8}>
            Change password
          </Button>
        </form>
      </Modal>
    </div>
  )
}