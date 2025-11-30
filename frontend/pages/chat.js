// frontend/pages/chat.js
import React, { useEffect, useRef, useState } from "react";


const API_HOST =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

function makeAvatarUrl(avatarPath) {
  if (!avatarPath) return null;
  const p = avatarPath.startsWith("/") ? avatarPath : `/${avatarPath}`;
  return `${API_HOST}${p}`;
}

function Avatar({ avatarPath, name, size = 40 }) {
  const src = avatarPath ? makeAvatarUrl(avatarPath) : null;
  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        style={{ width: size, height: size, borderRadius: 8, objectFit: "cover" }}
        onError={(e) => {
          const parent = e.target.parentNode;
          if (!parent) return;
          const initial = name && name[0] ? name[0].toUpperCase() : "?";
          const el = document.createElement("div");
          el.textContent = initial;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.borderRadius = "8px";
          el.style.background = "#ddd";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.fontWeight = "700";
          parent.replaceChild(el, e.target);
        }}
      />
    );
  }
  const initial = name && name[0] ? name[0].toUpperCase() : "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: "#ddd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
      }}
    >
      {initial}
    </div>
  );
}

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef(null);
  const messagesRef = useRef(null);
  const activeConvRef = useRef(null);
  const searchRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const me = await fetch(`${API_HOST}/api/auth/me`, { withCredentials: true });
        if (!mounted) return;
        setUser(me.data.user);

        socketRef.current = io(API_HOST, { withCredentials: true });
        socketRef.current.on("connect", async () => {
          try {
            const tk = await fetch(`${API_HOST}/api/auth/token`, { withCredentials: true });
            if (tk.data?.token) socketRef.current.emit("auth", { token: tk.data.token });
          } catch {}
        });

        socketRef.current.off("message");
        socketRef.current.on("message", (m) => {
          const cid = m.conversation_id ?? m.conversationId ?? null;
          if (cid && activeConvRef.current && cid === activeConvRef.current) {
            setMessages((prev) => {
              if (prev.some((x) => String(x.id) === String(m.id))) return prev;
              return [...prev, m];
            });
            setTimeout(() => {
              if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
            }, 40);
          } else loadConversations().catch(() => {});
        });

        await loadConversations(true);
      } catch (err) {
        console.error("init error", err);
        window.location.href = "/login";
      }
    }
    init();
    return () => {
      mounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    activeConvRef.current = activeConv?.id ?? null;
    // when user opens a conversation, close sidebar on mobile
    if (activeConv && window.innerWidth <= 860) setSidebarOpen(false);
  }, [activeConv]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!searchQ.trim()) return setSearchResults([]);
      (async () => {
        try {
          const res = await fetch(`${API_HOST}/api/users/search`, {
            params: { query: searchQ },
            withCredentials: true,
          });
          setSearchResults((res.data || []).filter((u) => u.id !== user?.id));
        } catch (e) {
          console.error("search error", e);
        }
      })();
    }, 220);
    return () => clearTimeout(t);
  }, [searchQ, user]);

  async function loadConversations(autoOpenFirst = false) {
    try {
      const res = await fetch(`${API_HOST}/api/conversations`, { withCredentials: true });
      setConversations(res.data || []);
      if (autoOpenFirst && res.data && res.data.length) {
        const first = res.data[0];
        await openConversation({ id: first.id, name: first.other_username || first.name || `#${first.id}` }, false);
      }
    } catch (e) {
      console.error("loadConversations error", e);
    }
  }

  async function openConversation(convInfo, reload = true) {
    const convId = convInfo.id;
    setActiveConv({ id: convId, name: convInfo.other_username || convInfo.name || `#${convId}` });
    setMessages([]);
    try {
      if (socketRef.current) socketRef.current.emit("join", { conversationId: convId });
    } catch {}
    try {
      const msgs = await fetch(`${API_HOST}/api/messages/${convId}`, { withCredentials: true });
      setMessages(msgs.data || []);
      setTimeout(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 40);
    } catch (e) {
      console.error("fetch messages error", e);
    }
    if (reload) loadConversations().catch(() => {});
  }

  async function onUserClick(u) {
    try {
      const r = await axios.post(`${API_HOST}/api/conversations`, { otherUserId: u.id }, { withCredentials: true });
      const convId = r.data.id;
      await openConversation({ id: convId, other_username: r.data.other_username || u.username });
      setSearchQ("");
      setSearchResults([]);
      loadConversations().catch(() => {});
    } catch (e) {
      console.error("open conv error", e);
    }
  }

  async function sendDirectMessage(conversationId, content) {
    if (!conversationId || !content || !user) return;
    const payload = { conversationId, senderId: user.id, content: content.trim() };
    try {
      setText("");
      if (socketRef.current) socketRef.current.emit("message", payload);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSend(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!text.trim() || !activeConv) return;
    await sendDirectMessage(activeConv.id, text);
  }

  function toggleSidebar() {
    setSidebarOpen((s) => !s);
  }

  async function doLogout() {
    try {
      await axios.post(`${API_HOST}/api/auth/logout`, {}, { withCredentials: true });
    } catch {}
    window.location.href = "/login";
  }

  return (
    <div className="app-root">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <div className="brand">Chat</div>
              {user && <div className="logged-as">Logged in as <b>{user.username}</b></div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
{typeof window !== 'undefined' && window.innerWidth <= 860 && (
  <button onClick={() => setSidebarOpen(false)}>Close</button>
)}
            </div>
          </div>

          <input className="search-bar" ref={searchRef} value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search username..." />

          <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((u) => (
              <div key={u.id} className="conv-item" onClick={() => onUserClick(u)}>
                <div className="avatar">{u.username.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>{u.username}</div>
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              {conversations.map((conv) => (
                <div key={conv.id} className={`conv-item ${activeConv?.id === conv.id ? "active" : ""}`} onClick={() => openConversation({ id: conv.id, other_username: conv.other_username })}>
                  <div className="avatar">{(conv.other_username || conv.name || `#${conv.id}`).charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{conv.other_username || conv.name || `#${conv.id}`}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>{conv.last_message || <span className="muted">No messages</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="chat-header">
          <button className="header-hamburger" onClick={toggleSidebar} aria-label="Toggle sidebar" style={{ display: "inline-block", marginRight: 6 }}>☰</button>
          <div style={{ fontWeight: 700 }}>{activeConv ? activeConv.name : "Select someone to start chatting"}</div>
          <div className="logged-user" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {user?.avatar ? <img src={user.avatar.startsWith("/") ? `${API_HOST}${user.avatar}` : `${API_HOST}/${user.avatar}`} alt="pfp" style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }} /> : <div style={{ width: 36, height: 36, borderRadius: 999, background: "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{user?.username?.charAt(0).toUpperCase()}</div>}
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{user?.username}</div>
          </div>
        </div>

        <div className="messages" ref={messagesRef}>
          {messages.map((m) => {
            const mine = m.sender_id === user?.id || m.sender === user?.username;
            const senderName = m.sender || (mine ? user?.username : "User");
            return (
              <div key={m.id} className={`msg-row ${mine ? "mine" : ""}`}>
                <div className="msg-avatar">{senderName.charAt(0).toUpperCase()}</div>
                <div className="msg-body">
                  <div className="msg-author">{senderName}</div>
                  <div className="msg-bubble">{m.content}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); handleSend(e); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={activeConv ? "Type a message..." : "Select a user to chat"} disabled={!activeConv} />
          <button type="submit" disabled={!activeConv || !text.trim()}>Send</button>
        </form>
      </main>
    </div>
  );
}
