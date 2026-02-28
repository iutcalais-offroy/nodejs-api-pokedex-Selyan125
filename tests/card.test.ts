import request from 'supertest'
import { app } from '../src/index'
import { prismaMock } from './vitest.setup'
import { describe, expect, it } from 'vitest'

describe('Cards endpoints', () => {
  it('fetch cards success', async () => {
    prismaMock.card.findMany.mockResolvedValueOnce([
      { id: 1, name: 'Bulbasaur', pokedexNumber: 1 },
      { id: 2, name: 'Ivysaur', pokedexNumber: 2 },
    ] as any)

    const res = await request(app).get('/api/cards')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
  })

  it('fetch cards internal error', async () => {
    prismaMock.card.findMany.mockRejectedValueOnce(new Error('boom'))
    const res = await request(app).get('/api/cards')
    expect(res.status).toBe(500)
  })
})
