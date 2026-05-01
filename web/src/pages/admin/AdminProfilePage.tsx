import { useEffect, useState } from 'react'
import { User, Shield, Clock, MapPin, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import adminService from '@/services/admin'
import type { AdminProfile } from '@/types/admin'
import { getApiErrorMessage } from '@/utils'

const ROLE_LABELS: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  operator: '运营',
}

export function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 个人信息表单
  const [nickname, setNickname] = useState('')

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const data = await adminService.getAdminProfile()
        setProfile(data)
        setNickname(data.nickname || '')
      } catch (error) {
        console.error('获取管理员信息失败:', error)
        alert(getApiErrorMessage(error, '获取管理员信息失败，请稍后重试'))
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSaveProfile = async () => {
    if (!profile) return

    if (!nickname.trim()) {
      alert('请输入昵称')
      return
    }

    setSaving(true)
    try {
      await adminService.updateAdmin(profile.id, { nickname: nickname.trim() })
      setProfile({ ...profile, nickname: nickname.trim() })
      alert('个人信息更新成功')
    } catch (error) {
      console.error('更新个人信息失败:', error)
      alert(getApiErrorMessage(error, '更新个人信息失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!oldPassword) {
      errors.oldPassword = '请输入当前密码'
    }
    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = '新密码至少 6 个字符'
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = '两次输入的新密码不一致'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChangePassword = async () => {
    if (!profile) return
    if (!validatePasswordForm()) return

    setSaving(true)
    try {
      await adminService.updateAdmin(profile.id, { password: newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordErrors({})
      alert('密码修改成功')
    } catch (error) {
      console.error('修改密码失败:', error)
      alert(getApiErrorMessage(error, '修改密码失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-stone">无法加载管理员信息</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold text-charcoal">个人资料</h2>
        <p className="mt-2 text-sm text-stone">
          查看和修改您的管理员账户信息，包括昵称和登录密码。
        </p>
      </div>

      {/* 基本信息卡片 */}
      <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-charcoal mb-4">基本信息</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
            <User className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-stone">用户名</p>
              <p className="text-sm font-medium text-charcoal">{profile.username}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-stone">角色</p>
              <p className="text-sm font-medium text-charcoal">
                {ROLE_LABELS[profile.role] || profile.role}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-stone">最后登录时间</p>
              <p className="text-sm font-medium text-charcoal">
                {profile.last_login_at
                  ? new Date(profile.last_login_at).toLocaleString('zh-CN')
                  : '从未登录'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-stone">最后登录 IP</p>
              <p className="text-sm font-medium text-charcoal">{profile.last_login_ip || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 修改昵称卡片 */}
      <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-charcoal mb-4">修改昵称</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">昵称</label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入新昵称"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} loading={saving}>
              保存昵称
            </Button>
          </div>
        </div>
      </div>

      {/* 修改密码卡片 */}
      <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-charcoal">修改密码</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">当前密码</label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码"
              error={passwordErrors.oldPassword}
            />
            {passwordErrors.oldPassword && (
              <p className="mt-1 text-xs text-red-500">{passwordErrors.oldPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">新密码</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少 6 位）"
              error={passwordErrors.newPassword}
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">确认新密码</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              error={passwordErrors.confirmPassword}
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} loading={saving}>
              修改密码
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminProfilePage
