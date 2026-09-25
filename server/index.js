import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import {
  config,
  SERVER1_SERVICES,
  SERVER2_SERVICES,
  SERVER3_SERVICES,
  SERVER4_SERVICES,
  EMAIL_SERVICES,
  GRIZZLY_COUNTRY,
  SMSBOWER_COUNTRY,
} from './config.js'
import * as durian from './durianrcs.js'
import * as grizzly from './grizzly.js'
import * as phantom from './phantomunion.js'
import * as smsbower from './smsbower.js'
import * as mailtm from './mailtm.js'

const ARRIVE = 9000
const EXPIRY = 5 * 60 * 1000
const CANCEL_RETRY_MS = 150000
const rand = (n) => randomBytes(n).toString('hex').slice(0, n)
const randNum = (n) => String(Math.floor(10 ** (n - 1) + Math.random() * 9 * 10 ** (n - 1)))

function send(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(body)
}
const ok = (res, obj) => send(res, 200, obj)
const bad = (res, message, details) => send(res, 400, { message, details })
const denied = (res, message, code = 403) => send(res, code, { message })

const DB = { users: new Map(), tokens: new Map(), orders: new Map(), tx: [], recharges: [], payments: new Map() }
const pendingCancel = []
let SEQ = 1000

// persistent set of phone numbers already used for rail services (skip-on-reuse)
const DATA_DIR = path.join(config.root, 'server', 'data')
const USED_FILE = path.join(DATA_DIR, 'used-numbers.json')
let usedNumbers = new Set()
function loadUsed() {
  try {
    usedNumbers = new Set(JSON.parse(fs.readFileSync(USED_FILE, 'utf8')))
  } catch {
    usedNumbers = new Set()
  }
}
function saveUsed() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(USED_FILE, JSON.stringify([...usedNumbers]))
  } catch {
    /* ignore */
  }
}
const normPhone = (p) => String(p).replace(/\D/g, '')
function markUsed(p) {
  usedNumbers.add(normPhone(p))
  saveUsed()
}
function unmarkUsed(p) {
  if (usedNumbers.delete(normPhone(p))) saveUsed()
}
loadUsed()

DB.users.set('suraj136', {
  username: 'suraj136',
  email: 'suraj136@demo.com',
  password: 'Rr@123456',
  beta: 250,
  emailVerified: true,
  createdAt: Date.now() - 30 * 86400000,
})

const pub = (u) => ({ username: u.username, email: u.email, role: 'user', balance: u.beta, createdAt: u.createdAt })

function findUser(id) {
  for (const u of DB.users.values()) if (u.username === id || u.email === id) return u
  return null
}
function tokenFor(username) {
  const t = 'tok_' + rand(24)
  DB.tokens.set(t, username)
  return t
}
function authUser(req) {
  const h = req.headers['authorization'] || ''
  return DB.users.get(DB.tokens.get(h.replace(/^Bearer\s+/i, '')))
}
function log(user, type, description, amount) {
  user.beta = Math.round((user.beta + amount) * 100) / 100
  DB.tx.unshift({ user: user.username, type, description, amount, balance_after: user.beta, created_at: new Date().toISOString() })
  if (DB.tx.length > 200) DB.tx.length = 200
}
function refund(order, reason) {
  if (order.status !== 'waiting') return
  order.status = 'expired'
  const u = DB.users.get(order.user)
  if (u) log(u, 'credit', `Refund \u00B7 ${order.serviceName} ${reason}`, order.cost)
}

// live providers: server1 -> durianrcs, server2 -> GrizzlySMS, server3 -> PhantomUnion, server4 -> SMSBower
const LIVE = {
  server1: { provider: 'durian', services: SERVER1_SERVICES },
  server2: { provider: 'grizzly', services: SERVER2_SERVICES },
  server3: { provider: 'phantom', services: SERVER3_SERVICES },
  server4: { provider: 'smsbower', services: SERVER4_SERVICES },
  email: { provider: 'email', services: EMAIL_SERVICES },
}
const SERVER_LABEL = { server1: 'Server 1', server2: 'Server 2', server3: 'Server 3', server4: 'Server 4', email: 'Email' }
function catalogFor(serverId) {
  if (!LIVE[serverId]) return []
  return LIVE[serverId].services.map(({ pid, code, businessCode, mail, service, domain, skipUsed, ...s }) => ({ ...s, skip: !!skipUsed }))
}

