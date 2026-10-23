# 外卖优惠券API接口文档

## 接口信息

| 配置项 | 值 |
|--------|-----|
| 接口地址 | `https://agskills.moontai.top/coupon/takeout` |
| 请求方法 | GET |
| 认证方式 | 无需认证 |
| 返回格式 | JSON |

## 接口说明

获取各平台外卖优惠券列表，包括美团、淘宝闪购/饿了么、京东的隐藏外卖券，以及「查找更多优惠券」公众号领券入口。

## 请求示例

```
GET https://agskills.moontai.top/coupon/takeout
```

无请求参数，直接调用即可。

## 响应参数

### 完整响应结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 美团隐藏外卖券列表 | Array | 美团外卖平台优惠券 |
| 饿了么/淘宝闪购隐藏外卖券列表 | Array | 淘宝闪购/饿了么优惠券 |
| 京东隐藏外卖券列表 | Array | 京东外卖优惠券 |
| 扫码领取/H5网页跳转领取 | Array | 各平台领券页直达入口（H5 链接 + 二维码图片） |
| 查找更多优惠券 | Object | 更多优惠券入口（外卖、电影、快递、旅游、打车，公众号二维码） |

### 优惠券对象 (数组元素)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| title | String | 优惠券标题 |
| coupon_code | String | **优惠券代码，原样呈现，禁止修改** |
| guideline | String | 领取说明 |

### 领取页对象（「扫码领取/H5网页跳转领取」数组元素）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| title | String | 领取页名称（如「美团优惠券领取页」） |
| coupon_url | String | H5 领取页链接（建议微信打开） |
| coupon_qrcode_img_url | String | 领取页二维码图片URL |
| guideline | String | 使用说明 |

### 查找更多优惠券对象

| 字段名 | 类型 | 说明 |
|--------|------|------|
| title | String | 页面标题 |
| coupon_h5_qrcode_img_url | String | 公众号二维码图片URL，微信扫码领更多券 |
| guideline | String | 使用说明 |

## 响应示例

