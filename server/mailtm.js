import { randomBytes } from 'node:crypto'
import { config } from './config.js'

const NAMES = [
  'rahul', 'rohit', 'raj', 'ravi', 'ram', 'amit', 'arjun', 'akash', 'ankit', 'aditya', 'ajay', 'amar',
  'anil', 'ashish', 'avinash', 'abhay', 'chetan', 'deepak', 'dhruv', 'gaurav', 'gopal', 'harish',
  'harsh', 'hemant', 'imran', 'jatin', 'karan', 'kiran', 'kunal', 'mohit', 'mahesh', 'manish',
  'manoj', 'mukesh', 'naveen', 'nikhil', 'nilesh', 'pankaj', 'pranav', 'prashant', 'rajesh',
  'rahim', 'sachin', 'sanjay', 'shubham', 'siddharth', 'sohan', 'suraj', 'tarun', 'uday',
  'vikas', 'vipul', 'vishal', 'yogesh', 'sameer', 'santosh', 'sunil', 'varun', 'vinay', 'vivek',
  'priya', 'pooja', 'neha', 'nisha', 'nidhi', 'kavya', 'kajal', 'isha', 'divya', 'deepika',
  'sonal', 'shreya', 'sharma', 'seema', 'rita', 'radha', 'payal', 'parul', 'monika', 'meena',
  'mamta', 'komal', 'kirti', 'geeta', 'anjali', 'anita', 'ananya', 'aarti', 'bhavna', 'chandni',
]

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(config.mailtm.base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(json?.['hydra:description'] || json?.message || `Mail provider error (${res.status})`)
  }
  return json
}

export async function createMailbox() {
  const domains = await req('/domains?page=1')
  const list = domains?.['hydra:member'] || []
  const domain = list.find((d) => d.isActive && !d.isPrivate)?.domain || list[0]?.domain
  if (!domain) throw new Error('No mail domain available right now. Please try again.')
  const password = 'Xotp@' + randomBytes(6).toString('hex')
  let address = null
  for (let i = 0; i < 8; i++) {
    const name = NAMES[Math.floor(Math.random() * NAMES.length)]
    const digits = String(Math.floor(100 + Math.random() * 900))
    const candidate = `${name}${digits}@${domain}`
    try {
      await req('/accounts', { method: 'POST', body: { address: candidate, password } })
      address = candidate
      break
    } catch {
      /* name taken (or transient) — pick another */
    }
  }
  if (!address) throw new Error('Could not create mailbox. Please try again.')
  const tok = await req('/token', { method: 'POST', body: { address, password } })
  if (!tok?.token) throw new Error('Could not create mailbox. Please try again.')
  return { address, token: tok.token }
}

export async function latestCode(token) {
  const list = await req('/messages?page=1', { token })
  const items = list?.['hydra:member'] || []
  if (!items.length) return null
  const msg = await req('/messages/' + items[0].id, { token })
  const blob = [msg?.subject, msg?.intro, msg?.text].filter(Boolean).join(' \n ')
  return extractOtp(blob)
}

export function extractOtp(text) {
  if (!text) return null
  const s = String(text)
  const m = s.match(/\b(\d{6})\b/) || s.match(/\b(\d{4,6})\b/)
  return m ? m[1] : null
}
