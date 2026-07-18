# AAS Core

**AAS Core** là lớp điều khiển cục bộ, ưu tiên agent được khuyến nghị cho Agentic Awesome Skills. Core cho phép Codex hoặc Claude Code tìm kiếm và kiểm tra catalog cục bộ đã xác minh, tạo đề xuất stack tối thiểu theo quy tắc xác định, rồi trình bày `aas-stack.json` và kế hoạch CLI để người dùng xem trước khi có bất kỳ thay đổi nào.

> **Ranh giới phát hành:** Gói npm 14.6.0 đã phát hành trước AAS Core và không thể dùng để bootstrap Core. Các gói hỗ trợ Core bắt đầu từ dòng 15.x; chỉ dùng một phiên bản chính xác có release notes tuyên bố rõ rằng nó bao gồm AAS Core.

## Luồng sử dụng

1. Dùng AAS CLI chính thức để cấu hình MCP stdio cục bộ cho Codex hoặc Claude Code.
2. Cho phép agent gọi `search_skills`, `get_skill` và `recommend_stack`; chỉ dùng `inspect_stack` hoặc `diff_stack` khi cần.
3. Xem lại tệp `aas-stack.json` do agent đề xuất.
4. Dùng AAS CLI để xác thực manifest và xem trước kế hoạch chính xác.
5. Dừng lại sau khi xem kế hoạch; chỉ nghiên cứu các giai đoạn sau nếu bạn chủ động tham gia phát triển preview có kiểm soát.

## Ranh giới tin cậy

- AAS MCP chạy cục bộ và chỉ đọc; MCP không cài đặt, xóa, áp dụng hay cập nhật nội dung.
- Đề xuất dựa trên quy tắc xác định và bằng chứng trong catalog, không dựa trên một lệnh gọi mô hình ẩn khác.
- `validate` và `plan` là luồng preview hiện được ghi nhận. `apply` và `recover` bị tắt theo mặc định và chưa phải là cam kết an toàn đã được chứng nhận.
- Danh tính catalog và runtime được xác minh cục bộ. Theo mặc định, dữ liệu dự án không được gửi tới dịch vụ AAS.

## Quan hệ với plugin và cài đặt trực tiếp

AAS Core là lớp điều phối và ra quyết định. Plugin, plugin chuyên biệt và bản cài đặt thư viện đầy đủ vẫn là các cách phân phối nội dung skill. Với Codex và Claude Code, nên dùng Core để xác định stack tối thiểu trước, rồi mới chọn cách phân phối phù hợp.

Các công cụ chưa có adapter AAS Core vẫn có thể dùng cách cài đặt trực tiếp, plugin hoặc tích hợp manifest tùy chỉnh.

Xem [`docs/users/aas-core.md`](../users/aas-core.md) để biết các lệnh tiếng Anh và yêu cầu cấu hình hiện tại.
