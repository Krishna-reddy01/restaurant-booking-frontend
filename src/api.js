async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body.message) message = body.message
    } catch { /* no JSON body */ }
    throw new Error(message)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const api = {
  menu: () => request('/menu'),
  bookings: () => request('/bookings'),
  orders: () => request('/orders'),
  book: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id) => request(`/bookings/${id}`, { method: 'DELETE' }),
  placeOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  setOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
