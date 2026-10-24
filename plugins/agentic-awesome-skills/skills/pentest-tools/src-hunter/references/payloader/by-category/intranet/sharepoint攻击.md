# SharePoint攻击

_2 条 intranet payload_

示例中的 sharepoint.com 不是可授权的占位目标：替换为明确在范围内的测试租户。SharePoint Online 通常需要受支持的 OAuth 流程；`curl -u` 和旧版 SharePointOnlineCredentials 片段不是通用的现代租户登录方案。列表 items 返回元数据，不自动下载文件内容。

### SharePoint枚举  `sharepoint-enum`
_枚举SharePoint站点和文件_
子类：**枚举** · tags: `sharepoint` `enum` `recon`

**前置条件：**
- SharePoint可访问

**攻击链：**

**站点枚举**
> 枚举站点
_platform: linux_
```
curl -k https://sharepoint.com/_api/web/webs
获取所有子站点
```

**用户枚举**
> 枚举用户
_platform: linux_
```
curl -k https://sharepoint.com/_api/web/siteusers
获取站点用户列表
```

**文件枚举**
> 枚举文档库
_platform: linux_
```
curl -k https://sharepoint.com/_api/web/lists
获取文档库列表
```

**搜索文件**
> 搜索敏感内容
_platform: linux_
```
curl -k "https://sharepoint.com/_api/search/query?querytext='password'"
搜索敏感文件
```


**概述：** SharePoint REST API可用于枚举。

**判定边界：** REST API 和已授权用户读取文档属于正常功能。仅在两个测试账户之间证明越权、匿名敏感数据泄露等具体影响时报告漏洞。

**利用方法：** 利用流程：1) 枚举站点 2) 枚举用户 3) 搜索敏感文件

**防御措施：** 防御措施：1) 限制API访问 2) 配置权限 3) 监控异常请求

---

### SharePoint文件访问  `sharepoint-file-access`
_访问SharePoint文档库中的文件_
子类：**文件访问** · tags: `sharepoint` `file` `access`

**前置条件：**
- SharePoint凭证或漏洞

**攻击链：**

**Web界面访问**
> Web界面访问
```
https://sharepoint.com/sites/site_name/Shared Documents
通过浏览器访问文档库
下载敏感文件
```

**REST API访问**
> REST API访问
_platform: linux_
```
curl -k -u user:password "https://sharepoint.com/_api/web/lists/getbytitle('Documents')/items"
获取文档列表
下载文件内容
```
**语法解析：**
- `_api/web/lists` — REST API端点 _keyword_
- `getbytitle` — 按名称获取列表 _keyword_

**CSOM访问**
> CSOM访问
_platform: windows_
```
使用SharePoint客户端对象模型:
ClientContext context = new ClientContext("https://sharepoint.com");
context.Credentials = new SharePointOnlineCredentials(user, password);
List list = context.Web.Lists.GetByTitle("Documents");
```

**OneDrive同步**
> OneDrive同步
```
使用OneDrive客户端同步SharePoint文档库
本地访问当前账户被授权且客户端实际同步的文件
离线查看敏感数据
```


**概述：** SharePoint文件可通过多种方式访问。

**漏洞原理：** 访问范围取决于账户权限、认证方式、条件访问和租户策略；持有凭证不保证完整访问。

**利用方法：** 利用流程：1) 获取凭证 2) 访问文档库 3) 下载敏感文件

**防御措施：** 防御措施：1) 权限最小化 2) 监控文件访问 3) 数据分类保护

---
