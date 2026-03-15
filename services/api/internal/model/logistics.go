package model

import (
	"time"

	"gorm.io/gorm"
)

// LogisticsCompany 物流公司模型
type LogisticsCompany struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name"`   // 物流公司名称
	Code      string         `gorm:"size:50;unique;not null" json:"code"` // 物流公司编码
	Website   string         `gorm:"size:255" json:"website"`         // 官网地址
	Phone     string         `gorm:"size:50" json:"phone"`            // 客服电话
	Logo      string         `gorm:"size:500" json:"logo"`            // Logo URL
	SortOrder int            `gorm:"default:0" json:"sort_order"`     // 排序
	Status    string         `gorm:"size:20;default:active" json:"status"` // 状态: active/inactive
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (LogisticsCompany) TableName() string {
	return "logistics_companies"
}

// LogisticsStatus 物流状态枚举
type LogisticsStatus string

const (
	LogisticsStatusPending    LogisticsStatus = "pending"    // 待揽件
	LogisticsStatusCollected  LogisticsStatus = "collected"  // 已揽件
	LogisticsStatusTransit    LogisticsStatus = "transit"    // 运输中
	LogisticsStatusDelivering LogisticsStatus = "delivering" // 派送中
	LogisticsStatusDelivered  LogisticsStatus = "delivered"  // 已签收
	LogisticsStatusReturned   LogisticsStatus = "returned"   // 退回
	LogisticsStatusException  LogisticsStatus = "exception"  // 异常
)

// LogisticsTrace 物流轨迹
type LogisticsTrace struct {
	Time        time.Time `json:"time"`        // 时间
	Status      string    `json:"status"`      // 状态
	Description string    `json:"description"` // 描述
	Location    string    `json:"location"`    // 地点
}

// LogisticsTraceList 物流轨迹列表（用于 JSONB 存储）
type LogisticsTraceList []LogisticsTrace

// OrderLogistics 订单物流信息
type OrderLogistics struct {
	ID          uint64           `gorm:"primaryKey" json:"id"`
	OrderID     uint64           `gorm:"not null;uniqueIndex" json:"order_id"`
	CompanyID   uint64           `gorm:"not null;index" json:"company_id"`
	TrackingNo  string           `gorm:"size:100;not null" json:"tracking_no"`
	Status      LogisticsStatus  `gorm:"size:20;default:pending" json:"status"`
	Traces      LogisticsTraceList `gorm:"type:jsonb" json:"traces"`
	SenderName     string       `gorm:"size:100" json:"sender_name"`
	SenderPhone    string       `gorm:"size:50" json:"sender_phone"`
	SenderAddress  string       `gorm:"size:500" json:"sender_address"`
	ReceiverName   string       `gorm:"size:100" json:"receiver_name"`
	ReceiverPhone  string       `gorm:"size:50" json:"receiver_phone"`
	ReceiverAddress string      `gorm:"size:500" json:"receiver_address"`
	EstimatedTime  *time.Time   `json:"estimated_time"` // 预计送达时间
	ActualTime     *time.Time   `json:"actual_time"`    // 实际送达时间
	Weight         float64      `gorm:"type:decimal(10,2)" json:"weight"` // 包裹重量(kg)
	FreightFee     float64      `gorm:"type:decimal(10,2)" json:"freight_fee"` // 运费
	Remark         string       `gorm:"size:500" json:"remark"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`
}

// TableName 指定表名
func (OrderLogistics) TableName() string {
	return "order_logistics"
}

// CreateLogisticsRequest 创建物流信息请求
type CreateLogisticsRequest struct {
	OrderID         uint64 `json:"order_id" binding:"required"`
	CompanyID       uint64 `json:"company_id" binding:"required"`
	TrackingNo      string `json:"tracking_no" binding:"required"`
	SenderName      string `json:"sender_name"`
	SenderPhone     string `json:"sender_phone"`
	SenderAddress   string `json:"sender_address"`
	Weight          float64 `json:"weight"`
	FreightFee      float64 `json:"freight_fee"`
	Remark          string `json:"remark"`
}

// UpdateLogisticsRequest 更新物流信息请求
type UpdateLogisticsRequest struct {
	CompanyID       uint64  `json:"company_id"`
	TrackingNo      string  `json:"tracking_no"`
	Status          string  `json:"status"`
	SenderName      string  `json:"sender_name"`
	SenderPhone     string  `json:"sender_phone"`
	SenderAddress   string  `json:"sender_address"`
	Weight          float64 `json:"weight"`
	FreightFee      float64 `json:"freight_fee"`
	Remark          string  `json:"remark"`
}

// AddTraceRequest 添加物流轨迹请求
type AddTraceRequest struct {
	Time        time.Time `json:"time" binding:"required"`
	Status      string    `json:"status" binding:"required"`
	Description string    `json:"description" binding:"required"`
	Location    string    `json:"location"`
}

// LogisticsDetailResponse 物流详情响应
type LogisticsDetailResponse struct {
	ID              uint64              `json:"id"`
	OrderID         uint64              `json:"order_id"`
	Company         *LogisticsCompany   `json:"company"`
	TrackingNo      string              `json:"tracking_no"`
	Status          LogisticsStatus     `json:"status"`
	StatusText      string              `json:"status_text"`
	Traces          LogisticsTraceList  `json:"traces"`
	SenderName      string              `json:"sender_name"`
	SenderPhone     string              `json:"sender_phone"`
	SenderAddress   string              `json:"sender_address"`
	ReceiverName    string              `json:"receiver_name"`
	ReceiverPhone   string              `json:"receiver_phone"`
	ReceiverAddress string              `json:"receiver_address"`
	EstimatedTime   *time.Time          `json:"estimated_time"`
	ActualTime      *time.Time          `json:"actual_time"`
	Weight          float64             `json:"weight"`
	FreightFee      float64             `json:"freight_fee"`
	Remark          string              `json:"remark"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
}

// GetStatusText 获取状态文本
func (s LogisticsStatus) GetStatusText() string {
	texts := map[LogisticsStatus]string{
		LogisticsStatusPending:    "待揽件",
		LogisticsStatusCollected:  "已揽件",
		LogisticsStatusTransit:    "运输中",
		LogisticsStatusDelivering: "派送中",
		LogisticsStatusDelivered:  "已签收",
		LogisticsStatusReturned:   "退回",
		LogisticsStatusException:  "异常",
	}
	if text, ok := texts[s]; ok {
		return text
	}
	return "未知状态"
}

// CreateCompanyRequest 创建物流公司请求
type CreateCompanyRequest struct {
	Name      string `json:"name" binding:"required"`
	Code      string `json:"code" binding:"required"`
	Website   string `json:"website"`
	Phone     string `json:"phone"`
	Logo      string `json:"logo"`
	SortOrder int    `json:"sort_order"`
}

// UpdateCompanyRequest 更新物流公司请求
type UpdateCompanyRequest struct {
	Name      string `json:"name"`
	Website   string `json:"website"`
	Phone     string `json:"phone"`
	Logo      string `json:"logo"`
	SortOrder int    `json:"sort_order"`
	Status    string `json:"status"`
}