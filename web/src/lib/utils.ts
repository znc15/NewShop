// 工具函数
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 合并 Tailwind 类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化价格（分转元）
export function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2);
}

// 格式化价格（带货币符号）
export function formatPriceWithSymbol(priceInCents: number): string {
  return `¥${formatPrice(priceInCents)}`;
}

// 格式化日期
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// 格式化日期时间
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 生成订单号显示格式
export function formatOrderNo(orderNo: string): string {
  if (orderNo.length <= 8) return orderNo;
  return `${orderNo.slice(0, 4)}****${orderNo.slice(-4)}`;
}

// 截断文本
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
