# 自动化入口

推荐开场顺序：

1. `js-reverse_new_page` 或 `js-reverse_navigate_page` 打开页面
2. `js-reverse_list_network_requests` 看最近请求
3. `js-reverse_get_request_initiator` 找调用栈
4. `js-reverse_list_scripts` 建立脚本范围
5. `js-reverse_search_in_sources` 搜请求路径、参数名、函数名
6. 必要时 `js-reverse_break_on_xhr` 或 `js-reverse_set_breakpoint_on_text`

默认不要一上来就猜 `window`、`document`、`navigator` 该怎么补。
