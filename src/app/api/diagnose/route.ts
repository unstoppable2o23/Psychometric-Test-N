import { db } from '@/lib/db'
import { apiHandler, json } from '@/lib/api'
export const GET = apiHandler(async () => {
  const info: any = {}
  try { info.tables = await db.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`) } catch (e: any) { info.tablesError = e.message?.slice(0, 150) }
  try { info.userColumns = await db.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position`) } catch (e: any) { info.userColumnsError = e.message?.slice(0, 150) }
  try { info.rawUserCount = await db.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "User"`) } catch (e: any) { info.rawUserCountError = e.message?.slice(0, 100) }
  return json(info)
})
export const dynamic = 'force-dynamic'
