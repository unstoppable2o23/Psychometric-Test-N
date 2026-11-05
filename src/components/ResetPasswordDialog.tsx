'use client'
import { useState } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Reset Password dialog.
 * - adminMode (default): uses the admin endpoint — Super Admin can reset ANY
 *   user's password (student or counsellor).
 * - non-admin (counsellor resetting a student): uses the student endpoint with
 *   assignment-based authorization.
 */
export function ResetPasswordDialog({
  userId,
  userName,
  adminMode = true,
  trigger,
}: {
  userId: string
  userName: string
  adminMode?: boolean
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const password = String(fd.get('password') || '')
    const confirm = String(fd.get('confirm') || '')
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setBusy(true)
    try {
      if (adminMode) {
        await api.adminResetPassword(userId, password)
      } else {
        await api.resetStudentPassword(userId, password)
      }
      toast.success(`Password updated for ${userName}`)
      setOpen(false)
    } catch (err: any) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="ghost" className="text-xs gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Reset Password
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-600" /> Reset Password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 -mt-1">Set a new password for <span className="font-semibold text-slate-700">{userName}</span>. They will need to use this new password at their next sign-in.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="password">New Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoFocus />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} placeholder="Re-enter the password" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-700">{busy ? 'Saving…' : 'Update Password'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
