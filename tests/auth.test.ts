import request from 'supertest'
import { app } from '../src/index'
import { prismaMock } from './vitest.setup'
import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'

describe('Auth endpoints', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset()
    prismaMock.user.create.mockReset()
  })

  it('sign-up success', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.create.mockResolvedValueOnce({ id: 1, email: 'a@a.com', username: 'u', password: 'h' } as any)

    const res = await request(app).post('/api/auth/sign-up').send({ email: 'a@a.com', username: 'u', password: 'pass' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).toMatchObject({ id: 1, email: 'a@a.com', username: 'u' })
  })

  it('sign-up invalid email', async () => {
    const res = await request(app).post('/api/auth/sign-up').send({ email: 'bad', username: 'u', password: 'p' })
    expect(res.status).toBe(400)
  })

  it('sign-up existing email', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 } as any)
    const res = await request(app).post('/api/auth/sign-up').send({ email: 'a@a.com', username: 'u', password: 'p' })
    expect(res.status).toBe(409)
  })

  it('sign-up existing username', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 2 } as any)
    const res = await request(app).post('/api/auth/sign-up').send({ email: 'a@a.com', username: 'u', password: 'p' })
    expect(res.status).toBe(409)
  })

  it('sign-up missing fields', async () => {
    const res = await request(app).post('/api/auth/sign-up').send({ email: '', username: '', password: '' })
    expect(res.status).toBe(400)
  })

  it('sign-up without body', async () => {
    const res = await request(app).post('/api/auth/sign-up')
    expect(res.status).toBe(400)
  })

  it('sign-up non-json body', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up')
      .set('Content-Type', 'text/plain')
      .send('raw')
    expect(res.status).toBe(400)
  })

  it('sign-up internal error', async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error('boom'))
    const res = await request(app).post('/api/auth/sign-up').send({ email: 'a@a.com', username: 'u', password: 'p' })
    expect(res.status).toBe(500)
  })

  it('sign-in success', async () => {
    const hashed = await bcrypt.hash('pass', 10)
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 3, email: 'b@b.com', username: 'u2', password: hashed } as any)

    const res = await request(app).post('/api/auth/sign-in').send({ email: 'b@b.com', password: 'pass' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).toMatchObject({ id: 3, email: 'b@b.com', username: 'u2' })
  })

  it('sign-in invalid credentials', async () => {
    const hashed = await bcrypt.hash('other', 10)
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 4, email: 'c@c.com', username: 'u3', password: hashed } as any)
    const res = await request(app).post('/api/auth/sign-in').send({ email: 'c@c.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('sign-in user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    const res = await request(app).post('/api/auth/sign-in').send({ email: 'c@c.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('sign-in missing fields', async () => {
    const res = await request(app).post('/api/auth/sign-in').send({ email: '', password: '' })
    expect(res.status).toBe(400)
  })

  it('sign-in without body', async () => {
    const res = await request(app).post('/api/auth/sign-in')
    expect(res.status).toBe(400)
  })

  it('sign-in non-json body', async () => {
    const res = await request(app)
      .post('/api/auth/sign-in')
      .set('Content-Type', 'text/plain')
      .send('raw')
    expect(res.status).toBe(400)
  })

  it('sign-in internal error', async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error('boom'))
    const res = await request(app).post('/api/auth/sign-in').send({ email: 'c@c.com', password: 'wrong' })
    expect(res.status).toBe(500)
  })
})
