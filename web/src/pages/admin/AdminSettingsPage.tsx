import { useEffect, useState } from 'react'
import { Shield, Mail, Server, KeyRound, User, Lock, Send, List } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import adminService from '@/services/admin'
import type { AdminConfigItem } from '@/types/admin'
import { getApiErrorMessage } from '@/utils'

// 极验配置字段定义
const GEETEST_FIELDS = [
  {
    key: 'geetest.id',
    label: '极验验证码 ID',
    description: '极验后台应用对应的 Captcha ID。',
    placeholder: '请输入极验 ID',
    icon: Shield,
    type: 'text' as const,
  },
  {
    key: 'geetest.key',
    label: '极验验证码 Key',
    description: '极验后台应用对应的 Captcha Key，保存后加密显示。',
    placeholder: '请输入极验 Key',
    icon: KeyRound,
    type: 'password' as const,
  },
  {
    key: 'geetest.enabled_actions',
    label: '启用的验证操作',
    description: '勾选需要人机验证的操作，支持多选。不勾选任何选项则关闭极验验证。',
    placeholder: '',
    icon: List,
    type: 'multiselect' as const,
    options: [
      { value: 'login', label: '登录' },
      { value: 'register', label: '注册' },
      { value: 'reset_password', label: '重置密码' },
      { value: 'order/create', label: '创建订单' },
      { value: 'review', label: '发表评价' },
    ],
  },
] as const

// SMTP 配置字段定义
const SMTP_FIELDS = [
  {
    key: 'smtp.host',
    label: 'SMTP 服务器地址',
    description: '邮件发送服务器地址，例如 smtp.gmail.com。',
    placeholder: 'smtp.example.com',
    icon: Server,
    type: 'text' as const,
  },
  {
    key: 'smtp.port',
    label: 'SMTP 端口',
    description: '常用端口：587（STARTTLS）、465（SSL）、25（非加密）。',
    placeholder: '587',
    icon: Server,
    type: 'number' as const,
  },
  {
    key: 'smtp.user',
    label: 'SMTP 用户名',
    description: 'SMTP 登录用户名，通常为邮箱地址。',
    placeholder: 'noreply@example.com',
    icon: User,
    type: 'text' as const,
  },
  {
    key: 'smtp.password',
    label: 'SMTP 密码',
    description: 'SMTP 登录密码或授权码，保存后加密显示。',
    placeholder: '请输入 SMTP 密码',
    icon: Lock,
    type: 'password' as const,
  },
  {
    key: 'smtp.from',
    label: '发件人地址',
    description: '邮件中显示的发送方邮箱地址。',
    placeholder: 'noreply@example.com',
    icon: Send,
    type: 'text' as const,
  },
] as const

type TabId = 'geetest' | 'smtp'

const TABS: { id: TabId; label: string; icon: typeof Shield }[] = [
  { id: 'geetest', label: '极验设置', icon: Shield },
  { id: 'smtp', label: 'SMTP 设置', icon: Mail },
]

function parseStringValue(value: string): string {
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}

