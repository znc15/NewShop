package errors

type ErrorCode struct {
	Code    int
	Message string
}

var (
	// 成功
	ErrSuccess = ErrorCode{0, "成功"}

	// 通用错误 1xxxx
	ErrBadRequest     = ErrorCode{10001, "请求参数错误"}
	ErrUnauthorized   = ErrorCode{10002, "未授权"}
	ErrForbidden      = ErrorCode{10003, "禁止访问"}
	ErrNotFound       = ErrorCode{10004, "资源不存在"}
	ErrInternalServer = ErrorCode{10005, "服务器内部错误"}

	// 用户错误 2xxxx
	ErrUserNotFound      = ErrorCode{20001, "用户不存在"}
	ErrUserAlreadyExists = ErrorCode{20002, "用户已存在"}
	ErrInvalidPassword   = ErrorCode{20003, "密码错误"}
	ErrInvalidCaptcha    = ErrorCode{20004, "验证码错误"}

	// 商品错误 3xxxx
	ErrProductNotFound   = ErrorCode{30001, "商品不存在"}
	ErrProductOffShelf   = ErrorCode{30002, "商品已下架"}
	ErrInsufficientStock = ErrorCode{30003, "库存不足"}

	// 订单错误 4xxxx
	ErrOrderNotFound      = ErrorCode{40001, "订单不存在"}
	ErrOrderStatusInvalid = ErrorCode{40002, "订单状态无效"}
	ErrOrderAlreadyPaid   = ErrorCode{40003, "订单已支付"}

	// 支付错误 5xxxx
	ErrPaymentNotFound     = ErrorCode{50001, "支付记录不存在"}
	ErrPaymentAlreadyPaid  = ErrorCode{50002, "支付已完成"}
	ErrPaymentRefundFailed = ErrorCode{50003, "退款失败"}

	ErrPageNotFound      = ErrorCode{60001, "页面不存在"}
	ErrPageSlugExists    = ErrorCode{60002, "页面标识已存在"}
	ErrPageStatusInvalid = ErrorCode{60003, "页面状态无效"}
)