function mockAdvance(o) {
  if (LIVE[o.serverId] || o.status !== 'waiting') return o
  const el = Date.now() - o.createdAt
  if (el >= ARRIVE) {
    o.status = 'received'
    o.otpCode = randNum(6)
  } else if (el >= EXPIRY) {
    refund(o, 'expired unused')
  }
  return o
}

const orderJSON = (o) => {
  mockAdvance(o)
  return {
    id: o.publicId,
    server: o.serverId,
    source: SERVER_LABEL[o.serverId],
    service_name: o.serviceName,
    icon: o.icon,
    target: o.target,
    expires_at: new Date(o.createdAt + EXPIRY).toISOString(),
    cost: o.cost,
    status: o.status,
    otp_code: o.otpCode,
    sms_code: o.smsCode,
    created_at: new Date(o.createdAt).toISOString(),
  }
}

const findOrder = (user, publicId) => [...DB.orders.values()].find((x) => x.publicId === publicId && x.user === user.username)

function queueCancel(o) {
  pendingCancel.push({
    provider: LIVE[o.serverId]?.provider,
    target: o.target,
    pid: o.pid,
    activationId: o.activationId,
    at: Date.now() + CANCEL_RETRY_MS,
  })
}

async function fetchLiveNumber(live, svc) {
  if (live.provider === 'durian') {
    let r
    try {
      r = await durian.getMobile(svc.pid, 1)
    } catch {
      throw new Error('Provider is unreachable. Please try again.')
    }
    if (r.code !== 200) throw new Error(durian.durianError(r))
    return { target: r.data, pid: svc.pid, activationId: null }
  }
  if (live.provider === 'phantom') {
    let n
    try {
      n = await phantom.fetchNumber(svc.businessCode)
    } catch (e) {
      throw new Error(e.message || 'Provider is unreachable. Please try again.')
    }
    const phone = String(n.phone)
    return { target: phone.startsWith('+') ? phone : '+' + phone, pid: null, activationId: n.serial, token: n.token }
  }
  const client = live.provider === 'smsbower' ? smsbower : grizzly
  const country = live.provider === 'smsbower' ? SMSBOWER_COUNTRY : GRIZZLY_COUNTRY
  let r
  try {
    r = await client.getNumber(svc.code, country)
  } catch {
    throw new Error('Provider is unreachable. Please try again.')
  }
  const parsed = client.parseNumber(r)
  if (!parsed) throw new Error(live.provider === 'smsbower' ? smsbower.smsbowerError(r) : grizzly.grizzlyError(r))
  return { target: '+' + parsed.phone, pid: null, activationId: parsed.activationId, token: null }
}

async function releaseLive(live, n) {
  if (live.provider === 'durian') await durian.passMobile(n.target, n.pid).catch(() => {})
  else if (live.provider === 'grizzly') await grizzly.setStatus(n.activationId, 8).catch(() => {})
  else if (live.provider === 'smsbower') await smsbower.setStatus(n.activationId, 8).catch(() => {})
  // phantom: charged only on a successful code, number auto-releases after effectiveTime
}

async function blacklistLive(live, n) {
  // durianrcs supports addBlack; sms-activate providers (Grizzly/SMSBower) and PhantomUnion do not
  if (live.provider === 'durian') await durian.addBlack(n.target, n.pid).catch(() => {})
}

