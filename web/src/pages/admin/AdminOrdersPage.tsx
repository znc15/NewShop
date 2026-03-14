import { useEffect, useState, useCallback } from 'react'
import adminService from '@/services/admin'
import type { AdminOrder, AdminOrderListParams, ShipOrderRequest } from '@/types/admin'
import { DataTable, Pagination, SearchInput, Select, Modal, StatusBadge } from '@/components/admin/AdminComponents'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// 订单状态配置
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  delivered: '已送达',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-red-100 text-red-800',
}

// 物流公司列表
const LOGISTICS_COMPANIES = [
  { value: '顺丰速运', label: '顺丰速运' },
  { value: '圆通快递', label: '圆通快递' },
  { value: '中通快递', label: '中通快递' },
  { value: '韵达快递', label: '韵达快递' },
  { value: '申通快递', label: '申通快递' },
  { value: '邮政EMS', label: '邮政EMS' },
  { value: '京东物流', label: '京东物流' },
]

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [params, setParams] = useState<AdminOrderListParams>({
    page: 1,
    page_size: 10,
  })

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [shipModalOpen, setShipModalOpen] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [shipForm, setShipForm] = useState<ShipOrderRequest>({
    tracking_company: '',
    tracking_no: '',
  })
  const [refundReason, setRefundReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getOrders(params)
      setOrders(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('获取订单列表失败:', error)
      // 模拟数据
      setOrders([
        {
          id: 1,
          order_no: 'ORD202401150001',
          user_id: 101,
          user_name: '张三',
          user_email: 'zhangsan@example.com',
          status: 'paid',
          total_amount: 598,
          discount_amount: 0,
          shipping_fee: 0,
          pay_amount: 598,
          payment_method: 'wechat',
          receiver_name: '张三',
          receiver_phone: '13800138000',
          receiver_address: '北京市朝阳区xxx街道xxx号',
          items_count: 2,
          remark: '请尽快发货',
          cancel_reason: null,
          refund_reason: null,
          tracking_company: null,
          tracking_no: null,
          paid_at: '2024-01-15 10:30:00',
          shipped_at: null,
          delivered_at: null,
          completed_at: null,
          cancelled_at: null,
          refunded_at: null,
          created_at: '2024-01-15 10:25:00',
          updated_at: '2024-01-15 10:30:00',
        },
        {
          id: 2,
          order_no: 'ORD202401150002',
          user_id: 102,
          user_name: '李四',
          user_email: 'lisi@example.com',
          status: 'shipped',
          total_amount: 1299,
          discount_amount: 100,
          shipping_fee: 0,
          pay_amount: 1199,
          payment_method: 'alipay',
          receiver_name: '李四',
          receiver_phone: '13900139000',
          receiver_address: '上海市浦东新区xxx路xxx号',
          items_count: 1,
          remark: '',
          cancel_reason: null,
          refund_reason: null,
          tracking_company: '顺丰速运',
          tracking_no: 'SF1234567890',
          paid_at: '2024-01-14 15:20:00',
          shipped_at: '2024-01-15 09:00:00',
          delivered_at: null,
          completed_at: null,
          cancelled_at: null,
          refunded_at: null,
          created_at: '2024-01-14 15:15:00',
          updated_at: '2024-01-15 09:00:00',
        },
      ])
      setTotal(2)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleSearch = (orderNo: string) => {
    setParams((prev) => ({ ...prev, page: 1, order_no: orderNo || undefined }))
  }

  const handleStatusChange = (status: string) => {
    setParams((prev) => ({ ...prev, page: 1, status: status || undefined }))
  }

  const openDetailModal = (order: AdminOrder) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  const openShipModal = (order: AdminOrder) => {
    setSelectedOrder(order)
    setShipForm({
      tracking_company: order.tracking_company || '',
      tracking_no: order.tracking_no || '',
    })
    setShipModalOpen(true)
  }

  const openRefundModal = (order: AdminOrder) => {
    setSelectedOrder(order)
    setRefundReason('')
    setRefundModalOpen(true)
  }

  const handleShip = async () => {
    if (!selectedOrder || !shipForm.tracking_company || !shipForm.tracking_no) {
      alert('请填写完整的物流信息')
      return
    }

    setSaving(true)
    try {
      await adminService.shipOrder(selectedOrder.id, shipForm)
      setShipModalOpen(false)
      fetchOrders()
    } catch (error) {
      console.error('发货失败:', error)
      alert('发货失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleRefund = async () => {
    if (!selectedOrder || !refundReason) {
      alert('请填写退款原因')
      return
    }

    setSaving(true)
    try {
      await adminService.refundOrder(selectedOrder.id, { reason: refundReason })
      setRefundModalOpen(false)
      fetchOrders()
    } catch (error) {
      console.error('退款失败:', error)
      alert('退款失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'order_no',
      title: '订单号',
      render: (item: AdminOrder) => (
        <button
          onClick={() => openDetailModal(item)}
          className="text-forest-600 hover:underline font-mono text-sm"
        >
          {item.order_no}
        </button>
      ),
    },
    {
      key: 'user',
      title: '用户',
      render: (item: AdminOrder) => (
        <div>
          <p className="font-medium text-sm">{item.user_name}</p>
          <p className="text-xs text-stone">{item.user_email}</p>
        </div>
      ),
    },
    {
      key: 'receiver_name',
      title: '收货人',
      render: (item: AdminOrder) => (
        <div>
          <p className="text-sm">{item.receiver_name}</p>
          <p className="text-xs text-stone">{item.receiver_phone}</p>
        </div>
      ),
    },
    {
      key: 'pay_amount',
      title: '实付金额',
      render: (item: AdminOrder) => (
        <span className="font-medium text-copper-600">¥{item.pay_amount}</span>
      ),
    },
    {
      key: 'items_count',
      title: '商品数',
      render: (item: AdminOrder) => <span>{item.items_count} 件</span>,
    },
    {
      key: 'status',
      title: '状态',
      render: (item: AdminOrder) => (
        <StatusBadge
          status={item.status}
          labels={ORDER_STATUS_LABELS}
          colors={ORDER_STATUS_COLORS}
        />
      ),
    },
    {
      key: 'created_at',
      title: '下单时间',
      render: (item: AdminOrder) => (
        <span className="text-sm text-stone">{item.created_at}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (item: AdminOrder) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetailModal(item)}
            className="px-2 py-1 text-xs bg-cream-100 text-charcoal rounded hover:bg-cream-200 transition-colors"
          >
            详情
          </button>
          {item.status === 'paid' && (
            <button
              onClick={() => openShipModal(item)}
              className="px-2 py-1 text-xs bg-forest-100 text-forest-700 rounded hover:bg-forest-200 transition-colors"
            >
              发货
            </button>
          )}
          {(item.status === 'paid' || item.status === 'shipped') && (
            <button
              onClick={() => openRefundModal(item)}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              退款
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={params.order_no || ''}
          onChange={handleSearch}
          placeholder="搜索订单号..."
          className="w-64"
        />
        <Select
          value={params.status || ''}
          onChange={handleStatusChange}
          options={Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          placeholder="全部状态"
        />
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-cream-200">
        <DataTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyText="暂无订单数据"
        />
        {total > 0 && (
          <div className="px-4 py-4 border-t border-cream-200">
            <Pagination
              page={params.page || 1}
              pageSize={params.page_size || 10}
              total={total}
              onChange={(page) => setParams((prev) => ({ ...prev, page }))}
            />
          </div>
        )}
      </div>

      {/* 订单详情弹窗 */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`订单详情 - ${selectedOrder?.order_no || ''}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* 订单状态 */}
            <div className="flex items-center justify-between">
              <StatusBadge
                status={selectedOrder.status}
                labels={ORDER_STATUS_LABELS}
                colors={ORDER_STATUS_COLORS}
              />
              <span className="text-sm text-stone">
                下单时间：{selectedOrder.created_at}
              </span>
            </div>

            {/* 收货信息 */}
            <div className="bg-cream-50 rounded-lg p-4">
              <h4 className="font-medium text-charcoal mb-2">收货信息</h4>
              <p className="text-sm">
                {selectedOrder.receiver_name} {selectedOrder.receiver_phone}
              </p>
              <p className="text-sm text-stone mt-1">
                {selectedOrder.receiver_address}
              </p>
            </div>

            {/* 物流信息 */}
            {selectedOrder.tracking_company && (
              <div className="bg-cream-50 rounded-lg p-4">
                <h4 className="font-medium text-charcoal mb-2">物流信息</h4>
                <p className="text-sm">
                  {selectedOrder.tracking_company}：{selectedOrder.tracking_no}
                </p>
              </div>
            )}

            {/* 金额信息 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone">商品总额</span>
                <span>¥{selectedOrder.total_amount}</span>
              </div>
              {selectedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone">优惠金额</span>
                  <span className="text-green-600">-¥{selectedOrder.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t border-cream-200">
                <span>实付金额</span>
                <span className="text-copper-600">¥{selectedOrder.pay_amount}</span>
              </div>
            </div>

            {/* 备注 */}
            {selectedOrder.remark && (
              <div className="bg-cream-50 rounded-lg p-4">
                <h4 className="font-medium text-charcoal mb-2">买家备注</h4>
                <p className="text-sm text-stone">{selectedOrder.remark}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 发货弹窗 */}
      <Modal
        open={shipModalOpen}
        onClose={() => setShipModalOpen(false)}
        title="订单发货"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone">
            订单号：{selectedOrder?.order_no}
          </p>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              物流公司 <span className="text-red-500">*</span>
            </label>
            <select
              value={shipForm.tracking_company}
              onChange={(e) => setShipForm((prev) => ({ ...prev, tracking_company: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
            >
              <option value="">请选择物流公司</option>
              {LOGISTICS_COMPANIES.map((company) => (
                <option key={company.value} value={company.value}>
                  {company.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              物流单号 <span className="text-red-500">*</span>
            </label>
            <Input
              value={shipForm.tracking_no}
              onChange={(e) => setShipForm((prev) => ({ ...prev, tracking_no: e.target.value }))}
              placeholder="请输入物流单号"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShipModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleShip} loading={saving}>
              {saving ? '发货中...' : '确认发货'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 退款弹窗 */}
      <Modal
        open={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="订单退款"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone">
            订单号：{selectedOrder?.order_no}
          </p>
          <p className="text-sm">
            退款金额：<span className="font-medium text-copper-600">¥{selectedOrder?.pay_amount}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              退款原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="请输入退款原因"
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setRefundModalOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleRefund} loading={saving}>
              {saving ? '处理中...' : '确认退款'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminOrdersPage
