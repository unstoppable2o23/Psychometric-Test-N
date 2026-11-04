import { getCurrentUser } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  return json({ user: user ?? null })
})

export const dynamic = 'force-dynamic'