async function acquireEmail(svc) {
  if (svc.mail === 'smsbower') {
    const r = await smsbower.mailActivate(svc.service || 'swl', svc.domain || 'gmail.com', 0).catch(() => null)
    if (!r || r.status !== 1 || !r.mail) throw new Error(r?.error || 'Could not create mailbox. Please try again.')
    return { target: r.mail, mailProvider: 'smsbower', mailId: r.mailId }
  }
  const m = await mailtm.createMailbox()
  return { target: m.address, mailProvider: 'mailtm', mailToken: m.token }
}

async function buyLive(user, serverId, catalogId, live, opts) {
  const svc = live.services.find((s) => s.id === catalogId)
  if (!svc) throw new Error('Service not found')
  const cost = svc.price
  if (user.beta < cost) throw new Error('Insufficient balance. Please add funds first.')

  let picked
  if (live.provider === 'email') {
    picked = await acquireEmail(svc)
  } else {
    const wantSkip = !!opts?.irctcCheck && svc.skipUsed
    picked = null
    for (let attempt = 0; attempt < 6; attempt++) {
      const n = await fetchLiveNumber(live, svc)
      if (wantSkip && usedNumbers.has(normPhone(n.target))) {
        await releaseLive(live, n)
        await blacklistLive(live, n)
        continue
      }
      picked = n
      break
    }
    if (!picked) throw new Error('No fresh numbers available right now. Please try again.')
    markUsed(picked.target)
  }

  const o = {
    id: ++SEQ,
    publicId: String(SEQ),
    user: user.username,
    serverId,
    catalogId,
    serviceName: svc.name,
    icon: svc.icon,
    pid: picked.pid ?? null,
    activationId: picked.activationId ?? null,
    token: picked.token ?? null,
    mailProvider: picked.mailProvider ?? null,
    mailId: picked.mailId ?? null,
    mailToken: picked.mailToken ?? null,
    target: picked.target,
    cost,
    status: 'waiting',
    otpCode: null,
    smsCode: null,
    createdAt: Date.now(),
  }
  log(user, 'debit', `Bought ${svc.name} \u00B7 ${SERVER_LABEL[serverId]}`, -cost)
  DB.orders.set(o.id, o)
  return o
}

async function buy(user, serverId, catalogId, opts) {
  const live = LIVE[serverId]
  if (!live) throw new Error('Service not found')
  return buyLive(user, serverId, catalogId, live, opts)
}

async function readEmailCode(o) {
  if (o.mailProvider === 'smsbower') {
    const r = await smsbower.mailGetCode(o.mailId)
    if (r?.status === 1 && r.code) return String(r.code)
    return null
  }
  return mailtm.latestCode(o.mailToken)
}

async function orderStatus(user, o) {
  if (o.status !== 'waiting') return orderJSON(o)
  const live = LIVE[o.serverId]
  if (!live) return orderJSON(o)
  try {
    if (live.provider === 'durian') {
      const r = await durian.getMsg(o.target, o.pid)
      if (r.code === 200 && r.data) {
        o.status = 'received'
        o.otpCode = durian.extractOtp(r.data)
        o.smsCode = String(r.data).slice(0, 200)
        await blacklistLive(live, o)
      } else if (Date.now() - o.createdAt >= EXPIRY) {
        await durian.passMobile(o.target, o.pid).catch(() => {})
        unmarkUsed(o.target)
        refund(o, 'expired unused')
      }
    } else if (live.provider === 'phantom') {
      const r = await phantom.sweetWrapper(o.token, o.activationId)
      const list = r?.data?.verificationCode
      const vc = Array.isArray(list) && list.length > 0 ? String(list[0].vc || '') : ''
      const otp = vc ? phantom.extractOtp(vc) : null
      if (String(r?.code) === '200' && otp) {
        o.status = 'received'
        o.otpCode = otp
        o.smsCode = vc.slice(0, 200)
      } else if (Date.now() - o.createdAt >= EXPIRY) {
        unmarkUsed(o.target)
        refund(o, 'expired unused')
      }
    } else if (live.provider === 'email') {
      const code = await readEmailCode(o)
      if (code) {
        o.status = 'received'
        o.otpCode = code
      } else if (Date.now() - o.createdAt >= EXPIRY) {
        refund(o, 'expired unused')
      }
    } else {
      const client = live.provider === 'smsbower' ? smsbower : grizzly
      const s = await client.getStatus(o.activationId)
      if (s.startsWith('STATUS_OK')) {
        o.status = 'received'
        o.otpCode = s.split(':')[1] || null
        client.setStatus(o.activationId, 6).catch(() => {})
      } else if (s === 'STATUS_CANCEL') {
        unmarkUsed(o.target)
        refund(o, 'cancelled by provider')
      } else if (Date.now() - o.createdAt >= EXPIRY) {
        unmarkUsed(o.target)
        refund(o, 'expired unused')
        queueCancel(o)
      }
    }
  } catch {
    /* keep waiting */
  }
  return orderJSON(o)
}

