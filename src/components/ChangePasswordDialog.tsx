'use client'
import { useState } from 'react'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const currentPassword = String(fd.get('currentPassword') || '')
    const newPassword = String(fd.get('newPassword') || '')
    const confirm = String(fd.get('confirm') || '')
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (newPassword !== confirm) { toast.error('New passwords do not match'); return }
    if (newPassword === currentPassword) { toast.error('New password must be different'); return }
    setBusy(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      toast.success('Password changed successfully')
      setOpen(false)
    } catch (err: any) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors">
          <KeyRound className="w-4 h-4" /> <span className="hidden sm:inline">Change Password</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-600" /> Change Your Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required autoFocus placeholder="Your current password" />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" name="newPassword" type="password" required minLength={8} placeholder="At least 8 characters" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} placeholder="Re-enter new password" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-700">{busy ? 'Saving…' : 'Change Password'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
