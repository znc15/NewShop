package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	ErrLogisticsNotFound        = errors.New("物流信息不存在")
	ErrLogisticsCompanyNotFound = errors.New("物流公司不存在")
	ErrOrderLogisticsExists     = errors.New("订单物流信息已存在")
	ErrInvalidLogisticsStatus   = errors.New("无效的物流状态")
)

// LogisticsService 物流服务
type LogisticsService struct {
	db            *gorm.DB
	logisticsRepo *repository.LogisticsRepo
	orderRepo     *repository.OrderRepo
	logger        *zap.Logger
}

// NewLogisticsService 创建物流服务实例
func NewLogisticsService(
	db *gorm.DB,
	logisticsRepo *repository.LogisticsRepo,
	orderRepo *repository.OrderRepo,
	logger *zap.Logger,
) *LogisticsService {
	return &LogisticsService{
		db:            db,
		logisticsRepo: logisticsRepo,
		orderRepo:     orderRepo,
		logger:        logger,
	}
}

// GetCompanies 获取物流公司列表
func (s *LogisticsService) GetCompanies(ctx context.Context, status string) ([]model.LogisticsCompany, error) {
	companies, err := s.logisticsRepo.ListCompanies(ctx, status)
	if err != nil {
		s.logger.Error("获取物流公司列表失败", zap.Error(err))
		return nil, fmt.Errorf("获取物流公司列表失败: %w", err)
	}
	return companies, nil
}

// GetCompanyByID 根据ID获取物流公司
func (s *LogisticsService) GetCompanyByID(ctx context.Context, id uint64) (*model.LogisticsCompany, error) {
	company, err := s.logisticsRepo.GetCompanyByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLogisticsCompanyNotFound
		}
		return nil, fmt.Errorf("获取物流公司失败: %w", err)
	}
	return company, nil
}

// CreateCompany 创建物流公司
func (s *LogisticsService) CreateCompany(ctx context.Context, req *model.CreateCompanyRequest) (*model.LogisticsCompany, error) {
	// 检查编码是否已存在
	_, err := s.logisticsRepo.GetCompanyByCode(ctx, req.Code)
	if err == nil {
		return nil, errors.New("物流公司编码已存在")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("检查物流公司编码失败: %w", err)
	}

	company := &model.LogisticsCompany{
		Name:      req.Name,
		Code:      req.Code,
		Website:   req.Website,
		Phone:     req.Phone,
		Logo:      req.Logo,
		SortOrder: req.SortOrder,
		Status:    "active",
	}

	if err := s.logisticsRepo.CreateCompany(ctx, company); err != nil {
		s.logger.Error("创建物流公司失败", zap.Error(err))
		return nil, fmt.Errorf("创建物流公司失败: %w", err)
	}

	s.logger.Info("创建物流公司成功",
		zap.Uint64("id", company.ID),
		zap.String("code", company.Code),
	)
	return company, nil
}

// UpdateCompany 更新物流公司
func (s *LogisticsService) UpdateCompany(ctx context.Context, id uint64, req *model.UpdateCompanyRequest) (*model.LogisticsCompany, error) {
	company, err := s.logisticsRepo.GetCompanyByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLogisticsCompanyNotFound
		}
		return nil, fmt.Errorf("获取物流公司失败: %w", err)
	}

	// 更新字段
	if req.Name != "" {
		company.Name = req.Name
	}
	if req.Website != "" {
		company.Website = req.Website
	}
	if req.Phone != "" {
		company.Phone = req.Phone
	}
	if req.Logo != "" {
		company.Logo = req.Logo
	}
	if req.Status != "" {
		company.Status = req.Status
	}
	company.SortOrder = req.SortOrder

	if err := s.logisticsRepo.UpdateCompany(ctx, company); err != nil {
		s.logger.Error("更新物流公司失败", zap.Error(err))
		return nil, fmt.Errorf("更新物流公司失败: %w", err)
	}

	s.logger.Info("更新物流公司成功", zap.Uint64("id", company.ID))
	return company, nil
}

// DeleteCompany 删除物流公司
func (s *LogisticsService) DeleteCompany(ctx context.Context, id uint64) error {
	if err := s.logisticsRepo.DeleteCompany(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrLogisticsCompanyNotFound
		}
		return fmt.Errorf("删除物流公司失败: %w", err)
	}
	s.logger.Info("删除物流公司成功", zap.Uint64("id", id))
	return nil
}

