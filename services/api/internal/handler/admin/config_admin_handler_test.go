package admin

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func newConfigHandlerTestContext() *gin.Context {
	gin.SetMode(gin.TestMode)
	writer := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(writer)
	return ctx
}

func TestGetOperatorIDPreferUserID(t *testing.T) {
	ctx := newConfigHandlerTestContext()
	ctx.Set("user_id", uint64(88))
	ctx.Set("admin_id", uint64(7))

	operatorID, ok := getOperatorID(ctx)
	if !ok {
		t.Fatalf("期望获取操作人ID成功")
	}
	if operatorID != 88 {
		t.Fatalf("期望优先使用 user_id=88，实际=%d", operatorID)
	}
}

func TestGetOperatorIDFallbackToAdminID(t *testing.T) {
	ctx := newConfigHandlerTestContext()
	ctx.Set("admin_id", uint64(66))

	operatorID, ok := getOperatorID(ctx)
	if !ok {
		t.Fatalf("期望获取操作人ID成功")
	}
	if operatorID != 66 {
		t.Fatalf("期望回退使用 admin_id=66，实际=%d", operatorID)
	}
}

func TestGetOperatorIDSupportStringValue(t *testing.T) {
	ctx := newConfigHandlerTestContext()
	ctx.Set("user_id", "123")

	operatorID, ok := getOperatorID(ctx)
	if !ok {
		t.Fatalf("期望字符串 user_id 可转换为 uint64")
	}
	if operatorID != 123 {
		t.Fatalf("期望转换后 operator_id=123，实际=%d", operatorID)
	}
}

func TestGetOperatorIDInvalidValue(t *testing.T) {
	ctx := newConfigHandlerTestContext()
	ctx.Set("user_id", -1)

	_, ok := getOperatorID(ctx)
	if ok {
		t.Fatalf("期望非法 user_id 无法通过")
	}
}

func TestGetOperatorIDMissing(t *testing.T) {
	ctx := newConfigHandlerTestContext()

	_, ok := getOperatorID(ctx)
	if ok {
		t.Fatalf("期望缺失 user_id/admin_id 时返回失败")
	}
}
