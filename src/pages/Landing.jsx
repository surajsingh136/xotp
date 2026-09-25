import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui.jsx'

const SITE = 'classic-practice-bundle-inc.trycloudflare.com'

const DEMO = [
  { net: 'server 1', service: 'WhatsApp', number: '+91 9XXXX 41207' },
  { net: 'server 2', service: 'Google', number: '+91 9XXXX 88134' },
  { net: 'server 3', service: 'Paytm', number: '+91 9XXXX 52061' },
]

function digits() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export default function Landing() {
  const [i, setI] = useState(0)
  const [code, setCode] = useState(digits())

  useEffect(() => {
    const t = setInterval(() => {
      setI((v) => (v + 1) % DEMO.length)
      setCode(digits())
    }, 4200)
    return () => clearInterval(t)
  }, [])

  const demo = DEMO[i]

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <a className="lp-brand" href="/">
            <span className="lp-brand-mark">{'\u2713'}</span>
            xOTP
          </a>
          <nav className="lp-nav-links">
            <a href="#services">Services</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="lp-nav-actions">
            <Link className="lp-signin btn btn-ghost" to="/login">Sign in</Link>
            <Link className="btn btn-accent" to="/register">Get started</Link>
          </div>
        </div>
      </header>

      <div className="lp-wrap">
        <section className="lp-hero">
          <div>
            <span className="lp-eyebrow">{'\u25CF'} live {'\u00B7'} 3 networks</span>
            <h1 className="lp-h1">
              Every OTP,
              <br />
              on the <em>first try.</em>
            </h1>
            <p className="lp-lede">
              Buy virtual numbers and temporary email inboxes, receive the code in seconds, and pay only for delivered
              codes. Unused numbers refund themselves.
            </p>
            <div className="lp-hero-cta">
              <Link className="btn btn-accent btn-lg" to="/register">Get started free</Link>
              <Link className="btn btn-lg" to="/login">Sign in</Link>
            </div>
            <div className="lp-hero-meta">
              <span><span className="lp-tick">{'\u2713'}</span> Instant delivery</span>
              <span><span className="lp-tick">{'\u2713'}</span> Auto refund</span>
              <span><span className="lp-tick">{'\u2713'}</span> Pay per code</span>
            </div>
          </div>

          <div className="lp-visual">
            <div className="lp-otp">
              <div className="lp-otp-head">
                <span className="lp-otp-net">{demo.net}</span>
                <span className="lp-live">live</span>
              </div>
              <div className="lp-otp-number">{demo.number}</div>
              <div className="lp-otp-service">{demo.service} verification</div>
              <div className="lp-otp-code">
                {code.split('').map((d, idx) => (
                  <span className="lp-digit" key={`${code}-${idx}`} style={{ animationDelay: `${idx * 60}ms` }}>
                    {d}
                  </span>
                ))}
              </div>
              <div className="lp-otp-foot">
                <span>Delivered in <strong>4.2s</strong></span>
                <span>{'\u20B9'}6 charged</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="services">
          <div className="lp-section-head">
            <div className="lp-kicker">Services</div>
            <h2 className="lp-h2">Everything you need to get verified</h2>
            <p className="lp-h2-sub">Three number networks plus throwaway inboxes, all from one wallet.</p>
          </div>
          <div className="lp-cards">
            <div className="lp-card">
              <div className="lp-card-icon">{'\uD83D\uDCF1'}</div>
              <h3>Virtual numbers</h3>
              <p>Three independent networks with hundreds of services. Pick one, get a number, read the code.</p>
            </div>
            <div className="lp-card">
              <div className="lp-card-icon">{'\u2709\uFE0F'}</div>
              <h3>Email inboxes</h3>
              <p>Fresh temporary inboxes for email-based verification, delivered instantly to your dashboard.</p>
            </div>
            <div className="lp-card">
              <div className="lp-card-icon">{'\u26A1'}</div>
              <h3>Instant delivery</h3>
              <p>Codes stream in live. Copy with one tap and cancel any unused order for a full refund.</p>
            </div>
          </div>
        </section>

        <section className="lp-section" id="how">
          <div className="lp-section-head">
            <div className="lp-kicker">How it works</div>
            <h2 className="lp-h2">Live in three steps</h2>
          </div>
          <div className="lp-steps">
            <div className="lp-step">
              <h3>Top up</h3>
              <p>Add funds with UPI, Paytm or a manual transfer. Your balance is ready instantly.</p>
            </div>
            <div className="lp-step">
              <h3>Pick a service</h3>
              <p>Choose a number or inbox for the app you want to verify. Pricing is shown upfront.</p>
            </div>
            <div className="lp-step">
              <h3>Read the code</h3>
              <p>Watch the live card and copy your OTP the second it lands. Unused numbers refund.</p>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-strip">
            <div>
              <div className="lp-stat-v">3</div>
              <div className="lp-stat-l">number networks</div>
            </div>
            <div>
              <div className="lp-stat-v">~4s</div>
              <div className="lp-stat-l">to a live code</div>
            </div>
            <div>
              <div className="lp-stat-v">100%</div>
              <div className="lp-stat-l">auto refund</div>
            </div>
            <div>
              <div className="lp-stat-v">24/7</div>
              <div className="lp-stat-l">instant top-ups</div>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-final">
            <h2>Ready when you are</h2>
            <p>Create an account, add funds, and start receiving codes in under a minute.</p>
            <Link className="btn btn-lg lp-btn-invert" to="/register">Create free account</Link>
          </div>
        </section>
      </div>

      <footer className="lp-wrap">
        <div className="lp-footer">
          <span>{'\u00A9'} {new Date().getFullYear()} xOTP {'\u00B7'} {SITE}</span>
          <span className="row" style={{ gap: 'var(--sp-4)' }}>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}