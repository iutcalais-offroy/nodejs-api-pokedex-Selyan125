import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { describe, expect, it, vi } from 'vitest'
import { authenticate } from '../src/middleware/auth.middleware'
import { env } from '../src/env'

declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; email: string }
    }
  }
}

describe('authenticate middleware', () => {
  function createRes() {
    const res: Partial<Response> = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res as Response
  }

  it('returns 401 when no authorization header', () => {
    const req = { header: vi.fn().mockReturnValue(undefined) } as unknown as Request
    const res = createRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when header is malformed', () => {
    const req = { header: vi.fn().mockReturnValue('Token abc') } as unknown as Request
    const res = createRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', () => {
    const req = { header: vi.fn().mockReturnValue('Bearer invalid.token') } as unknown as Request
    const res = createRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when payload is missing required fields', () => {
    const token = jwt.sign({ foo: 'bar' }, env.JWT_SECRET)
    const req = { header: vi.fn().mockReturnValue(`Bearer ${token}`) } as unknown as Request
    const res = createRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next and attaches user for valid token', () => {
    const token = jwt.sign({ userId: 42, email: 'user@test.com' }, env.JWT_SECRET)
    const req = { header: vi.fn().mockReturnValue(`Bearer ${token}`) } as unknown as Request
    const res = createRes()
    const next = vi.fn() as NextFunction

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toEqual({ userId: 42, email: 'user@test.com' })
  })
})
