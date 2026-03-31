import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Crown,
  Star,
  ShoppingBag,
  ChevronRight,
  Lock,
  Edit2,
  LogOut,
  ShieldCheck,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { authService } from '@/services/auth'
import { userService } from '@/services/user'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores'
import { MemberLevels, type UserProfile } from '@/types/user'
import { cn, getApiErrorMessage } from '@/utils'

type UserProfileResponse = Partial<UserProfile> & {
  member_level?: number
  level?: number
  email?: string
  nickname?: string | null
  username?: string | null
  phone?: string | null
  avatar?: string | null
  points?: number
  order_count?: number
  total_spent?: number
  created_at?: string
  updated_at?: string
  status?: string
}

type FeedbackTone = 'success' | 'error' | 'info'

function getDefaultUsername(data: UserProfileResponse): string {
  if (data.username?.trim()) return data.username.trim()
  if (data.nickname?.trim()) return data.nickname.trim()

  const emailPrefix = data.email?.split('@')[0]?.trim()
  return emailPrefix || '用户'
}

function normalizeUserProfile(data: UserProfileResponse): UserProfile {
  const level = typeof data.level === 'number'
    ? data.level
    : typeof data.member_level === 'number'
      ? data.member_level
      : 1

  return {
    id: data.id ?? 0,
    email: data.email ?? '',
    phone: data.phone ?? null,
    username: getDefaultUsername(data),
    nickname: data.nickname ?? null,
    avatar: data.avatar || null,
    member_level: typeof data.member_level === 'number' ? data.member_level : level,
    level,
    points: data.points ?? 0,
    status: data.status ?? 'active',
    order_count: data.order_count ?? 0,
    total_spent: data.total_spent ?? 0,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? '',
  }
}

function formatRegisterDate(value: string): string {
  if (!value) return '-'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-CN')
}

function getMemberProgress(level: number, points: number) {
  const currentIndex = MemberLevels.findIndex((item) => item.level === level)
  if (currentIndex === -1 || currentIndex === MemberLevels.length - 1) {
    return null
  }

  const nextLevel = MemberLevels[currentIndex + 1]
  return Math.max(nextLevel.min_points - points, 0)
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28 },
  },
}

function MemberBadge({ level, points }: { level: number; points: number }) {
  const memberInfo = MemberLevels.find((member) => member.level === level) || MemberLevels[0]
  const remainingPoints = getMemberProgress(level, points)

  const getLevelColor = (memberLevel: number) => {
    switch (memberLevel) {
      case 5: return 'from-purple-500 to-pink-500'
      case 4: return 'from-yellow-500 to-orange-500'
      case 3: return 'from-slate-400 to-slate-500'
      case 2: return 'from-orange-400 to-orange-600'
      default: return 'from-slate-500 to-slate-600'
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-sm font-medium text-white',
        getLevelColor(level)
      )}>
        <Crown className="h-4 w-4" />
        <span>{memberInfo.name}</span>
      </div>
      {remainingPoints !== null && (
        <p className="text-xs text-slate-500">
          再获得 {remainingPoints} 积分即可升级
        </p>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, suffix }: {
  icon: LucideIcon
  label: string
  value: number | string
  suffix?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-charcoal">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-slate-500">{suffix}</span>}
      </p>
    </div>
  )
}

function FeedbackBanner({ tone, text }: { tone: FeedbackTone; text: string }) {
  const toneClassName = {
    success: 'border-green-200 bg-green-50 text-green-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  }[tone]

  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm', toneClassName)}>
      {text}
    </div>
  )
}

