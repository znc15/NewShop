package scheduler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/service"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	ErrTaskNotFound = errors.New("任务不存在")
)

// TaskType 任务类型
type TaskType string

const (
	TaskTypeOrderTimeout   TaskType = "order_timeout"
	TaskTypeEmail          TaskType = "email"
	TaskTypePresaleRelease TaskType = "presale_release"
)

// TaskStatus 任务状态
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
	TaskStatusSkipped   TaskStatus = "skipped"
)

// Task 异步任务
type Task struct {
	ID          uint64     `gorm:"primaryKey"`
	Type        TaskType   `gorm:"not null;index"`
	Payload     string     `gorm:"type:text;not null"`
	Status      TaskStatus `gorm:"not null;default:pending;index"`
	Priority    int        `gorm:"default:5"`
	MaxRetry    int        `gorm:"default:3"`
	RetryCount  int        `gorm:"default:0"`
	RunAt       *time.Time `gorm:"index"`
	ScheduledAt *time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
	ErrorMsg    string    `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
}

// TableName 指定表名
func (Task) TableName() string {
	return "async_tasks"
}

// EmailPayload 邮件任务负载
type EmailPayload struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

// Scheduler 异步任务调度器
type Scheduler struct {
	db      *gorm.DB
	email   *service.EmailService
	logger  *zap.Logger
	stopped bool
	mu      sync.Mutex
}

// NewScheduler 创建调度器
func NewScheduler(db *gorm.DB, email *service.EmailService, logger *zap.Logger) *Scheduler {
	return &Scheduler{
		db:     db,
		email:  email,
		logger: logger,
	}
}

// Start 启动调度器
func (s *Scheduler) Start() {
	s.mu.Lock()
	s.stopped = false
	s.mu.Unlock()

	s.logger.Info("启动异步任务调度器")
	ctx := context.Background()

	// 启动订单超时检查（每分钟）
	go s.runPeriodicTask(ctx, "订单超时检查", time.Minute, s.checkOrderTimeout)

	// 启动预售释放检查（每分钟）
	go s.runPeriodicTask(ctx, "预售释放检查", time.Minute, s.checkPresaleRelease)

	// 启动邮件队列消费者（每5秒）
	go s.runPeriodicTask(ctx, "邮件队列消费", 5*time.Second, s.processEmailQueue)

	s.logger.Info("异步任务调度器启动完成")
}

// Stop 停止调度器
func (s *Scheduler) Stop() {
	s.mu.Lock()
	s.stopped = true
	s.mu.Unlock()
	s.logger.Info("异步任务调度器已停止")
}

// isStopped 检查是否已停止
func (s *Scheduler) isStopped() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.stopped
}

// runPeriodicTask 运行周期性任务
func (s *Scheduler) runPeriodicTask(ctx context.Context, name string, interval time.Duration, taskFunc func(context.Context)) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if s.isStopped() {
				return
			}
			taskFunc(ctx)
		}
	}
}

// SubmitTask 提交任务到队列
func (s *Scheduler) SubmitTask(taskType TaskType, payload string, runAt *time.Time, priority int) (*Task, error) {
	task := &Task{
		Type:        taskType,
		Payload:     payload,
		Status:      TaskStatusPending,
		Priority:    priority,
		RunAt:       runAt,
		ScheduledAt: timePtr(time.Now()),
	}

	if task.Priority <= 0 {
		task.Priority = 5
	}

	// 保存到数据库
	if err := s.db.Create(task).Error; err != nil {
		return nil, err
	}

	s.logger.Info("任务已提交",
		zap.Uint64("id", task.ID),
		zap.String("type", string(task.Type)),
		zap.Int("priority", task.Priority))

	return task, nil
}

// checkOrderTimeout 检查订单超时
func (s *Scheduler) checkOrderTimeout(ctx context.Context) {
	// 获取超时配置（默认30分钟）
	timeoutMinutes := 30

	// 查找超时的待支付订单
	var orders []model.Order
	timeout := time.Now().Add(-time.Duration(timeoutMinutes) * time.Minute)

	if err := s.db.WithContext(ctx).
		Where("status = ? AND created_at < ?", model.OrderStatusPending, timeout).
		Limit(100).
		Find(&orders).Error; err != nil {
		s.logger.Error("查询超时订单失败", zap.Error(err))
		return
	}

	for _, order := range orders {
		if s.isStopped() {
			return
		}
		s.cancelOrder(ctx, &order)
	}
}

// cancelOrder 取消订单
func (s *Scheduler) cancelOrder(ctx context.Context, order *model.Order) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 更新订单状态
		if err := tx.Model(order).Updates(map[string]interface{}{
			"status":     model.OrderStatusCancelled,
			"updated_at": time.Now(),
		}).Error; err != nil {
			return err
		}

		// 恢复库存
		var items []model.OrderItem
		if err := tx.Where("order_id = ?", order.ID).Find(&items).Error; err != nil {
			return err
		}

		for _, item := range items {
			if err := tx.Model(&model.Product{}).
				Where("id = ?", item.ProductID).
				Update("stock", gorm.Expr("stock + ?", item.Quantity)).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		s.logger.Error("取消超时订单失败",
			zap.Uint64("order_id", order.ID),
			zap.Error(err))
	} else {
		s.logger.Info("订单超时自动取消",
			zap.Uint64("order_id", order.ID),
			zap.String("order_no", order.OrderNo))
	}
}

// checkPresaleRelease 检查预售定金释放
func (s *Scheduler) checkPresaleRelease(ctx context.Context) {
	// 查找需要释放的预售订单
	// 条件：状态为 deposit_paid（已付定金），且尾款结束时间已过
	var presaleOrders []model.PresaleOrder
	now := time.Now()

	// 先查找尾款阶段已结束的预售活动
	var expiredPresales []uint64
	s.db.Model(&model.Presale{}).
		Where("status = ? AND balance_end_time < ?", model.PresaleStatusBalance, now).
		Pluck("id", &expiredPresales)

	if len(expiredPresales) == 0 {
		return
	}

	if err := s.db.WithContext(ctx).
		Where("presale_id IN (?) AND status = ?", expiredPresales, model.PresaleOrderStatusDepositPaid).
		Limit(100).
		Find(&presaleOrders).Error; err != nil {
		s.logger.Error("查询过期预售订单失败", zap.Error(err))
		return
	}

	for _, order := range presaleOrders {
		if s.isStopped() {
			return
		}
		s.releasePresale(ctx, &order)
	}
}

// releasePresale 释放预售定金
func (s *Scheduler) releasePresale(ctx context.Context, order *model.PresaleOrder) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 更新预售订单状态
		if err := tx.Model(order).Updates(map[string]interface{}{
			"status":     model.PresaleOrderStatusCancelled,
			"updated_at": time.Now(),
		}).Error; err != nil {
			return err
		}

		// 释放预售库存
		if err := tx.Model(&model.Presale{}).
			Where("id = ?", order.PresaleID).
			Update("sold_count", gorm.Expr("sold_count - 1")).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		s.logger.Error("释放预售定金失败",
			zap.Uint64("order_id", order.ID),
			zap.Error(err))
	} else {
		s.logger.Info("预售定金已过期释放",
			zap.Uint64("order_id", order.ID))
	}
}

// processEmailQueue 处理邮件队列
func (s *Scheduler) processEmailQueue(ctx context.Context) {
	var tasks []Task
	now := time.Now()

	if err := s.db.WithContext(ctx).
		Where("status = ? AND type = ?", TaskStatusPending, TaskTypeEmail).
		Where("run_at IS NULL OR run_at <= ?", now).
		Order("priority DESC, created_at ASC").
		Limit(10).
		Find(&tasks).Error; err != nil {
		s.logger.Error("查询邮件任务失败", zap.Error(err))
		return
	}

	for _, task := range tasks {
		if s.isStopped() {
			return
		}
		s.sendEmail(ctx, &task)
	}
}

// sendEmail 发送邮件
func (s *Scheduler) sendEmail(ctx context.Context, task *Task) {
	var payload EmailPayload
	if err := json.Unmarshal([]byte(task.Payload), &payload); err != nil {
		s.updateTaskStatus(ctx, task.ID, TaskStatusFailed, "解析负载失败: "+err.Error())
		return
	}

	// 标记任务为运行中
	s.db.Model(task).Update("status", TaskStatusRunning)

	// 通过 ProcessQueue 处理邮件队列
	// 这里简化处理，直接使用 email service 的队列功能
	if err := s.email.ProcessQueue(ctx); err != nil {
		// 重试逻辑
		if task.RetryCount < task.MaxRetry {
			s.db.Model(task).Updates(map[string]interface{}{
				"retry_count": task.RetryCount + 1,
				"status":      TaskStatusPending,
			})
			s.logger.Warn("邮件发送失败，将重试",
				zap.Uint64("task_id", task.ID),
				zap.Int("retry_count", task.RetryCount+1),
				zap.Error(err))
		} else {
			s.updateTaskStatus(ctx, task.ID, TaskStatusFailed, "发送失败: "+err.Error())
		}
		return
	}

	s.updateTaskStatus(ctx, task.ID, TaskStatusCompleted, "")
	s.logger.Info("邮件发送成功",
		zap.Uint64("task_id", task.ID),
		zap.String("to", payload.To))
}

// updateTaskStatus 更新任务状态
func (s *Scheduler) updateTaskStatus(ctx context.Context, taskID uint64, status TaskStatus, errMsg string) {
	updates := map[string]interface{}{
		"status":       status,
		"completed_at": time.Now(),
	}
	if errMsg != "" {
		updates["error_msg"] = errMsg
	}

	if err := s.db.WithContext(ctx).Model(&Task{}).Where("id = ?", taskID).Updates(updates).Error; err != nil {
		s.logger.Error("更新任务状态失败",
			zap.Uint64("task_id", taskID),
			zap.Error(err))
	}
}

// SubmitEmailTask 提交邮件任务
func (s *Scheduler) SubmitEmailTask(ctx context.Context, to, subject, body string, runAt *time.Time) (*Task, error) {
	payload := EmailPayload{
		To:      to,
		Subject: subject,
		Body:    body,
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return s.SubmitTask(TaskTypeEmail, string(payloadJSON), runAt, 5)
}

// SubmitOrderTimeoutTask 提交订单超时检查任务
func (s *Scheduler) SubmitOrderTimeoutTask(ctx context.Context, orderID uint64, runAt time.Time) (*Task, error) {
	payload := fmt.Sprintf(`{"order_id": %d}`, orderID)
	return s.SubmitTask(TaskTypeOrderTimeout, payload, &runAt, 10)
}

// SubmitPresaleReleaseTask 提交预售释放任务
func (s *Scheduler) SubmitPresaleReleaseTask(ctx context.Context, recordID uint64, runAt time.Time) (*Task, error) {
	payload := fmt.Sprintf(`{"record_id": %d}`, recordID)
	return s.SubmitTask(TaskTypePresaleRelease, payload, &runAt, 8)
}

// timePtr 返回时间的指针
func timePtr(t time.Time) *time.Time {
	return &t
}