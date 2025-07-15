import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server, Socket } from 'socket.io'

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())

// — SIMPLE LOGIN ENDPOINT —
// (in prod replace with real auth / DB)
app.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }
  // echo back the username
  return res.json({ username })
})

// — HTTP + Socket.IO SETUP —
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: true },
})

// on client connect
io.on('connection', (socket: Socket) => {
  console.log(`🟢 Client connected: ${socket.id}`)

  // relay incoming chat messages
  socket.on('chat:message', (msg) => {
    // msg: { username: string; text: string; }
    io.emit('chat:message', msg)
  })

  socket.on('disconnect', () => {
    console.log(`🔴 Client disconnected: ${socket.id}`)
  })
})

// — START SERVER —
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
})
