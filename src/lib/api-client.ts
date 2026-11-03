// Typed API client for the psychometric platform frontend.
// All requests use relative paths (Caddy gateway handles routing).

export type Role = 'STUDENT' | 'SUPER_ADMIN' | 'COUNSELLOR'
export interface AuthUser { id: string; name: string; email: string; phone?: string | null; role: Role; isActive: boolean; createdAt: string }

async function req<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'same-origin',
  })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) {
    const msg = (data && data.error) ? data.error : `Request failed (${res.status})`
    const err = new Error(msg) as any
    err.status = res.status
    err.details = data?.details
    throw err
  }
  return data as T
}

export const api = {
  // auth
  register: (body: { name: string; email: string; phone: string; password: string }) =>
    req<{ user: AuthUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string; role?: Role }) =>
    req<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => req('/api/auth/logout', { method: 'POST' }),
  me: () => req<{ user: AuthUser | null }>('/api/auth/me'),

  // assessments
  assessments: () => req<{ assessments: any[] }>('/api/assessments'),

  // student
  studentDashboard: () => req<{ student: any; assignments: any[] }>('/api/student/dashboard'),
  startTest: (assignmentId: string) =>
    req<{ token: string; attemptId: string; assessment: any }>(`/api/student/assignments/${assignmentId}/start`, { method: 'POST' }),
  getTestQuestion: (token: string) => req<any>(`/api/test/${token}`),
  answerQuestion: (token: string, selectedOption: string) =>
    req<any>(`/api/test/${token}/answer`, { method: 'POST', body: JSON.stringify({ selectedOption }) }),
  backQuestion: (token: string) => req<any>(`/api/test/${token}/back`, { method: 'POST' }),
  completeTest: (token: string) => req<any>(`/api/test/${token}/complete`, { method: 'POST' }),

  // admin
  adminStudents: (q = '') => req<{ students: any[] }>(`/api/admin/students${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  adminCreateStudent: (body: any) => req('/api/admin/students', { method: 'POST', body: JSON.stringify(body) }),
  adminStudent: (id: string) => req<{ student: any }>(`/api/admin/students/${id}`),
  adminUpdateStudent: (id: string, body: any) => req(`/api/admin/students/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminAssign: (body: { studentIds: string[]; assessmentIds: string[] }) => req('/api/admin/assign', { method: 'POST', body: JSON.stringify(body) }),
  adminAssignments: () => req<{ assignments: any[] }>('/api/admin/assign'),
  adminReports: () => req<{ reports: any[] }>('/api/admin/reports'),
  adminAssignReport: (reportId: string, counsellorIds: string[]) =>
    req(`/api/admin/reports/${reportId}/assign`, { method: 'POST', body: JSON.stringify({ counsellorIds }) }),
  adminCounsellors: () => req<{ counsellors: any[] }>('/api/admin/counsellors'),
  adminCreateCounsellor: (body: any) => req('/api/admin/counsellors', { method: 'POST', body: JSON.stringify(body) }),
  adminAssignCounsellor: (body: { counsellorId: string; studentIds: string[] }) =>
    req('/api/admin/counsellor-assign', { method: 'POST', body: JSON.stringify(body) }),
  adminAnalytics: () => req<any>('/api/admin/analytics'),
  adminAudit: (limit = 100) => req<{ logs: any[] }>(`/api/admin/audit?limit=${limit}`),

  // counsellor
  counsellorDashboard: () => req<any>('/api/counsellor/dashboard'),
  counsellorManuals: () => req<{ manuals: any[] }>('/api/counsellor/manuals'),
  counsellorManual: (assessmentId: string) => req<{ manual: any }>(`/api/counsellor/manuals/${assessmentId}`),

  // reports
  report: (id: string) => req<{ report: any }>(`/api/reports/${id}`),
  reportDownloadUrl: (id: string) => `/api/reports/${id}/download`,
  manualDownloadUrl: (assessmentId: string) => `/api/manuals/${assessmentId}/download`,

  // seed
  seed: () => req('/api/seed', { method: 'POST' }),
}
