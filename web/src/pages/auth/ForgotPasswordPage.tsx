import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth'
import { cn } from '@/utils'

type Step = 'email' | 'verify' | 'reset' | 'success'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState<Step>('email')
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [countdown, setCountdown] = useState(0)

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validateEmailStep = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱地址'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateVerifyStep = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.code.trim()) {
      newErrors.code = '请输入验证码'
    } else if (formData.code.length !== 6) {
      newErrors.code = '验证码为 6 位数字'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateResetStep = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.password) {
      newErrors.password = '请输入新密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要 6 位'
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendCode = async () => {
    if (!validateEmailStep()) return

    setIsLoading(true)
    setServerError('')
    try {
      await authService.sendVerifyCode(formData.email)
      setCurrentStep('verify')
      setCountdown(60)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setServerError(err.response?.data?.message || '验证码发送失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setServerError('')
    try {
      await authService.sendVerifyCode(formData.email)
      setCountdown(60)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setServerError(err.response?.data?.message || '验证码发送失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!validateVerifyStep()) return

    setIsLoading(true)
    setServerError('')
    try {
      // 验证码校验通过后进入重置密码步骤
      setCurrentStep('reset')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setServerError(err.response?.data?.message || '验证码验证失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!validateResetStep()) return

    setIsLoading(true)
    setServerError('')
    try {
      await authService.resetPassword(formData.email, formData.code, formData.password)
      setCurrentStep('success')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      setServerError(err.response?.data?.message || '密码重置失败，请稍后重试')
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

  const goBack = () => {
    switch (currentStep) {
      case 'verify':
        setCurrentStep('email')
        break
      case 'reset':
        setCurrentStep('verify')
        break
      default:
        navigate('/login')
    }
  }

  // 步骤配置
  const steps = [
    { key: 'email', label: '输入邮箱' },
    { key: 'verify', label: '验证身份' },
    { key: 'reset', label: '重置密码' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  // 遮蔽邮箱显示
  const maskEmail = (email: string) => {
    return email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12 bg-gradient-to-br from-cream-50 via-cream-100 to-forest-50 relative overflow-hidden">
      {/* 装饰背景 */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-forest-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-copper-300/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* 返回按钮 */}
        {currentStep !== 'success' && (
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-stone hover:text-charcoal transition-colors mb-6 animate-fade-in"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
        )}

        {/* 卡片容器 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-scale-in">
          {/* 步骤指示器 */}
          {currentStep !== 'success' && (
            <div className="flex items-center justify-center mb-8">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      index < currentStepIndex
                        ? 'bg-forest-500 text-white'
                        : index === currentStepIndex
                        ? 'bg-copper-500 text-white'
                        : 'bg-cream-200 text-stone'
                    )}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-12 h-0.5 mx-1',
                        index < currentStepIndex ? 'bg-forest-500' : 'bg-cream-200'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 步骤 1: 输入邮箱 */}
          {currentStep === 'email' && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                  忘记密码
                </h2>
                <p className="text-stone">
                  请输入您注册时使用的邮箱地址
                </p>
              </div>

              {serverError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {serverError}
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-charcoal">
                    邮箱地址
                  </label>
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
                  onClick={handleSendCode}
                  variant="default"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                >
                  发送验证码
                  {!isLoading && <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}

          {/* 步骤 2: 验证码验证 */}
          {currentStep === 'verify' && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                  验证身份
                </h2>
                <p className="text-stone">
                  验证码已发送至 {maskEmail(formData.email)}
                </p>
              </div>

              {serverError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {serverError}
                </div>
              )}

              <div className="space-y-5">
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
                    className="tracking-widest text-center text-lg"
                    maxLength={6}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0}
                    className={cn(
                      'text-copper-500 hover:text-copper-600 transition-colors',
                      countdown > 0 && 'text-stone cursor-not-allowed'
                    )}
                  >
                    {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                  </button>
                  <span className="text-stone">
                    {maskEmail(formData.email)}
                  </span>
                </div>

                <Button
                  onClick={handleVerifyCode}
                  variant="default"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                >
                  验证
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}

          {/* 步骤 3: 重置密码 */}
          {currentStep === 'reset' && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                  设置新密码
                </h2>
                <p className="text-stone">
                  请设置您的新密码
                </p>
              </div>

              {serverError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {serverError}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                    新密码
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入新密码（至少6位）"
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

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal">
                    确认密码
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入新密码"
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

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                >
                  重置密码
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </form>
            </div>
          )}

          {/* 成功状态 */}
          {currentStep === 'success' && (
            <div className="text-center animate-scale-in">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                密码重置成功
              </h2>
              <p className="text-stone mb-8">
                您的密码已成功重置，请使用新密码登录
              </p>
              <Button
                onClick={() => navigate('/login')}
                variant="default"
                size="lg"
                className="w-full"
              >
                前往登录
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* 底部链接 */}
          {currentStep !== 'success' && (
            <p className="mt-6 text-center text-sm text-stone">
              想起密码了？{' '}
              <Link
                to="/login"
                className="text-copper-500 hover:text-copper-600 font-medium transition-colors"
              >
                返回登录
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// 导入 Send 图标
function Send(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}
