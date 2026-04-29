import { Link } from 'react-router-dom';
import { formatPriceWithSymbol, formatDate } from '@/utils';
import { OrderStatus, OrderStatusLabels, OrderStatusColors } from '../../types/order';
import type { OrderListItem } from '../../types/order';

interface OrderCardProps {
  order: OrderListItem;
  showActions?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onPay?: () => void;
}

// 订单卡片组件 - 用于订单列表页
export function OrderCard({
  order,
  showActions = true,
  onCancel,
  onConfirm,
  onPay,
}: OrderCardProps) {
  // 根据状态显示操作按钮
  const renderActions = () => {
    if (!showActions) return null;

    switch (order.status) {
      case OrderStatus.Pending:
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                onCancel?.();
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onPay?.();
              }}
              className="px-3 py-1.5 bg-primary text-white rounded-full text-sm hover:bg-primary/90"
            >
              去支付
            </button>
          </div>
        );
      case OrderStatus.Shipped:
        return (
          <button
            onClick={(e) => {
              e.preventDefault();
              onConfirm?.();
            }}
            className="px-3 py-1.5 bg-primary text-white rounded-full text-sm hover:bg-primary/90"
          >
            确认收货
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <Link
      to={`/orders/${order.id}`}
      className="block bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors overflow-hidden"
    >
      {/* 订单头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${OrderStatusColors[order.status]}`}>
          {OrderStatusLabels[order.status]}
        </span>
      </div>

      {/* 商品预览 */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* 商品图片 */}
          <div className="flex -space-x-2">
            {order.items.slice(0, 3).map((item, index) => (
              <img
                key={index}
                src={item.product_image || item.image}
                alt={item.product_name}
                className="w-12 h-12 object-cover rounded-lg border-2 border-white"
              />
            ))}
            {order.items.length > 3 && (
              <div className="w-12 h-12 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                +{order.items.length - 3}
              </div>
            )}
          </div>

          {/* 商品信息摘要 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 line-clamp-1">
              {order.items[0]?.product_name}
              {order.items.length > 1 && ` 等${order.items.length}件商品`}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              共{order.items.reduce((sum, item) => sum + item.quantity, 0)}件
            </p>
          </div>

          {/* 金额和操作 */}
          <div className="text-right">
            <p className="text-primary font-semibold">
              {formatPriceWithSymbol(order.pay_amount)}
            </p>
            {renderActions()}
          </div>
        </div>
      </div>
    </Link>
  );
}

// 紧凑型订单卡片 - 用于用户中心等位置
export function OrderCardCompact({
  order,
}: {
  order: OrderListItem;
}) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
    >
      {/* 商品图片 */}
      <div className="flex -space-x-1">
        {order.items.slice(0, 2).map((item, index) => (
          <img
            key={index}
            src={item.product_image || item.image}
            alt={item.product_name}
            className="w-10 h-10 object-cover rounded border border-white"
          />
        ))}
      </div>

      {/* 状态和金额 */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${OrderStatusColors[order.status]}`}>
          {OrderStatusLabels[order.status]}
        </p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">
          {formatPriceWithSymbol(order.pay_amount)}
        </p>
      </div>

      {/* 箭头 */}
      <span className="text-gray-400">›</span>
    </Link>
  );
}

export default OrderCard;
