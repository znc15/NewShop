package geetest

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

type Config struct {
	ID  string
	Key string
}

type Client struct {
	config Config
	http   *http.Client
}

func NewClient(id, key string) *Client {
	return &Client{
		config: Config{ID: id, Key: key},
		http:   &http.Client{Timeout: 10 * time.Second},
	}
}

type VerifyRequest struct {
	Challenge string `json:"challenge"`
	Validate  string `json:"validate"`
	Seccode   string `json:"seccode"`
}

// Verify 验证极验二次验证
func (c *Client) Verify(req VerifyRequest) (bool, error) {
	// 本地校验：validate 是否等于 hmac-sha256(key, challenge)
	expectedValidate := c.hashHmacSha256(req.Challenge, c.config.Key)
	if req.Validate != expectedValidate {
		return false, nil
	}

	// 服务器二次验证
	verifyURL := fmt.Sprintf(
		"http://gcaptcha4.geetest.com/validate?captcha_id=%s&lot_number=%s&captcha_output=%s&pass_token=%s&gen_time=%s",
		c.config.ID,
		req.Challenge,
		req.Validate,
		req.Seccode,
		strconv.FormatInt(time.Now().UnixMilli(), 10),
	)

	resp, err := c.http.Get(verifyURL)
	if err != nil {
		return false, fmt.Errorf("极验服务器请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("读取响应失败: %w", err)
	}

	var result struct {
		Result string `json:"result"`
		Reason string `json:"reason"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("解析响应失败: %w", err)
	}

	return result.Result == "success", nil
}

func (c *Client) hashHmacSha256(data, key string) string {
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

// GetRegisterInfo 获取前端初始化信息
func (c *Client) GetRegisterInfo() map[string]string {
	return map[string]string{
		"captchaId": c.config.ID,
		"product":   "bind",
	}
}
