import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'
import { prisma } from '../src/database'
import { CardModel } from '../src/generated/prisma/models/Card'
import { PokemonType } from '../src/generated/prisma/enums'

function generateCards(cards: CardModel[], count: number) {
  const copy = [...cards]
  const result: CardModel[] = []

  for (let i = 0; i < count && copy.length > 0; i++) {
    const index = Math.floor(Math.random() * copy.length)
    result.push(copy[index])
    copy.splice(index, 1)
  }

  return result
}

async function main() {
  console.log('🌱 Starting database seed...')

  await prisma.card.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('password123', 10)

  await prisma.user.createMany({
    data: [
      {
        username: 'red',
        email: 'red@example.com',
        password: hashedPassword,
      },
      {
        username: 'blue',
        email: 'blue@example.com',
        password: hashedPassword,
      },
    ],
  })

  const redUser = await prisma.user.findUnique({
    where: { email: 'red@example.com' },
  })
  const blueUser = await prisma.user.findUnique({
    where: { email: 'blue@example.com' },
  })

  if (!redUser || !blueUser) {
    throw new Error('Failed to create users')
  }

  console.log('✅ Created users:', redUser.username, blueUser.username)

  const pokemonDataPath = join(__dirname, 'data', 'pokemon.json')
  const pokemonJson = readFileSync(pokemonDataPath, 'utf-8')
  const pokemonData: CardModel[] = JSON.parse(pokemonJson)

  const createdCards = await Promise.all(
    pokemonData.map((pokemon) =>
      prisma.card.create({
        data: {
          name: pokemon.name,
          hp: pokemon.hp,
          attack: pokemon.attack,
          type: PokemonType[pokemon.type as keyof typeof PokemonType],
          pokedexNumber: pokemon.pokedexNumber,
          imgUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexNumber}.png`,
        },
      }),
    ),
  )

  // Création des decks
  const redDeck = await prisma.deck.create({
    data: {
      name: 'Starter Deck',
      userId: redUser.id,
    },
  })

  const blueDeck = await prisma.deck.create({
    data: {
      name: 'Starter Deck',
      userId: blueUser.id,
    },
  })

  // Liaison entre decks et cartes
  await prisma.deckCard.createMany({
    data: generateCards(createdCards, 10).map((card) => ({
      deckId: redDeck.id,
      cardId: card.id,
    })),
  })

  await prisma.deckCard.createMany({
    data: generateCards(createdCards, 10).map((card) => ({
      deckId: blueDeck.id,
      cardId: card.id,
    })),
  })

  console.log(`✅ Created ${pokemonData.length} Pokemon cards`)

  console.log('\n🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
