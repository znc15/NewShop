import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, Camera, Crown, Star, ShoppingBag, ChevronRight, Lock, Edit2 } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { userService } from '@/services/user'
import { MemberLevels, type UserProfile } from '@/types/user'
import { cn } from '@/utils'

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

// 会员等级徽章组件
function MemberBadge({ level }: { level: number }) {
  const memberInfo = MemberLevels.find(m => m.level === level) || MemberLevels[0]

  const getLevelColor = (lvl: number) => {
    switch (lvl) {
      case 5: return 'from-purple-500 to-pink-500'
      case 4: return 'from-yellow-500 to-orange-500'
      case 3: return 'from-gray-300 to-gray-400'
      case 2: return 'from-orange-400 to-orange-600'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r text-white text-sm font-medium',
        getLevelColor(level)
      )}>
        <Crown className="w-4 h-4" />
        <span>{memberInfo.name}</span>
      </div>
      {level < 5 && (
        <span className="text-xs text-stone">
          距下一等级还需 {MemberLevels[level].min_points - (level > 1 ? MemberLevels[level - 1].max_points : 0)} 积分
        </span>
      )}
    </div>
  )
}

// 统计卡片组件
function StatCard({ icon: Icon, label, value, suffix }: {
  icon: React.ElementType
  label: string
  value: number | string
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-cream-50 rounded-xl">
      <div className="w-10 h-10 flex items-center justify-center bg-forest-100 rounded-lg">
        <Icon className="w-5 h-5 text-forest-600" />
      </div>
      <div>
        <p className="text-sm text-stone">{label}</p>
        <p className="text-lg font-semibold text-charcoal">
          {value}{suffix && <span className="text-sm font-normal text-stone ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await userService.getProfile()
      setProfile(data)
      setFormData({
        username: data.username ?? '',
        nickname: data.nickname ?? '',
        phone: data.phone ?? '',
      })
    } catch (error) {
      console.error('获取用户资料失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名'
    } else if (formData.username.length < 2 || formData.username.length > 20) {
      newErrors.username = '用户名需要 2-20 个字符'
    }

    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的手机号'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const updated = await userService.updateProfile({
        username: formData.username,
        nickname: formData.nickname || undefined,
        phone: formData.phone || undefined,
      })
      setProfile(updated)
      setEditing(false)
    } catch (error) {
      console.error('更新资料失败:', error)
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

  if (loading) {
    return (
      <motion.div
        className="max-w-4xl mx-auto px-4 py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="space-y-6" variants={itemVariants}>
          <motion.div
            className="h-32 bg-cream-200 rounded-2xl"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="h-64 bg-cream-200 rounded-2xl"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          />
          <motion.div
            className="h-48 bg-cream-200 rounded-2xl"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
        </motion.div>
      </motion.div>
    )
  }

  if (!profile) {
    return (
      <motion.div
        className="max-w-4xl mx-auto px-4 py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center py-16">
          <p className="text-stone">无法获取用户信息</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/login')}>
            重新登录
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 py-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 页面标题 */}
      <motion.h1
        className="font-display text-2xl font-semibold text-charcoal mb-6"
        variants={itemVariants}
      >
        个人中心
      </motion.h1>

      <motion.div className="space-y-6" variants={containerVariants}>
        {/* 用户头像和基本信息 */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <motion.div
              className="h-24 bg-gradient-to-r from-forest-600 to-forest-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
            <CardContent className="relative pt-0">
              <motion.div
                className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {/* 头像 */}
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-cream-200 overflow-hidden shadow-lg">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.username ?? 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-forest-100">
                        <User className="w-10 h-10 text-forest-400" />
                      </div>
                    )}
                  </div>
                  <motion.button
                    className="absolute bottom-0 right-0 w-8 h-8 bg-forest-600 text-white rounded-full flex items-center justify-center hover:bg-forest-700 transition-colors shadow-md"
                    title="更换头像"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera className="w-4 h-4" />
                  </motion.button>
                </motion.div>

                {/* 用户名和会员等级 */}
                <div className="flex-1 pb-2">
                  <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-xl font-semibold text-charcoal">{profile.username}</h2>
                    <MemberBadge level={profile.level} />
                  </motion.div>
                  <motion.p
                    className="text-sm text-stone mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    注册于 {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                  </motion.p>
                </div>

                {/* 编辑按钮 */}
                {!editing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                      className="mb-2"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      编辑资料
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 统计信息 */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          {[
            { icon: Star, label: '积分', value: profile.points, suffix: '分' },
            { icon: ShoppingBag, label: '订单', value: profile.order_count, suffix: '笔' },
            { icon: Crown, label: '会员等级', value: `Lv.${profile.level}` },
            { icon: User, label: '累计消费', value: `¥${(profile.total_spent / 100).toFixed(0)}` },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              custom={index}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        {/* 个人信息 */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">
                        用户名 <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        error={errors.username}
                        placeholder="请输入用户名"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">昵称</label>
                      <Input
                        value={formData.nickname}
                        onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                        placeholder="请输入昵称"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">手机号</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        error={errors.phone}
                        placeholder="请输入手机号"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal">邮箱</label>
                      <Input
                        value={profile.email}
                        disabled
                        className="bg-cream-100"
                      />
                    </div>
                  </div>
                  <motion.div
                    className="flex justify-end gap-3 pt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Button variant="outline" onClick={handleCancel}>
                      取消
                    </Button>
                    <Button onClick={handleSave} loading={saving}>
                      保存
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {[
                    { icon: User, label: '用户名', value: profile.username },
                    { icon: User, label: '昵称', value: profile.nickname || '-' },
                    { icon: Mail, label: '邮箱', value: profile.email },
                    { icon: Phone, label: '手机号', value: profile.phone || '-' },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      className="flex items-center gap-3 py-3 border-b border-cream-200 last:border-b-0"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <item.icon className="w-5 h-5 text-stone" />
                      <span className="text-sm text-stone w-20">{item.label}</span>
                      <span className="text-charcoal">{item.value}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 快捷入口 */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>账户管理</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <motion.button
                onClick={() => navigate('/user/addresses')}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-cream-50 transition-colors"
                whileHover={{ x: 5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-forest-100 rounded-lg">
                    <User className="w-5 h-5 text-forest-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-charcoal font-medium">收货地址</p>
                    <p className="text-sm text-stone">管理您的收货地址</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone" />
              </motion.button>
              <div className="border-t border-cream-200" />
              <motion.button
                onClick={() => {/* TODO: 打开修改密码弹窗 */}}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-cream-50 transition-colors"
                whileHover={{ x: 5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-forest-100 rounded-lg">
                    <Lock className="w-5 h-5 text-forest-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-charcoal font-medium">修改密码</p>
                    <p className="text-sm text-stone">定期修改密码更安全</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone" />
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>

        {/* 会员权益 */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>会员权益</CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {MemberLevels.map((level, index) => (
                  <motion.div
                    key={level.level}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl',
                      level.level === profile.level ? 'bg-forest-50 border-2 border-forest-200' : 'bg-cream-50'
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div>
                      <p className="font-medium text-charcoal">{level.name}</p>
                      <p className="text-sm text-stone">
                        {level.min_points} - {level.max_points === Infinity ? '∞' : level.max_points} 积分
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {level.level === profile.level && (
                        <motion.span
                          className="text-sm text-forest-600 font-medium"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          当前等级
                        </motion.span>
                      )}
                      <span className="text-sm text-copper-500">{level.discount / 10}折</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