async function cancel(user, o) {
  if (o.status !== 'waiting') return
  const live = LIVE[o.serverId]
  if (live) {
    if (live.provider === 'durian') {
      await durian.passMobile(o.target, o.pid).catch(() => {})
    } else if (live.provider === 'grizzly' || live.provider === 'smsbower') {
      const client = live.provider === 'smsbower' ? smsbower : grizzly
      const s = await client.setStatus(o.activationId, 8).catch(() => '')
      if (s === 'EARLY_CANCEL_DENIED') queueCancel(o)
    }
    // phantom: charged only on a successful code, nothing to release
  }
  unmarkUsed(o.target)
  o.status = 'refunded'
  log(user, 'credit', `Refund \u00B7 ${o.serviceName}`, o.cost)
}

async function body(req) {
  let d = ''
  for await (const c of req) d += c
  return d ? JSON.parse(d) : {}
}

async function api(req, res, path_, q, b) {
  const method = req.method

  if (path_ === '/api/auth/config' && method === 'GET') return ok(res, { turnstile: { enabled: false, siteKey: '0x4AAAAAAENCOhQzoHluhk3v' } })
  if (path_ === '/api/auth/notice' && method === 'GET') return ok(res, { title: '\uD83D\uDCCC Important notice', body: 'Any Issue? DM on Telegram @X_S_Support.' })

  if (path_ === '/api/auth/login' && method === 'POST') {
    const u = findUser(String(b.identifier || ''))
    if (!u || u.password !== String(b.password || '')) return bad(res, 'Invalid username or password.')
    if (!u.emailVerified) return denied(res, 'Please verify your email before signing in.')
    return ok(res, { token: tokenFor(u.username), user: pub(u) })
  }
  if (path_ === '/api/auth/logout' && method === 'POST') {
    DB.tokens.delete((req.headers['authorization'] || '').replace(/^Bearer\s+/i, ''))
    return ok(res, { message: 'Signed out.' })
  }
  if (path_ === '/api/auth/me' && method === 'GET') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    return ok(res, { user: pub(u) })
  }
  if (path_ === '/api/auth/send-signup-otp' && method === 'POST') return ok(res, { otpDisabled: true, emailToken: 'et_' + rand(20) })
  if (path_ === '/api/auth/verify-signup-otp' && method === 'POST') {
    if (!/^\d{6}$/.test(String(b.otp || ''))) return bad(res, 'Invalid code.')
    return ok(res, { emailToken: 'et_' + rand(20) })
  }
  if (path_ === '/api/auth/register' && method === 'POST') {
    const username = String(b.username || '').trim()
    const email = String(b.email || '').trim()
    const password = String(b.password || '')
    if (username.length < 3 || username.length > 50) return bad(res, 'Username must be 3\u201350 characters.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, 'Enter a valid email.')
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return bad(res, 'Password must be 8+ characters with letters and numbers.')
    if (DB.users.has(username)) return bad(res, 'Username is already taken.')
    if (findUser(email)) return bad(res, 'Email is already registered.')
    const u = { username, email, password, beta: 0, emailVerified: true, createdAt: Date.now() }
    DB.users.set(username, u)
    return ok(res, { token: tokenFor(username), user: pub(u) })
  }
  if (path_ === '/api/auth/verify-email' && method === 'POST') {
    const u = findUser(String(b.email || ''))
    if (!u || !/^\d{6}$/.test(String(b.otp || ''))) return bad(res, 'Invalid code.')
    u.emailVerified = true
    return ok(res, { token: tokenFor(u.username), user: pub(u) })
  }
  if (path_ === '/api/auth/resend-otp' && method === 'POST') return ok(res, { message: 'Code resent.' })
  if (path_ === '/api/auth/forgot-password' && method === 'POST') return ok(res, { message: 'Reset code emailed.' })
  if (path_ === '/api/auth/reset-password' && method === 'POST') {
    const u = findUser(String(b.email || ''))
    if (!u || !/^\d{6}$/.test(String(b.otp || ''))) return bad(res, 'Invalid code.')
    if (String(b.password || '').length < 8) return bad(res, 'Password must be 8+ characters.')
    u.password = String(b.password)
    return ok(res, { message: 'Password updated.' })
  }
  if (path_ === '/api/auth/change-password' && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    if (u.password !== String(b.currentPassword || '')) return bad(res, 'Current password is incorrect.')
    if (String(b.newPassword || '').length < 8) return bad(res, 'New password must be 8+ characters.')
    u.password = String(b.newPassword)
    return ok(res, { token: tokenFor(u.username) })
  }

  const cat = path_.match(/^\/api\/catalog\/(server1|server2|server3|server4|email)$/)
  if (cat && method === 'GET') {
    if (!authUser(req)) return denied(res, 'Unauthorized', 401)
    return ok(res, { services: catalogFor(cat[1]) })
  }

  const buyM = path_.match(/^\/api\/orders\/(server1|server2|server3|server4|email)\/buy$/)
  if (buyM && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    try {
      const o = await buy(u, buyM[1], String(b.catalogId || ''), { irctcCheck: b.irctcCheck })
      const base = { orderId: o.publicId, balance: u.beta }
      return ok(res, o.serverId === 'email' ? { ...base, email: o.target } : { ...base, phoneNumber: o.target })
    } catch (e) {
      return bad(res, e.message)
    }
  }

  const stM = path_.match(/^\/api\/orders\/(server1|server2|server3|server4|email)\/(\w+)\/status$/)
  if (stM && method === 'GET') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const o = findOrder(u, stM[2])
    if (!o) return denied(res, 'Order not found', 404)
    const j = await orderStatus(u, o)
    return ok(res, { otpCode: j.otp_code, smsCode: j.sms_code, status: j.status, expires_at: j.expires_at })
  }

  const cnM = path_.match(/^\/api\/orders\/(server1|server2|server3|server4|email)\/(\w+)\/cancel$/)
  if (cnM && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const o = findOrder(u, cnM[2])
    if (!o) return denied(res, 'Order not found', 404)
    await cancel(u, o)
    return ok(res, { message: 'Cancelled and refunded.' })
  }

  if (path_ === '/api/orders/active' && method === 'GET') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const list = [...DB.orders.values()]
      .filter((x) => x.user === u.username && (x.status === 'waiting' || x.status === 'received'))
      .sort((a, b2) => b2.createdAt - a.createdAt)
      .map(orderJSON)
    return ok(res, { orders: list })
  }
  if (path_ === '/api/orders' && method === 'GET') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const list = [...DB.orders.values()]
      .filter((x) => x.user === u.username)
      .sort((a, b2) => b2.createdAt - a.createdAt)
      .map(orderJSON)
    return ok(res, { orders: list })
  }

  if (path_ === '/api/wallet' && method === 'GET') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const mine = DB.tx.filter((t) => t.user === u.username)
    return ok(res, {
      balance: u.beta,
      totalCredited: mine.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      spent: mine.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0),
      transactions: mine.slice(0, 50),
    })
  }
  if (path_ === '/api/payments/history' && method === 'GET') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    return ok(res, { recharges: DB.recharges.filter((r) => r.user === u.username) })
  }
  if (path_ === '/api/payments/config' && method === 'GET') {
    if (!authUser(req)) return denied(res, 'Unauthorized', 401)
    return ok(res, { paytm: { enabled: true }, bharatpe: { enabled: true }, manual: { enabled: true }, presets: [100, 200, 500, 1000], min: 50, upiId: 'xotp@upi' })
  }
  if (path_ === '/api/payments/paytm/initiate' && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const amt = Number(b.amount || 0)
    if (amt < 1) return bad(res, 'Invalid amount.')
    const id = 'PT' + randNum(6)
    DB.payments.set(id, { user: u.username, amount: amt })
    return ok(res, { orderId: id })
  }
  if (path_ === '/api/payments/paytm/verify' && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const p = DB.payments.get(String(b.orderId || ''))
    const amt = p && p.user === u.username ? p.amount : 0
    DB.payments.delete(String(b.orderId || ''))
    log(u, 'credit', 'Recharge via Paytm/UPI', amt)
    DB.recharges.unshift({ user: u.username, method: 'paytm', order_id: String(b.orderId), amount: amt, status: 'SUCCESS', created_at: new Date().toISOString() })
    return ok(res, { status: 'SUCCESS', message: 'Payment successful.', balance: u.beta })
  }
  if (path_ === '/api/payments/bharatpe/initiate' && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const amt = Number(b.amount || 0)
    if (amt < 1) return bad(res, 'Invalid amount.')
    const id = 'BP' + randNum(6)
    const ref = 'REF' + randNum(8)
    DB.payments.set(id, { user: u.username, amount: amt })
    return ok(res, { paymentId: id, upiId: 'xotp@upi', amount: amt, ref, note: 'xOTP-' + ref })
  }
  if (path_ === '/api/payments/bharatpe/submit-utr' && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const p = DB.payments.get(String(b.paymentId || ''))
    if (!p || p.user !== u.username) return bad(res, 'Payment not found.')
    if (String(b.utr || '').length < 6) return bad(res, 'UTR must be at least 6 characters.')
    DB.payments.delete(String(b.paymentId || ''))
    log(u, 'credit', 'Recharge via BharatPe UPI', p.amount)
    DB.recharges.unshift({ user: u.username, method: 'bharatpe', order_id: String(b.paymentId), amount: p.amount, status: 'SUCCESS', created_at: new Date().toISOString() })
    return ok(res, { message: 'UTR verified \u2014 balance added.', balance: u.beta })
  }
  if (path_ === '/api/wallet/recharge/manual' && method === 'POST') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const amt = Number(b.amount || 0)
    if (amt < 1) return bad(res, 'Invalid amount.')
    const id = 'M' + randNum(6)
    DB.recharges.unshift({ user: u.username, method: 'manual', order_id: id, amount: amt, status: 'PENDING', created_at: new Date().toISOString() })
    return ok(res, { orderId: id, whatsappUrl: `https://wa.me/?text=${encodeURIComponent('Recharge request ' + id + ' of Rs ' + amt)}`, telegramUrl: 'https://t.me/X_S_Support' })
  }

  if (path_ === '/api/profile' && method === 'PATCH') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const email = String(b.email || '').trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, 'Enter a valid email.')
    u.email = email
    u.emailVerified = false
    return ok(res, { email: u.email })
  }
  if (path_ === '/api/auth/change-verify-email' && method === 'POST') {
    const u = findUser(String(b.identifier || ''))
    if (!u || u.password !== String(b.password || '')) return bad(res, 'Invalid username or password.')
    if (!/^\S+@\S+\.\S+$/.test(String(b.newEmail || ''))) return bad(res, 'Enter a valid email.')
    return ok(res, { email: b.newEmail })
  }

  if (path_ === '/api/dashboard' && method === 'GET') {
    const u = authUser(req)
    if (!u) return denied(res, 'Unauthorized', 401)
    const mine = [...DB.orders.values()].filter((x) => x.user === u.username)
    const news = [
      { id: 1, type: 'info', title: 'Welcome to xOTP', body: 'Top up your wallet and pick a service to start receiving OTPs.' },
      { id: 2, type: 'success', title: 'Servers 1\u20134 are live', body: 'Rail services are delivered from real networks (durianrcs, GrizzlySMS, PhantomUnion & SMSBower).' },
      { id: 3, type: 'success', title: 'Email is live', body: 'Gmail (SMSBower) and Temp Mail (mail.tm) deliver real inbox codes.' },
    ]
    return ok(res, {
      balance: u.beta,
      telegramUrl: 'https://t.me/X_S_Support',
      news,
      recentTransactions: DB.tx.filter((t) => t.user === u.username).slice(0, 6),
      stats: {
        totalOrders: mine.length,
        activeOrders: mine.filter((x) => x.status === 'waiting' || x.status === 'received').length,
        totalSpent: mine.reduce((s, x) => s + (x.status === 'refunded' ? 0 : x.cost), 0),
      },
    })
  }

  return send(res, 404, { message: 'Not found' })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

