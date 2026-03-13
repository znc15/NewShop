package email

import (
	"crypto/tls"
	"fmt"
	"strings"

	"github.com/go-gomail/gomail"
)

// Config 邮件配置
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

// Client 邮件客户端
type Client struct {
	config Config
	dialer *gomail.Dialer
}

// NewClient 创建邮件客户端
func NewClient(cfg Config) *Client {
	dialer := gomail.NewDialer(cfg.Host, cfg.Port, cfg.User, cfg.Password)
	dialer.TLSConfig = &tls.Config{InsecureSkipVerify: true}
	return &Client{
		config: cfg,
		dialer: dialer,
	}
}

// Message 邮件消息
type Message struct {
	To      string
	Subject string
	Body    string
}

// Send 发送邮件
func (c *Client) Send(msg Message) error {
	m := gomail.NewMessage()
	m.SetHeader("From", c.config.From)
	m.SetHeader("To", msg.To)
	m.SetHeader("Subject", msg.Subject)
	m.SetBody("text/html", msg.Body)
	if err := c.dialer.DialAndSend(m); err != nil {
		return fmt.Errorf("发送邮件失败: %w", err)
	}
	return nil
}

// SendWithTemplate 使用模板发送邮件
func (c *Client) SendWithTemplate(to, subject, template string, params map[string]string) error {
	body := template
	for k, v := range params {
		body = strings.ReplaceAll(body, "{{."+k+"}}", v)
	}
	return c.Send(Message{To: to, Subject: subject, Body: body})
}
