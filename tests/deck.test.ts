import request from 'supertest'
import { app } from '../src/index'
import { describe, expect, it } from 'vitest'

describe('Deck endpoints', () => {
  it('returns 404 for removed deck routes', async () => {
    const res = await request(app).get('/api/decks/mine')
    expect(res.status).toBe(404)
  })
})
