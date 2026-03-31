package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/email"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// EmailService 邮件服务
type EmailService struct {
	db    *gorm.DB
	redis *redis.Client
	email *email.Client
}

// NewEmailService 创建邮件服务
func NewEmailService(db *gorm.DB, redis *redis.Client, emailClient *email.Client) *EmailService {
	return &EmailService{db: db, redis: redis, email: emailClient}
}

// SendVerifyCode 发送验证码
func (s *EmailService) SendVerifyCode(ctx context.Context, emailAddr, codeType string) error {
	code := generateCode(6)
	key := fmt.Sprintf("captcha:%s:%s", codeType, emailAddr)
	if err := s.redis.Set(ctx, key, code, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("存储验证码失败: %w", err)
	}

	return s.sendCodeEmail(ctx, emailAddr, "verify_code", "NewShop 验证码", verifyCodeEmailTemplate, code)
}

func (s *EmailService) SendLoginCode(ctx context.Context, emailAddr, code string) error {
	return s.sendCodeEmail(ctx, emailAddr, "login_code", "NewShop 登录验证码", loginCodeEmailTemplate, code)
}

func (s *EmailService) sendCodeEmail(ctx context.Context, emailAddr, templateCode, defaultSubject, defaultBodyHTML, code string) error {
	subject := defaultSubject
	bodyHTML := defaultBodyHTML

	if s.db != nil {
		var template model.EmailTemplate
		err := s.db.WithContext(ctx).Where("code = ?", templateCode).First(&template).Error
		if err == nil {
			subject = template.Subject
			bodyHTML = template.BodyHTML
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("获取邮件模板失败: %w", err)
		}
	}

	if s.email == nil {
		return fmt.Errorf("邮件客户端未初始化")
	}

	if err := s.email.SendWithTemplate(emailAddr, subject, bodyHTML, map[string]string{"Code": code}); err != nil {
		return fmt.Errorf("发送邮件失败: %w", err)
	}

	return nil
}

// VerifyCode 验证验证码
func (s *EmailService) VerifyCode(ctx context.Context, emailAddr, codeType, code string) (bool, error) {
	key := fmt.Sprintf("captcha:%s:%s", codeType, emailAddr)
	storedCode, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return false, nil
	}
	if storedCode != code {
		return false, nil
	}
	s.redis.Del(ctx, key)
	return true, nil
}

// QueueEmail 将邮件加入发送队列
func (s *EmailService) QueueEmail(ctx context.Context, to, templateCode string, params map[string]interface{}) error {
	outbox := &model.EmailOutbox{
		ToEmail:      to,
		TemplateCode: templateCode,
		Params:       model.JSONB(params),
		Status:       "pending",
		MaxRetry:     3,
	}
	return s.db.Create(outbox).Error
}

// ProcessQueue 处理邮件队列
func (s *EmailService) ProcessQueue(ctx context.Context) error {
	var emails []model.EmailOutbox
	if err := s.db.Where("status = ? AND retry_count < max_retry", "pending").Order("created_at").Limit(10).Find(&emails).Error; err != nil {
		return err
	}

	for _, e := range emails {
		if err := s.sendQueuedEmail(ctx, &e); err != nil {
			s.db.Model(&e).Updates(map[string]interface{}{
				"status":        "failed",
				"retry_count":   e.RetryCount + 1,
				"error_message": err.Error(),
			})
		} else {
			now := time.Now()
			s.db.Model(&e).Updates(map[string]interface{}{
				"status":  "sent",
				"sent_at": &now,
			})
		}
	}
	return nil
}

func (s *EmailService) sendQueuedEmail(ctx context.Context, e *model.EmailOutbox) error {
	var template model.EmailTemplate
	if err := s.db.Where("code = ?", e.TemplateCode).First(&template).Error; err != nil {
		return err
	}

	// 将 JSONB 转换为 map[string]string
	params := make(map[string]string)
	for k, v := range e.Params {
		if str, ok := v.(string); ok {
			params[k] = str
		}
	}
	return s.email.SendWithTemplate(e.ToEmail, template.Subject, template.BodyHTML, params)
}

// generateCode 使用加密随机数生成验证码
func generateCode(length int) string {
	const digits = "0123456789"
	code := ""
	for i := 0; i < length; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		code += string(digits[n.Int64()])
	}
	return code
}

const verifyCodeEmailTemplate = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
	<h2 style="margin-bottom:16px;">邮箱验证码</h2>
	<p>您好，您的验证码是：</p>
	<p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:24px 0;color:#111827;">{{.Code}}</p>
	<p>验证码 5 分钟内有效，请勿泄露给他人。</p>
</div>
`

const loginCodeEmailTemplate = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
	<h2 style="margin-bottom:16px;">快捷登录验证码</h2>
	<p>您好，您正在使用邮箱验证码快捷登录 NewShop。</p>
	<p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:24px 0;color:#111827;">{{.Code}}</p>
	<p>验证码 5 分钟内有效，60 秒内不可重复发送。如非本人操作，请忽略此邮件。</p>
</div>
`
