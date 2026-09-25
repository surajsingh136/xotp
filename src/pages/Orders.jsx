import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../notify.jsx'
import { Card, PageHead, Badge, Tabs, Empty, Skeleton, CopyButton, Button, fmtINR, fmtDate } from '../ui.jsx'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'received', label: 'Received' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'expired', label: 'Expired' },
]

const toneFor = (s) => (s === 'received' ? 'mint' : s === 'waiting' ? 'amber' : 'neutral')

export default function Orders() {
  const { refresh } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = () => {
    get('/orders?limit=200')
      .then((d) => setOrders(d.orders || []))
      .catch((e) => {
        toast.show('error', e.message)
        setOrders([])
      })
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const list = (orders || []).filter((o) => filter === 'all' || o.status === filter)

  return (
    <div>
      <PageHead title="Orders" sub="Every number and inbox you've bought." />

      <Card>
        <div className="card-head">
          <Tabs items={FILTERS} value={filter} onChange={setFilter} />
          <Button size="sm" variant="ghost" onClick={load}>
            Refresh
          </Button>
        </div>

        {!orders ? (
          <div className="stack">
            <Skeleton h={40} />
            <Skeleton h={40} />
            <Skeleton h={40} />
          </div>
        ) : list.length === 0 ? (
          <Empty icon={'\uD83E\uDDFE'} title="No orders here" desc="Once you buy a number or inbox, it shows up here.">
            <Link to="/buy">
              <Button variant="accent" size="sm">Buy number</Button>
            </Link>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Number / Email</th>
                  <th>Code</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="row" style={{ gap: 6 }}>
                        <span>{o.icon}</span>
                        <span className="mono faint" style={{ fontSize: 'var(--step--1)' }}>{o.source}</span>
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 'var(--step--1)' }}>{o.target}</span>
                      <CopyButton text={o.target} label="copy" />
                    </td>
                    <td>
                      {o.otp_code ? (
                        <span className="row" style={{ gap: 4 }}>
                          <span className="mono tabular" style={{ color: 'var(--success)', fontWeight: 600 }}>{o.otp_code}</span>
                          <CopyButton text={o.otp_code} label="copy" />
                        </span>
                      ) : (
                        <span className="faint">{'\u2014'}</span>
                      )}
                    </td>
                    <td className="mono tabular">{fmtINR(o.cost)}</td>
                    <td>
                      <Badge tone={toneFor(o.status)} live={o.status === 'waiting'}>{o.status}</Badge>
                    </td>
                    <td className="faint" style={{ fontSize: 'var(--step--1)' }}>{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}