package admin

import (
	"encoding/json"
	"testing"
	"time"

	"newshop/api/internal/model"
)

func mustJSONMap(t *testing.T, value any) map[string]any {
	t.Helper()

	data, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("序列化 JSON 失败: %v", err)
	}

	result := make(map[string]any)
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("反序列化 JSON 失败: %v", err)
	}

	return result
}

func assertKeysExist(t *testing.T, value map[string]any, keys ...string) {
	t.Helper()

	for _, key := range keys {
		if _, ok := value[key]; !ok {
			t.Fatalf("缺少字段 %q，当前字段: %+v", key, value)
		}
	}
}

func TestProductListResponseContract(t *testing.T) {
	resp := ProductListResponse{
		Items:      []ProductListItem{{ID: 1, Name: "测试商品"}},
		Total:      1,
		Page:       1,
		PageSize:   20,
		TotalPages: 1,
	}

	m := mustJSONMap(t, resp)
	assertKeysExist(t, m, "items", "total", "page", "page_size", "total_pages")
}

func TestUserListResponseContract(t *testing.T) {
	resp := UserListResponse{
		Items:      []UserListItem{{ID: 1, Email: "user@example.com"}},
		Total:      1,
		Page:       1,
		PageSize:   20,
		TotalPages: 1,
	}

	m := mustJSONMap(t, resp)
	assertKeysExist(t, m, "items", "total", "page", "page_size", "total_pages")
}

func TestCategoryListResponseContract(t *testing.T) {
	resp := CategoryListResponse{
		Items: []CategoryTreeItem{{ID: 1, Name: "一级分类", Level: 1}},
	}

	m := mustJSONMap(t, resp)
	assertKeysExist(t, m, "items")
}

func TestOrderListDataAndNewFieldsContract(t *testing.T) {
	now := time.Date(2026, 3, 31, 10, 0, 0, 0, time.UTC)
	payTime := now.Add(-2 * time.Hour)
	shipTime := now.Add(-1 * time.Hour)
	receiveTime := now
	refundTime := now.Add(30 * time.Minute)

	orders := []model.Order{
		{
			ID:              1,
			OrderNo:         "ORD-001",
			UserID:          100,
			Status:          model.OrderStatusShipped,
			TotalAmount:     100,
			PayAmount:       98,
			DiscountAmount:  2,
			FreightAmount:   10,
			PaymentMethod:   "alipay",
			PaymentTime:     &payTime,
			ShipTime:        &shipTime,
			ReceiveTime:     &receiveTime,
			ExpressCompany:  "顺丰速运",
			ExpressNo:       "SF123456",
			RefundReason:    "测试退款",
			RefundTime:      &refundTime,
			ReceiverName:    "张三",
			ReceiverPhone:   "13800138000",
			ReceiverAddress: "北京市朝阳区",
			CreatedAt:       now,
			UpdatedAt:       now,
			Items: []model.OrderItem{
				{ID: 11, ProductID: 201, ProductName: "测试商品", Quantity: 1, Price: 98},
			},
		},
	}

	listData := buildOrderListData(orders, 1, 1, 20)
	root := mustJSONMap(t, listData)
	assertKeysExist(t, root, "items", "orders", "total", "page", "page_size", "total_pages")

	itemsValue, ok := root["items"].([]any)
	if !ok || len(itemsValue) == 0 {
		t.Fatalf("items 字段格式错误: %+v", root["items"])
	}

	firstItem, ok := itemsValue[0].(map[string]any)
	if !ok {
		t.Fatalf("首个订单项格式错误: %+v", itemsValue[0])
	}

	assertKeysExist(t, firstItem,
		"shipping_fee", "tracking_company", "tracking_no", "paid_at", "shipped_at", "delivered_at", "refunded_at",
	)
}

func TestResolveRefundInputPreferNewFields(t *testing.T) {
	amount, reason := resolveRefundInput(RefundOrderRequest{
		RefundAmount: 199.5,
		RefundReason: "新字段原因",
		Amount:       88,
		Reason:       "旧字段原因",
	})

	if amount != 199.5 {
		t.Fatalf("期望退款金额使用新字段 199.5，实际 %v", amount)
	}

	if reason != "新字段原因" {
		t.Fatalf("期望退款原因使用新字段，新字段原因，实际 %q", reason)
	}
}

func TestResolveRefundInputFallbackLegacyFields(t *testing.T) {
	amount, reason := resolveRefundInput(RefundOrderRequest{
		RefundAmount: 0,
		RefundReason: "   ",
		Amount:       66,
		Reason:       "  旧字段原因  ",
	})

	if amount != 66 {
		t.Fatalf("期望退款金额回退到旧字段 66，实际 %v", amount)
	}

	if reason != "旧字段原因" {
		t.Fatalf("期望退款原因回退并去空格，实际 %q", reason)
	}
}