// GetLogisticsByOrderID 根据订单ID获取物流信息
func (s *LogisticsService) GetLogisticsByOrderID(ctx context.Context, orderID uint64) (*model.LogisticsDetailResponse, error) {
	logistics, company, err := s.logisticsRepo.GetByOrderIDWithCompany(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLogisticsNotFound
		}
		return nil, fmt.Errorf("获取物流信息失败: %w", err)
	}

	return s.buildLogisticsDetailResponse(logistics, company), nil
}

// GetLogisticsByID 根据ID获取物流信息
func (s *LogisticsService) GetLogisticsByID(ctx context.Context, id uint64) (*model.LogisticsDetailResponse, error) {
	logistics, err := s.logisticsRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLogisticsNotFound
		}
		return nil, fmt.Errorf("获取物流信息失败: %w", err)
	}

	company, err := s.logisticsRepo.GetCompanyByID(ctx, logistics.CompanyID)
	if err != nil {
		s.logger.Warn("获取物流公司失败", zap.Error(err))
	}

	return s.buildLogisticsDetailResponse(logistics, company), nil
}

// buildLogisticsDetailResponse 构建物流详情响应
func (s *LogisticsService) buildLogisticsDetailResponse(logistics *model.OrderLogistics, company *model.LogisticsCompany) *model.LogisticsDetailResponse {
	return &model.LogisticsDetailResponse{
		ID:              logistics.ID,
		OrderID:         logistics.OrderID,
		Company:         company,
		TrackingNo:      logistics.TrackingNo,
		Status:          logistics.Status,
		StatusText:      logistics.Status.GetStatusText(),
		Traces:          logistics.Traces,
		SenderName:      logistics.SenderName,
		SenderPhone:     logistics.SenderPhone,
		SenderAddress:   logistics.SenderAddress,
		ReceiverName:    logistics.ReceiverName,
		ReceiverPhone:   logistics.ReceiverPhone,
		ReceiverAddress: logistics.ReceiverAddress,
		EstimatedTime:   logistics.EstimatedTime,
		ActualTime:      logistics.ActualTime,
		Weight:          logistics.Weight,
		FreightFee:      logistics.FreightFee,
		Remark:          logistics.Remark,
		CreatedAt:       logistics.CreatedAt,
		UpdatedAt:       logistics.UpdatedAt,
	}
}

// CreateLogistics 创建物流信息
func (s *LogisticsService) CreateLogistics(ctx context.Context, req *model.CreateLogisticsRequest) (*model.OrderLogistics, error) {
	// 检查订单是否存在
	order, err := s.orderRepo.GetByID(ctx, req.OrderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("订单不存在")
		}
		return nil, fmt.Errorf("获取订单失败: %w", err)
	}

	// 检查是否已存在物流信息
	existing, err := s.logisticsRepo.GetByOrderID(ctx, req.OrderID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("检查物流信息失败: %w", err)
	}
	if existing != nil {
		return nil, ErrOrderLogisticsExists
	}

	// 检查物流公司是否存在
	company, err := s.logisticsRepo.GetCompanyByID(ctx, req.CompanyID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLogisticsCompanyNotFound
		}
		return nil, fmt.Errorf("获取物流公司失败: %w", err)
	}

	logistics := &model.OrderLogistics{
		OrderID:         req.OrderID,
		CompanyID:       req.CompanyID,
		TrackingNo:      req.TrackingNo,
		Status:          model.LogisticsStatusPending,
		SenderName:      req.SenderName,
		SenderPhone:     req.SenderPhone,
		SenderAddress:   req.SenderAddress,
		ReceiverName:    order.ReceiverName,
		ReceiverPhone:   order.ReceiverPhone,
		ReceiverAddress: order.ReceiverAddress,
		Weight:          req.Weight,
		FreightFee:      req.FreightFee,
		Remark:          req.Remark,
	}

	if err := s.logisticsRepo.Create(ctx, logistics); err != nil {
		s.logger.Error("创建物流信息失败", zap.Error(err))
		return nil, fmt.Errorf("创建物流信息失败: %w", err)
	}

	s.logger.Info("创建物流信息成功",
		zap.Uint64("order_id", req.OrderID),
		zap.String("company", company.Name),
		zap.String("tracking_no", req.TrackingNo),
	)
	return logistics, nil
}

