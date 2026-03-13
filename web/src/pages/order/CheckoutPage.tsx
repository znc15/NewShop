import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Tag, ChevronRight, Check, AlertCircle } from 'lucide-react';
import orderService from '../../services/order';
import { formatPriceWithSymbol } from '../../lib/utils';
import type { CheckoutPreviewResponse, CheckoutItem, OrderAddress } from '../../types/order';

// 地址卡片组件
function AddressCard({
  address,
  selected,
  onClick,
}: {
  address: OrderAddress | null;
  selected: boolean;
  onClick: () => void;
}) {
  if (!address) {
    return (
      <button
        onClick={onClick}
        className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <MapPin className="w-5 h-5" />
        添加收货地址
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">
            {address.name}
            <span className="ml-3 text-gray-500">{address.phone}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">{address.full_address}</p>
        </div>
        {selected && (
          <Check className="w-5 h-5 text-primary flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

// 商品项组件
function CheckoutItemCard({ item }: { item: CheckoutItem }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0">
      <img
        src={item.product_image}
        alt={item.product_name}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 font-medium line-clamp-1">{item.product_name}</p>
        {item.sku_specs && (
          <p className="text-sm text-gray-500 mt-0.5">{item.sku_specs}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-gray-900">{formatPriceWithSymbol(item.price)}</p>
        <p className="text-sm text-gray-500">x{item.quantity}</p>
      </div>
    </div>
  );
}

// 优惠券选择组件
function CouponSelector({
  coupons,
  selectedCoupon,
  onSelect,
  totalAmount,
}: {
  coupons: CheckoutPreviewResponse['available_coupons'];
  selectedCoupon: number | null;
  onSelect: (couponId: number | null) => void;
  totalAmount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const usableCoupons = coupons.filter((c) => totalAmount >= c.min_amount);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4"
      >
        <div className="flex items-center gap-2 text-gray-600">
          <Tag className="w-5 h-5" />
          <span>优惠券</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedCoupon ? (
            <span className="text-primary">
              -{formatPriceWithSymbol(
                coupons.find((c) => c.id === selectedCoupon)?.discount || 0
              )}
            </span>
          ) : usableCoupons.length > 0 ? (
            <span className="text-primary">{usableCoupons.length} 张可用</span>
          ) : (
            <span className="text-gray-400">暂无可用</span>
          )}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-100 z-10 max-h-64 overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`w-full p-3 rounded-lg text-left ${
                selectedCoupon === null ? 'bg-primary/5 border border-primary' : 'hover:bg-gray-50'
              }`}
            >
              <p className="text-gray-900">不使用优惠券</p>
            </button>
            {usableCoupons.map((coupon) => (
              <button
                key={coupon.id}
                onClick={() => {
                  onSelect(coupon.id);
                  setIsOpen(false);
                }}
                className={`w-full p-3 rounded-lg text-left mt-1 ${
                  selectedCoupon === coupon.id
                    ? 'bg-primary/5 border border-primary'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary">
                      ¥{coupon.discount / 100}
                    </p>
                    <p className="text-sm text-gray-500">{coupon.name}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    满{formatPriceWithSymbol(coupon.min_amount)}可用
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartItemIds = (location.state as { cartItemIds?: number[] })?.cartItemIds || [];

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<OrderAddress | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState(0);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cartItemIds.length === 0) {
      navigate('/cart');
      return;
    }

    const fetchPreview = async () => {
      try {
        const data = await orderService.getCheckoutPreview({ cart_item_ids: cartItemIds });
        setPreview(data);
        setSelectedAddress(data.default_address);
      } catch (error) {
        console.error('获取结算预览失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [cartItemIds, navigate]);

  // 计算金额
  const couponDiscount = selectedCoupon
    ? preview?.available_coupons.find((c) => c.id === selectedCoupon)?.discount || 0
    : 0;
  const pointsDiscount = usePoints * 100; // 1积分 = 100分
  const totalAmount = (preview?.total_amount || 0) + (preview?.shipping_fee || 0) - couponDiscount - pointsDiscount;

  const handleSubmit = async () => {
    if (!selectedAddress) {
      alert('请选择收货地址');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: 调用创建订单 API
      navigate('/order/success');
    } catch (error) {
      console.error('创建订单失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-64 bg-gray-200 rounded-lg" />
          <div className="h-32 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500">无法获取结算信息</p>
          <button
            onClick={() => navigate('/cart')}
            className="mt-4 text-primary hover:underline"
          >
            返回购物车
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">确认订单</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 收货地址 */}
          <section className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">收货地址</h2>
            <AddressCard
              address={selectedAddress}
              selected={true}
              onClick={() => navigate('/address/select')}
            />
          </section>

          {/* 商品清单 */}
          <section className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">商品清单</h2>
            <div className="divide-y divide-gray-100">
              {preview.items.map((item) => (
                <CheckoutItemCard key={item.cart_item_id} item={item} />
              ))}
            </div>
          </section>

          {/* 优惠券和积分 */}
          <section className="bg-white rounded-lg border border-gray-100 p-6">
            <CouponSelector
              coupons={preview.available_coupons}
              selectedCoupon={selectedCoupon}
              onSelect={setSelectedCoupon}
              totalAmount={preview.total_amount}
            />

            {/* 积分抵扣 */}
            {preview.user_points > 0 && (
              <div className="flex items-center justify-between py-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <CreditCard className="w-5 h-5" />
                  <span>积分抵扣</span>
                  <span className="text-sm text-gray-400">
                    (可用 {preview.user_points} 积分，最大抵扣 {formatPriceWithSymbol(preview.max_points_usable * 100)})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setUsePoints(Math.max(0, usePoints - 10))}
                    className="w-8 h-8 rounded border border-gray-200 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={usePoints}
                    onChange={(e) => {
                      const val = Math.min(
                        Math.max(0, parseInt(e.target.value) || 0),
                        Math.min(preview.user_points, preview.max_points_usable)
                      );
                      setUsePoints(val);
                    }}
                    className="w-20 h-8 text-center border border-gray-200 rounded"
                  />
                  <button
                    onClick={() => setUsePoints(Math.min(usePoints + 10, preview.user_points, preview.max_points_usable))}
                    className="w-8 h-8 rounded border border-gray-200 hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-primary">
                    -{formatPriceWithSymbol(pointsDiscount)}
                  </span>
                </div>
              </div>
            )}

            {/* 备注 */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-gray-600 mb-2">订单备注</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="选填，如有特殊需求请备注"
                rows={2}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </section>
        </div>

        {/* 右侧结算栏 */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">订单金额</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">商品金额</span>
                <span>{formatPriceWithSymbol(preview.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">运费</span>
                <span>
                  {preview.shipping_fee > 0
                    ? formatPriceWithSymbol(preview.shipping_fee)
                    : '免运费'}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>优惠券</span>
                  <span>-{formatPriceWithSymbol(couponDiscount)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>积分抵扣</span>
                  <span>-{formatPriceWithSymbol(pointsDiscount)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">应付金额</span>
                <span className="text-primary font-bold text-2xl">
                  {formatPriceWithSymbol(totalAmount)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedAddress}
              className="w-full mt-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '提交订单'}
            </button>

            <p className="mt-4 text-xs text-gray-400 text-center">
              提交订单即表示您同意《用户购买协议》
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
