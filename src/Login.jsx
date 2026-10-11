import { useState } from 'react'
import { api } from './api'
import { restaurant } from "./restaurantInfo";
export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', fullName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const isLogin = mode === 'login'

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = isLogin
        ? await api.login(form.username, form.password)
        : await api.register(form)
      onLogin(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="panel login-card" onSubmit={submit}>
        <h1>{restaurant.name}</h1>
        <p>📍 {restaurant.location}</p>
        <h2>{isLogin ? 'Log in' : 'Create an account'}</h2>

        {!isLogin && (
          <label>Full name
            <input value={form.fullName} onChange={set('fullName')} autoComplete="name" required />
          </label>
        )}
        <label>Username
          <input value={form.username} onChange={set('username')} autoComplete="username" required />
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={set('password')}
                 autoComplete={isLogin ? 'current-password' : 'new-password'}
                 minLength={isLogin ? undefined : 6} required />
        </label>

        {error && <p className="notice error" role="alert">{error}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>

        <p className="muted switch">
          {isLogin ? 'New here? ' : 'Already have an account? '}
          <button type="button" className="link" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError('') }}>
            {isLogin ? 'Create an account' : 'Log in'}
          </button>
        </p>

        {isLogin && (
          <p className="muted demo">
            Demo logins: <strong>staff</strong> / staff123 (staff) and <strong>customer</strong> / customer123.
          </p>
        )}
      </form>
    </div>
  )
}
