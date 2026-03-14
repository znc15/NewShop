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
import { motion, AnimatePresence, type Variants } from 'motion/react';
import orderService from '../../services/order';
import { formatPriceWithSymbol, formatDateTime } from '../../lib/utils';
import { OrderStatus, OrderStatusLabels, OrderStatusColors } from '../../types/order';
import type { Order } from '../../types/order';

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5 },
  },
};

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
    <motion.section
      className="bg-white rounded-lg border border-gray-100 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
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
            <motion.div
              key={step.status}
              className="flex items-start gap-4 pb-6 last:pb-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              {/* 连接线 */}
              {index < logisticsSteps.length - 1 && (
                <motion.div
                  className={`absolute left-[11px] top-6 w-0.5 h-8 ${
                    isCompleted ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                />
              )}
              {/* 状态点 */}
              <motion.div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
              >
                {index + 1}
              </motion.div>
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
            </motion.div>
          );
        })}

        {/* 取消/退款状态 */}
        <AnimatePresence>
          {(order.status === OrderStatus.Cancelled || order.status === OrderStatus.Refunded) && (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
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
      <motion.div
        className="max-w-4xl mx-auto px-4 py-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="space-y-6" variants={itemVariants}>
          <motion.div
            className="h-8 w-32 bg-gray-200 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="h-32 bg-gray-200 rounded-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          />
          <motion.div
            className="h-64 bg-gray-200 rounded-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="h-48 bg-gray-200 rounded-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
        </motion.div>
      </motion.div>
    );
  }

  if (error || !order) {
    return (
      <motion.div
        className="max-w-4xl mx-auto px-4 py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center py-20">
          <p className="text-gray-500">{error || '订单不存在'}</p>
          <motion.button
            onClick={() => navigate('/orders')}
            className="mt-4 text-primary hover:underline"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            返回订单列表
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto px-4 py-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* 返回按钮 */}
      <motion.button
        onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        variants={itemVariants}
        whileHover={{ x: -5 }}
      >
        <ChevronLeft className="w-5 h-5" />
        返回订单列表
      </motion.button>

      {/* 订单状态头部 */}
      <motion.div
        className="bg-white rounded-lg border border-gray-100 p-6 mb-6"
        variants={itemVariants}
        whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">订单号: {order.order_no}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {OrderStatusLabels[order.status]}
            </h1>
          </div>
          <motion.span
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              OrderStatusColors[order.status]
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {OrderStatusLabels[order.status]}
          </motion.span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧内容 */}
        <motion.div className="lg:col-span-2 space-y-6" variants={containerVariants}>
          {/* 物流进度 */}
          <LogisticsSection order={order} />

          {/* 收货地址 */}
          <motion.section
            className="bg-white rounded-lg border border-gray-100 p-6"
            variants={itemVariants}
            whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
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
          </motion.section>

          {/* 商品清单 */}
          <motion.section
            className="bg-white rounded-lg border border-gray-100 p-6"
            variants={itemVariants}
            whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
            <h2 className="text-lg font-medium text-gray-900 mb-4">商品清单</h2>
            <motion.div
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {order.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/products/${item.product_id}`}
                    className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <motion.img
                      src={item.product_image ?? item.image ?? ''}
                      alt={item.product_name}
                      className="w-20 h-20 object-cover rounded-lg"
                      whileHover={{ scale: 1.05 }}
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
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          {/* 订单信息 */}
          <motion.section
            className="bg-white rounded-lg border border-gray-100 p-6"
            variants={itemVariants}
            whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
            <h2 className="text-lg font-medium text-gray-900 mb-4">订单信息</h2>
            <div className="space-y-3 text-sm">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">下单时间:</span>
                <span className="text-gray-900">{formatDateTime(order.created_at)}</span>
              </motion.div>
              {order.paid_at && (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">支付时间:</span>
                  <span className="text-gray-900">{formatDateTime(order.paid_at)}</span>
                </motion.div>
              )}
              {order.shipped_at && (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">发货时间:</span>
                  <span className="text-gray-900">{formatDateTime(order.shipped_at)}</span>
                </motion.div>
              )}
              {order.remark && (
                <motion.div
                  className="flex items-start gap-2 pt-2 border-t border-gray-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <span className="text-gray-500">订单备注:</span>
                  <span className="text-gray-900">{order.remark}</span>
                </motion.div>
              )}
            </div>
          </motion.section>
        </motion.div>

        {/* 右侧金额信息 */}
        <motion.div className="lg:col-span-1" variants={fadeVariants}>
          <div className="sticky top-4 space-y-6">
            {/* 金额明细 */}
            <motion.div
              className="bg-white rounded-lg border border-gray-100 p-6"
              whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
            >
              <h2 className="text-lg font-medium text-gray-900 mb-4">金额明细</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">商品总额</span>
                  <span className="text-gray-900">{formatPriceWithSymbol(order.total_amount)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <motion.div
                    className="flex justify-between text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span>优惠金额</span>
                    <span>-{formatPriceWithSymbol(order.discount_amount)}</span>
                  </motion.div>
                )}
                {order.coupon_discount > 0 && (
                  <motion.div
                    className="flex justify-between text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <span>优惠券</span>
                    <span>-{formatPriceWithSymbol(order.coupon_discount)}</span>
                  </motion.div>
                )}
                {order.points_discount > 0 && (
                  <motion.div
                    className="flex justify-between text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span>积分抵扣</span>
                    <span>-{formatPriceWithSymbol(order.points_discount)}</span>
                  </motion.div>
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
                  <motion.span
                    className="text-primary font-bold text-2xl"
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                  >
                    {formatPriceWithSymbol(order.pay_amount)}
                  </motion.span>
                </div>
              </div>
            </motion.div>

            {/* 操作按钮 */}
            <motion.div
              className="bg-white rounded-lg border border-gray-100 p-6"
              whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
            >
              <OrderActions
                order={order}
                onCancel={handleCancel}
                onConfirm={handleConfirm}
                onPay={handlePay}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
