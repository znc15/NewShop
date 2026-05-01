package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/jwt"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	githubAuthorizeURL   = "https://github.com/login/oauth/authorize"
	githubAccessTokenURL = "https://github.com/login/oauth/access_token"
	githubUserAPIURL     = "https://api.github.com/user"
	githubUserEmailsURL  = "https://api.github.com/user/emails"
)

var (
	ErrGitHubOAuthConfigMissing = errors.New("GitHub OAuth 配置缺失")
	ErrGitHubOAuthDisabled      = errors.New("GitHub OAuth 未启用")
	ErrGitHubOAuthStateInvalid  = errors.New("GitHub OAuth 状态无效")
	ErrGitHubOAuthCodeMissing   = errors.New("GitHub OAuth 授权码缺失")
	ErrGitHubOAuthEmailMissing  = errors.New("GitHub 账户未返回邮箱")
)

type GitHubOAuthService struct {
	userService   *UserService
	configService *ConfigService
	jwtManager    *jwt.JWTManager
	logger        *zap.Logger
	httpClient    *http.Client
}

type GitHubOAuthResult struct {
	AccessToken  string
	RefreshToken string
	User         *model.User
}

type githubOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

type githubAccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

type githubUserProfile struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

type githubUserEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func NewGitHubOAuthService(userService *UserService, configService *ConfigService, jwtManager *jwt.JWTManager, logger *zap.Logger) *GitHubOAuthService {
	return &GitHubOAuthService{
		userService:   userService,
		configService: configService,
		jwtManager:    jwtManager,
		logger:        logger,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *GitHubOAuthService) GenerateState() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	return hex.EncodeToString(buf), nil
}

func (s *GitHubOAuthService) GetAuthorizationURL(ctx context.Context, state string) (string, error) {
	cfg, err := s.getOAuthConfig(ctx)
	if err != nil {
		return "", err
	}

	params := url.Values{}
	params.Set("client_id", cfg.ClientID)
	params.Set("redirect_uri", cfg.RedirectURI)
	params.Set("scope", "read:user user:email")
	params.Set("state", state)

	return githubAuthorizeURL + "?" + params.Encode(), nil
}

