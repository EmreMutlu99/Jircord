import './style.css'
import { showLogin } from './login/login'
import { setupChat } from './chat/chat'

const API_BASE = 'http://localhost:3000'  // adjust for production

export async function setupApp() {
  const token = localStorage.getItem('jwt')

  if (token) {
    try {
      // Verify token & get user info
      const resp = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!resp.ok) throw new Error('Invalid token')

      const { user } = await resp.json() as { user: { username: string } }
      setupChat(user.username)
      return
    } catch {
      // Token invalid or /me failed → drop it
      localStorage.removeItem('jwt')
    }
  }

  // No token or invalid → show login form
  showLogin(async (username) => {
    setupChat(username)
  })
}
