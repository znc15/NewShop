package tests

import (
	"testing"
	"newshop/api/internal/pkg/geetest"
)

func TestGeetestClientCreation(t *testing.T) {
	client := geetest.NewClient("test-id", "test-key")
	if client == nil {
		t.Fatal("客户端创建失败")
	}
}

func TestGeetestGetRegisterInfo(t *testing.T) {
	client := geetest.NewClient("test-id", "test-key")
	info := client.GetRegisterInfo()

	if info["captchaId"] != "test-id" {
		t.Errorf("期望 captchaId=test-id, 得到 %s", info["captchaId"])
	}

	if info["product"] != "bind" {
		t.Errorf("期望 product=bind, 得到 %s", info["product"])
	}
}

func TestGeetestVerifyWithInvalidData(t *testing.T) {
	client := geetest.NewClient("test-id", "test-key")

	valid, err := client.Verify(geetest.VerifyRequest{
		Challenge: "invalid",
		Validate:  "invalid",
		Seccode:   "invalid",
	})

	if err != nil {
		t.Logf("网络错误（预期）: %v", err)
	}

	if valid {
		t.Error("无效数据不应通过验证")
	}
}
