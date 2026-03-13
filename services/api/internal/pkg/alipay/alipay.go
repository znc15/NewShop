// Package alipay 提供支付宝支付集成功能
package alipay

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/smartwalle/alipay/v3"
)

// Client 支付宝客户端封装
type Client struct {
	client    *alipay.Client
	notifyURL string
	returnURL string
}

// Config 支付宝配置
type Config struct {
	AppID      string
	PrivateKey string
	PublicKey  string
	NotifyURL  string
	ReturnURL  string
	IsProd     bool
}

// NewClient 创建支付宝客户端
func NewClient(cfg Config) (*Client, error) {
	if cfg.AppID == "" || cfg.PrivateKey == "" {
		return nil, fmt.Errorf("支付宝配置不完整: AppID 和 PrivateKey 不能为空")
	}

	client, err := alipay.New(cfg.AppID, cfg.PrivateKey, cfg.IsProd)
	if err != nil {
		return nil, fmt.Errorf("初始化支付宝客户端失败: %w", err)
	}

	// 加载支付宝公钥用于验签
	if cfg.PublicKey != "" {
		if err := client.LoadAliPayPublicKey(cfg.PublicKey); err != nil {
			return nil, fmt.Errorf("加载支付宝公钥失败: %w", err)
		}
	}

	return &Client{
		client:    client,
		notifyURL: cfg.NotifyURL,
		returnURL: cfg.ReturnURL,
	}, nil
}

// CreatePaymentRequest 创建支付请求参数
type CreatePaymentRequest struct {
	OutTradeNo  string // 商户订单号
	TotalAmount string // 订单金额（元）
	Subject     string // 订单标题
	Body        string // 订单描述
	Passback    string // 回传参数
}

// CreatePaymentResult 创建支付结果
type CreatePaymentResult struct {
	PayURL string // 支付页面 URL
}

// CreatePagePayment 创建电脑网站支付
func (c *Client) CreatePagePayment(ctx context.Context, req CreatePaymentRequest) (*CreatePaymentResult, error) {
	p := alipay.TradePagePay{
		Trade: alipay.Trade{
			Subject:     req.Subject,
			OutTradeNo:  req.OutTradeNo,
			TotalAmount: req.TotalAmount,
			Body:        req.Body,
			ProductCode: "FAST_INSTANT_TRADE_PAY",
		},
	}

	if c.notifyURL != "" {
		p.NotifyURL = c.notifyURL
	}
	if c.returnURL != "" {
		p.ReturnURL = c.returnURL
	}
	if req.Passback != "" {
		p.PassbackParams = req.Passback
	}

	payURL, err := c.client.TradePagePay(p)
	if err != nil {
		return nil, fmt.Errorf("创建页面支付失败: %w", err)
	}

	return &CreatePaymentResult{PayURL: payURL.String()}, nil
}

// CreateWapPayment 创建手机网站支付
func (c *Client) CreateWapPayment(ctx context.Context, req CreatePaymentRequest) (*CreatePaymentResult, error) {
	p := alipay.TradeWapPay{
		Trade: alipay.Trade{
			Subject:     req.Subject,
			OutTradeNo:  req.OutTradeNo,
			TotalAmount: req.TotalAmount,
			Body:        req.Body,
			ProductCode: "QUICK_WAP_WAY",
		},
	}

	if c.notifyURL != "" {
		p.NotifyURL = c.notifyURL
	}
	if c.returnURL != "" {
		p.ReturnURL = c.returnURL
	}
	if req.Passback != "" {
		p.PassbackParams = req.Passback
	}

	payURL, err := c.client.TradeWapPay(p)
	if err != nil {
		return nil, fmt.Errorf("创建手机网站支付失败: %w", err)
	}

	return &CreatePaymentResult{PayURL: payURL.String()}, nil
}

