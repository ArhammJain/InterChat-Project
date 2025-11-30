// frontend/pages/signup.js
import { useState } from 'react';
import Router from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    if (!username.trim()) return alert('Enter a username');
    if (!password) return alert('Enter a password');
    try {
      setBusy(true);
      // Signup JSON call
await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});

      // If avatar file selected, upload it
      if (avatarFile) {
        try {
          const fd = new FormData();
          fd.append('avatar', avatarFile);
          await axios.post(`${API}/api/users/me/avatar`, fd, {
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (e) {
          console.warn('Avatar upload failed', e);
          // don't block signup — continue
        }
      }

      // redirect to chat
      Router.push('/chat');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Signup failed';
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-bg">
        <main className="center-wrap">
          <form onSubmit={handleSignup} className="card" aria-live="polite">
            <div className="card-top">
              <h1 className="card__title">Sign Up</h1>
              <p className="card__content">Register your username and start chatting.</p>
            </div>

            <div className="card__form">
              <label className="label">Username</label>
              <input
                name="username"
                placeholder="Your username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />

              <label className="label">Password</label>
              <input
                name="password"
                placeholder="Your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <label className="label">Profile picture (optional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />

              <button type="submit" className="sign-up" disabled={busy}>
                {busy ? 'Signing up...' : 'Sign up'}
              </button>

              <p className="card__foot">
                Have an account? <a href="/login">Login</a>
              </p>
            </div>
          </form>
        </main>
      </div>

      <style jsx global>{`
        /* layout */
        :root { --bg: #e6e1d6; --card-bg: #fff; --muted: #666; --accent: #111; --radius: 14px; }
        html,body,#__next { height: 100%; margin: 0; font-family: Inter, system-ui, Arial, sans-serif; background: var(--bg); color: var(--accent); }

        .page-bg { min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 28px; box-sizing: border-box; }

        /* center wrapper keeps card nicely centered on all screens */
        .center-wrap { width: 100%; max-width: 480px; margin: 0 auto; }

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

        input[type="text"], input[type="password"], input[type="file"] {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #ddd;
          background: #fff;
          font-size: 15px;
        }
        input[type="file"] { padding: 8px; }

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

        /* Responsive: make vertical spacing slightly tighter on very small screens */
        @media (max-width: 420px) {
          .card { padding: 14px; border-radius: 12px; }
          input[type="text"], input[type="password"] { padding: 10px; font-size: 14px; }
          .card__title { font-size: 20px; }
        }
      `}</style>
    </>
  );
}
