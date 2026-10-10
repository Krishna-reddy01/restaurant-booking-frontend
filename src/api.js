let token = localStorage.getItem('token')
let onUnauthorized = () => {}

export const getToken = () => token
export const setToken = (t) => {
  token = t
  if (t) localStorage.setItem('token', t)
  else localStorage.removeItem('token')
}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { ...options, headers })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body.message) message = body.message
    } catch { /* no JSON body */ }
    if (res.status === 401 && token) onUnauthorized()
    throw new Error(message)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const send = (method, path, body) =>
  request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  // auth
  login: (username, password) => send('POST', '/auth/login', { username, password }),
  register: (data) => send('POST', '/auth/register', data),
  me: () => request('/auth/me'),
  logout: () => send('POST', '/auth/logout'),
  // menu
  menu: () => request('/menu'),
  createMenuItem: (data) => send('POST', '/menu', data),
  updateMenuItem: (id, data) => send('PUT', `/menu/${id}`, data),
  deleteMenuItem: (id) => send('DELETE', `/menu/${id}`),
  // tables
  tables: () => request('/tables'),
  createTable: (data) => send('POST', '/tables', data),
  updateTable: (id, data) => send('PUT', `/tables/${id}`, data),
  deleteTable: (id) => send('DELETE', `/tables/${id}`),
  // bookings
  bookings: () => request('/bookings'),
  book: (data) => send('POST', '/bookings', data),
  updateBooking: (id, data) => send('PUT', `/bookings/${id}`, data),
  cancelBooking: (id) => send('PATCH', `/bookings/${id}/cancel`),
  deleteBooking: (id) => send('DELETE', `/bookings/${id}`),
  // orders
  orders: () => request('/orders'),
  placeOrder: (data) => send('POST', '/orders', data),
  updateOrder: (id, data) => send('PUT', `/orders/${id}`, data),
  setOrderStatus: (id, status) => send('PATCH', `/orders/${id}/status`, { status }),
  deleteOrder: (id) => send('DELETE', `/orders/${id}`),
}
