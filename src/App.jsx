import { useEffect, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api'
import Login from './Login'
import StaffPage from './Staff'

const money = (n) => `$${Number(n).toFixed(2)}`

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(!!getToken())
  const [tab, setTab] = useState('order')

  useEffect(() => {
    setUnauthorizedHandler(() => { setToken(null); setUser(null) })
    if (getToken()) {
      api.me().then(setUser).catch(() => setToken(null)).finally(() => setChecking(false))
    }
  }, [])

  const handleLogin = (res) => { setToken(res.token); setUser(res); setTab('order') }
  const logout = () => {
    api.logout().catch(() => {})
    setToken(null)
    setUser(null)
  }

  if (checking) return <p className="muted center">Loading…</p>
  if (!user) return <Login onLogin={handleLogin} />

  const isStaff = user.role === 'STAFF'
  return (
    <>
      <header className="top">
        <h1>Table &amp; Plate</h1>
        <nav>
          <button className={tab === 'order' ? 'on' : ''} onClick={() => setTab('order')}>Menu &amp; order</button>
          <button className={tab === 'book' ? 'on' : ''} onClick={() => setTab('book')}>Book a table</button>
          {isStaff && (
            <button className={tab === 'staff' ? 'on' : ''} onClick={() => setTab('staff')}>Staff</button>
          )}
        </nav>
        <div className="who">
          <span>{user.fullName}{isStaff ? ' (staff)' : ''}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        {tab === 'order' && <OrderPage />}
        {tab === 'book' && <BookPage user={user} />}
        {tab === 'staff' && isStaff && <StaffPage />}
      </main>
    </>
  )
}

function Notice({ notice }) {
  if (!notice) return null
  return <p className={`notice ${notice.type}`} role="status">{notice.text}</p>
}

function OrderPage() {
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState({})
  const [tableNumber, setTableNumber] = useState('')
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    api.menu().then(setMenu).catch((e) => setNotice({ type: 'error', text: e.message }))
  }, [])

  const categories = [...new Set(menu.map((m) => m.category))]
  const lines = menu.filter((m) => cart[m.id])
  const total = lines.reduce((sum, m) => sum + m.price * cart[m.id], 0)

  const change = (id, delta) =>
    setCart((c) => {
      const qty = (c[id] || 0) + delta
      const next = { ...c }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })

  async function place() {
    try {
      const order = await api.placeOrder({
        tableNumber: Number(tableNumber),
        items: lines.map((m) => ({ menuItemId: m.id, quantity: cart[m.id] })),
      })
      setCart({})
      setNotice({ type: 'ok', text: `Order #${order.id} sent to the kitchen for table ${order.tableNumber}.` })
    } catch (e) {
      setNotice({ type: 'error', text: e.message })
    }
  }

  return (
    <div className="split">
      <section>
        {categories.map((cat) => (
          <div key={cat} className="category">
            <h2>{cat}</h2>
            {menu.filter((m) => m.category === cat).map((m) => (
              <div key={m.id} className="dish">
                <div>
                  <strong>{m.name}</strong>
                  <p>{m.description}</p>
                </div>
                <span className="price">{money(m.price)}</span>
                <button onClick={() => change(m.id, 1)}>Add</button>
              </div>
            ))}
          </div>
        ))}
      </section>
      <aside className="panel">
        <h2>Your order</h2>
        {lines.length === 0 && <p className="muted">Add dishes from the menu to start an order.</p>}
        {lines.map((m) => (
          <div key={m.id} className="cart-line">
            <span>{m.name}</span>
            <span className="qty">
              <button aria-label={`Remove one ${m.name}`} onClick={() => change(m.id, -1)}>−</button>
              {cart[m.id]}
              <button aria-label={`Add one ${m.name}`} onClick={() => change(m.id, 1)}>+</button>
            </span>
            <span>{money(m.price * cart[m.id])}</span>
          </div>
        ))}
        {lines.length > 0 && <p className="total">Total {money(total)}</p>}
        <label>
          Table number
          <input type="number" min="1" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
        </label>
        <button className="primary" disabled={!lines.length || !tableNumber} onClick={place}>Place order</button>
        <Notice notice={notice} />
      </aside>
    </div>
  )
}

function BookPage({ user }) {
  const [form, setForm] = useState({ customerName: user.fullName || '', phone: '', partySize: 2, bookingTime: '' })
  const [notice, setNotice] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit() {
    try {
      const b = await api.book({ ...form, partySize: Number(form.partySize) })
      setNotice({
        type: 'ok',
        text: `Booked: table ${b.table.number} (seats ${b.table.seats}) for ${b.customerName} on ${new Date(b.bookingTime).toLocaleString()}.`,
      })
    } catch (e) {
      setNotice({ type: 'error', text: e.message })
    }
  }

  const ready = form.customerName && form.phone && form.bookingTime
  return (
    <div className="panel narrow">
      <h2>Book a table</h2>
      <label>Name<input value={form.customerName} onChange={set('customerName')} /></label>
      <label>Phone<input value={form.phone} onChange={set('phone')} /></label>
      <label>Party size<input type="number" min="1" max="20" value={form.partySize} onChange={set('partySize')} /></label>
      <label>Date and time<input type="datetime-local" value={form.bookingTime} onChange={set('bookingTime')} /></label>
      <button className="primary" disabled={!ready} onClick={submit}>Confirm booking</button>
      <p className="muted">Each booking holds a table for two hours.</p>
      <Notice notice={notice} />
    </div>
  )
}