// NotifyData 回调通知数据
type NotifyData struct {
	NotifyTime        string // 通知时间
	NotifyType        string // 通知类型
	NotifyID          string // 通知校验ID
	AppID             string // 支付宝分配的应用ID
	Charset           string // 编码格式
	Version           string // 接口版本
	SignType          string // 签名类型
	Sign              string // 签名
	TradeNo           string // 支付宝交易号
	OutTradeNo        string // 商户订单号
	OutBizNo          string // 商户业务号
	BuyerID           string // 买家支付宝用户ID
	BuyerLogonID      string // 买家支付宝账号
	SellerID          string // 卖家支付宝用户ID
	SellerEmail       string // 卖家支付宝账号
	TradeStatus       string // 交易状态
	TotalAmount       string // 订单金额
	ReceiptAmount     string // 实收金额
	InvoiceAmount     string // 可开票金额
	BuyerPayAmount    string // 买家付款金额
	PointAmount       string // 积分金额
	RefundFee         string // 退款金额
	Subject           string // 订单标题
	Body              string // 订单描述
	GmtCreate         string // 交易创建时间
	GmtPayment        string // 交易付款时间
	GmtRefund         string // 交易退款时间
	GmtClose          string // 交易关闭时间
	FundBillList      string // 支付金额信息
	PassbackParams    string // 回传参数
	VoucherDetailList string // 优惠券信息
}

// VerifyNotify 验证回调通知签名
func (c *Client) VerifyNotify(ctx context.Context, r *http.Request) (*NotifyData, error) {
	if err := r.ParseForm(); err != nil {
		return nil, fmt.Errorf("解析表单失败: %w", err)
	}

	// 验证签名
	if err := c.client.VerifySign(ctx, r.Form); err != nil {
		return nil, fmt.Errorf("验证签名失败: %w", err)
	}

	// 解析通知数据
	data := &NotifyData{
		NotifyTime:        r.FormValue("notify_time"),
		NotifyType:        r.FormValue("notify_type"),
		NotifyID:          r.FormValue("notify_id"),
		AppID:             r.FormValue("app_id"),
		Charset:           r.FormValue("charset"),
		Version:           r.FormValue("version"),
		SignType:          r.FormValue("sign_type"),
		Sign:              r.FormValue("sign"),
		TradeNo:           r.FormValue("trade_no"),
		OutTradeNo:        r.FormValue("out_trade_no"),
		OutBizNo:          r.FormValue("out_biz_no"),
		BuyerID:           r.FormValue("buyer_id"),
		BuyerLogonID:      r.FormValue("buyer_logon_id"),
		SellerID:          r.FormValue("seller_id"),
		SellerEmail:       r.FormValue("seller_email"),
		TradeStatus:       r.FormValue("trade_status"),
		TotalAmount:       r.FormValue("total_amount"),
		ReceiptAmount:     r.FormValue("receipt_amount"),
		InvoiceAmount:     r.FormValue("invoice_amount"),
		BuyerPayAmount:    r.FormValue("buyer_pay_amount"),
		PointAmount:       r.FormValue("point_amount"),
		RefundFee:         r.FormValue("refund_fee"),
		Subject:           r.FormValue("subject"),
		Body:              r.FormValue("body"),
		GmtCreate:         r.FormValue("gmt_create"),
		GmtPayment:        r.FormValue("gmt_payment"),
		GmtRefund:         r.FormValue("gmt_refund"),
		GmtClose:          r.FormValue("gmt_close"),
		FundBillList:      r.FormValue("fund_bill_list"),
		PassbackParams:    r.FormValue("passback_params"),
		VoucherDetailList: r.FormValue("voucher_detail_list"),
	}

	return data, nil
}

// QueryResult 查询结果
type QueryResult struct {
	TradeNo        string // 支付宝交易号
	OutTradeNo     string // 商户订单号
	BuyerLogonID   string // 买家支付宝账号
	TradeStatus    string // 交易状态
	TotalAmount    string // 订单金额
	ReceiptAmount  string // 实收金额
	BuyerPayAmount string // 买家付款金额
	SendPayDate    string // 打款给卖家的时间
}

