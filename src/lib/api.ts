import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'

// Standard JSON helpers ------------------------------------------------------
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function error(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

// Wrap an API handler so auth errors & unexpected errors become clean JSON ----
export function apiHandler<T extends (...a: any[]) => any>(fn: T): T {
  const wrapped = async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof AuthError) return error(e.message, e.status)
      console.error('[API error]', e)
      return error('Internal server error', 500, String(e))
    }
  }
  return wrapped as unknown as T
}
