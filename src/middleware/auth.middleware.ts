import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { env } from '../env'

type AuthPayload = {
  userId: number
  email: string
}

function getBearerToken(headerValue?: string): string | null {
  if (!headerValue) {
    return null
  }

  const [scheme, token] = headerValue.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return null
  }

  return token
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = getBearerToken(req.header('Authorization'))
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    const userId = payload.userId as number | undefined
    const email = payload.email as string | undefined

    if (typeof userId !== 'number' || typeof email !== 'string') {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    req.user = { userId, email } satisfies AuthPayload
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