function parseActionsValue(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string')
    }
    return []
  } catch {
    return typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  }
}

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('geetest')
  const [configs, setConfigs] = useState<Record<string, AdminConfigItem>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Geetest 表单
  const [geetestId, setGeetestId] = useState('')
  const [geetestKey, setGeetestKey] = useState('')
  const [geetestActions, setGeetestActions] = useState<string[]>([])

  // SMTP 表单
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')

  useEffect(() => {
    const fetchConfigs = async () => {
      setLoading(true)
      try {
        // 获取所有配置（不分分类）
        const data = await adminService.getConfigs()
        const configMap = data.reduce<Record<string, AdminConfigItem>>((acc, item) => {
          acc[item.key] = item
          return acc
        }, {})

        setConfigs(configMap)

        // 填充极验表单
        setGeetestId(parseStringValue(configMap['geetest.id']?.value ?? ''))
        setGeetestKey(parseStringValue(configMap['geetest.key']?.value ?? ''))
        setGeetestActions(parseActionsValue(configMap['geetest.enabled_actions']?.value ?? ''))

        // 填充 SMTP 表单
        setSmtpHost(parseStringValue(configMap['smtp.host']?.value ?? ''))
        setSmtpPort(parseStringValue(configMap['smtp.port']?.value ?? ''))
        setSmtpUser(parseStringValue(configMap['smtp.user']?.value ?? ''))
        setSmtpPassword(parseStringValue(configMap['smtp.password']?.value ?? ''))
        setSmtpFrom(parseStringValue(configMap['smtp.from']?.value ?? ''))
      } catch (error) {
        console.error('获取系统配置失败:', error)
        alert(getApiErrorMessage(error, '获取系统配置失败，请稍后重试'))
      } finally {
        setLoading(false)
      }
    }

    fetchConfigs()
  }, [])

  const toggleAction = (action: string) => {
    setGeetestActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    )
  }

  const buildPayload = (key: string, value: string, type: AdminConfigItem['type'], category: string) => ({
    key,
    value,
    type,
    category,
    description: configs[key]?.description || '',
    is_public: configs[key]?.is_public ?? false,
  })

  const handleSaveGeetest = async () => {
    setSaving(true)
    try {
      const payloads = [
        buildPayload('geetest.id', JSON.stringify(geetestId.trim()), 'string' as const, 'geetest'),
        buildPayload('geetest.key', JSON.stringify(geetestKey.trim()), 'string' as const, 'geetest'),
        buildPayload('geetest.enabled_actions', JSON.stringify(geetestActions), 'array' as const, 'geetest'),
      ]

      await Promise.all(payloads.map((p) => adminService.upsertConfig(p)))

      // 重新获取以刷新配置映射
      const latest = await adminService.getConfigs()
      const configMap = latest.reduce<Record<string, AdminConfigItem>>((acc, item) => {
        acc[item.key] = item
        return acc
      }, {})
      setConfigs(configMap)
      alert('极验配置保存成功')
    } catch (error) {
      console.error('保存极验配置失败:', error)
      alert(getApiErrorMessage(error, '保存极验配置失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSMTP = async () => {
    if (!smtpPort.trim() || isNaN(Number(smtpPort.trim()))) {
      alert('请输入有效的 SMTP 端口号')
      return
    }

    setSaving(true)
    try {
      const payloads = [
        buildPayload('smtp.host', JSON.stringify(smtpHost.trim()), 'string' as const, 'smtp'),
        buildPayload('smtp.port', JSON.stringify(Number(smtpPort.trim())), 'number' as const, 'smtp'),
        buildPayload('smtp.user', JSON.stringify(smtpUser.trim()), 'string' as const, 'smtp'),
        buildPayload('smtp.password', JSON.stringify(smtpPassword.trim()), 'string' as const, 'smtp'),
        buildPayload('smtp.from', JSON.stringify(smtpFrom.trim()), 'string' as const, 'smtp'),
      ]

      await Promise.all(payloads.map((p) => adminService.upsertConfig(p)))

      // 重新获取以刷新配置映射
      const latest = await adminService.getConfigs()
      const configMap = latest.reduce<Record<string, AdminConfigItem>>((acc, item) => {
        acc[item.key] = item
        return acc
      }, {})
      setConfigs(configMap)
      alert('SMTP 配置保存成功')
    } catch (error) {
      console.error('保存 SMTP 配置失败:', error)
      alert(getApiErrorMessage(error, '保存 SMTP 配置失败，请稍后重试'))
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-charcoal">系统设置</h2>
        <p className="mt-2 max-w-2xl text-sm text-stone">
          管理系统核心配置，包括极验验证码和 SMTP 邮件服务。修改后即时生效，无需重启服务。
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b border-cream-200">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-stone hover:text-charcoal'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 极验配置 Tab */}
      {activeTab === 'geetest' && (
        <div className="space-y-4">
          {GEETEST_FIELDS.map((field) => {
            const Icon = field.icon

            return (
              <div key={field.key} className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-charcoal">{field.label}</h3>
                      <p className="mt-1 text-sm text-stone">{field.description}</p>
                    </div>

                    {field.type === 'multiselect' ? (
                      <div className="flex flex-wrap gap-2">
                        {field.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleAction(opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              geetestActions.includes(opt.value)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-stone border-cream-300 hover:border-blue-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Input
                        type={field.type === 'password' ? 'password' : 'text'}
                        value={
                          field.key === 'geetest.id'
                            ? geetestId
                            : field.key === 'geetest.key'
                              ? geetestKey
                              : ''
                        }
                        onChange={(event) => {
                          if (field.key === 'geetest.id') setGeetestId(event.target.value)
                          else if (field.key === 'geetest.key') setGeetestKey(event.target.value)
                        }}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex justify-end">
            <Button onClick={handleSaveGeetest} loading={saving}>
              保存极验配置
            </Button>
          </div>
        </div>
      )}

      {/* SMTP 配置 Tab */}
      {activeTab === 'smtp' && (
        <div className="space-y-4">
          {SMTP_FIELDS.map((field) => {
            const Icon = field.icon

            return (
              <div key={field.key} className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-charcoal">{field.label}</h3>
                      <p className="mt-1 text-sm text-stone">{field.description}</p>
                    </div>

                    <Input
                      type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                      value={
                        field.key === 'smtp.host'
                          ? smtpHost
                          : field.key === 'smtp.port'
                            ? smtpPort
                            : field.key === 'smtp.user'
                              ? smtpUser
                              : field.key === 'smtp.password'
                                ? smtpPassword
                                : field.key === 'smtp.from'
                                  ? smtpFrom
                                  : ''
                      }
                      onChange={(event) => {
                        if (field.key === 'smtp.host') setSmtpHost(event.target.value)
                        else if (field.key === 'smtp.port') setSmtpPort(event.target.value)
                        else if (field.key === 'smtp.user') setSmtpUser(event.target.value)
                        else if (field.key === 'smtp.password') setSmtpPassword(event.target.value)
                        else if (field.key === 'smtp.from') setSmtpFrom(event.target.value)
                      }}
                      placeholder={field.placeholder}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex justify-end">
            <Button onClick={handleSaveSMTP} loading={saving}>
              保存 SMTP 配置
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSettingsPage
