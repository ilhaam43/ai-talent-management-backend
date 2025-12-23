import axios from 'axios'

const BASE_URL = 'http://localhost:3000'
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
}

const documentTypes = [
  'CV/Resume',
  'Cover Letter',
  'Certificate',
  'Portfolio',
  'ID Card',
  'Transcript',
  'Supporting Document',
  'Reference Letter',
  'Work Sample',
]

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER)
    return response.data.access_token
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message)
    return null
  }
}

async function seedDocumentTypes(token: string) {
  console.log('Seeding document types via API...')

  for (const type of documentTypes) {
    try {
      // Check if exists
      const existing = await axios.get(`${BASE_URL}/documents/types`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const found = existing.data.find((dt: any) => dt.documentType === type)
      if (found) {
        console.log(`✔ Document type "${type}" already exists (ID: ${found.id})`)
        continue
      }

      // Create new one - but we don't have create endpoint, so just check
      console.log(`ℹ Document type "${type}" not found - need to create manually`)

    } catch (error: any) {
      console.error(`❌ Error checking "${type}":`, error.response?.data || error.message)
    }
  }

  console.log('\nNote: Document types need to be created via database migration or manual seeding.')
  console.log('Please run: npx prisma db seed')
}

async function main() {
  console.log('🌱 Seeding document types via API...')

  const token = await login()
  if (!token) {
    console.error('Cannot proceed without authentication')
    process.exit(1)
  }

  await seedDocumentTypes(token)
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})

