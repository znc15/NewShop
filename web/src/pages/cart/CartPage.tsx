import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { useCartStore } from '../../stores/cartStore';
import { formatPriceWithSymbol } from '@/utils';
import type { CartItem } from '../../types/cart';

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 },
  },
};

const fadeVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

// 购物车商品项组件
function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  onSelect,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void | Promise<void>;
  onSelect: (selected: boolean) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const price = item.sku?.price ?? item.product.price;

  const handleRemove = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await Promise.resolve(onRemove());
    } finally {
      setIsDeleting(false);
    }
  };

  const isOutOfStock = item.sku ? item.sku.stock < item.quantity : item.product.stock < item.quantity;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
      variants={itemVariants}
      layout
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.2 }}
    >
      {/* 选择框 */}
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
        />
      </label>

      {/* 商品图片 */}
      <Link to={`/products/${item.product_id}`} className="flex-shrink-0">
        <motion.img
          src={item.sku?.image || item.product.main_image}
          alt={item.product.name}
          className="w-20 h-20 object-cover rounded-lg"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        />
      </Link>

      {/* 商品信息 */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/products/${item.product_id}`}
          className="text-gray-900 font-medium hover:text-primary line-clamp-2"
        >
          {item.product.name}
        </Link>
        {item.sku && (
          <p className="text-sm text-gray-500 mt-1">{item.sku.specs}</p>
        )}
        {isOutOfStock && (
          <p className="text-sm text-red-500 mt-1">库存不足</p>
        )}
      </div>

      {/* 单价 */}
      <div className="text-right w-24">
        <p className="text-gray-900 font-medium">{formatPriceWithSymbol(price)}</p>
        {item.product.original_price > price && (
          <p className="text-sm text-gray-400 line-through">
            {formatPriceWithSymbol(item.product.original_price)}
          </p>
        )}
      </div>

      {/* 数量控制 */}
      <div className="flex items-center gap-2 w-32">
        <motion.button
          onClick={() => onQuantityChange(Math.max(1, item.quantity - 1))}
          disabled={item.quantity <= 1}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.9 }}
        >
          <Minus className="w-4 h-4" />
        </motion.button>
        <input
          type="number"
          value={item.quantity}
          min={1}
          max={item.sku?.stock ?? item.product.stock}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val > 0) onQuantityChange(val);
          }}
          className="w-12 h-8 text-center border border-gray-200 rounded-lg"
        />
        <motion.button
          onClick={() => onQuantityChange(item.quantity + 1)}
          disabled={item.quantity >= (item.sku?.stock ?? item.product.stock)}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      {/* 小计 */}
      <div className="text-right w-28">
        <p className="text-primary font-semibold">
          {formatPriceWithSymbol(price * item.quantity)}
        </p>
      </div>

      {/* 删除按钮 */}
      <motion.button
        onClick={handleRemove}
        disabled={isDeleting}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        title="删除"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.9 }}
      >
        <Trash2 className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}

// 空购物车组件
function EmptyCart() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ShoppingBag className="w-24 h-24 text-gray-200 mb-6" />
      </motion.div>
      <h2 className="text-xl font-medium text-gray-900 mb-2">购物车是空的</h2>
      <p className="text-gray-500 mb-6">去挑选心仪的商品吧</p>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Link
          to="/"
          className="px-8 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
        >
          去购物
        </Link>
      </motion.div>
    </motion.div>
  );
}

// 加载骨架屏
function CartSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
          <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-28 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
        </motion.div>
      ))}
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const {
    items,
    totalCount,
    selectedCount,
    selectedPrice,
    loading,
    error,
    fetchCart,
    updateQuantity,
    removeItem,
    removeItems,
    toggleSelect,
    selectAll,
    getSelectedItems,
  } = useCartStore();

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const isAllSelected = useMemo(
    () => items.length > 0 && items.every((item) => item.selected),
    [items]
  );

  const handleSelectAll = (selected: boolean) => {
    selectAll(selected);
  };

  const handleDeleteSelected = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;

    if (window.confirm(`确定要删除选中的 ${selectedItems.length} 件商品吗？`)) {
      await removeItems(selectedItems.map((item) => item.id));
    }
  };

  const handleCheckout = () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      alert('请选择要结算的商品');
      return;
    }
    navigate('/checkout', {
      state: { cartItemIds: selectedItems.map((item) => item.id) },
    });
  };

  if (loading && items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.h1
          className="text-2xl font-bold text-gray-900 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          购物车
        </motion.h1>
        <CartSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.h1
        className="text-2xl font-bold text-gray-900 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        购物车
        {totalCount > 0 && (
          <span className="text-base font-normal text-gray-500 ml-2">
            共 {totalCount} 件商品
          </span>
        )}
      </motion.h1>

      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 商品列表头部 */}
          <motion.div
            className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-lg text-sm text-gray-600"
            variants={fadeVariants}
          >
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="ml-2">全选</span>
            </label>
            <span className="flex-1">商品信息</span>
            <span className="w-24 text-right">单价</span>
            <span className="w-32 text-center">数量</span>
            <span className="w-28 text-right">小计</span>
            <span className="w-10">操作</span>
          </motion.div>

          {/* 商品列表 */}
          <div className="space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={(quantity) => updateQuantity(item.id, quantity)}
                  onRemove={() => removeItem(item.id)}
                  onSelect={(selected) => toggleSelect(item.id, selected)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* 结算栏 */}
          <motion.div
            className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-4 -mx-4 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-gray-600">全选</span>
                </label>
                <motion.button
                  onClick={handleDeleteSelected}
                  disabled={selectedCount === 0}
                  className="text-gray-500 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  删除选中 ({selectedCount})
                </motion.button>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    已选择 <span className="text-primary font-semibold">{selectedCount}</span> 件商品
                  </p>
                  <p className="text-lg">
                    合计: <span className="text-primary font-bold text-2xl">{formatPriceWithSymbol(selectedPrice)}</span>
                  </p>
                </div>
                <motion.button
                  onClick={handleCheckout}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  去结算
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
