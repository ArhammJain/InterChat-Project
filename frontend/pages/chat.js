// frontend/pages/chat.js
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

// Simple avatar (same visual idea as before)
function Avatar({ name, size = 40 }) {
  const initial = name && name[0] ? name[0].toUpperCase() : '?';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: '#ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
      }}
    >
      {initial}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const messagesRef = useRef(null);
  const activeConvRef = useRef(null);
  const searchRef = useRef(null);

  // 🔐 Auth check + initial data load
  useEffect(() => {
    setMounted(true);

    const init = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.status !== 200) {
          router.replace('/login');
          return;
        }

        const data = await res.json();
        setUser(data.user);

        await loadConversations(true);
      } catch (err) {
        console.error('init error', err);
        router.replace('/login');
      } finally {
        setLoadingInitial(false);
      }
    };

    init();
  }, [router]);

  // track active conversation for scrolling logic
  useEffect(() => {
    activeConvRef.current = activeConv?.id ?? null;

    if (activeConv && typeof window !== 'undefined' && window.innerWidth <= 860) {
      setSidebarOpen(false);
    }
  }, [activeConv]);

  // 🔍 Search users by username
  useEffect(() => {
    const t = setTimeout(() => {
      if (!searchQ.trim()) {
        setSearchResults([]);
        return;
      }

      (async () => {
        try {
          const url = `/api/users/search?query=${encodeURIComponent(searchQ)}`;
          const res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error('search error:', data);
            return;
          }

          const data = await res.json();
          const users = data.users || data || [];
          setSearchResults(users.filter((u) => u.id !== user?.id));
        } catch (e) {
          console.error('search error', e);
        }
      })();
    }, 220);

    return () => clearTimeout(t);
  }, [searchQ, user]);

  async function loadConversations(autoOpenFirst = false) {
    try {
      const res = await fetch('/api/conversations', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('loadConversations error:', data);
        return;
      }

      const data = await res.json();
      const convs = data.conversations || data || [];
      setConversations(convs);

      if (autoOpenFirst && convs.length > 0) {
        const first = convs[0];
        await openConversation({
          id: first.id,
          other_username: first.other_username,
          name: first.name || first.other_username || `#${first.id}`,
        });
      }
    } catch (e) {
      console.error('loadConversations exception', e);
    }
  }

  async function openConversation(convInfo) {
    const convId = convInfo.id;
    const name = convInfo.other_username || convInfo.name || `#${convId}`;

    setActiveConv({ id: convId, name });
    setMessages([]);

    try {
      const res = await fetch(`/api/messages/${convId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('fetch messages error:', data);
        alert(data.error || 'Could not load messages');
        return;
      }

      const data = await res.json();
      const msgs = data.messages || data || [];
      setMessages(msgs);

      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 40);
    } catch (e) {
      console.error('fetch messages exception', e);
      alert('Could not load messages');
    }

    // Refresh list (for last_message preview)
    loadConversations().catch(() => {});
  }

  async function onUserClick(u) {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: u.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('open conv error:', data);
        alert(data.error || 'Could not open conversation');
        return;
      }

      const data = await res.json();
      const convId = data.id;

      await openConversation({
        id: convId,
        other_username: data.other_username || u.username,
      });

      setSearchQ('');
      setSearchResults([]);
      loadConversations().catch(() => {});
    } catch (e) {
      console.error('open conv exception', e);
      alert('Could not open conversation');
    }
  }

  async function sendMessage(conversationId, content) {
    if (!conversationId || !content || !user) return;

    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('send message error:', data);
        alert(data.error || 'Could not send message');
        return;
      }

      const data = await res.json();
      const msg = data.message || data;

      setMessages((prev) => [...prev, msg]);

      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 40);
    } catch (e) {
      console.error('send message exception', e);
      alert('Could not send message');
    }
  }

  async function handleSend(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!text.trim() || !activeConv) return;
    const content = text;
    setText('');
    await sendMessage(activeConv.id, content);
  }

  function toggleSidebar() {
    setSidebarOpen((s) => !s);
  }

  async function doLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('logout error', e);
    }
    router.replace('/login');
  }

  if (!mounted || loadingInitial) {
    return <div>Loading chat...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="app-root">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div>
              <div className="brand">Chat</div>
              {user && (
                <div className="logged-as">
                  Logged in as <b>{user.username}</b>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {typeof window !== 'undefined' && window.innerWidth <= 860 && (
                <button onClick={() => setSidebarOpen(false)}>Close</button>
              )}
              <button onClick={doLogout}>Logout</button>
            </div>
          </div>

          <input
            className="search-bar"
            ref={searchRef}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search username..."
          />

          <div className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchResults.map((u) => (
              <div
                key={u.id}
                className="conv-item"
                onClick={() => onUserClick(u)}
              >
                <div className="avatar">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>{u.username}</div>
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                  onClick={() =>
                    openConversation({
                      id: conv.id,
                      other_username: conv.other_username,
                      name: conv.name,
                    })
                  }
                >
                  <div className="avatar">
                    {(conv.other_username || conv.name || `#${conv.id}`)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {conv.other_username || conv.name || `#${conv.id}`}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {conv.last_message || (
                        <span className="muted">No messages</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="chat-header">
          <button
            className="header-hamburger"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            style={{ display: 'inline-block', marginRight: 6 }}
          >
            ☰
          </button>
          <div style={{ fontWeight: 700 }}>
            {activeConv ? activeConv.name : 'Select someone to start chatting'}
          </div>
          <div
            className="logged-user"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Avatar name={user?.username} size={36} />
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {user?.username}
            </div>
          </div>
        </div>

        <div className="messages" ref={messagesRef}>
          {messages.map((m) => {
            const mine = m.sender_id === user?.id || m.sender === user?.username;
            const senderName = m.sender || (mine ? user?.username : 'User');
            return (
              <div key={m.id} className={`msg-row ${mine ? 'mine' : ''}`}>
                <div className="msg-avatar">
                  {senderName.charAt(0).toUpperCase()}
                </div>
                <div className="msg-body">
                  <div className="msg-author">{senderName}</div>
                  <div className="msg-bubble">{m.content}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(e);
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={activeConv ? 'Type a message...' : 'Select a user to chat'}
            disabled={!activeConv}
          />
          <button type="submit" disabled={!activeConv || !text.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
