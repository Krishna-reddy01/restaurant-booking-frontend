import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

const money = (n) => `$${Number(n).toFixed(2)}`
const NEXT_STATUS = { PLACED: 'PREPARING', PREPARING: 'SERVED' }
const toInput = (iso) => (iso ? iso.slice(0, 16) : '')
const confirmDelete = (what) => window.confirm(`Delete ${what}? This cannot be undone.`)

/** Loads a list and gives back an `act` helper that runs a change, reloads, and reports errors. */
function useList(fetcher) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const reload = useCallback(
    () => fetcher().then((d) => { setItems(d); setError('') }).catch((e) => setError(e.message)),
    [fetcher],
  )
  useEffect(() => { reload() }, [reload])
  const act = async (fn) => {
    try { await fn(); await reload(); return true } catch (e) { setError(e.message); return false }
  }
  return { items, error, setError, act }
}

const ErrorLine = ({ error }) => (error ? <p className="notice error" role="alert">{error}</p> : null)

export default function StaffPage() {
  const [section, setSection] = useState('bookings')
  const sections = [['bookings', 'Bookings'], ['orders', 'Orders'], ['menu', 'Menu items'], ['tables', 'Tables']]
  return (
    <div>
      <div className="subtabs">
        {sections.map(([key, label]) => (
          <button key={key} className={section === key ? 'on' : ''} onClick={() => setSection(key)}>{label}</button>
        ))}
      </div>
      {section === 'bookings' && <BookingsSection />}
      {section === 'orders' && <OrdersSection />}
      {section === 'menu' && <MenuSection />}
      {section === 'tables' && <TablesSection />}
    </div>
  )
}

