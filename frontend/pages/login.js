// frontend/pages/login.js
import { useState } from 'react';
import Router from 'next/router';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim()) return alert('Enter username');
    if (!password) return alert('Enter password');

    try {
      setBusy(true);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // cookie from API route
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || 'Login failed';
        alert(msg);
        return;
      }

      // Cookie is set by the API route on the same domain
      Router.push('/chat');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-bg">
        <main className="center-wrap">
          <form onSubmit={handleLogin} className="card" aria-live="polite">
            <div className="card-top">
              <h1 className="card__title">Login</h1>
              <p className="card__content">Sign in with your username and password.</p>
            </div>

            <div className="card__form">
              <label className="label">Username</label>
              <input
                type="text"
                name="username"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />

              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button type="submit" className="sign-up" disabled={busy}>
                {busy ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="card__foot">
                No account? <a href="/signup">Create one</a>
              </p>
            </div>
          </form>
        </main>
      </div>

      <style jsx global>{`
        /* reuse same style tokens as signup for consistent look */
        :root { --bg: #e6e1d6; --card-bg: #fff; --muted: #666; --accent: #111; --radius: 14px; }
        html,body,#__next { height: 100%; margin: 0; font-family: Inter, system-ui, Arial, sans-serif; background: var(--bg); color: var(--accent); }

        .page-bg { min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 28px; box-sizing: border-box; }

        .center-wrap { width: 100%; max-width: 420px; margin: 0 auto; }

        .card {
          width: 100%;
          background: var(--card-bg);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(10,10,10,0.06);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .card-top { text-align: left; margin-bottom: 6px; }
        .card__title { margin: 0; font-size: 22px; font-weight: 800; color: #222; }
        .card__content { margin: 6px 0 0 0; color: var(--muted); font-size: 14px; }

        .card__form { display:flex; flex-direction:column; gap:10px; margin-top: 6px; }
        .label { font-size: 13px; color: #444; margin-bottom: 4px; font-weight:600; }

        input[type="text"], input[type="password"] {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fff;
          font-size: 15px;
        }

        .sign-up {
          margin-top: 6px;
          padding: 12px;
          border-radius: 12px;
          border: none;
          background: #111;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .sign-up:disabled { opacity: 0.6; cursor: not-allowed; }

        .card__foot { margin: 6px 0 0 0; color: var(--muted); font-size: 14px; text-align: center; }
        .card__foot a { color: var(--accent); font-weight:700; text-decoration:none; }

        @media (max-width: 420px) {
          .card { padding: 14px; border-radius: 12px; }
          input[type="text"], input[type="password"] { padding: 10px; font-size: 14px; }
          .card__title { font-size: 20px; }
        }
      `}</style>
    </>
  );
}
