import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Truck,
  Clock,
  ChevronLeft,
  Copy,
  MessageCircle,
} from 'lucide-react';
import orderService from '../../services/order';
import { formatPriceWithSymbol, formatDateTime } from '../../lib/utils';
import { OrderStatus, OrderStatusLabels, OrderStatusColors } from '../../types/order';
import type { Order } from '../../types/order';

// 订单进度中的有效状态列表
const PROGRESS_STATUSES = [
  OrderStatus.Pending,
  OrderStatus.Paid,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Completed,
] as const;

// 物流信息组件
function LogisticsSection({ order }: { order: Order }) {
  const logisticsSteps = [
    { status: OrderStatus.Pending, label: '提交订单', time: order.created_at },
    { status: OrderStatus.Paid, label: '支付成功', time: order.paid_at },
    { status: OrderStatus.Shipped, label: '商品发货', time: order.shipped_at },
    { status: OrderStatus.Delivered, label: '已送达', time: order.delivered_at },
    { status: OrderStatus.Completed, label: '已完成', time: order.completed_at },
  ];

  // 计算当前进度
  const currentIndex = PROGRESS_STATUSES.indexOf(order.status as typeof PROGRESS_STATUSES[number]);

  return (
    <section className="bg-white rounded-lg border border-gray-100 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">订单进度</h2>
      <div className="relative">
        {logisticsSteps.map((step, index) => {
          const isCompleted = index <= currentIndex && step.time;
          const isCurrent = index === currentIndex;
          const isCancelled = order.status === OrderStatus.Cancelled;
          const isRefunded = order.status === OrderStatus.Refunded;

          if (isCancelled || isRefunded) {
            return null;
          }

          return (
            <div key={step.status} className="flex items-start gap-4 pb-6 last:pb-0">
              {/* 连接线 */}
              {index < logisticsSteps.length - 1 && (
                <div
                  className={`absolute left-[11px] top-6 w-0.5 h-8 ${
                    isCompleted ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}
              {/* 状态点 */}
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
              >
                {index + 1}
              </div>
              {/* 内容 */}
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    isCurrent ? 'text-primary' : 'text-gray-900'
                  }`}
                >
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDateTime(step.time)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* 取消/退款状态 */}
        {(order.status === OrderStatus.Cancelled || order.status === OrderStatus.Refunded) && (
          <div className="text-center py-8">
            <p className="text-lg font-medium text-gray-900">
              {OrderStatusLabels[order.status]}
            </p>
            {order.cancel_reason && (
              <p className="text-sm text-gray-500 mt-2">
                原因: {order.cancel_reason}
              </p>
            )}
            {order.cancelled_at && (
              <p className="text-sm text-gray-500 mt-1">
                {formatDateTime(order.cancelled_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// 操作按钮组件
function OrderActions({
  order,
  onCancel,
  onConfirm,
  onPay,
}: {
  order: Order;
  onCancel: () => void;
  onConfirm: () => void;
  onPay: () => void;
}) {
  const navigate = useNavigate();

  const handleCopyOrderNo = () => {
    navigator.clipboard.writeText(order.order_no);
    alert('订单号已复制');
  };

  // 通用按钮
  const commonButtons = (
    <>
      <button
        onClick={handleCopyOrderNo}
        className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
      >
        <Copy className="w-4 h-4 inline mr-1" />
        复制订单号
      </button>
      <button className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50">
        <MessageCircle className="w-4 h-4 inline mr-1" />
        联系客服
      </button>
    </>
  );

  switch (order.status) {
    case OrderStatus.Pending:
      return (
        <div className="flex items-center gap-3">
          {commonButtons}
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
          >
            取消订单
          </button>
          <button
            onClick={onPay}
            className="px-6 py-2 bg-primary text-white rounded-full text-sm hover:bg-primary/90"
          >
            立即支付
          </button>
        </div>
      );
    case OrderStatus.Shipped:
      return (
        <div className="flex items-center gap-3">
          {commonButtons}
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-primary text-white rounded-full text-sm hover:bg-primary/90"
          >
            确认收货
          </button>
        </div>
      );
    case OrderStatus.Delivered:
      return (
        <div className="flex items-center gap-3">
          {commonButtons}
          <button
            onClick={() => navigate(`/products/${order.items[0]?.product_id}`)}
            className="px-6 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
          >
            再次购买
          </button>
        </div>
      );
    case OrderStatus.Completed:
      return (
        <div className="flex items-center gap-3">
          {commonButtons}
          <button
            onClick={() => navigate(`/products/${order.items[0]?.product_id}`)}
            className="px-6 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
          >
            再次购买
          </button>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-3">
          {commonButtons}
        </div>
      );
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const data = await orderService.getOrderDetail(parseInt(id));
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取订单详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleCancel = async () => {
    if (!order) return;

    const reason = prompt('请输入取消原因:');
    if (!reason) return;

    try {
      await orderService.cancelOrder(order.id, { reason });
      const data = await orderService.getOrderDetail(order.id);
      setOrder(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消订单失败');
    }
  };

  const handleConfirm = async () => {
    if (!order) return;

    if (!window.confirm('确认已收到货物吗？')) return;

    try {
      await orderService.confirmReceive(order.id);
      const data = await orderService.getOrderDetail(order.id);
      setOrder(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '确认收货失败');
    }
  };

  const handlePay = () => {
    if (!order) return;
    // TODO: 跳转支付页面
    navigate(`/pay/${order.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-64 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-gray-500">{error || '订单不存在'}</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 text-primary hover:underline"
          >
            返回订单列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        返回订单列表
      </button>

      {/* 订单状态头部 */}
      <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">订单号: {order.order_no}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {OrderStatusLabels[order.status]}
            </h1>
          </div>
          <span
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              OrderStatusColors[order.status]
            }`}
          >
            {OrderStatusLabels[order.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 物流进度 */}
          <LogisticsSection order={order} />

          {/* 收货地址 */}
          <section className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">收货信息</h2>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {order.address.name}
                  <Phone className="w-4 h-4 inline ml-3 text-gray-400" />
                  {order.address.phone}
                </p>
                <p className="text-gray-600 mt-1">{order.address.full_address}</p>
              </div>
            </div>
          </section>

          {/* 商品清单 */}
          <section className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">商品清单</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.product_id}`}
                  className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <img
                    src={item.product_image ?? item.image ?? ''}
                    alt={item.product_name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium line-clamp-2">
                      {item.product_name}
                    </p>
                    {item.sku_specs && (
                      <p className="text-sm text-gray-500 mt-1">{item.sku_specs}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      编码: {item.sku_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900">{formatPriceWithSymbol(item.price)}</p>
                    <p className="text-sm text-gray-500">x{item.quantity}</p>
                    <p className="text-primary font-medium mt-1">
                      {formatPriceWithSymbol(item.total_price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 订单信息 */}
          <section className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">订单信息</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">下单时间:</span>
                <span className="text-gray-900">{formatDateTime(order.created_at)}</span>
              </div>
              {order.paid_at && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">支付时间:</span>
                  <span className="text-gray-900">{formatDateTime(order.paid_at)}</span>
                </div>
              )}
              {order.shipped_at && (
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">发货时间:</span>
                  <span className="text-gray-900">{formatDateTime(order.shipped_at)}</span>
                </div>
              )}
              {order.remark && (
                <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-500">订单备注:</span>
                  <span className="text-gray-900">{order.remark}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 右侧金额信息 */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-6">
            {/* 金额明细 */}
            <div className="bg-white rounded-lg border border-gray-100 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">金额明细</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">商品总额</span>
                  <span className="text-gray-900">{formatPriceWithSymbol(order.total_amount)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>优惠金额</span>
                    <span>-{formatPriceWithSymbol(order.discount_amount)}</span>
                  </div>
                )}
                {order.coupon_discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>优惠券</span>
                    <span>-{formatPriceWithSymbol(order.coupon_discount)}</span>
                  </div>
                )}
                {order.points_discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>积分抵扣</span>
                    <span>-{formatPriceWithSymbol(order.points_discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">运费</span>
                  <span className="text-gray-900">
                    {order.shipping_fee > 0
                      ? formatPriceWithSymbol(order.shipping_fee)
                      : '免运费'}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600">实付款</span>
                  <span className="text-primary font-bold text-2xl">
                    {formatPriceWithSymbol(order.pay_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="bg-white rounded-lg border border-gray-100 p-6">
              <OrderActions
                order={order}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                onPay={handlePay}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
