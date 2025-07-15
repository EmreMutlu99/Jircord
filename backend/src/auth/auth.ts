import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret'
export interface JwtPayload { username: string }

// Middleware to protect REST endpoints
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header('Authorization')?.split(' ')[1]
  if (!auth) return res.status(401).json({ error: 'No token' })
  try {
    const payload = jwt.verify(auth, JWT_SECRET) as JwtPayload
    // @ts-ignore
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Issue a JWT
export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' })
}
