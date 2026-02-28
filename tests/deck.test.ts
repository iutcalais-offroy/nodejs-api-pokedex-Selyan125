import request from 'supertest'
import { app } from '../src/index'
import { prismaMock } from './vitest.setup'
import { createAuthToken } from '../src/utils/tools'
import { beforeEach, describe, expect, it } from 'vitest'

describe('Deck endpoints', () => {
  const token = createAuthToken(10, 'me@me.com')
  const authHeader = `Bearer ${token}`

  beforeEach(() => {
    prismaMock.card.findMany.mockReset()
    prismaMock.deck.create.mockReset()
    prismaMock.deck.findMany.mockReset()
    prismaMock.deck.findUnique.mockReset()
    prismaMock.deck.update.mockReset()
    prismaMock.deck.delete.mockReset()
    prismaMock.deckCard.deleteMany.mockReset()
    prismaMock.deckCard.createMany.mockReset()
  })

  it('returns 401 for protected routes without token', async () => {
    const res = await request(app).get('/api/decks/mine')
    expect(res.status).toBe(401)
  })

  it('get cards success', async () => {
    prismaMock.card.findMany.mockResolvedValueOnce([{ id: 1, name: 'Bulbasaur', pokedexNumber: 1 } as any])
    const res = await request(app).get('/api/cards')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('create deck success', async () => {
    const cards = Array.from({ length: 10 }, (_, i) => i + 1)
    prismaMock.card.findMany.mockResolvedValueOnce(cards.map((id) => ({ id } as any)))
    prismaMock.deck.create.mockResolvedValueOnce({ id: 7, name: 'My', userId: 10, cards: [] } as any)

    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader)
      .send({ name: 'My', cards })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 7, name: 'My', userId: 10 })
  })

  it('create deck validations', async () => {
    const res1 = await request(app).post('/api/decks').set('Authorization', authHeader).send({ name: '', cards: [] })
    expect(res1.status).toBe(400)

    const res2 = await request(app).post('/api/decks').set('Authorization', authHeader).send({ name: 'n', cards: 'x' })
    expect(res2.status).toBe(400)

    const res3 = await request(app).post('/api/decks').set('Authorization', authHeader).send({ name: 'n', cards: [1, 2] })
    expect(res3.status).toBe(400)

    const res4 = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader)
      .send({ name: 'n', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'x'] })
    expect(res4.status).toBe(400)

    prismaMock.card.findMany.mockResolvedValueOnce([{ id: 1 } as any])
    const res5 = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader)
      .send({ name: 'n', cards: Array.from({ length: 10 }, () => 999) })
    expect(res5.status).toBe(400)

    const res6 = await request(app)
      .post('/api/decks')
      .set('Authorization', authHeader)
      .set('Content-Type', 'text/plain')
      .send('raw')
    expect(res6.status).toBe(400)
  })

  it('create deck internal error', async () => {
    prismaMock.card.findMany.mockRejectedValueOnce(new Error('boom'))
    const cards = Array.from({ length: 10 }, (_, i) => i + 1)
    const res = await request(app).post('/api/decks').set('Authorization', authHeader).send({ name: 'n', cards })
    expect(res.status).toBe(500)
  })

  it('get my decks success and error', async () => {
    prismaMock.deck.findMany.mockResolvedValueOnce([{ id: 8, name: 'd', userId: 10 } as any])
    const ok = await request(app).get('/api/decks/mine').set('Authorization', authHeader)
    expect(ok.status).toBe(200)
    expect(ok.body).toHaveLength(1)

    prismaMock.deck.findMany.mockRejectedValueOnce(new Error('boom'))
    const ko = await request(app).get('/api/decks/mine').set('Authorization', authHeader)
    expect(ko.status).toBe(500)
  })

  it('get deck by id branches', async () => {
    const resNaN = await request(app).get('/api/decks/abc').set('Authorization', authHeader)
    expect(resNaN.status).toBe(404)

    prismaMock.deck.findUnique.mockResolvedValueOnce(null)
    const resNotFound = await request(app).get('/api/decks/999').set('Authorization', authHeader)
    expect(resNotFound.status).toBe(404)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 11, userId: 999 } as any)
    const resForbidden = await request(app).get('/api/decks/11').set('Authorization', authHeader)
    expect(resForbidden.status).toBe(403)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 12, userId: 10 } as any)
    const resOk = await request(app).get('/api/decks/12').set('Authorization', authHeader)
    expect(resOk.status).toBe(200)

    prismaMock.deck.findUnique.mockRejectedValueOnce(new Error('boom'))
    const resErr = await request(app).get('/api/decks/12').set('Authorization', authHeader)
    expect(resErr.status).toBe(500)
  })

  it('patch deck branches', async () => {
    const resNaN = await request(app).patch('/api/decks/abc').set('Authorization', authHeader).send({})
    expect(resNaN.status).toBe(404)

    prismaMock.deck.findUnique.mockResolvedValueOnce(null)
    const resNotFound = await request(app).patch('/api/decks/100').set('Authorization', authHeader).send({})
    expect(resNotFound.status).toBe(404)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 13, userId: 999 } as any)
    const resForbidden = await request(app).patch('/api/decks/13').set('Authorization', authHeader).send({})
    expect(resForbidden.status).toBe(403)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 14, userId: 10 } as any)
    const resInvalidName = await request(app).patch('/api/decks/14').set('Authorization', authHeader).send({ name: '' })
    expect(resInvalidName.status).toBe(400)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 15, userId: 10 } as any)
    const resInvalidCardsType = await request(app).patch('/api/decks/15').set('Authorization', authHeader).send({ cards: 'x' })
    expect(resInvalidCardsType.status).toBe(400)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 16, userId: 10 } as any)
    const resBadLen = await request(app).patch('/api/decks/16').set('Authorization', authHeader).send({ cards: [1, 2] })
    expect(resBadLen.status).toBe(400)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 17, userId: 10 } as any)
    const resBadIdsType = await request(app)
      .patch('/api/decks/17')
      .set('Authorization', authHeader)
      .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'x'] })
    expect(resBadIdsType.status).toBe(400)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 18, userId: 10 } as any)
    prismaMock.card.findMany.mockResolvedValueOnce([{ id: 1 } as any])
    const resInvalidIds = await request(app)
      .patch('/api/decks/18')
      .set('Authorization', authHeader)
      .send({ cards: Array.from({ length: 10 }, () => 999) })
    expect(resInvalidIds.status).toBe(400)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 19, userId: 10 } as any)
    prismaMock.card.findMany.mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => ({ id: i + 1 } as any)))
    prismaMock.deckCard.deleteMany.mockResolvedValueOnce({} as any)
    prismaMock.deckCard.createMany.mockResolvedValueOnce({} as any)
    prismaMock.deck.update.mockResolvedValueOnce({ id: 19, name: 'new' } as any)
    const resSuccess = await request(app)
      .patch('/api/decks/19')
      .set('Authorization', authHeader)
      .send({ name: 'new', cards: Array.from({ length: 10 }, (_, i) => i + 1) })
    expect(resSuccess.status).toBe(200)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 20, userId: 10 } as any)
    prismaMock.deck.update.mockResolvedValueOnce({ id: 20, name: 'only-name' } as any)
    const resNameOnly = await request(app).patch('/api/decks/20').set('Authorization', authHeader).send({ name: 'only-name' })
    expect(resNameOnly.status).toBe(200)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 21, userId: 10 } as any)
    prismaMock.deck.update.mockResolvedValueOnce({ id: 21, name: 'same' } as any)
    const resNonJsonBody = await request(app)
      .patch('/api/decks/21')
      .set('Authorization', authHeader)
      .set('Content-Type', 'text/plain')
      .send('raw')
    expect(resNonJsonBody.status).toBe(200)

    prismaMock.deck.findUnique.mockRejectedValueOnce(new Error('boom'))
    const resErr = await request(app).patch('/api/decks/20').set('Authorization', authHeader).send({ name: 'x' })
    expect(resErr.status).toBe(500)
  })

  it('delete deck branches', async () => {
    const resNaN = await request(app).delete('/api/decks/abc').set('Authorization', authHeader)
    expect(resNaN.status).toBe(404)

    prismaMock.deck.findUnique.mockResolvedValueOnce(null)
    const resNotFound = await request(app).delete('/api/decks/200').set('Authorization', authHeader)
    expect(resNotFound.status).toBe(404)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 21, userId: 999 } as any)
    const resForbidden = await request(app).delete('/api/decks/21').set('Authorization', authHeader)
    expect(resForbidden.status).toBe(403)

    prismaMock.deck.findUnique.mockResolvedValueOnce({ id: 22, userId: 10 } as any)
    prismaMock.deckCard.deleteMany.mockResolvedValueOnce({} as any)
    prismaMock.deck.delete.mockResolvedValueOnce({} as any)
    const resOk = await request(app).delete('/api/decks/22').set('Authorization', authHeader)
    expect(resOk.status).toBe(200)

    prismaMock.deck.findUnique.mockRejectedValueOnce(new Error('boom'))
    const resErr = await request(app).delete('/api/decks/23').set('Authorization', authHeader)
    expect(resErr.status).toBe(500)
  })
})
