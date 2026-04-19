import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Tag, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import orderService from '../../services/order';
import userService from '../../services/user';
import { formatPriceWithSymbol } from '../../lib/utils';
import type { CheckoutPreviewResponse, CheckoutItem, OrderAddress } from '../../types/order';
import type { UserAddress } from '../../types/user';
import { useGeetest } from '../../hooks/useGeetest';

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

const slideVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
};

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
      <motion.button
        onClick={onClick}
        className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <MapPin className="w-5 h-5" />
        添加收货地址
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">
            {address.name}
            <span className="ml-3 text-gray-500">{address.phone}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">{address.full_address}</p>
        </div>
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
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
  const { verify } = useGeetest();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<OrderAddress | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState(0);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toOrderAddress = (address: UserAddress): OrderAddress => ({
    id: address.id,
    name: address.name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    address: address.address,
    full_address: address.full_address,
  });

  useEffect(() => {
    const cartItemIds = (location.state as { cartItemIds?: number[] } | null)?.cartItemIds || [];

    if (cartItemIds.length === 0) {
      navigate('/cart');
      return;
    }

    const fetchPreview = async () => {
      try {
        const addresses = await userService.getAddresses();
        const defaultAddress = addresses.find((item) => item.is_default) || addresses[0];

        if (!defaultAddress) {
          setPreview(null);
          setSelectedAddress(null);
          return;
        }

        setSelectedAddress(toOrderAddress(defaultAddress));

        const data = await orderService.getCheckoutPreview({
          address_id: defaultAddress.id,
          item_ids: cartItemIds,
        });
        setPreview(data);
      } catch (error) {
        console.error('获取结算预览失败:', error);
        setPreview(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [location.state, navigate]);

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
      const geetestResult = await verify('checkout');
      if (preview) {
        await orderService.createOrder({
          address_id: selectedAddress.id,
          items: preview.items.map(item => ({
            product_id: item.product_id,
            sku_id: item.sku_id,
            quantity: item.quantity,
          })),
          remark: remark || undefined,
          coupon_id: selectedCoupon || undefined,
          ...geetestResult,
        });
      }
      navigate('/order/success');
    } catch (error) {
      console.error('创建订单失败:', error);
    } finally {
      setSubmitting(false);
    }
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
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        </motion.div>
      </motion.div>
    );
  }

  if (!preview) {
    return (
      <motion.div
        className="max-w-4xl mx-auto px-4 py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500">无法获取结算信息</p>
          <motion.button
            onClick={() => navigate('/cart')}
            className="mt-4 text-primary hover:underline"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            返回购物车
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
      <motion.h1
        className="text-2xl font-bold text-gray-900 mb-6"
        variants={itemVariants}
      >
        确认订单
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧内容 */}
        <motion.div className="lg:col-span-2 space-y-6" variants={containerVariants}>
          {/* 收货地址 */}
          <motion.section
            className="bg-white rounded-lg border border-gray-100 p-6"
            variants={itemVariants}
            whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
            <h2 className="text-lg font-medium text-gray-900 mb-4">收货地址</h2>
            <AddressCard
              address={selectedAddress}
              selected={true}
              onClick={() => navigate('/address/select')}
            />
          </motion.section>

          {/* 商品清单 */}
          <motion.section
            className="bg-white rounded-lg border border-gray-100 p-6"
            variants={itemVariants}
            whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
            <h2 className="text-lg font-medium text-gray-900 mb-4">商品清单</h2>
            <motion.div
              className="divide-y divide-gray-100"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {preview.items.map((item) => (
                <motion.div key={item.cart_item_id} variants={slideVariants}>
                  <CheckoutItemCard item={item} />
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          {/* 优惠券和积分 */}
          <motion.section
            className="bg-white rounded-lg border border-gray-100 p-6"
            variants={itemVariants}
            whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
            <CouponSelector
              coupons={preview.available_coupons}
              selectedCoupon={selectedCoupon}
              onSelect={setSelectedCoupon}
              totalAmount={preview.total_amount}
            />

            {/* 积分抵扣 */}
            {preview.user_points > 0 && (
              <motion.div
                className="flex items-center justify-between py-4 border-t border-gray-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 text-gray-600">
                  <CreditCard className="w-5 h-5" />
                  <span>积分抵扣</span>
                  <span className="text-sm text-gray-400">
                    (可用 {preview.user_points} 积分，最大抵扣 {formatPriceWithSymbol(preview.max_points_usable * 100)})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setUsePoints(Math.max(0, usePoints - 10))}
                    className="w-8 h-8 rounded border border-gray-200 hover:bg-gray-50"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    -
                  </motion.button>
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
                  <motion.button
                    onClick={() => setUsePoints(Math.min(usePoints + 10, preview.user_points, preview.max_points_usable))}
                    className="w-8 h-8 rounded border border-gray-200 hover:bg-gray-50"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    +
                  </motion.button>
                  <span className="text-primary">
                    -{formatPriceWithSymbol(pointsDiscount)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* 备注 */}
            <motion.div
              className="pt-4 border-t border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-gray-600 mb-2">订单备注</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="选填，如有特殊需求请备注"
                rows={2}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </motion.div>
          </motion.section>
        </motion.div>

        {/* 右侧结算栏 */}
        <motion.div
          className="lg:col-span-1"
          variants={itemVariants}
        >
          <motion.div
            className="sticky top-4 bg-white rounded-lg border border-gray-100 p-6"
            whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          >
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
                <motion.div
                  className="flex justify-between text-primary"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span>优惠券</span>
                  <span>-{formatPriceWithSymbol(couponDiscount)}</span>
                </motion.div>
              )}
              {pointsDiscount > 0 && (
                <motion.div
                  className="flex justify-between text-primary"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span>积分抵扣</span>
                  <span>-{formatPriceWithSymbol(pointsDiscount)}</span>
                </motion.div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">应付金额</span>
                <motion.span
                  key={totalAmount}
                  className="text-primary font-bold text-2xl"
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                >
                  {formatPriceWithSymbol(totalAmount)}
                </motion.span>
              </div>
            </div>

            <motion.button
              onClick={handleSubmit}
              disabled={submitting || !selectedAddress}
              className="w-full mt-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {submitting ? '提交中...' : '提交订单'}
            </motion.button>

            <p className="mt-4 text-xs text-gray-400 text-center">
              提交订单即表示您同意《用户购买协议》
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