function serveStatic(req, res, pathname) {
  const dist = path.join(config.root, 'dist')
  let file = path.join(dist, pathname === '/' ? 'index.html' : pathname)
  if (!file.startsWith(dist)) return send(res, 403, { message: 'Forbidden' })
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html')
  if (!fs.existsSync(file)) return send(res, 404, { message: 'Not found. Run: npm run build' })
  const ext = path.extname(file)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost')
  if (!u.pathname.startsWith('/api')) return serveStatic(req, res, u.pathname)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' })
    return res.end()
  }
  body(req)
    .then((b) => api(req, res, u.pathname, u.searchParams, b))
    .catch((e) => send(res, 400, { message: e.message || 'Bad request' }))
})

// release + refund expired live numbers so provider credits are not wasted
setInterval(async () => {
  for (const o of DB.orders.values()) {
    const live = LIVE[o.serverId]
    if (!live || o.status !== 'waiting' || Date.now() - o.createdAt < EXPIRY) continue
    if (live.provider === 'durian') {
      await durian.passMobile(o.target, o.pid).catch(() => {})
      unmarkUsed(o.target)
      refund(o, 'expired unused')
    } else if (live.provider === 'phantom' || live.provider === 'email') {
      unmarkUsed(o.target)
      refund(o, 'expired unused')
    } else {
      unmarkUsed(o.target)
      refund(o, 'expired unused')
      queueCancel(o)
    }
  }
  for (let i = pendingCancel.length - 1; i >= 0; i--) {
    const c = pendingCancel[i]
    if (Date.now() < c.at) continue
    try {
      if (c.provider === 'durian') await durian.passMobile(c.target, c.pid)
      else if (c.provider === 'grizzly') await grizzly.setStatus(c.activationId, 8)
      else if (c.provider === 'smsbower') await smsbower.setStatus(c.activationId, 8)
    } catch {
      /* ignore */
    }
    pendingCancel.splice(i, 1)
  }
}, 30000)

server.listen(config.port, () => {
  console.log(`xOTP API server on http://localhost:${config.port}`)
  console.log(`  server1 -> ${config.durian.base} (${config.durian.name || 'no user'})`)
  console.log(`  server2 -> ${config.grizzly.base} (GrizzlySMS)`)
  console.log(`  server3 -> ${config.phantom.base} (PhantomUnion)`)
  console.log(`  server4 -> ${config.smsbower.base} (SMSBower)`)
  console.log(`  email   -> ${config.smsbower.base.replace(/\/stubs\/handler_api\.php.*$/, '/api/mail')} + ${config.mailtm.base} (SMSBower mail + mail.tm)`)
})
