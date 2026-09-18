# AAS Core

**AAS Core** là lớp điều khiển cục bộ, ưu tiên agent được khuyến nghị cho Agentic Awesome Skills. Core cho phép Codex hoặc Claude Code tìm kiếm và đọc catalog cục bộ đã xác minh, tự chọn chính xác các ID skill, rồi lưu lựa chọn đó trong `aas-stack.json` để người dùng xem trước trước khi có bất kỳ thay đổi nào. Core không xếp hạng hay đề xuất skill.

> **Ranh giới phát hành:** Gói npm 14.6.0 đã phát hành trước AAS Core và không thể dùng để bootstrap Core. Các gói hỗ trợ Core bắt đầu từ dòng 15.x; chỉ dùng một phiên bản chính xác có release notes tuyên bố rõ rằng nó bao gồm AAS Core.

## Luồng sử dụng

1. Dùng AAS CLI chính thức để cấu hình MCP stdio cục bộ cho Codex hoặc Claude Code.
2. Cho phép agent gọi `search_skills` và `get_skill`, tự đánh giá kết quả theo ngữ nghĩa, rồi gọi `compose_stack` với `profile` và các ID đã chọn; dùng `inspect_stack` để xác minh và `diff_stack` khi cần so sánh.
3. Xem lại tệp `aas-stack.json` schema 2 chứa `profile` và đúng thứ tự ID do agent chọn.
4. Dùng AAS CLI để xác thực manifest và xem trước kế hoạch chính xác.
5. Dừng lại sau khi xem kế hoạch; chỉ nghiên cứu các giai đoạn sau nếu bạn chủ động tham gia phát triển preview có kiểm soát.

## Ranh giới tin cậy

- AAS MCP chạy cục bộ và chỉ đọc; MCP không cài đặt, xóa, áp dụng hay cập nhật nội dung.
- Kết quả tìm kiếm đầy đủ, phân trang và có thứ tự catalog ổn định; chúng không chứa điểm số hay thứ hạng. Codex hoặc Claude Code tự đánh giá và chọn skill.
- `validate` và `plan` là luồng preview hiện được ghi nhận. `apply` và `recover` bị tắt theo mặc định và chưa phải là cam kết an toàn đã được chứng nhận.
- Danh tính catalog và runtime được xác minh cục bộ. Theo mặc định, dữ liệu dự án không được gửi tới dịch vụ AAS.

## Quan hệ với plugin và cài đặt trực tiếp

AAS Core là lớp truy cập catalog, ghi nhận lựa chọn và xác thực; Codex hoặc Claude Code ra quyết định ngữ nghĩa. Plugin, plugin chuyên biệt và bản cài đặt thư viện đầy đủ vẫn là các cách phân phối nội dung skill. Với Codex và Claude Code, nên dùng Core để lưu stack do agent chọn trước, rồi mới chọn cách phân phối phù hợp.

Các công cụ chưa có adapter AAS Core vẫn có thể dùng cách cài đặt trực tiếp, plugin hoặc tích hợp manifest tùy chỉnh.

Xem [`docs/users/aas-core.md`](../users/aas-core.md) để biết các lệnh tiếng Anh và yêu cầu cấu hình hiện tại.
