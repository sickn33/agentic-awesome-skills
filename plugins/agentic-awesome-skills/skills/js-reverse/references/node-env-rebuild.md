# Node 环境复现

Node 侧默认顺序：

1. 导入目标脚本
2. 最小 shim 宿主对象
3. 跑入口函数
4. 记录首个异常或 first divergence
5. 回到页面证据补齐缺口