export default function UserProfilePage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.logout)
  const resetCart = useCartStore((state) => state.resetCart)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passwordExpanded, setPasswordExpanded] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [passwordCountdown, setPasswordCountdown] = useState(0)
  const [profileError, setProfileError] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    code: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    void fetchProfile()
  }, [])

  useEffect(() => {
    if (passwordCountdown <= 0) return

    const timer = window.setTimeout(() => {
      setPasswordCountdown((current) => current - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [passwordCountdown])

  const fetchProfile = async () => {
    try {
      setProfileError('')
      const data = normalizeUserProfile(await userService.getProfile() as UserProfileResponse)
      setProfile(data)
      setFormData({
        username: data.username ?? '',
        nickname: data.nickname ?? '',
        phone: data.phone ?? '',
      })
    } catch (error) {
      console.error('获取用户资料失败:', error)
      setProfileError(getApiErrorMessage(error, '获取用户资料失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      nextErrors.username = '请输入用户名'
    } else if (formData.username.length < 2 || formData.username.length > 20) {
      nextErrors.username = '用户名需要 2-20 个字符'
    }

    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      nextErrors.phone = '请输入有效的手机号'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validatePasswordForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!passwordForm.oldPassword) {
      nextErrors.oldPassword = '请输入当前密码'
    }

    if (!passwordForm.newPassword) {
      nextErrors.newPassword = '请输入新密码'
    } else if (passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 20) {
      nextErrors.newPassword = '新密码长度需在 6-20 位之间'
    }

    if (!passwordForm.confirmPassword) {
      nextErrors.confirmPassword = '请再次输入新密码'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = '两次输入的新密码不一致'
    }

    if (!passwordForm.code.trim()) {
      nextErrors.code = '请输入邮箱验证码'
    } else if (passwordForm.code.trim().length !== 6) {
      nextErrors.code = '验证码为 6 位数字'
    }

    setPasswordErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const updated = normalizeUserProfile(await userService.updateProfile({
        username: formData.username,
        nickname: formData.nickname || undefined,
        phone: formData.phone || undefined,
      }) as UserProfileResponse)
      setProfile(updated)
      setEditing(false)
      setProfileError('')
    } catch (error) {
      console.error('更新资料失败:', error)
      setProfileError(getApiErrorMessage(error, '更新资料失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username ?? '',
        nickname: profile.nickname ?? '',
        phone: profile.phone ?? '',
      })
    }

    setErrors({})
    setEditing(false)
  }

  const handlePasswordInputChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((current) => ({ ...current, [field]: value }))
    if (passwordErrors[field]) {
      setPasswordErrors((current) => ({ ...current, [field]: '' }))
    }
    if (passwordFeedback) {
      setPasswordFeedback(null)
    }
  }

  const handleSendPasswordCode = async () => {
    if (!profile) return

    setSendingCode(true)
    setPasswordFeedback(null)

    try {
      await authService.sendVerifyCode(profile.email, 'reset')
      setPasswordExpanded(true)
      setPasswordCountdown(60)
      setPasswordFeedback({
        tone: 'info',
        text: `验证码已发送至 ${profile.email}`,
      })
    } catch (error) {
      setPasswordFeedback({
        tone: 'error',
        text: getApiErrorMessage(error, '验证码发送失败，请稍后重试'),
      })
    } finally {
      setSendingCode(false)
    }
  }

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return

    setPasswordSubmitting(true)
    setPasswordFeedback(null)

    try {
      await userService.changePassword({
        old_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword,
        code: passwordForm.code.trim(),
      })

      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        code: '',
      })
      setPasswordErrors({})
      setPasswordFeedback({
        tone: 'success',
        text: '密码修改成功，请使用新密码重新登录。',
      })
    } catch (error) {
      setPasswordFeedback({
        tone: 'error',
        text: getApiErrorMessage(error, '密码修改失败，请稍后重试'),
      })
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authService.logout()
    } catch (error) {
      console.error('退出登录失败:', error)
    } finally {
      resetCart()
      clearAuth()
      navigate('/', { replace: true })
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        className="mx-auto max-w-6xl px-4 py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
          <motion.div className="space-y-6" variants={itemVariants}>
            <div className="h-72 rounded-3xl bg-slate-100" />
            <div className="h-48 rounded-3xl bg-slate-100" />
          </motion.div>
          <motion.div className="space-y-6" variants={itemVariants}>
            <div className="h-72 rounded-3xl bg-slate-100" />
            <div className="h-60 rounded-3xl bg-slate-100" />
          </motion.div>
        </div>
      </motion.div>
    )
  }

  if (!profile) {
    return (
      <motion.div
        className="mx-auto max-w-4xl px-4 py-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <Card>
          <CardContent className="py-14 text-center">
            <p className="text-base text-charcoal">{profileError || '无法获取用户信息'}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => void fetchProfile()}>
                重新加载
              </Button>
              <Button onClick={() => navigate('/login')}>重新登录</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="mx-auto max-w-6xl px-4 py-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="mb-6 flex flex-col gap-2" variants={itemVariants}>
        <h1 className="font-display text-3xl font-semibold text-charcoal">个人中心</h1>
        <p className="text-sm text-slate-500">在一个页面里管理资料、地址、安全设置与会员权益。</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
        <motion.aside className="space-y-6 lg:sticky lg:top-24 lg:self-start" variants={itemVariants}>
          <Card className="overflow-hidden rounded-3xl border-slate-200">
            <div className="h-24 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500" />
            <CardContent className="relative pt-0">
              <div className="-mt-10 flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-blue-100 shadow-sm">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.username ?? '用户头像'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 pt-10">
                  <p className="text-xl font-semibold text-charcoal">{profile.username}</p>
                  <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <MemberBadge level={profile.level} points={profile.points} />

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>注册时间</span>
                    <span className="font-medium text-charcoal">{formatRegisterDate(profile.created_at)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span>账户状态</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {profile.status === 'active' ? '正常' : profile.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">账户速览</CardTitle>
              <CardDescription>常用数据一眼可见</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <StatCard icon={Star} label="积分" value={profile.points} suffix="分" />
              <StatCard icon={ShoppingBag} label="订单" value={profile.order_count} suffix="笔" />
              <StatCard icon={Crown} label="等级" value={`Lv.${profile.level}`} />
              <StatCard icon={User} label="累计消费" value={`¥${(profile.total_spent / 100).toFixed(0)}`} />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">账户管理</CardTitle>
              <CardDescription>常用操作放在左侧，移动端自动串成单列</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => navigate('/user/addresses')}
                className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">管理收货地址</p>
                    <p className="text-sm text-slate-500">维护默认地址与收货信息</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>

              <div className="border-t border-slate-200" />

              <button
                type="button"
                onClick={() => setPasswordExpanded((current) => !current)}
                className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">修改密码</p>
                    <p className="text-sm text-slate-500">使用邮箱验证码完成密码更新</p>
                  </div>
                </div>
                <ChevronRight className={cn('h-5 w-5 text-slate-400 transition-transform duration-200', passwordExpanded && 'rotate-90')} />
              </button>

              <div className="border-t border-slate-200" />

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-red-50"
                disabled={loggingOut}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-500">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">退出登录</p>
                    <p className="text-sm text-slate-500">清理本地登录状态并返回首页</p>
                  </div>
                </div>
                <span className="text-sm text-slate-400">{loggingOut ? '处理中...' : '立即退出'}</span>
              </button>
            </CardContent>
          </Card>
        </motion.aside>

        <motion.section className="space-y-6" variants={itemVariants}>
          <Card className="rounded-3xl border-slate-200">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>基本信息</CardTitle>
                <CardDescription>昵称、手机号等资料会同步到订单与售后场景</CardDescription>
              </div>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                  编辑资料
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {profileError && <FeedbackBanner tone="error" text={profileError} />}

              {editing ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">
                        用户名 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.username}
                        onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))}
                        error={errors.username}
                        placeholder="请输入用户名"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">昵称</label>
                      <Input
                        value={formData.nickname}
                        onChange={(event) => setFormData((current) => ({ ...current, nickname: event.target.value }))}
                        placeholder="请输入昵称"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">手机号</label>
                      <Input
                        value={formData.phone}
                        onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                        error={errors.phone}
                        placeholder="请输入手机号"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">邮箱</label>
                      <Input value={profile.email} disabled className="bg-slate-50" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={handleCancel}>
                      取消
                    </Button>
                    <Button onClick={() => void handleSave()} loading={saving}>
                      保存资料
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {[
                    { icon: User, label: '用户名', value: profile.username },
                    { icon: User, label: '昵称', value: profile.nickname || '-' },
                    { icon: Mail, label: '邮箱', value: profile.email },
                    { icon: Phone, label: '手机号', value: profile.phone || '-' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col gap-2 rounded-2xl border border-slate-200 px-4 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-3 sm:w-44">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm text-slate-500">{item.label}</span>
                      </div>
                      <span className="text-charcoal">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>密码与安全</CardTitle>
                <CardDescription>修改密码前先发送邮箱验证码，保障账户操作安全。</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSendPasswordCode()}
                  loading={sendingCode}
                  disabled={passwordCountdown > 0}
                >
                  <Send className="h-4 w-4" />
                  {passwordCountdown > 0 ? `${passwordCountdown}s 后重发` : '发送验证码'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasswordExpanded((current) => !current)}
                >
                  {passwordExpanded ? '收起表单' : '展开表单'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {passwordFeedback && (
                <FeedbackBanner tone={passwordFeedback.tone} text={passwordFeedback.text} />
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                验证码将发送到当前绑定邮箱 <span className="font-medium text-charcoal">{profile.email}</span>。
              </div>

              <AnimatePresence initial={false}>
                {passwordExpanded && (
                  <motion.div
                    key="password-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-charcoal">
                          当前密码 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(event) => handlePasswordInputChange('oldPassword', event.target.value)}
                          error={passwordErrors.oldPassword}
                          placeholder="请输入当前密码"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-charcoal">
                          邮箱验证码 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={passwordForm.code}
                          onChange={(event) => handlePasswordInputChange('code', event.target.value)}
                          error={passwordErrors.code}
                          placeholder="请输入 6 位验证码"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-charcoal">
                          新密码 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(event) => handlePasswordInputChange('newPassword', event.target.value)}
                          error={passwordErrors.newPassword}
                          placeholder="请输入 6-20 位新密码"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-charcoal">
                          确认新密码 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(event) => handlePasswordInputChange('confirmPassword', event.target.value)}
                          error={passwordErrors.confirmPassword}
                          placeholder="请再次输入新密码"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setPasswordExpanded(false)}>
                        暂不修改
                      </Button>
                      <Button onClick={() => void handleChangePassword()} loading={passwordSubmitting}>
                        提交新密码
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>会员权益</CardTitle>
              <CardDescription>保留原有等级信息，但用更安静的层级和边框呈现。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MemberLevels.map((level) => (
                <div
                  key={level.level}
                  className={cn(
                    'flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
                    level.level === profile.level
                      ? 'border-blue-200 bg-blue-50/80'
                      : 'border-slate-200 bg-slate-50/70'
                  )}
                >
                  <div>
                    <p className="font-medium text-charcoal">{level.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {level.min_points} - {level.max_points === Infinity ? '∞' : level.max_points} 积分
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {level.level === profile.level && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-600">
                        当前等级
                      </span>
                    )}
                    <span className="text-sm font-medium text-blue-600">{level.discount / 10} 折</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </motion.div>
  )
}
