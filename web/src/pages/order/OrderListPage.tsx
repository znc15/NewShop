import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { orderService } from '../../services/order'
import { formatPriceWithSymbol, formatDate } from '../../lib/utils'
import { OrderStatus, OrderStatusLabels, OrderStatusColors } from '../../types/order'
import type { OrderListItem, OrderStatusType } from '../../types/order'

// 状态筛选标签
const statusTabs: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: OrderStatus.Pending, label: '待付款' },
  { value: OrderStatus.Paid, label: '待发货' },
  { value: OrderStatus.Shipped, label: '待收货' },
  { value: OrderStatus.Completed, label: '已完成' },
];

// 订单卡片组件
function OrderCard({
  order,
  onCancel,
  onConfirm,
  onPay,
}: {
  order: OrderListItem;
  onCancel?: () => void;
  onConfirm?: () => void;
  onPay?: () => void;
}) {
  const navigate = useNavigate();

  // 根据状态显示操作按钮
  const renderActions = () => {
    switch (order.status) {
      case OrderStatus.Pending:
        return (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.();
              }}
              className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
            >
              取消订单
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPay?.();
              }}
              className="px-4 py-2 bg-primary text-white rounded-full text-sm hover:bg-primary/90"
            >
              立即支付
            </button>
          </>
        );
      case OrderStatus.Shipped:
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm?.();
            }}
            className="px-4 py-2 bg-primary text-white rounded-full text-sm hover:bg-primary/90"
          >
            确认收货
          </button>
        );
      case OrderStatus.Completed:
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/products');
            }}
            className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50"
          >
            再次购买
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
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{formatDate(order.created_at)}</span>
          <span>订单号: {order.order_no}</span>
        </div>
        <span className={`px-2 py-1 rounded text-sm ${OrderStatusColors[order.status]}`}>
          {OrderStatusLabels[order.status]}
        </span>
      </div>

      {/* 商品列表 */}
      <div className="p-4">
        {order.items.slice(0, 3).map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-4 py-2 first:pt-0 last:pb-0"
          >
            <img
              src={item.product_image || item.image}
              alt={item.product_name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 line-clamp-1">{item.product_name}</p>
              <p className="text-sm text-gray-500 mt-1">x{item.quantity}</p>
            </div>
            <p className="text-gray-900">{formatPriceWithSymbol(item.price)}</p>
          </div>
        ))}

        {/* 更多商品提示 */}
        {order.items.length > 3 && (
          <p className="text-sm text-gray-400 text-center py-2">
            共 {order.items.length} 件商品
          </p>
        )}
      </div>

      {/* 订单底部 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          共 {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件商品
          <span className="ml-4">
            实付款: <span className="text-primary font-semibold">{formatPriceWithSymbol(order.pay_amount)}</span>
          </span>
        </p>
        <div className="flex items-center gap-3" onClick={(e) => e.preventDefault()}>
          {renderActions()}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </Link>
  );
}

// 空订单列表组件
function EmptyOrders({ currentTab }: { currentTab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShoppingBag className="w-24 h-24 text-gray-200 mb-6" />
      <h2 className="text-xl font-medium text-gray-900 mb-2">
        {currentTab === '' ? '暂无订单' : `暂无${statusTabs.find(t => t.value === currentTab)?.label}订单`}
      </h2>
      <p className="text-gray-500 mb-6">去挑选心仪的商品吧</p>
      <Link
        to="/"
        className="px-8 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
      >
        去购物
      </Link>
    </div>
  );
}

// 加载骨架屏
function OrderSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden animate-pulse">
          <div className="h-12 bg-gray-100" />
          <div className="p-4 space-y-4">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-16 bg-gray-50" />
        </div>
      ))}
    </div>
  );
}

export default function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStatus = searchParams.get('status') || '';

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchOrders = useCallback(async (pageNum: number, status: string) => {
    setLoading(true);
    try {
      const response = await orderService.getOrderList({
        status: (status || undefined) as OrderStatusType | undefined,
        page: pageNum,
        page_size: 10,
      });
      if (pageNum === 1) {
        setOrders(response.items);
      } else {
        setOrders((prev) => [...prev, ...response.items]);
      }
      setHasMore(response.items.length === 10);
    } catch (error) {
      console.error('获取订单列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchOrders(1, currentStatus);
  }, [currentStatus, fetchOrders]);

  const handleTabChange = (status: string) => {
    setSearchParams(status ? { status } : {});
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage, currentStatus);
  };

  const handleCancel = async (_orderId: number) => {
    if (window.confirm('确定要取消该订单吗？')) {
      // TODO: 调用取消订单 API
      fetchOrders(1, currentStatus);
    }
  };

  const handleConfirm = async (_orderId: number) => {
    if (window.confirm('确认已收到货物吗？')) {
      // TODO: 调用确认收货 API
      fetchOrders(1, currentStatus);
    }
  };

  const handlePay = (_orderId: number) => {
    // TODO: 跳转支付页面
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的订单</h1>

      {/* 状态筛选标签 */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${
              currentStatus === tab.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 订单列表 */}
      {loading && orders.length === 0 ? (
        <OrderSkeleton />
      ) : orders.length === 0 ? (
        <EmptyOrders currentTab={currentStatus} />
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={() => handleCancel(order.id)}
                onConfirm={() => handleConfirm(order.id)}
                onPay={() => handlePay(order.id)}
              />
            ))}
          </div>

          {/* 加载更多 */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-8 py-2 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}

          {/* 没有更多了 */}
          {!hasMore && orders.length > 0 && (
            <p className="mt-6 text-center text-gray-400 text-sm">
              没有更多订单了
            </p>
          )}
        </>
      )}
    </div>
  );
}
