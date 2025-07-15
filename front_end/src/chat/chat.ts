import io from 'socket.io-client'
import { setupApp } from '../app'
import './chat.css'

export function setupChat(username: string) {
  const token = localStorage.getItem('jwt')!
  console.log('🔌 Connecting socket with token', token)
  const socket = io('http://localhost:3000', { auth: { token } })

  // 1) Create the DOM shell immediately
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div class="sidebar">
      <div class="channel global-btn" data-target=""># Global</div>
      <div class="users-header">Direct Messages</div>
      <div id="user-list"></div>
    </div>
    <div class="chat">
      <div class="chat-header">
        <span id="chat-title"># Global</span>
        <button id="logout-btn" class="logout-btn">Logout</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input">
        <input type="text" id="chat-input" placeholder="Type your message..." />
      </div>
    </div>
  `

  // 2) Grab references to your elements
  const userList   = document.getElementById('user-list')!            // sidebar list
  const chatTitle  = document.getElementById('chat-title')!           // header title
  const messages   = document.getElementById('chat-messages')!        // message container
  const input      = document.getElementById('chat-input')! as HTMLInputElement
  const globalBtn  = document.querySelector('.global-btn')!          // “# Global” button
  const logoutBtn  = document.getElementById('logout-btn')!         // logout

  let currentTarget: string | undefined = undefined

  // 3) Bind socket event listeners *before* server emits
  socket.on('connect', () => console.log('✅ Socket connected', socket.id))
  socket.on('connect_error', (err: { message: any }) => console.error('⛔ Socket auth failed:', err.message))

  socket.on('users:update', (users: string[]) => {
    console.log('👥 users:update', users)
    // rebuild user list
    userList.innerHTML = users
      .filter(u => u !== username)
      .map(u => `<div class="channel dm-btn" data-target="${u}">${u}</div>`)
      .join('')

    // wire up the new DM buttons
    document.querySelectorAll('.dm-btn').forEach(el => {
      el.addEventListener('click', () => {
        currentTarget = el.getAttribute('data-target')!
        chatTitle.textContent = currentTarget ? `@${currentTarget}` : '# Global'
        messages.innerHTML = ''
      })
    })
  })

  socket.on('chat:message', (msg: { from: string; text: string; to?: string }) => {
    console.log('📩 chat:message', msg)
    // only show if global or relevant DM
    if (!msg.to || msg.to === username || msg.from === username) {
      const line = document.createElement('div')
      const prefix = msg.to ? `(DM) ${msg.from}` : msg.from
      line.textContent = `${prefix}: ${msg.text}`
      messages.appendChild(line)
      messages.scrollTop = messages.scrollHeight

      // play sound
      new Audio('/notify.mp3').play().catch(() => {})
    }
  })

  // 4) Wire up the static buttons & input
  globalBtn.addEventListener('click', () => {
    currentTarget = undefined
    chatTitle.textContent = '# Global'
    messages.innerHTML = ''
  })

  input.addEventListener('keypress', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      console.log('✏️ Sending', { to: currentTarget, text: input.value.trim() })
      socket.emit('chat:message', { to: currentTarget, text: input.value.trim() })
      input.value = ''
    }
  })

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwt')
    socket.disconnect()
    setupApp()
  })
}