function BookingsSection() {
  const { items, error, act } = useList(api.bookings)
  const [form, setForm] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    const ok = await act(() => api.updateBooking(form.id, {
      customerName: form.customerName,
      phone: form.phone,
      partySize: Number(form.partySize),
      bookingTime: form.bookingTime,
    }))
    if (ok) setForm(null)
  }

  return (
    <section>
      <h2>Bookings</h2>
      {form && (
        <div className="panel form-panel">
          <h3>Edit booking #{form.id}</h3>
          <div className="grid2">
            <label>Name<input value={form.customerName} onChange={set('customerName')} /></label>
            <label>Phone<input value={form.phone} onChange={set('phone')} /></label>
            <label>Party size<input type="number" min="1" max="20" value={form.partySize} onChange={set('partySize')} /></label>
            <label>Date and time<input type="datetime-local" value={form.bookingTime} onChange={set('bookingTime')} /></label>
          </div>
          <div className="actions">
            <button className="primary" onClick={save}>Save changes</button>
            <button onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
      <ErrorLine error={error} />
      {items.length === 0 && <p className="muted">No bookings yet. Customers create them on the Book a table page.</p>}
      {items.map((b) => (
        <div key={b.id} className={`row ${b.status === 'CANCELLED' ? 'dim' : ''}`}>
          <div>
            <strong>{new Date(b.bookingTime).toLocaleString()}</strong>
            <p>{b.customerName} · {b.partySize} guests · table {b.table.number} · {b.phone}</p>
            <p>{b.status === 'CANCELLED' ? 'Cancelled' : 'Confirmed'}</p>
          </div>
          <div className="actions">
            <button onClick={() => setForm({ id: b.id, customerName: b.customerName, phone: b.phone, partySize: b.partySize, bookingTime: toInput(b.bookingTime) })}>Edit</button>
            {b.status === 'CONFIRMED' && <button onClick={() => act(() => api.cancelBooking(b.id))}>Cancel booking</button>}
            <button onClick={() => confirmDelete(`booking #${b.id}`) && act(() => api.deleteBooking(b.id))}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  )
}

function OrdersSection() {
  const { items, error, setError, act } = useList(api.orders)
  const [form, setForm] = useState(null)

  const edit = (o) => setForm({
    id: o.id,
    tableNumber: o.tableNumber,
    lines: o.lines.map((l) => ({ menuItemId: l.menuItemId, name: l.name, quantity: l.quantity })),
  })
  const setQty = (i, quantity) =>
    setForm({ ...form, lines: form.lines.map((l, idx) => (idx === i ? { ...l, quantity } : l)) })

  const save = async () => {
    const kept = form.lines.filter((l) => Number(l.quantity) > 0)
    if (kept.length === 0) { setError('Keep at least one item, or delete the order instead.'); return }
    const ok = await act(() => api.updateOrder(form.id, {
      tableNumber: Number(form.tableNumber),
      items: kept.map((l) => ({ menuItemId: l.menuItemId, quantity: Number(l.quantity) })),
    }))
    if (ok) setForm(null)
  }

  return (
    <section>
      <h2>Orders</h2>
      {form && (
        <div className="panel form-panel">
          <h3>Edit order #{form.id}</h3>
          <label>Table number
            <input type="number" min="1" value={form.tableNumber} onChange={(e) => setForm({ ...form, tableNumber: e.target.value })} />
          </label>
          {form.lines.map((l, i) => (
            <label key={l.menuItemId}>{l.name} (quantity, 0 removes it)
              <input type="number" min="0" value={l.quantity} onChange={(e) => setQty(i, e.target.value)} />
            </label>
          ))}
          <div className="actions">
            <button className="primary" onClick={save}>Save changes</button>
            <button onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
      <ErrorLine error={error} />
      {items.length === 0 && <p className="muted">No orders yet.</p>}
      {items.map((o) => (
        <div key={o.id} className={`row ${o.status === 'CANCELLED' ? 'dim' : ''}`}>
          <div>
            <strong>Order #{o.id}, table {o.tableNumber}</strong>
            <p>{o.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}</p>
            <p>{money(o.total)} · {o.status.toLowerCase()}</p>
          </div>
          <div className="actions">
            {NEXT_STATUS[o.status] && (
              <button onClick={() => act(() => api.setOrderStatus(o.id, NEXT_STATUS[o.status]))}>
                Mark {NEXT_STATUS[o.status].toLowerCase()}
              </button>
            )}
            {o.status !== 'SERVED' && o.status !== 'CANCELLED' && <button onClick={() => edit(o)}>Edit</button>}
            {(o.status === 'PLACED' || o.status === 'PREPARING') && (
              <button onClick={() => act(() => api.setOrderStatus(o.id, 'CANCELLED'))}>Cancel order</button>
            )}
            <button onClick={() => confirmDelete(`order #${o.id}`) && act(() => api.deleteOrder(o.id))}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  )
}

function MenuSection() {
  const { items, error, act } = useList(api.menu)
  const [form, setForm] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    const body = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: Number(form.price),
    }
    const ok = await act(() => (form.id ? api.updateMenuItem(form.id, body) : api.createMenuItem(body)))
    if (ok) setForm(null)
  }

  return (
    <section>
      <div className="section-head">
        <h2>Menu items</h2>
        <button onClick={() => setForm({ name: '', description: '', category: '', price: '' })}>Add menu item</button>
      </div>
      {form && (
        <div className="panel form-panel">
          <h3>{form.id ? `Edit ${form.name || 'menu item'}` : 'New menu item'}</h3>
          <div className="grid2">
            <label>Name<input value={form.name} onChange={set('name')} /></label>
            <label>Category<input value={form.category} onChange={set('category')} placeholder="Starters, Mains, Desserts, Drinks" /></label>
            <label>Price<input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} /></label>
            <label>Description<input value={form.description || ''} onChange={set('description')} /></label>
          </div>
          <div className="actions">
            <button className="primary" disabled={!form.name || !form.category || form.price === ''} onClick={save}>
              {form.id ? 'Save changes' : 'Add item'}
            </button>
            <button onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
      <ErrorLine error={error} />
      {items.map((m) => (
        <div key={m.id} className="row">
          <div>
            <strong>{m.name}</strong> <span className="muted">· {m.category}</span>
            <p>{m.description} · {money(m.price)}</p>
          </div>
          <div className="actions">
            <button onClick={() => setForm({ ...m })}>Edit</button>
            <button onClick={() => confirmDelete(m.name) && act(() => api.deleteMenuItem(m.id))}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  )
}

function TablesSection() {
  const { items, error, act } = useList(api.tables)
  const [form, setForm] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    const body = { number: Number(form.number), seats: Number(form.seats) }
    const ok = await act(() => (form.id ? api.updateTable(form.id, body) : api.createTable(body)))
    if (ok) setForm(null)
  }

  return (
    <section>
      <div className="section-head">
        <h2>Tables</h2>
        <button onClick={() => setForm({ number: '', seats: '' })}>Add table</button>
      </div>
      {form && (
        <div className="panel form-panel">
          <h3>{form.id ? `Edit table ${form.number}` : 'New table'}</h3>
          <div className="grid2">
            <label>Table number<input type="number" min="1" value={form.number} onChange={set('number')} /></label>
            <label>Seats<input type="number" min="1" max="50" value={form.seats} onChange={set('seats')} /></label>
          </div>
          <div className="actions">
            <button className="primary" disabled={!form.number || !form.seats} onClick={save}>
              {form.id ? 'Save changes' : 'Add table'}
            </button>
            <button onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}
      <ErrorLine error={error} />
      {[...items].sort((a, b) => a.number - b.number).map((t) => (
        <div key={t.id} className="row">
          <div>
            <strong>Table {t.number}</strong>
            <p>Seats {t.seats}</p>
          </div>
          <div className="actions">
            <button onClick={() => setForm({ ...t })}>Edit</button>
            <button onClick={() => confirmDelete(`table ${t.number}`) && act(() => api.deleteTable(t.id))}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  )
}