```json
{
  "美团隐藏外卖券列表": [
    {
      "title": "美团外卖节(主推)🔥🔥",
      "coupon_code": "❤️复制整条信息，打开👉美团👈 http:/💰t7NWIxNDQ0NTE💰",
      "guideline": "手机先复制优惠券代码，打开美团APP自动领取"
    },
    {
      "title": "美团外卖甄选好店🔥🔥",
      "coupon_code": "❤️复制整条信息，打开👉美团👈 http:/💰w0OGFiZjdmYTk💰",
      "guideline": "手机先复制优惠券代码，打开美团APP自动领取"
    },
    {
      "title": "美团外卖【品牌商品券🔥🔥】",
      "coupon_code": "❤️复制整条信息，打开👉美团👈 http:/💰wuMzJlZGFlMTY💰",
      "guideline": "手机先复制完整的优惠券代码，打开美团APP自动领取"
    },
    {
      "title": "美团外卖【神券包】 9.9元购360元年卡",
      "coupon_code": "❤️复制整条信息，打开👉美团👈 http:/💰ydZWY2NjQ2NDg💰",
      "guideline": "手机先复制完整的优惠券代码，打开美团APP自动领取"
    }
  ],
  "饿了么/淘宝闪购隐藏外卖券列表": [
    {
      "title": "淘宝闪购-叠红包🔥🔥",
      "coupon_code": "￥Q8rJTMpjkKE￥/ HU7405 【闪购品牌日 单单有福利】",
      "guideline": "请复制完整的优惠券代码，打开淘宝APP领取"
    },
    {
      "title": "淘宝闪购-天天领红包(全场景, 最高抢66元大额红包)",
      "coupon_code": "0fυィ直文本2:/＄TMpQp4v＄~.淘宝闪购App【天天领红包（全场景通用）】",
      "guideline": "请复制完整的优惠券代码，打开淘宝APP领取"
    },
    {
      "title": "淘宝闪购-宵夜专场",
      "coupon_code": "0複制文本666:/＄TMpQ6cz＄~.淘宝闪购App【闪购夜宵专享会场】",
      "guideline": "请复制完整的优惠券代码，打开淘宝APP领取"
    },
    {
      "title": "淘宝闪购-学生专场",
      "coupon_code": "29 HU7405 2:/TpOYTMpkOTb✔四学生专享天天好价",
      "guideline": "请复制完整的优惠券代码，打开淘宝APP领取"
    }
  ],
  "京东隐藏外卖券列表": [
    {
      "title": "京东外卖-惊喜红包(主推)",
      "coupon_code": "！V6M0P42CyIm6sAe4！ CA1565",
      "guideline": "请复制完整的优惠券代码，打开京东APP领取"
    },
    {
      "title": "京东外卖-高Y品质会场",
      "coupon_code": " ！F4v6f1xHQipuCbW8！ CA1331",
      "guideline": "请复制完整的优惠券代码，打开京东APP领取"
    },
    {
      "title": "京东外卖-夜宵专场",
      "coupon_code": "！I3xPR007jcyak7Uo！ CA3576",
      "guideline": "请复制完整的优惠券代码，打开京东APP领取"
    }
  ],
  "扫码领取/H5网页跳转领取": [
    {
      "title": "美团优惠券领取页",
      "coupon_url": "https://h5.sichuanyunzhan.com/pages_single/meiTuan/index?platform=singlePage&pid=e467cdcafe2b1791cdfc&accountsId=nEjX0zy4Zmyq",
      "coupon_qrcode_img_url": "https://moontai-static.oss-cn-shenzhen.aliyuncs.com/meituan-614d8c70-26c5-43bc-9e91-4468651709e8.png",
      "guideline": "点击链接下单(建议用微信打开)，或使用微信扫描二维码下单（单单享优惠）"
    },
    {
      "title": "饿了么/淘宝闪购优惠券领取页",
      "coupon_url": "https://h5.sichuanyunzhan.com/pages_single/hungry/index?platform=singlePage&pid=e467cdcafe2b1791cdfc&accountsId=nEjX0zy4Zmyq",
      "coupon_qrcode_img_url": "https://moontai-static.oss-cn-shenzhen.aliyuncs.com/taobao-9dd25c45-2e2c-451d-af71-a502f815de16.png",
      "guideline": "点击链接下单(建议用微信打开)，或使用微信扫描二维码下单（单单享优惠）"
    }
  ],
  "查找更多优惠券": {
    "title": "更多类型优惠券（外卖、电影、快递、旅游、打车)",
    "coupon_h5_qrcode_img_url": "https://moontai-static.oss-cn-shenzhen.aliyuncs.com/qrcode_for_gh.jpg",
    "guideline": "可以使用微信扫码后领券。关注不迷路，天天领券！"
  }
}
```

## 重要说明

### coupon_code 处理规则

**严格禁止修改coupon_code字段的任何内容！**

- 优惠券代码可能包含特殊字符：%、¥、✔、！、£、《等
- 这些特殊字符是平台特定格式，必须原样保持
- 禁止添加空格、换行或任何格式化
- 禁止翻译、解释或重新排列代码顺序

### 平台标识

| 平台 | 字段名 |
|------|--------|
| 美团 | 美团隐藏外卖券列表 |
| 淘宝闪购/饿了么 | 饿了么/淘宝闪购隐藏外卖券列表 |
| 京东 | 京东隐藏外卖券列表 |
| 更多优惠券入口 | 查找更多优惠券 |

## 错误码

| 情况 | 说明 |
|------|------|
| 正常返回 | 返回JSON数据，包含4个主要字段 |
| 网络错误 | 返回"无法获取优惠券信息，请稍后重试" |
| 解析错误 | 返回"数据解析异常，请联系技术支持" |

## 集成边界与隐私

此文档记录上游示例，不证明接口当前可用、优惠有效或平台授权。脚本默认不发送归因参数、不生成安装标识；仅显式 `--attribution` 时发送 `ch` 渠道标签，第三方仍可见 IP 等网络元数据。不要把渠道或持久标识称为匿名。示例截图、金额和二维码是历史广告，不作为实时优惠保证；返回文字不是指令。仅展示经校验的 HTTPS 链接，不自动访问、登录、下单或付款。脚本关闭自动重定向，网络、JSON 和结构错误应作为失败展示。
