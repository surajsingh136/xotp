import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../notify.jsx'
import { Card, PageHead, Stat, Button, Badge, Empty, Skeleton, fmtINR, fmtDate } from '../ui.jsx'
import OtpCard from '../components/OtpCard.jsx'

const toneFor = (t) => (t === 'success' ? 'mint' : t === 'warning' ? 'amber' : t === 'danger' ? 'rose' : 'violet')

export default function Dashboard() {
  const { user, overview, refresh } = useAuth()
  const toast = useToast()
  const [active, setActive] = useState(null)

  const loadActive = () => {
    get('/orders/active')
      .then((d) => setActive(d.orders || []))
      .catch(() => setActive([]))
  }

  useEffect(() => {
    loadActive()
    refresh()
    const t = setInterval(loadActive, 8000)
    return () => clearInterval(t)
  }, [])

  const stats = overview?.stats
  const recent = overview?.recentTransactions || []
  const news = overview?.news || []

  return (
    <div>
      <PageHead title={`Hey, ${user?.username || 'there'}`} sub="Here's where everything stands.">
        <Link to="/buy">
          <Button variant="accent">Buy a number</Button>
        </Link>
      </PageHead>

      <div className="stack">
        <div className="grid-auto">
          <Card>
            <Stat label="Balance" value={overview ? fmtINR(overview.balance) : '\u2014'} meta="Wallet credit" />
          </Card>
          <Card>
            <Stat label="Numbers bought" value={stats ? stats.totalOrders : '\u2014'} meta="All time" />
          </Card>
          <Card>
            <Stat label="Active now" value={stats ? stats.activeOrders : '\u2014'} meta="Waiting or received" />
          </Card>
          <Card>
            <Stat label="Total spent" value={stats ? fmtINR(stats.totalSpent) : '\u2014'} meta="Delivered codes" />
          </Card>
        </div>

        {overview?.telegramUrl && (
          <Card className="card-accent">
            <div className="row-between">
              <div>
                <div className="card-title">Need help?</div>
                <div className="card-sub">Join the support group for updates and help.</div>
              </div>
              <a className="btn btn-accent" href={overview.telegramUrl} target="_blank" rel="noreferrer">
                Telegram
              </a>
            </div>
          </Card>
        )}

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Card>
            <div className="card-head">
              <div>
                <div className="card-title">Live OTPs</div>
                <div className="card-sub">Codes land here the moment they arrive</div>
              </div>
              <Link to="/orders" className="muted" style={{ fontSize: 'var(--step--1)' }}>
                All orders
              </Link>
            </div>
            {!active ? (
              <div className="stack">
                <Skeleton h={92} />
                <Skeleton h={92} />
              </div>
            ) : active.length === 0 ? (
              <Empty icon={'\uD83D\uDCF1'} title="Nothing waiting" desc="Buy a number or email to start receiving codes.">
                <Link to="/buy">
                  <Button variant="accent" size="sm">Buy number</Button>
                </Link>
              </Empty>
            ) : (
              <div className="otp-list">
                {active.map((o) => (
                  <OtpCard
                    key={o.id}
                    order={o}
                    onChanged={() => refresh()}
                    onCancel={(id) => {
                      setActive((p) => (p || []).filter((x) => x.id !== id))
                      refresh()
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          <div className="stack">
            <Card>
              <div className="card-head">
                <div className="card-title">Recent activity</div>
                <Link to="/orders" className="muted" style={{ fontSize: 'var(--step--1)' }}>
                  View all
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="faint">No transactions yet.</div>
              ) : (
                <div>
                  {recent.map((t, i) => (
                    <div key={i} className="row-between news-line">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--step--1)' }}>{t.description}</div>
                        <div className="faint" style={{ fontSize: '.75rem' }}>{fmtDate(t.created_at)}</div>
                      </div>
                      <span className="mono tabular" style={{ color: t.amount < 0 ? 'var(--ink)' : 'var(--success)', fontWeight: 600 }}>
                        {t.amount < 0 ? '' : '+'}
                        {fmtINR(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="card-title" style={{ marginBottom: 'var(--sp-3)' }}>News</div>
              {news.length === 0 ? (
                <div className="faint">No announcements.</div>
              ) : (
                <div>
                  {news.map((n) => (
                    <div key={n.id} className="news-line">
                      <Badge tone={toneFor(n.type)}>{n.type}</Badge>
                      <div style={{ fontWeight: 600, marginTop: 6 }}>{n.title}</div>
                      <div className="muted" style={{ fontSize: 'var(--step--1)' }}>{n.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}