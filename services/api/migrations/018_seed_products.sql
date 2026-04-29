-- +goose Up
-- +goose StatementBegin

-- 分类数据
INSERT INTO categories (id, name, parent_id, level, sort, status, created_at, updated_at) VALUES
(1, '数码产品', 0, 1, 1, 'active', NOW(), NOW()),
(2, '服装鞋帽', 0, 1, 2, 'active', NOW(), NOW()),
(3, '家居生活', 0, 1, 3, 'active', NOW(), NOW()),
(4, '美妆个护', 0, 1, 4, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 品牌数据
INSERT INTO brands (id, name, logo, description, sort, status, created_at, updated_at) VALUES
(1, 'Apple', 'https://picsum.photos/seed/apple-logo/200/200', '苹果公司，全球领先的科技品牌', 1, 'active', NOW(), NOW()),
(2, 'Nike', 'https://picsum.photos/seed/nike-logo/200/200', '耐克，全球知名运动品牌', 2, 'active', NOW(), NOW()),
(3, 'MUJI', 'https://picsum.photos/seed/muji-logo/200/200', '无印良品，简约生活美学', 3, 'active', NOW(), NOW()),
(4, 'L''Oreal', 'https://picsum.photos/seed/loreal-logo/200/200', '欧莱雅，全球领先的美妆品牌', 4, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 商品数据
INSERT INTO products (id, name, category_id, brand_id, main_image, images, price, original_price, stock, sales, is_hot, is_sale, description, detail, status, sort, created_at, updated_at) VALUES
(1, 'iPhone 15 Pro', 1, 1,
  'https://picsum.photos/seed/iphone15pro/400/400',
  'https://picsum.photos/seed/iphone15pro-1/400/400,https://picsum.photos/seed/iphone15pro-2/400/400,https://picsum.photos/seed/iphone15pro-3/400/400',
  799900, 899900, 200, 156, true, true,
  '全新 iPhone 15 Pro，搭载 A17 Pro 芯片，钛金属设计，4800 万像素主摄',
  '<h3>全新设计</h3><p>采用航空级钛金属，更轻更强</p><h3>A17 Pro 芯片</h3><p>首款 3nm 芯片，性能飞跃</p><h3> Pro 级相机系统</h3><p>4800 万像素主摄，支持 ProRAW</p>',
  'published', 1, NOW(), NOW()),

(2, 'MacBook Air M3', 1, 1,
  'https://picsum.photos/seed/macbook-air-m3/400/400',
  'https://picsum.photos/seed/macbook-m3-1/400/400,https://picsum.photos/seed/macbook-m3-2/400/400',
  899900, 999900, 100, 89, true, false,
  'MacBook Air 搭载 M3 芯片，13.6 英寸 Liquid Retina 显示屏，轻薄便携',
  '<h3>M3 芯片</h3><p>8 核 CPU，10 核 GPU，性能卓越</p><h3>超长续航</h3><p>长达 18 小时电池续航</p>',
  'published', 2, NOW(), NOW()),

(3, 'AirPods Pro 2', 1, 1,
  'https://picsum.photos/seed/airpods-pro2/400/400',
  'https://picsum.photos/seed/airpods-1/400/400,https://picsum.photos/seed/airpods-2/400/400',
  189900, 199900, 500, 312, false, true,
  'AirPods Pro 第二代，搭载 H2 芯片，主动降噪，自适应通透模式',
  '<h3>H2 芯片</h3><p>智能降噪，沉浸音质</p><h3>自适应通透模式</h3><p>动态调节环境声音</p>',
  'published', 3, NOW(), NOW()),

(4, 'Nike Air Max 270', 2, 2,
  'https://picsum.photos/seed/nike-airmax/400/400',
  'https://picsum.photos/seed/nike-1/400/400,https://picsum.photos/seed/nike-2/400/400',
  129900, 159900, 300, 245, true, true,
  'Nike Air Max 270 运动鞋，270 度气垫，舒适缓震，经典百搭',
  '<h3>270 度 Max Air 气垫</h3><p>全掌缓震，步伐轻盈</p><h3>网眼鞋面</h3><p>透气舒适，持久包裹</p>',
  'published', 4, NOW(), NOW()),

(5, 'Nike Dri-FIT T 恤', 2, 2,
  'https://picsum.photos/seed/nike-tshirt/400/400',
  'https://picsum.photos/seed/nike-t-1/400/400',
  29900, 39900, 600, 178, false, true,
  'Nike Dri-FIT 速干 T 恤，运动休闲两不误，透气排汗',
  '<h3>Dri-FIT 技术</h3><p>快速排汗，保持干爽</p><h3>标准版型</h3><p>舒适自然，运动自如</p>',
  'published', 5, NOW(), NOW()),

(6, 'MUJI 超声波香薰机', 3, 3,
  'https://picsum.photos/seed/muji-diffuser/400/400',
  'https://picsum.photos/seed/muji-d-1/400/400,https://picsum.photos/seed/muji-d-2/400/400',
  39900, 45000, 150, 67, false, false,
  '无印良品超声波香薰机，静音设计，大容量水箱，营造舒适氛围',
  '<h3>超声波雾化</h3><p>细腻水雾，均匀扩散</p><h3>静音运行</h3><p>低于 30dB，不影响睡眠</p>',
  'published', 6, NOW(), NOW()),

(7, 'MUJI 棉麻四件套', 3, 3,
  'https://picsum.photos/seed/muji-bedding/400/400',
  'https://picsum.photos/seed/muji-b-1/400/400,https://picsum.photos/seed/muji-b-2/400/400',
  29900, 39900, 80, 34, false, true,
  '无印良品棉麻四件套，天然材质，亲肤透气，简约素雅',
  '<h3>天然棉麻</h3><p>亲肤柔软，四季适用</p><h3>简约设计</h3><p>素雅色调，百搭家居</p>',
  'published', 7, NOW(), NOW()),

(8, '欧莱雅复颜玻尿酸精华', 4, 4,
  'https://picsum.photos/seed/loreal-serum/400/400',
  'https://picsum.photos/seed/loreal-s-1/400/400,https://picsum.photos/seed/loreal-s-2/400/400',
  19900, 25900, 400, 289, true, true,
  '欧莱雅复颜玻尿酸水润精华，深层补水，紧致提亮',
  '<h3>高浓度玻尿酸</h3><p>深层渗透，持久保湿</p><h3>复颜科技</h3><p>紧致肌肤，淡化细纹</p>',
  'published', 8, NOW(), NOW()),

(9, '欧莱雅男士洁面乳', 4, 4,
  'https://picsum.photos/seed/loreal-men/400/400',
  'https://picsum.photos/seed/loreal-m-1/400/400',
  5900, 7900, 800, 567, false, false,
  '欧莱雅男士控油洁面乳，深层清洁，控油爽肤',
  '<h3>深层清洁</h3><p>去除多余油脂和污垢</p><h3>控油配方</h3><p>保持清爽不油腻</p>',
  'published', 9, NOW(), NOW()),

(10, 'iPad Air M2', 1, 1,
  'https://picsum.photos/seed/ipad-air-m2/400/400',
  'https://picsum.photos/seed/ipad-1/400/400,https://picsum.photos/seed/ipad-2/400/400',
  479900, 529900, 120, 78, true, false,
  'iPad Air 搭载 M2 芯片，11 英寸 Liquid Retina 显示屏，支持 Apple Pencil',
  '<h3>M2 芯片</h3><p>强大性能，流畅体验</p><h3>Apple Pencil 支持</h3><p>创意无限，书写绘画自如</p>',
  'published', 10, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- SKU 数据
INSERT INTO product_skus (id, product_id, sku_code, specs, price, stock, created_at, updated_at) VALUES
(1,  1, 'SKU-IP15P-256',   '{"颜色":"原色钛金属","存储":"256GB"}', 799900, 80, NOW(), NOW()),
(2,  1, 'SKU-IP15P-512',   '{"颜色":"原色钛金属","存储":"512GB"}', 899900, 60, NOW(), NOW()),
(3,  1, 'SKU-IP15P-BLUE',  '{"颜色":"蓝色钛金属","存储":"256GB"}', 799900, 60, NOW(), NOW()),
(4,  2, 'SKU-MBA-M3-8',    '{"颜色":"午夜色","内存":"8GB","存储":"256GB"}', 899900, 50, NOW(), NOW()),
(5,  2, 'SKU-MBA-M3-16',   '{"颜色":"午夜色","内存":"16GB","存储":"512GB"}', 1099900, 50, NOW(), NOW()),
(6,  3, 'SKU-APP-USB-C',   '{"充电盒":"USB-C"}', 189900, 250, NOW(), NOW()),
(7,  3, 'SKU-APP-MAGSAFE', '{"充电盒":"MagSafe"}', 199900, 250, NOW(), NOW()),
(8,  4, 'SKU-NK-270-42',   '{"颜色":"黑白色","尺码":"42"}', 129900, 100, NOW(), NOW()),
(9,  4, 'SKU-NK-270-43',   '{"颜色":"黑白色","尺码":"43"}', 129900, 100, NOW(), NOW()),
(10, 4, 'SKU-NK-270-44',   '{"颜色":"纯白色","尺码":"44"}', 129900, 100, NOW(), NOW()),
(11, 5, 'SKU-NK-T-M',      '{"颜色":"黑色","尺码":"M"}', 29900, 200, NOW(), NOW()),
(12, 5, 'SKU-NK-T-L',      '{"颜色":"黑色","尺码":"L"}', 29900, 200, NOW(), NOW()),
(13, 5, 'SKU-NK-T-XL',     '{"颜色":"白色","尺码":"XL"}', 29900, 200, NOW(), NOW()),
(14, 6, 'SKU-MJ-DIFF-W',   '{"颜色":"白色"}', 39900, 150, NOW(), NOW()),
(15, 7, 'SKU-MJ-BED-TW',   '{"尺寸":"1.5m 床","颜色":"米白色"}', 29900, 40, NOW(), NOW()),
(16, 7, 'SKU-MJ-BED-QN',   '{"尺寸":"1.8m 床","颜色":"米白色"}', 34900, 40, NOW(), NOW()),
(17, 8, 'SKU-LR-S-30ML',   '{"容量":"30ml"}', 19900, 200, NOW(), NOW()),
(18, 8, 'SKU-LR-S-50ML',   '{"容量":"50ml"}', 27900, 200, NOW(), NOW()),
(19, 9, 'SKU-LR-MEN-100',  '{"容量":"100ml"}', 5900, 400, NOW(), NOW()),
(20, 10, 'SKU-IPA-M2-128', '{"颜色":"星光色","存储":"128GB"}', 479900, 60, NOW(), NOW()),
(21, 10, 'SKU-IPA-M2-256', '{"颜色":"星光色","存储":"256GB"}', 529900, 60, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 商品图片数据
INSERT INTO product_images (product_id, url, sort, created_at, updated_at) VALUES
(1, 'https://picsum.photos/seed/iphone15pro-1/800/800', 1, NOW(), NOW()),
(1, 'https://picsum.photos/seed/iphone15pro-2/800/800', 2, NOW(), NOW()),
(1, 'https://picsum.photos/seed/iphone15pro-3/800/800', 3, NOW(), NOW()),
(2, 'https://picsum.photos/seed/macbook-m3-1/800/800', 1, NOW(), NOW()),
(2, 'https://picsum.photos/seed/macbook-m3-2/800/800', 2, NOW(), NOW()),
(3, 'https://picsum.photos/seed/airpods-1/800/800', 1, NOW(), NOW()),
(3, 'https://picsum.photos/seed/airpods-2/800/800', 2, NOW(), NOW()),
(4, 'https://picsum.photos/seed/nike-1/800/800', 1, NOW(), NOW()),
(4, 'https://picsum.photos/seed/nike-2/800/800', 2, NOW(), NOW()),
(5, 'https://picsum.photos/seed/nike-t-1/800/800', 1, NOW(), NOW()),
(6, 'https://picsum.photos/seed/muji-d-1/800/800', 1, NOW(), NOW()),
(6, 'https://picsum.photos/seed/muji-d-2/800/800', 2, NOW(), NOW()),
(7, 'https://picsum.photos/seed/muji-b-1/800/800', 1, NOW(), NOW()),
(7, 'https://picsum.photos/seed/muji-b-2/800/800', 2, NOW(), NOW()),
(8, 'https://picsum.photos/seed/loreal-s-1/800/800', 1, NOW(), NOW()),
(8, 'https://picsum.photos/seed/loreal-s-2/800/800', 2, NOW(), NOW()),
(9, 'https://picsum.photos/seed/loreal-m-1/800/800', 1, NOW(), NOW()),
(10, 'https://picsum.photos/seed/ipad-1/800/800', 1, NOW(), NOW()),
(10, 'https://picsum.photos/seed/ipad-2/800/800', 2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM product_images WHERE product_id IN (1,2,3,4,5,6,7,8,9,10);
DELETE FROM product_skus WHERE product_id IN (1,2,3,4,5,6,7,8,9,10);
DELETE FROM product_attrs WHERE product_id IN (1,2,3,4,5,6,7,8,9,10);
DELETE FROM products WHERE id IN (1,2,3,4,5,6,7,8,9,10);
DELETE FROM brands WHERE id IN (1,2,3,4);
DELETE FROM categories WHERE id IN (1,2,3,4);
-- +goose StatementEnd
