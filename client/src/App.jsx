import './App.css'
import { useState } from 'react'
import { AuthView } from './components/AuthView'
import { ChatLayout } from './components/ChatLayout'
import { ApiProvider } from './hooks/useApi'
import { SocketProvider } from './hooks/useSocket'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('user') || 'null')
  )

  const handleAuthSuccess = (data) => {
    setToken(data.token)
    setCurrentUser(data.user)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  const handleLogout = () => {
    setToken(null)
    setCurrentUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <ApiProvider token={token}>
      {token && currentUser ? (
        <SocketProvider token={token} currentUser={currentUser}>
          <ChatLayout currentUser={currentUser} onLogout={handleLogout} />
        </SocketProvider>
      ) : (
        <AuthView onAuthSuccess={handleAuthSuccess} />
      )}
    </ApiProvider>
  )
}

export default App
