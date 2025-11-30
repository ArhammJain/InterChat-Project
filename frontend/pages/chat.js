// frontend/pages/chat.js
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

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

  const [mounted, setMounted] = useState(false); // avoid hydration issues
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

  // 🔐 Check auth + load first data
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

  // Keep active conversation id in ref
  useEffect(() => {
    activeConvRef.current = activeConv?.id ?? null;

    if (activeConv && typeof window !== 'undefined' && window.innerWidth <= 860) {
      setSidebarOpen(false);
    }
  }, [activeConv]);

  // 🔍 Search users (simple polling)
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

          if (!res.ok) return;

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
        console.error('loadConversations status', res.status);
        return;
      }

      const data = await res.json();
      const convs = data.conversations || data || [];
      setConversations(convs);

      if (autoOpenFirst && convs.length > 0) {
        const first = convs[0];
        await openConversation({
          id: first.id,
          name: first.other_username || first.name || `#${first.id}`,
        });
      }
    } catch (e) {
      console.error('loadConversations error', e);
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
        console.error('fetch messages status', res.status);
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
      console.error('fetch messages error', e);
    }

    // Refresh list (last message preview, etc.)
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
        console.error('create conversation status', res.status);
        return;
      }

      const data = await res.json();
      const convId = data.id || data.conversation?.id;

      await openConversation({
        id: convId,
        other_username: data.other_username || u.username,
      });

      setSearchQ('');
      setSearchResults([]);
      loadConversations().catch(() => {});
    } catch (e) {
      console.error('open conv error', e);
    }
  }

  async function sendMessage(conversationId, content) {
    if (!conversationId || !content || !user) return;

    try {
      setText('');

      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        console.error('send message status', res.status);
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
      console.error('send message error', e);
    }
  }

  async function handleSend(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!text.trim() || !activeConv) return;
    await sendMessage(activeConv.id, text);
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
    // If user disappears for some reason, fallback
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
              <div key={u.id} className="conv-item" onClick={() => onUserClick(u)}>
                <div className="avatar">{u.username.charAt(0).toUpperCase()}</div>
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
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.username}</div>
          </div>
        </div>

        <div className="messages" ref={messagesRef}>
          {messages.map((m) => {
            const mine = m.sender_id === user?.id || m.sender === user?.username;
            const senderName = m.sender || (mine ? user?.username : 'User');
            return (
              <div key={m.id} className={`msg-row ${mine ? 'mine' : ''}`}>
                <div className="msg-avatar">{senderName.charAt(0).toUpperCase()}</div>
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