// QueryPayment 查询支付状态
func (c *Client) QueryPayment(ctx context.Context, outTradeNo string) (*QueryResult, error) {
	p := alipay.TradeQuery{
		OutTradeNo: outTradeNo,
	}

	resp, err := c.client.TradeQuery(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("查询支付状态失败: %w", err)
	}

	if resp.IsFailure() {
		return nil, fmt.Errorf("查询失败: %s - %s", resp.Msg, resp.SubMsg)
	}

	return &QueryResult{
		TradeNo:        resp.TradeNo,
		OutTradeNo:     resp.OutTradeNo,
		BuyerLogonID:   resp.BuyerLogonId,
		TradeStatus:    string(resp.TradeStatus),
		TotalAmount:    resp.TotalAmount,
		ReceiptAmount:  resp.ReceiptAmount,
		BuyerPayAmount: resp.BuyerPayAmount,
		SendPayDate:    resp.SendPayDate,
	}, nil
}

// RefundRequest 退款请求参数
type RefundRequest struct {
	OutTradeNo   string // 商户订单号
	RefundAmount string // 退款金额（元）
	RefundReason string // 退款原因
	OutRequestNo string // 退款请求单号（同一笔交易多次退款需唯一）
}

// RefundResult 退款结果
type RefundResult struct {
	TradeNo    string // 支付宝交易号
	OutTradeNo string // 商户订单号
	RefundFee  string // 退款金额
	FundChange string // 退款资金变化
}

// RefundPayment 申请退款
func (c *Client) RefundPayment(ctx context.Context, req RefundRequest) (*RefundResult, error) {
	p := alipay.TradeRefund{
		OutTradeNo:   req.OutTradeNo,
		RefundAmount: req.RefundAmount,
		RefundReason: req.RefundReason,
		OutRequestNo: req.OutRequestNo,
	}

	resp, err := c.client.TradeRefund(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("申请退款失败: %w", err)
	}

	if resp.IsFailure() {
		return nil, fmt.Errorf("退款失败: %s - %s", resp.Msg, resp.SubMsg)
	}

	return &RefundResult{
		TradeNo:    resp.TradeNo,
		OutTradeNo: resp.OutTradeNo,
		RefundFee:  resp.RefundFee,
		FundChange: resp.FundChange,
	}, nil
}

// ClosePayment 关闭交易
func (c *Client) ClosePayment(ctx context.Context, outTradeNo string) error {
	p := alipay.TradeClose{
		OutTradeNo: outTradeNo,
	}

	resp, err := c.client.TradeClose(ctx, p)
	if err != nil {
		return fmt.Errorf("关闭交易失败: %w", err)
	}

	if resp.IsFailure() {
		return fmt.Errorf("关闭交易失败: %s - %s", resp.Msg, resp.SubMsg)
	}

	return nil
}

// GenerateFormHTML 生成自动提交的 HTML 表单
func (c *Client) GenerateFormHTML(payURL string) string {
	// 解析 URL 获取参数
	u, err := url.Parse(payURL)
	if err != nil {
		return ""
	}

	var gateway = "https://openapi.alipay.com/gateway.do"
	if u.Host == "openapi.alipaydev.com" {
		gateway = "https://openapi.alipaydev.com/gateway.do"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>正在跳转到支付宝...</title>
</head>
<body>
    <form id="alipaysubmit" name="alipaysubmit" action="%s" method="POST">
        %s
    </form>
    <script>document.forms["alipaysubmit"].submit();</script>
    <p style="text-align:center;padding-top:50px;">正在跳转到支付宝，请稍候...</p>
</body>
</html>`, gateway, c.generateFormFields(u.Query()))
}

func (c *Client) generateFormFields(query url.Values) string {
	var fields string
	for key, values := range query {
		for _, value := range values {
			fields += fmt.Sprintf(`<input type="hidden" name="%s" value="%s"/>`, key, value)
		}
	}
	return fields
}
