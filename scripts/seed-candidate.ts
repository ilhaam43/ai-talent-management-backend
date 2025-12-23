import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcrypt'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = 'test@example.com'
  const password = 'password123'
  const salt = await bcrypt.genSalt()
  const hashedPassword = await bcrypt.hash(password, salt)

  // Check if User already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { candidates: true },
  })

  if (existingUser) {
    console.log('User already exists:', existingUser.email)
    if (existingUser.candidates?.[0]) {
      console.log('Candidate profile already exists')
    }
    return
  }

  // Create User first
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Test Candidate',
    },
  })

  // Then create Candidate linked to User
  const candidate = await prisma.candidate.create({
    data: {
      userId: user.id,
      candidateEmail: email,
      candidateFullname: 'Test Candidate',
    },
  })

  console.log('Seeded user and candidate:', user.email, candidate.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

