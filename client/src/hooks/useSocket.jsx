import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export function SocketProvider({ token, currentUser, children }) {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect()
      }
      setSocket(null)
      return
    }

    const s = io(SOCKET_URL, {
      auth: { token },
    })

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [token])

  const value = useMemo(
    () => ({
      socket,
      currentUser,
    }),
    [socket, currentUser]
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return ctx
}