func (s *GitHubOAuthService) HandleCallback(ctx context.Context, code string) (*GitHubOAuthResult, error) {
	if strings.TrimSpace(code) == "" {
		return nil, ErrGitHubOAuthCodeMissing
	}

	cfg, err := s.getOAuthConfig(ctx)
	if err != nil {
		return nil, err
	}

	accessToken, err := s.exchangeAccessToken(ctx, cfg, code)
	if err != nil {
		return nil, err
	}

	githubUser, err := s.fetchGitHubUser(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	email := strings.TrimSpace(githubUser.Email)
	if email == "" {
		email, err = s.fetchPrimaryEmail(ctx, accessToken)
		if err != nil {
			return nil, err
		}
	}

	user, err := s.findOrCreateUser(ctx, githubUser, email)
	if err != nil {
		return nil, err
	}

	jwtAccessToken, err := s.jwtManager.GenerateToken(user.ID, user.Email, "user")
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, user.Email, "user")
	if err != nil {
		return nil, err
	}

	return &GitHubOAuthResult{
		AccessToken:  jwtAccessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}

func (s *GitHubOAuthService) exchangeAccessToken(ctx context.Context, cfg *githubOAuthConfig, code string) (string, error) {
	payload := map[string]string{
		"client_id":     cfg.ClientID,
		"client_secret": cfg.ClientSecret,
		"code":          code,
		"redirect_uri":  cfg.RedirectURI,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, githubAccessTokenURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求 GitHub access token 失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp githubAccessTokenResponse
	if err := json.Unmarshal(respBody, &tokenResp); err != nil {
		return "", fmt.Errorf("解析 GitHub access token 响应失败: %w", err)
	}

	if resp.StatusCode >= http.StatusBadRequest {
		return "", fmt.Errorf("GitHub access token 响应异常: %s", strings.TrimSpace(string(respBody)))
	}
	if tokenResp.Error != "" {
		return "", fmt.Errorf("GitHub access token 获取失败: %s", tokenResp.ErrorDesc)
	}
	if strings.TrimSpace(tokenResp.AccessToken) == "" {
		return "", errors.New("GitHub access token 为空")
	}

	return tokenResp.AccessToken, nil
}

func (s *GitHubOAuthService) fetchGitHubUser(ctx context.Context, accessToken string) (*githubUserProfile, error) {
	var profile githubUserProfile
	if err := s.doGitHubAPIRequest(ctx, accessToken, githubUserAPIURL, &profile); err != nil {
		return nil, err
	}

	return &profile, nil
}

func (s *GitHubOAuthService) fetchPrimaryEmail(ctx context.Context, accessToken string) (string, error) {
	var emails []githubUserEmail
	if err := s.doGitHubAPIRequest(ctx, accessToken, githubUserEmailsURL, &emails); err != nil {
		return "", err
	}

	for _, item := range emails {
		if item.Primary && item.Verified && strings.TrimSpace(item.Email) != "" {
			return strings.TrimSpace(item.Email), nil
		}
	}
	for _, item := range emails {
		if item.Verified && strings.TrimSpace(item.Email) != "" {
			return strings.TrimSpace(item.Email), nil
		}
	}

	return "", ErrGitHubOAuthEmailMissing
}

func (s *GitHubOAuthService) doGitHubAPIRequest(ctx context.Context, accessToken, requestURL string, dest interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("请求 GitHub 用户信息失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("GitHub API 响应异常: %s", strings.TrimSpace(string(respBody)))
	}

	if err := json.Unmarshal(respBody, dest); err != nil {
		return fmt.Errorf("解析 GitHub API 响应失败: %w", err)
	}

	return nil
}

func (s *GitHubOAuthService) findOrCreateUser(ctx context.Context, githubUser *githubUserProfile, email string) (*model.User, error) {
	user, err := s.userService.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if err == nil && user != nil {
		updated := false
		if strings.TrimSpace(user.Nickname) == "" {
			user.Nickname = s.buildNickname(githubUser, email)
			updated = true
		}
		if strings.TrimSpace(user.Avatar) == "" && strings.TrimSpace(githubUser.AvatarURL) != "" {
			user.Avatar = strings.TrimSpace(githubUser.AvatarURL)
			updated = true
		}
		if updated {
			if updateErr := s.userService.Update(ctx, user); updateErr != nil {
				s.logger.Warn("更新 GitHub 登录用户资料失败", zap.Error(updateErr), zap.String("email", email))
			}
		}
		return user, nil
	}

	randomPassword, err := s.GenerateState()
	if err != nil {
		return nil, err
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	newUser := &model.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Nickname:     s.buildNickname(githubUser, email),
		Avatar:       strings.TrimSpace(githubUser.AvatarURL),
		MemberLevel:  1,
		Points:       0,
		Status:       "active",
	}

	if err := s.userService.Create(ctx, newUser); err != nil {
		return nil, err
	}

	return newUser, nil
}

func (s *GitHubOAuthService) buildNickname(githubUser *githubUserProfile, email string) string {
	if strings.TrimSpace(githubUser.Name) != "" {
		return strings.TrimSpace(githubUser.Name)
	}
	if strings.TrimSpace(githubUser.Login) != "" {
		return strings.TrimSpace(githubUser.Login)
	}
	parts := strings.Split(email, "@")
	if len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
		return strings.TrimSpace(parts[0])
	}
	return "GitHub 用户"
}

func (s *GitHubOAuthService) getOAuthConfig(ctx context.Context) (*githubOAuthConfig, error) {
	// 检查 GitHub OAuth 是否已启用
	if !s.configService.IsFeatureEnabled(ctx, model.ConfigKeyGitHubEnabled) {
		return nil, ErrGitHubOAuthDisabled
	}

	clientID, err := s.getDecodedStringConfig(ctx, model.ConfigKeyGitHubClientID)
	if err != nil {
		return nil, err
	}
	clientSecret, err := s.getDecodedStringConfig(ctx, model.ConfigKeyGitHubClientSecret)
	if err != nil {
		return nil, err
	}
	redirectURI, err := s.getDecodedStringConfig(ctx, model.ConfigKeyGitHubRedirectURI)
	if err != nil {
		return nil, err
	}

	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return nil, ErrGitHubOAuthConfigMissing
	}

	return &githubOAuthConfig{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  redirectURI,
	}, nil
}

func (s *GitHubOAuthService) getDecodedStringConfig(ctx context.Context, key string) (string, error) {
	config, err := s.configService.GetByKey(ctx, key)
	if err != nil {
		return "", err
	}

	var value string
	if err := json.Unmarshal([]byte(config.Value), &value); err != nil {
		return "", err
	}

	return strings.TrimSpace(value), nil
}
