import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth'
import { cn, getApiErrorMessage } from '@/utils'
import { useGeetest } from '@/hooks/useGeetest'

type Step = 'email' | 'verify' | 'reset' | 'success'

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

const stepVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: { duration: 0.3 },
  }),
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { verify } = useGeetest()

  const [currentStep, setCurrentStep] = useState<Step>('email')
  const [direction, setDirection] = useState(1)
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
      const geetestResult = await verify('send_code')
      await authService.sendCode({ email: formData.email, type: 'reset', ...geetestResult })
      setDirection(1)
      setCurrentStep('verify')
      setCountdown(60)
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, '验证码发送失败，请稍后重试'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setServerError('')
    try {
      const geetestResult = await verify('send_code')
      await authService.sendCode({ email: formData.email, type: 'reset', ...geetestResult })
      setCountdown(60)
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, '验证码发送失败，请稍后重试'))
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
      setDirection(1)
      setCurrentStep('reset')
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, '验证码验证失败'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!validateResetStep()) return

    setIsLoading(true)
    setServerError('')
    try {
      const geetestResult = await verify('reset_password')
      await authService.resetPassword({ email: formData.email, code: formData.code, password: formData.password, ...geetestResult })
      setDirection(1)
      setCurrentStep('success')
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, '密码重置失败，请稍后重试'))
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
        setDirection(-1)
        setCurrentStep('email')
        break
      case 'reset':
        setDirection(-1)
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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-blue-50 relative overflow-hidden">
      {/* 装饰背景 */}
      <motion.div
        className="absolute top-20 left-20 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 返回按钮 */}
        <AnimatePresence>
          {currentStep !== 'success' && (
            <motion.button
              onClick={goBack}
              className="flex items-center gap-2 text-stone hover:text-charcoal transition-colors mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              whileHover={{ x: -3 }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* 卡片容器 */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* 步骤指示器 */}
          <AnimatePresence>
            {currentStep !== 'success' && (
              <motion.div
                className="flex items-center justify-center mb-8"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {steps.map((step, index) => (
                  <div key={step.key} className="flex items-center">
                    <motion.div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        index < currentStepIndex
                          ? 'bg-blue-500 text-white'
                          : index === currentStepIndex
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200 text-stone'
                      )}
                      animate={{
                        scale: index === currentStepIndex ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {index < currentStepIndex ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </motion.div>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'w-12 h-0.5 mx-1 transition-colors duration-300',
                          index < currentStepIndex ? 'bg-blue-500' : 'bg-slate-200'
                        )}
                      />
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" custom={direction}>
            {/* 步骤 1: 输入邮箱 */}
            {currentStep === 'email' && (
              <motion.div
                key="email"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="text-center mb-8">
                  <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                    忘记密码
                  </h2>
                  <p className="text-stone">
                    请输入您注册时使用的邮箱地址
                  </p>
                </div>

                {serverError && (
                  <motion.div
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {serverError}
                  </motion.div>
                )}

                <motion.div
                  className="space-y-5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div className="space-y-2" variants={itemVariants}>
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
                  </motion.div>

                  <motion.div variants={itemVariants}>
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
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* 步骤 2: 验证码验证 */}
            {currentStep === 'verify' && (
              <motion.div
                key="verify"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="text-center mb-8">
                  <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                    验证身份
                  </h2>
                  <p className="text-stone">
                    验证码已发送至 {maskEmail(formData.email)}
                  </p>
                </div>

                {serverError && (
                  <motion.div
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {serverError}
                  </motion.div>
                )}

                <motion.div
                  className="space-y-5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div className="space-y-2" variants={itemVariants}>
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
                  </motion.div>

                  <motion.div
                    className="flex items-center justify-between text-sm"
                    variants={itemVariants}
                  >
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={countdown > 0}
                      className={cn(
                        'text-blue-500 hover:text-blue-600 transition-colors',
                        countdown > 0 && 'text-stone cursor-not-allowed'
                      )}
                    >
                      {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                    </button>
                    <span className="text-stone">
                      {maskEmail(formData.email)}
                    </span>
                  </motion.div>

                  <motion.div variants={itemVariants}>
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
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* 步骤 3: 重置密码 */}
            {currentStep === 'reset' && (
              <motion.div
                key="reset"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <div className="text-center mb-8">
                  <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                    设置新密码
                  </h2>
                  <p className="text-stone">
                    请设置您的新密码
                  </p>
                </div>

                {serverError && (
                  <motion.div
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {serverError}
                  </motion.div>
                )}

                <motion.form
                  onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }}
                  className="space-y-5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div className="space-y-2" variants={itemVariants}>
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
                  </motion.div>

                  <motion.div className="space-y-2" variants={itemVariants}>
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
                  </motion.div>

                  <motion.div variants={itemVariants}>
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
                  </motion.div>
                </motion.form>
              </motion.div>
            )}

            {/* 成功状态 */}
            {currentStep === 'success' && (
              <motion.div
                key="success"
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </motion.div>
                </motion.div>
                <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                  密码重置成功
                </h2>
                <p className="text-stone mb-8">
                  您的密码已成功重置，请使用新密码登录
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => navigate('/login')}
                    variant="default"
                    size="lg"
                    className="w-full"
                  >
                    前往登录
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 底部链接 */}
          <AnimatePresence>
            {currentStep !== 'success' && (
              <motion.p
                className="mt-6 text-center text-sm text-stone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                想起密码了？{' '}
                <Link
                  to="/login"
                  className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  返回登录
                </Link>
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
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
