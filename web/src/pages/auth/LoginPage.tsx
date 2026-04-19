import { useEffect, useState, type SyntheticEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { cn, getApiErrorMessage } from '@/utils'
import { useGeetest } from '@/hooks/useGeetest'

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

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser, setToken } = useAuthStore()
  const { verify } = useGeetest()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError('')

    if (!validateForm()) return

    setIsLoading(true)
    try {
      const geetestResult = await verify('login')
      const response = await authService.login({ ...formData, ...geetestResult })
      setUser(response.user)
      setToken(response.access_token)
      navigate('/')
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, '登录失败，请检查邮箱和密码'))
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const accessToken = searchParams.get('access_token')
    const oauthError = searchParams.get('oauth_error')

    if (oauthError) {
      setServerError(oauthError)
      navigate('/login', { replace: true })
      return
    }

    if (!accessToken) {
      return
    }

    let cancelled = false

    const completeGitHubLogin = async () => {
      setIsLoading(true)
      setServerError('')

      try {
        setToken(accessToken)
        const currentUser = await authService.getCurrentUser()
        if (cancelled) {
          return
        }
        setUser(currentUser)
        navigate('/', { replace: true })
      } catch {
        if (cancelled) {
          return
        }
        setToken(null)
        setUser(null)
        setServerError('GitHub 登录失败，请稍后重试')
        navigate('/login', { replace: true })
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void completeGitHubLogin()

    return () => {
      cancelled = true
    }
  }, [location.search, navigate, setToken, setUser])

  return (
    <div className="min-h-[calc(100vh-64px)] flex">
      {/* 左侧品牌展示区 - 仅在大屏幕显示 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
        {/* 装饰性背景图案 */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="leaves" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <circle cx="5" cy="15" r="1" fill="currentColor" />
                <circle cx="15" cy="5" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#leaves)" />
          </svg>
        </div>

        {/* 浮动装饰元素 */}
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-blue-100/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1],
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
              欢迎回来
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              登录您的账户，继续探索精选好物，<br />
              开启品质生活之旅。
            </p>
          </motion.div>

          {/* 特性列表 */}
          <motion.div className="space-y-4" variants={containerVariants}>
            {[
              { icon: '🌿', text: '精选优质商品' },
              { icon: '🚚', text: '极速配送服务' },
              { icon: '💝', text: '专属会员权益' },
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
                登录账户
              </h2>
              <p className="text-stone">
                还没有账户？{' '}
                <Link
                  to="/register"
                    className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  立即注册
                </Link>
              </p>
            </motion.div>

            {/* 服务器错误提示 */}
            {serverError && (
              <motion.div
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
              >
                {serverError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 邮箱输入 */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
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
                  className={cn(errors.email && 'border-red-500')}
                />
              </motion.div>

              {/* 密码输入 */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                    密码
                  </label>
                  <Link
                    to="/forgot-password"
                     className="text-sm text-stone hover:text-blue-500 transition-colors"
                  >
                    忘记密码？
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    error={errors.password}
                    icon={<Lock className="w-5 h-5" />}
                    className={cn(errors.password && 'border-red-500', 'pr-10')}
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

              {/* 登录按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  loading={isLoading}
                  className="w-full mt-6"
                >
                  {isLoading ? '登录中...' : '登录'}
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </motion.div>
            </form>

            {/* 分隔线 */}
            <motion.div
              className="relative my-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-stone">或</span>
              </div>
            </motion.div>

{/* 社交登录按钮 */}
             <motion.div
               className="space-y-3"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.8 }}
             >
                <motion.a
                  href="/api/v1/auth/github"
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg text-charcoal hover:bg-slate-50 hover:border-slate-400 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                   <path
                     fill="currentColor"
                     d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
                   />
                 </svg>
                  <span>使用 GitHub 登录</span>
                </motion.a>
              </motion.div>
          </motion.div>

          {/* 底部链接 */}
          <motion.p
            className="mt-6 text-center text-sm text-stone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            登录即表示您同意我们的
             <a href="#" className="text-blue-500 hover:text-blue-600 mx-1">服务条款</a>
            和
             <a href="#" className="text-blue-500 hover:text-blue-600 mx-1">隐私政策</a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
