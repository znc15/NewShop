import { useState, useEffect, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Send } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { getApiErrorMessage } from '@/utils'

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
    transition: { duration: 0.5 },
  },
}

const slideVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
}

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
      await authService.sendVerifyCode(formData.email, 'register')
      setCodeSent(true)
      setCountdown(60)
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, '验证码发送失败，请稍后重试'))
    }
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
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
      setToken(response.access_token)
      navigate('/')
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, '注册失败，请稍后重试'))
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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400">
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
        <motion.div
          className="absolute top-32 right-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-16 left-16 w-64 h-64 bg-blue-100/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.2, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        {/* 品牌内容 */}
        <motion.div
          className="relative z-10 flex flex-col justify-center px-16 text-white"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={slideVariants}>
            <h1 className="font-display text-5xl font-semibold mb-6">
              加入我们
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              创建账户，享受专属会员权益，<br />
              开启您的品质购物之旅。
            </p>
          </motion.div>

          {/* 会员权益 */}
          <motion.div className="space-y-4" variants={containerVariants}>
            {[
              { icon: '🎁', text: '新用户专享礼包' },
              { icon: '⭐', text: '积分双倍返还' },
              { icon: '🔔', text: '优先获取新品资讯' },
              { icon: '💎', text: '专属会员折扣' },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 text-blue-100"
                variants={itemVariants}
                whileHover={{ x: 5 }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-lg">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* 右侧表单区 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-slate-50">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 移动端品牌标识 */}
          <motion.div
            className="lg:hidden text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link to="/" className="inline-block">
              <span className="font-display text-3xl font-semibold text-blue-700">
                NewShop
              </span>
            </Link>
          </motion.div>

          {/* 表单卡片 */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
                创建账户
              </h2>
              <p className="text-stone">
                已有账户？{' '}
                <Link
                  to="/login"
                  className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  立即登录
                </Link>
              </p>
            </motion.div>

            {/* 服务器错误提示 */}
            {serverError && (
              <motion.div
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
              >
                {serverError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 昵称输入 */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
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
              </motion.div>

              {/* 邮箱输入 + 验证码按钮 */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
              >
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
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                  </motion.div>
                </div>
                {codeSent && countdown > 0 && (
                  <motion.p
                    className="text-xs text-green-600 flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    验证码已发送至您的邮箱
                  </motion.p>
                )}
              </motion.div>

              {/* 验证码输入 */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
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
              </motion.div>

              {/* 密码输入 */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 }}
              >
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
              </motion.div>

              {/* 确认密码输入 */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
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
              </motion.div>

              {/* 注册按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
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
              </motion.div>
            </form>

            {/* 用户协议 */}
            <motion.p
              className="mt-6 text-center text-xs text-stone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              注册即表示您已阅读并同意
              <a href="#" className="text-blue-500 hover:text-blue-600 mx-1">《用户协议》</a>
              和
              <a href="#" className="text-blue-500 hover:text-blue-600 mx-1">《隐私政策》</a>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
