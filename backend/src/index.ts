import http from 'http'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Server, Socket } from 'socket.io'
import { requireAuth, signToken, JwtPayload } from './auth/auth'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const app = express()
// allow our Vite frontend + credentials
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// — In-memory user store —
interface User { username: string; passwordHash: string }
const users: User[] = []

async function seedUsers() {
  const defaultUsers = [
    { username: 'alice',   password: 'password123' },
    { username: 'bob',     password: 'hunter2'      },
    { username: 'charlie', password: 'qwerty'       },
  ]

  for (const { username, password } of defaultUsers) {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (!existing) {
      const hash = await bcrypt.hash(password, 10)
      await prisma.user.create({
        data: { username, passwordHash: hash }
      })
    }
  }
}
seedUsers()


// — LOGIN: issue JWT —
app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ username })
  console.log(`🔑 ${username} logged in`)
  res.json({ token })
})


// — /me: verify JWT & return user info —
app.get('/me', requireAuth, (req, res) => {
  // @ts-ignore
  const { username } = req.user as JwtPayload
  return res.json({ user: { username } })
})

// — track online users for DMs —
const onlineUsers = new Map<string, Set<Socket>>()

// — HTTP + WebSocket setup —
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: 'http://localhost:5173' } })

// — JWT auth on Socket handshake —
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined
  if (!token) return next(new Error('Unauthorized'))
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'super-secret') as JwtPayload
    socket.data.user = payload.username
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

io.on('connection', (socket: Socket) => {
  const username = socket.data.user as string
  console.log(`🟢 ${username} connected (socket ${socket.id})`)

  // add to onlineUsers
  let set = onlineUsers.get(username)
  if (!set) {
    set = new Set()
    onlineUsers.set(username, set)
  }
  set.add(socket)
  io.emit('users:update', Array.from(onlineUsers.keys()))

  // handle chat messages
  socket.on('chat:message', (payload: { to?: string; text: string }) => {
    const from = username
    console.log(`✉️  Msg from ${from}${payload.to ? ` to ${payload.to}` : ''}: "${payload.text}"`)

    if (payload.to) {
      // DM
      const recipients = onlineUsers.get(payload.to) ?? new Set()
      for (const s of recipients) {
        s.emit('chat:message', { from, text: payload.text, to: payload.to })
      }
      // echo back to sender too
      socket.emit('chat:message', { from, text: payload.text, to: payload.to })
    } else {
      // Global
      io.emit('chat:message', { from, text: payload.text })
    }
  })

  socket.on('disconnect', () => {
    console.log(`🔴 ${username} disconnected (socket ${socket.id})`)
    const set = onlineUsers.get(username)
    if (set) {
      set.delete(socket)
      if (set.size === 0) {
        onlineUsers.delete(username)
      }
      io.emit('users:update', Array.from(onlineUsers.keys()))
    }
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`))
