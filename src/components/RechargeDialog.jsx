import { useEffect, useState } from 'react'
import { get, post } from '../api.js'
import { useToast } from '../notify.jsx'
import { Modal, Field, Input, Button, Tabs, fmtINR } from '../ui.jsx'

export default function RechargeDialog({ open, onClose, onSuccess }) {
  const toast = useToast()
  const [config, setConfig] = useState(null)
  const [method, setMethod] = useState('paytm')
  const [amount, setAmount] = useState(100)
  const [txn, setTxn] = useState(null)
  const [busy, setBusy] = useState(false)
  const [utr, setUtr] = useState('')

  useEffect(() => {
    if (!open) return
    setConfig(null)
    setTxn(null)
    setUtr('')
    setBusy(false)
    setMethod('paytm')
    get('/payments/config')
      .then((c) => {
        setConfig(c)
        setAmount(c.presets?.[0] ?? 100)
      })
      .catch((e) => toast.show('error', e.message))
  }, [open])

  const methods = [
    { key: 'paytm', label: 'Paytm / UPI' },
    { key: 'bharatpe', label: 'BharatPe' },
    { key: 'manual', label: 'Manual' },
  ].filter((m) => config && config[m.key]?.enabled)

  const startPaytm = async () => {
    setBusy(true)
    try {
      const { orderId } = await post('/payments/paytm/initiate', { amount })
      const start = Date.now()
      const poll = async () => {
        try {
          const r = await post('/payments/paytm/verify', { orderId })
          if (r.status === 'SUCCESS') {
            toast.show('success', 'Payment successful \u2014 balance added.')
            onSuccess?.()
            onClose()
            return
          }
        } catch {
          /* keep polling */
        }
        if (Date.now() - start < 20000) setTimeout(poll, 4000)
        else {
          toast.show('error', 'Payment not detected. Try again.')
          setBusy(false)
        }
      }
      const t = setTimeout(poll, 2000)
      return () => clearTimeout(t)
    } catch (e) {
      toast.show('error', e.message)
      setBusy(false)
    }
  }

  const startBharatpe = async () => {
    setBusy(true)
    try {
      const r = await post('/payments/bharatpe/initiate', { amount })
      setTxn(r)
      setBusy(false)
    } catch (e) {
      toast.show('error', e.message)
      setBusy(false)
    }
  }

  const submitUtr = async () => {
    if (!txn) return
    setBusy(true)
    try {
      await post('/payments/bharatpe/submit-utr', { paymentId: txn.paymentId, utr })
      toast.show('success', 'UTR verified \u2014 balance added.')
      onSuccess?.()
      onClose()
    } catch (e) {
      toast.show('error', e.message)
      setBusy(false)
    }
  }

  const startManual = async () => {
    setBusy(true)
    try {
      const r = await post('/wallet/recharge/manual', { amount })
      setTxn(r)
      setBusy(false)
    } catch (e) {
      toast.show('error', e.message)
      setBusy(false)
    }
  }

  const go = async () => {
    if (method === 'paytm') return startPaytm()
    if (method === 'bharatpe') return startBharatpe()
    return startManual()
  }

  const upiStr = txn
    ? `upi://pay?pa=${encodeURIComponent(txn.upiId)}&am=${txn.amount}&pn=xOTP&tr=${encodeURIComponent(txn.ref)}&tn=${encodeURIComponent(txn.note)}`
    : ''

  return (
    <Modal open={open} onClose={onClose} title="Add funds" sub="Instant recharge against your wallet.">
      <div className="stack">
        <Tabs items={methods} value={method} onChange={(k) => { setMethod(k); setTxn(null); setBusy(false) }} />

        {!txn ? (
          <>
            <Field label="Amount" hint={config ? `Minimum ${fmtINR(config.min)}` : 'Select an amount'}>
              <div className="amount-grid">
                {(config?.presets || []).map((p) => (
                  <button
                    key={p}
                    className={`btn amount-btn ${amount === p ? 'btn-accent' : ''}`}
                    onClick={() => setAmount(p)}
                  >
                    {fmtINR(p)}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 'var(--sp-2)' }}>
                <Input
                  type="number"
                  value={amount || ''}
                  min={config?.min || 1}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Custom amount"
                />
              </div>
            </Field>
            <Button variant={method === 'manual' ? 'mint' : 'accent'} block loading={busy} onClick={go}>
              {method === 'manual' ? 'Create payment request' : 'Pay ' + fmtINR(amount)}
            </Button>
          </>
        ) : method === 'bharatpe' ? (
          <>
            <div className="row-between">
              <span className="muted">Scan with any UPI app</span>
              <span className="mono tabular">{fmtINR(txn.amount)}</span>
            </div>
            <div className="qr-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiStr)}`}
                alt="UPI QR"
                style={{ borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}
              />
            </div>
            <div className="mono faint" style={{ fontSize: 'var(--step--1)', textAlign: 'center' }}>
              {txn.ref}
            </div>
            <Field label="UTR number" hint="After paying, paste the UTR from your payment app.">
              <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 415732984671" />
            </Field>
            <Button variant="mint" block loading={busy} onClick={submitUtr} disabled={utr.trim().length < 6}>
              Verify payment
            </Button>
          </>
        ) : (
          <>
            <div className="auth-alert auth-alert-info">
              Send a screenshot of your payment to us with your order ID
              <strong className="mono"> {txn?.orderId}</strong>.
            </div>
            <div className="row">
              <a className="btn btn-mint btn-block" href={txn?.whatsappUrl} target="_blank" rel="noreferrer">
                WhatsApp proof
              </a>
              <a className="btn btn-accent btn-block" href={txn?.telegramUrl} target="_blank" rel="noreferrer">
                Telegram
              </a>
            </div>
            <div className="faint" style={{ fontSize: 'var(--step--1)' }}>
              Balance is added after admin verifies your payment.
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}