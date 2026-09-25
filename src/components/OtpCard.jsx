import { useEffect, useRef, useState } from 'react'
import { get, post } from '../api.js'
import { useToast } from '../notify.jsx'
import { Badge, Button, CopyButton, mmss, fmtINR, copyTarget } from '../ui.jsx'
import { playAlert } from '../sound.js'

export default function OtpCard({ order, onChanged, onCancel }) {
  const toast = useToast()
  const [data, setData] = useState(order)
  const [now, setNow] = useState(Date.now())
  const mounted = useRef(true)
  const announced = useRef(order?.otp_code || null)

  useEffect(() => {
    mounted.current = true
    setData(order)
    announced.current = order?.otp_code || null
    return () => {
      mounted.current = false
    }
  }, [order])

  useEffect(() => {
    const t = setInterval(() => mounted.current && setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const status = data?.status || 'waiting'
  const waiting = status === 'waiting'
  const live = status === 'waiting' || status === 'received'
  const expires = new Date(data?.expires_at || Date.now() + 4 * 60000).getTime()
  const remain = Math.max(0, Math.round((expires - now) / 1000))
  const R = 40
  const C = 2 * Math.PI * R
  const pct = Math.min(1, remain / 240)

  useEffect(() => {
    if (!live) return
    const id = setInterval(async () => {
      try {
        const s = await get(`/orders/${data.server}/${data.id}/status`)
        if (!mounted.current) return
        setData((d) => ({ ...d, ...s }))
        if (s.otp_code && announced.current !== s.otp_code) {
          announced.current = s.otp_code
          playAlert()
        }
        onChanged?.(s)
      } catch {
        /* keep polling */
      }
    }, 3000)
    return () => clearInterval(id)
  }, [data.id, data.server, live])

  const cancel = async () => {
    if (!window.confirm('Cancel this order and get a full refund?')) return
    try {
      await post(`/orders/${data.server}/${data.id}/cancel`)
      toast.show('success', 'Order cancelled \u2014 refunded.')
      onCancel?.(data.id)
    } catch (e) {
      toast.show('error', e.message)
    }
  }

  const copyT = async () => {
    const t = data?.target
    if (!t) return
    try {
      await navigator.clipboard.writeText(copyTarget(t))
      toast.show('success', String(t).includes('@') ? 'Email copied' : 'Number copied (no +91)')
    } catch {
      toast.show('error', 'Copy failed')
    }
  }

  const tone = status === 'received' ? 'mint' : status === 'refunded' ? 'neutral' : status === 'expired' ? 'neutral' : 'amber'
  const label = status === 'received' ? 'received' : status === 'refunded' ? 'refunded' : status === 'expired' ? 'expired' : 'waiting'

  return (
    <div className="card otp-card">
      <div className={`ring ${remain < 30 && waiting ? 'ring-urgent' : ''}`}>
        <svg viewBox="0 0 92 92">
          <circle className="ring-track" cx="46" cy="46" r="40" />
          <circle
            className="ring-fill"
            cx="46"
            cy="46"
            r="40"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
          />
        </svg>
        <div className="ring-inner">
          <div>
            <div className="ring-time">{live ? mmss(remain) : '\u2014'}</div>
            <div className="ring-caption">{waiting ? 'waiting' : status}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <span>{data?.icon}</span>
          <span className="mono faint" style={{ fontSize: 'var(--step--1)' }}>
            {data?.service_name} {'\u00B7'} {data?.source}
          </span>
          <Badge tone={tone} live={waiting}>
            {label}
          </Badge>
        </div>

        <div
          className="otp-target otp-copy"
          role="button"
          tabIndex={0}
          title="Click to copy"
          onClick={copyT}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              copyT()
            }
          }}
        >
          {data?.target}
        </div>

        {waiting && <div className="otp-slot">{'\u2022'.repeat(6)}</div>}

        {status === 'received' && data?.otp_code && (
          <div className="otp-code">
            <Badge tone="mint">{'\u2713'} delivered</Badge>
            <span className="otp-code-value tabular">{data.otp_code}</span>
            <CopyButton text={data.otp_code} label="Copy code" />
          </div>
        )}

        {status === 'received' && data?.sms_code && data.sms_code !== data.otp_code && (
          <div className="muted" style={{ fontSize: 'var(--step--1)', marginTop: 'var(--sp-2)' }}>
            SMS code: <span className="mono tabular">{data.sms_code}</span>
            <CopyButton text={data.sms_code} label="copy" size="sm" />
          </div>
        )}

        <div className="otp-actions">
          <CopyButton text={copyTarget(data?.target)} label={String(data?.target || '').includes('@') ? 'Copy email' : 'Copy number'} />
          {waiting && (
            <>
              <Button variant="ghost" size="sm" onClick={cancel}>
                {'\u2715 Cancel & refund'}
              </Button>
              <span className="faint" style={{ fontSize: 'var(--step--1)' }}>
                {fmtINR(data?.cost)} {data?.cost ? 'charged' : ''}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}