package geetest

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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
	LotNumber     string `json:"lot_number"`
	CaptchaOutput string `json:"captcha_output"`
	PassToken     string `json:"pass_token"`
	GenTime       string `json:"gen_time"`
}

// Verify 验证极验二次验证 (Geetest V4)
func (c *Client) Verify(req VerifyRequest) (bool, error) {
	// 生成 sign_token: hmac_sha256(lot_number, key)
	signToken := c.hashHmacSha256(req.LotNumber, c.config.Key)

	// 服务器二次验证
	verifyURL := "http://gcaptcha4.geetest.com/validate"
	params := url.Values{}
	params.Add("captcha_id", c.config.ID)
	params.Add("lot_number", req.LotNumber)
	params.Add("captcha_output", req.CaptchaOutput)
	params.Add("pass_token", req.PassToken)
	params.Add("gen_time", req.GenTime)
	params.Add("sign_token", signToken)

	resp, err := c.http.PostForm(verifyURL, params)
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
