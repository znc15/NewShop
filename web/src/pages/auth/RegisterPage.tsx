import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nickname.trim()) {
      newErrors.nickname = '请输入昵称'
    } else if (formData.nickname.length < 2 || formData.nickname.length > 20) {
      newErrors.nickname = '昵称长度需在 2-20 位之间'
    }

    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱地址'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要 6 位'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    if (!formData.code.trim()) {
      newErrors.code = '请输入验证码'
    } else if (formData.code.length !== 6) {
      newErrors.code = '验证码为 6 位数字'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendCode = async () => {
    if (!formData.email.trim()) {
      setErrors((prev) => ({ ...prev, email: '请先输入邮箱地址' }))
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: '请输入有效的邮箱地址' }))
      return
    }

    try {
      await authService.sendVerifyCode(formData.email)
      setCodeSent(true)
      setCountdown(60)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setServerError(err.response?.data?.message || '验证码发送失败，请稍后重试')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')

    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await authService.register({
        nickname: formData.nickname,
        email: formData.email,
        password: formData.password,
      })
      setUser(response.user)
      setToken(response.token)
      navigate('/')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setServerError(err.response?.data?.message || '注册失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
    if (serverError) setServerError('')
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* 左侧品牌展示区 - 仅在大屏幕显示 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-forest-600 via-forest-500 to-forest-400">
        {/* 装饰性背景图案 */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="dots" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
                <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* 浮动装饰元素 */}
        <div className="absolute top-32 right-20 w-72 h-72 bg-copper-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-16 left-16 w-64 h-64 bg-cream-100/15 rounded-full blur-3xl" />

        {/* 品牌内容 */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-cream-100">
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-display text-5xl font-semibold mb-6">
              加入我们
            </h1>
            <p className="text-xl text-cream-200 mb-8 leading-relaxed">
              创建账户，享受专属会员权益，<br />
              开启您的品质购物之旅。
            </p>
          </div>

          {/* 会员权益 */}
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {[
              { icon: '🎁', text: '新用户专享礼包' },
              { icon: '⭐', text: '积分双倍返还' },
              { icon: '🔔', text: '优先获取新品资讯' },
              { icon: '💎', text: '专属会员折扣' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-cream-200"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-lg">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-cream-50">
        <div className="w-full max-w-md">
          {/* 移动端品牌标识 */}
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <Link to="/" className="inline-block">
              <span className="font-display text-3xl font-semibold text-forest-700">
                NewShop
              </span>
            </Link>
          </div>

          {/* 表单卡片 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 animate-scale-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                创建账户
              </h2>
              <p className="text-stone">
                已有账户？{' '}
                <Link
                  to="/login"
                  className="text-copper-500 hover:text-copper-600 font-medium transition-colors"
                >
                  立即登录
                </Link>
              </p>
            </div>

            {/* 服务器错误提示 */}
            {serverError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-slide-down">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 昵称输入 */}
              <div className="space-y-2">
                <label htmlFor="nickname" className="block text-sm font-medium text-charcoal">
                  昵称
                </label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="请输入昵称（2-20位）"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  error={errors.nickname}
                  icon={<User className="w-5 h-5" />}
                />
              </div>

              {/* 邮箱输入 + 验证码按钮 */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-charcoal">
                  邮箱地址
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入邮箱"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      error={errors.email}
                      icon={<Mail className="w-5 h-5" />}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '发送验证码'}
                    {countdown === 0 && <Send className="w-4 h-4 ml-1" />}
                  </Button>
                </div>
                {codeSent && countdown > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    验证码已发送至您的邮箱
                  </p>
                )}
              </div>

              {/* 验证码输入 */}
              <div className="space-y-2">
                <label htmlFor="code" className="block text-sm font-medium text-charcoal">
                  验证码
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder="请输入 6 位验证码"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  error={errors.code}
                  className="tracking-widest text-center"
                  maxLength={6}
                />
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                  密码
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码（至少6位）"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    error={errors.password}
                    icon={<Lock className="w-5 h-5" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-charcoal transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal">
                  确认密码
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    error={errors.confirmPassword}
                    icon={<Lock className="w-5 h-5" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-charcoal transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 注册按钮 */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                loading={isLoading}
                className="w-full mt-6"
              >
                {isLoading ? '注册中...' : '注册'}
                {!isLoading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>

            {/* 用户协议 */}
            <p className="mt-6 text-center text-xs text-stone">
              注册即表示您已阅读并同意
              <a href="#" className="text-copper-500 hover:text-copper-600 mx-1">《用户协议》</a>
              和
              <a href="#" className="text-copper-500 hover:text-copper-600 mx-1">《隐私政策》</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
