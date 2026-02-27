import { useEffect, useMemo, useRef, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useSocket } from '../hooks/useSocket'

export function ChatLayout({ currentUser, onLogout }) {
  const api = useApi()
  const { socket } = useSocket()

  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isTypingMap, setIsTypingMap] = useState({})
  const [search, setSearch] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef(null)

  const activePartner = useMemo(() => {
    if (!activeConversation || !currentUser) return null
    return activeConversation.participants.find((p) => p._id !== currentUser.id)
  }, [activeConversation, currentUser])

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchInitial = async () => {
      const [usersRes, convRes] = await Promise.all([
        api.get('/users', { params: { q: search || undefined } }),
        api.get('/chat/conversations'),
      ])
      setUsers(usersRes.data)
      setConversations(convRes.data)
    }
    fetchInitial().catch((err) => console.error(err))
  }, [api, search])

  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (msg) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === msg.conversationId)
        if (idx === -1) return prev
        const updated = [...prev]
        updated[idx] = { ...updated[idx], lastMessage: msg, lastMessageAt: msg.createdAt }
        return updated.sort(
          (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
        )
      })
      if (activeConversation && msg.conversationId === activeConversation._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) {
            return prev
          }
          return [...prev, msg]
        })
      }
    }

    const handleTyping = ({ fromUserId, isTyping }) => {
      setIsTypingMap((prev) => ({ ...prev, [fromUserId]: isTyping }))

      // If the other user (active partner) starts typing, we can assume
      // they have seen our messages, so mark our outgoing messages as read.
      if (
        isTyping &&
        activeConversation &&
        activePartner &&
        fromUserId === activePartner._id
      ) {
        setMessages((prev) =>
          prev.map((m) =>
            (m.from === currentUser.id || m.from?._id === currentUser.id) &&
            (m.to === activePartner._id || m.to?._id === activePartner._id)
              ? { ...m, readAt: m.readAt || new Date().toISOString() }
              : m
          )
        )
      }
    }

    const handleRead = async ({ conversationId }) => {
      if (!activeConversation || activeConversation._id !== conversationId) return
      try {
        const { data } = await api.get(`/chat/conversations/${conversationId}/messages`)
        setMessages(data)
      } catch (err) {
        console.error('Failed to refresh messages after read', err)
      }
    }

    socket.on('message:new', handleNewMessage)
    socket.on('typing', handleTyping)
    socket.on('messages:read', handleRead)

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('typing', handleTyping)
      socket.off('messages:read', handleRead)
    }
  }, [socket, activeConversation, api])

  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversation) return
      const { data } = await api.get(`/chat/conversations/${activeConversation._id}/messages`)
      setMessages(data)
      if (socket) {
        socket.emit('conversation:join', activeConversation._id)
        socket.emit('messages:markRead', activeConversation._id)
      } else {
        await api.post(`/chat/conversations/${activeConversation._id}/read`)
      }
    }
    loadMessages().catch((err) => console.error(err))
  }, [activeConversation, api, socket])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages.length, activeConversation && activeConversation._id])

  const handleSelectUser = async (user) => {
    let convo =
      conversations.find((c) =>
        c.participants.some((p) => p._id === user._id) &&
        c.participants.some((p) => p._id === currentUser.id)
      ) || null

    if (!convo) {
      const { data } = await api.post('/chat/conversations/with', {
        userId: user._id,
      })
      convo = data
      setConversations((prev) => {
        if (prev.some((c) => c._id === data._id)) return prev
        return [data, ...prev]
      })
    }

    setActiveConversation(convo)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !activePartner) return

    const text = messageInput
    setMessageInput('')
    if (socket) {
      socket.emit(
        'message:send',
        { toUserId: activePartner._id, content: text },
        (res) => {
          if (!res?.ok) {
            console.error('Failed to send via socket')
          }
        }
      )
    } else {
      const { data } = await api.post('/chat/messages', {
        toUserId: activePartner._id,
        content: text,
      })
      setMessages((prev) => [...prev, data.message])
    }
  }

  const handleTypingChange = (text) => {
    setMessageInput(text)
    if (socket && activePartner) {
      socket.emit('typing', { toUserId: activePartner._id, isTyping: !!text })
    }
  }

  return (
    <div className="chat-shell">
      {(!isMobile || !activeConversation) && (
        <aside className="chat-sidebar">
        <header className="sidebar-header">
          <div>
            <div className="user-name">{currentUser.displayName}</div>
            <div className="user-email">{currentUser.email}</div>
          </div>
          <button className="secondary-btn" onClick={onLogout}>
            Logout
          </button>
        </header>

        <div className="sidebar-section">
          <h2>People</h2>
          <input
            className="search-input"
            placeholder="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="user-list">
            {users.map((u) => (
              <button
                key={u._id}
                className={
                  activePartner && activePartner._id === u._id
                    ? 'user-item active'
                    : 'user-item'
                }
                onClick={() => handleSelectUser(u)}
              >
                <div className="avatar-circle">
                  {u.displayName?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                </div>
                <div className="user-meta">
                  <div className="user-name-row">
                    <span>{u.displayName || u.email}</span>
                    <span
                      className={u.isOnline ? 'presence-dot online' : 'presence-dot offline'}
                    />
                  </div>
                  <div className="user-sub">
                    {u.isOnline
                      ? 'Online'
                      : u.lastSeenAt
                      ? `Last seen ${new Date(u.lastSeenAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Offline'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>
      )}

      <main className="chat-main">
        {activePartner ? (
          <div className="chat-window">
            <header className="chat-header">
              <div className="chat-partner">
                {isMobile && (
                  <button
                    className="back-button"
                    type="button"
                    onClick={() => {
                      setActiveConversation(null)
                      setMessages([])
                    }}
                  >
                    ←
                  </button>
                )}
                <div className="avatar-circle large">
                  {activePartner.displayName?.[0]?.toUpperCase() ||
                    activePartner.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{activePartner.displayName || activePartner.email}</div>
                  <div className="user-sub">
                    {activePartner.isOnline
                      ? 'Online'
                      : activePartner.lastSeenAt
                      ? `Last seen ${new Date(activePartner.lastSeenAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Offline'}
                  </div>
                </div>
              </div>
            </header>

            <div className="messages-container">
              {messages.map((m) => {
                const isMine = m.from === currentUser.id || m.from?._id === currentUser.id
                const time = new Date(m.sentAt || m.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                return (
                  <div
                    key={m._id}
                    className={isMine ? 'message-row mine' : 'message-row theirs'}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{m.content}</div>
                      <div className="message-meta">
                        <span>{time}</span>
                        {isMine && (
                          <span className={m.readAt ? 'read-indicator read' : 'read-indicator'}>
                            {m.readAt ? 'Read' : 'Sent'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {activePartner && isTypingMap[activePartner._id] && (
              <div className="typing-indicator">{activePartner.displayName || 'User'} is typing…</div>
            )}

            <form className="message-input-row" onSubmit={handleSendMessage}>
              <input
                className="message-input"
                placeholder="Type a message"
                value={messageInput}
                onChange={(e) => handleTypingChange(e.target.value)}
              />
              <button className="primary-btn" type="submit">
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Select a user to start chatting</h2>
            <p>Your conversations will appear here.</p>
          </div>
        )}
      </main>
    </div>
  )
}

