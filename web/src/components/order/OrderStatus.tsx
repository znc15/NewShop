import { OrderStatus, OrderStatusLabels, OrderStatusColors } from '../../types/order';

// 进度步骤中使用的状态列表
const PROGRESS_STATUSES = [
  OrderStatus.Pending,
  OrderStatus.Paid,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Completed,
] as const;

interface OrderStatusProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

// 订单状态徽章组件
export function OrderStatusBadge({
  status,
  size = 'md',
  showDot = false,
}: OrderStatusProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${sizeClasses[size]} ${
        OrderStatusColors[status] || 'text-gray-600 bg-gray-50'
      }`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === OrderStatus.Completed
              ? 'bg-green-500'
              : status === OrderStatus.Cancelled || status === OrderStatus.Refunded
              ? 'bg-red-500'
              : 'bg-primary'
          }`}
        />
      )}
      {OrderStatusLabels[status] || status}
    </span>
  );
}

// 订单状态步骤条组件
interface OrderStatusStepsProps {
  currentStatus: string;
  completedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export function OrderStatusSteps({
  currentStatus,
  createdAt,
  paidAt,
  shippedAt,
  deliveredAt,
  completedAt,
}: OrderStatusStepsProps) {
  const steps = [
    { key: OrderStatus.Pending, label: '提交订单', time: createdAt },
    { key: OrderStatus.Paid, label: '支付成功', time: paidAt },
    { key: OrderStatus.Shipped, label: '商品发货', time: shippedAt },
    { key: OrderStatus.Delivered, label: '已送达', time: deliveredAt },
    { key: OrderStatus.Completed, label: '已完成', time: completedAt },
  ];

  // 计算当前步骤索引
  const currentIndex = PROGRESS_STATUSES.indexOf(currentStatus as (typeof PROGRESS_STATUSES)[number]);

  // 取消或退款状态特殊处理
  const isSpecialStatus =
    currentStatus === OrderStatus.Cancelled || currentStatus === OrderStatus.Refunded;

  if (isSpecialStatus) {
    return (
      <div className="text-center py-4">
        <OrderStatusBadge status={currentStatus} size="lg" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 步骤条 */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex && step.time;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.key} className="flex-1 relative">
              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-3 left-1/2 w-full h-0.5 ${
                    index < currentIndex ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* 步骤点 */}
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium z-10 ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                >
                  {index + 1}
                </div>
                <p
                  className={`mt-2 text-xs ${
                    isCurrent ? 'text-primary font-medium' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OrderStatusBadge;
