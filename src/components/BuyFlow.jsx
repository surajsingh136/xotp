import { useEffect, useMemo, useState } from 'react'
import { get, post } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../notify.jsx'
import { PageHead, Card, Button, Badge, Modal, Empty, Skeleton, Tabs, fmtINR } from '../ui.jsx'
import OtpCard from './OtpCard.jsx'

export default function BuyFlow({ servers, defaultServer, scope, title, sub, headActions }) {
  const { refresh } = useAuth()
  const toast = useToast()

  const [server, setServer] = useState(defaultServer || servers[0]?.id)
  const [catalog, setCatalog] = useState(null)
  const [sel, setSel] = useState(null)
  const [irctcCheck, setIrctcCheck] = useState(true)
  const [buying, setBuying] = useState(false)
  const [active, setActive] = useState([])

  const recKey = `xotp_recent_${scope}`
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(recKey) || '[]')
    } catch {
      return []
    }
  })

  const serverLabel = useMemo(() => {
    const s = servers.find((x) => x.id === server)
    return s ? s.name : server
  }, [server, servers])

  useEffect(() => {
    setCatalog(null)
    get(`/catalog/${server}`)
      .then((d) => setCatalog(d.services || []))
      .catch((e) => toast.show('error', e.message))
  }, [server])

  const loadActive = () => {
    get('/orders/active')
      .then((d) => setActive(d.orders || []))
      .catch(() => {})
  }
  useEffect(() => {
    loadActive()
    const t = setInterval(loadActive, 10000)
    return () => clearInterval(t)
  }, [])

  const buy = async () => {
    if (!sel) return
    setBuying(true)
    try {
      const r = await post(`/orders/${server}/buy`, {
        catalogId: sel.id,
        ...(scope === 'number' ? { irctcCheck } : {}),
      })
      const target = r.phoneNumber || r.email
      toast.show('success', `${serverLabel} issued \u2014 ${target}`)
      setSel(null)
      const rec = [{ server, id: sel.id, name: sel.name, icon: sel.icon }, ...recent.filter((x) => !(x.id === sel.id && x.server === server))].slice(0, 6)
      setRecent(rec)
      localStorage.setItem(recKey, JSON.stringify(rec))
      refresh()
      setTimeout(loadActive, 300)
    } catch (e) {
      toast.show('error', e.message)
    }
    setBuying(false)
  }

  const activeHere = active.filter((o) => o.server === server)

  return (
    <div>
      <PageHead title={title} sub={sub}>{headActions}</PageHead>

      <div className="stack">
        <Card>
          <div className="card-head" style={{ marginBottom: 0 }}>
            {servers.length > 1 ? (
              <Tabs
                items={servers.map((s) => ({ key: s.id, label: s.name }))}
                value={server}
                onChange={setServer}
              />
            ) : (
              <div>
                <div className="card-title">{servers[0].name}</div>
                <div className="card-sub">One-time inboxes, billed per code</div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="card-head">
            <div>
              <div className="card-title">Services</div>
              <div className="card-sub">{serverLabel} {'\u2014'} flat price, or market pricing</div>
            </div>
          </div>

          {!catalog ? (
            <div className="grid-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} h={86} />
              ))}
            </div>
          ) : (
            <div className="grid-auto">
              {catalog.map((s) => {
                const cost = s.price > 0 ? fmtINR(s.price) : 'Market'
                return (
                  <div
                    key={s.id}
                    className="card card-pad-sm card-hover service"
                    onClick={() => setSel(s)}
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
                  >
                    <div className="row-between">
                      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{s.icon}</span>
                      <Badge tone={s.price > 0 ? 'neutral' : 'violet'}>{cost}</Badge>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div className="faint" style={{ fontSize: 'var(--step--1)' }}>
                        {s.skip ? 'RailOne checked' : 'Instant delivery'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {recent.length > 0 && (
          <Card>
            <div className="card-title" style={{ marginBottom: 'var(--sp-3)' }}>
              Recent
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {recent.map((r, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setServer(r.server)
                    const s = r
                    setSel(s)
                  }}
                >
                  {r.icon} {r.name}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <div className="card-head">
            <div>
              <div className="card-title">Active orders</div>
              <div className="card-sub">Live codes refresh automatically</div>
            </div>
          </div>
          {activeHere.length === 0 ? (
            <Empty icon={scope === 'email' ? '\u2709\uFE0F' : '\uD83D\uDCF1'} title="No active orders" desc="Pick a service above to start." />
          ) : (
            <div className="otp-list">
              {activeHere.map((o) => (
                <OtpCard
                  key={o.id}
                  order={o}
                  onChanged={() => {}}
                  onCancel={(id) => setActive((p) => p.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel ? `${sel.icon} ${sel.name}` : ''}
        sub={`${serverLabel}`}
      >
        {sel && (
          <div className="stack">
            <div className="row-between" style={{ padding: 'var(--sp-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)' }}>
              <span className="muted">Price</span>
              <span className="mono tabular" style={{ fontSize: 'var(--step-1)', fontWeight: 600 }}>
                {sel.price > 0 ? fmtINR(sel.price) : 'Market'}
              </span>
            </div>

            {scope === 'number' && sel.skip && (
              <label className="field" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                <input type="checkbox" checked={irctcCheck} onChange={(e) => setIrctcCheck(e.target.checked)} style={{ marginTop: 3 }} />
                <span style={{ fontSize: 'var(--step-1)', color: 'var(--ink-2)' }}>
                  Skip already-used numbers
                  <span className="field-hint">Defaults on {'\u2014'} never reissues a number that has already been used on RailOne.</span>
                </span>
              </label>
            )}

            <Button block variant="accent" loading={buying} onClick={buy}>
              Buy now
            </Button>
            <div className="faint" style={{ fontSize: 'var(--step--1)', textAlign: 'center' }}>
              Charged on issue {'\u00B7'} auto refund if the code never arrives
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}