// UpdateLogistics 更新物流信息
func (s *LogisticsService) UpdateLogistics(ctx context.Context, id uint64, req *model.UpdateLogisticsRequest) (*model.OrderLogistics, error) {
	logistics, err := s.logisticsRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLogisticsNotFound
		}
		return nil, fmt.Errorf("获取物流信息失败: %w", err)
	}

	// 更新字段
	if req.CompanyID > 0 {
		// 检查物流公司是否存在
		_, err := s.logisticsRepo.GetCompanyByID(ctx, req.CompanyID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrLogisticsCompanyNotFound
			}
			return nil, fmt.Errorf("获取物流公司失败: %w", err)
		}
		logistics.CompanyID = req.CompanyID
	}
	if req.TrackingNo != "" {
		logistics.TrackingNo = req.TrackingNo
	}
	if req.Status != "" {
		logistics.Status = model.LogisticsStatus(req.Status)
	}
	if req.SenderName != "" {
		logistics.SenderName = req.SenderName
	}
	if req.SenderPhone != "" {
		logistics.SenderPhone = req.SenderPhone
	}
	if req.SenderAddress != "" {
		logistics.SenderAddress = req.SenderAddress
	}
	if req.Weight > 0 {
		logistics.Weight = req.Weight
	}
	if req.FreightFee > 0 {
		logistics.FreightFee = req.FreightFee
	}
	if req.Remark != "" {
		logistics.Remark = req.Remark
	}

	if err := s.logisticsRepo.Update(ctx, logistics); err != nil {
		s.logger.Error("更新物流信息失败", zap.Error(err))
		return nil, fmt.Errorf("更新物流信息失败: %w", err)
	}

	s.logger.Info("更新物流信息成功", zap.Uint64("id", id))
	return logistics, nil
}

// AddTrace 添加物流轨迹
func (s *LogisticsService) AddTrace(ctx context.Context, id uint64, req *model.AddTraceRequest) error {
	logistics, err := s.logisticsRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrLogisticsNotFound
		}
		return fmt.Errorf("获取物流信息失败: %w", err)
	}

	trace := model.LogisticsTrace{
		Time:        req.Time,
		Status:      req.Status,
		Description: req.Description,
		Location:    req.Location,
	}

	if err := s.logisticsRepo.AddTrace(ctx, logistics.ID, trace); err != nil {
		s.logger.Error("添加物流轨迹失败", zap.Error(err))
		return fmt.Errorf("添加物流轨迹失败: %w", err)
	}

	// 更新物流状态
	status := s.mapStatusToLogisticsStatus(req.Status)
	if status != "" && logistics.Status != status {
		if err := s.logisticsRepo.UpdateStatus(ctx, logistics.ID, status); err != nil {
			s.logger.Warn("更新物流状态失败", zap.Error(err))
		}
	}

	// 如果状态为已签收，更新实际送达时间
	if status == model.LogisticsStatusDelivered {
		now := time.Now()
		logistics.ActualTime = &now
		if err := s.logisticsRepo.Update(ctx, logistics); err != nil {
			s.logger.Warn("更新实际送达时间失败", zap.Error(err))
		}
	}

	s.logger.Info("添加物流轨迹成功",
		zap.Uint64("id", id),
		zap.String("status", req.Status),
	)
	return nil
}

// mapStatusToLogisticsStatus 将轨迹状态映射到物流状态
func (s *LogisticsService) mapStatusToLogisticsStatus(status string) model.LogisticsStatus {
	statusMap := map[string]model.LogisticsStatus{
		"揽收":   model.LogisticsStatusCollected,
		"已揽收":  model.LogisticsStatusCollected,
		"运输":   model.LogisticsStatusTransit,
		"运输中":  model.LogisticsStatusTransit,
		"派送":   model.LogisticsStatusDelivering,
		"派送中":  model.LogisticsStatusDelivering,
		"签收":   model.LogisticsStatusDelivered,
		"已签收":  model.LogisticsStatusDelivered,
		"退回":   model.LogisticsStatusReturned,
		"异常":   model.LogisticsStatusException,
	}
	if s, ok := statusMap[status]; ok {
		return s
	}
	return ""
}

// UpdateLogisticsStatus 更新物流状态
func (s *LogisticsService) UpdateLogisticsStatus(ctx context.Context, id uint64, status model.LogisticsStatus) error {
	if err := s.logisticsRepo.UpdateStatus(ctx, id, status); err != nil {
		s.logger.Error("更新物流状态失败", zap.Error(err))
		return fmt.Errorf("更新物流状态失败: %w", err)
	}
	s.logger.Info("更新物流状态成功",
		zap.Uint64("id", id),
		zap.String("status", string(status)),
	)
	return nil
}

// DeleteLogistics 删除物流信息
func (s *LogisticsService) DeleteLogistics(ctx context.Context, id uint64) error {
	if err := s.logisticsRepo.Delete(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrLogisticsNotFound
		}
		return fmt.Errorf("删除物流信息失败: %w", err)
	}
	s.logger.Info("删除物流信息成功", zap.Uint64("id", id))
	return nil
}