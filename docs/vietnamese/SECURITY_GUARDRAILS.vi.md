# 🛡️ Chính sách Bảo mật & Rào chắn An toàn (Guardrails)

Agentic Awesome Skills là một bộ công cụ mạnh mẽ. Và quyền lực lớn luôn đi kèm với trách nhiệm lớn. Tài liệu này xác định **Quy tắc Ứng xử** cho tất cả các khả năng bảo mật và tấn công trong repository này.

## 🔴 Chính sách đối với Skill Tấn công (Vạch kẻ đỏ)

**Skill Tấn công là gì?**
Bất kỳ kỹ năng (skill) nào được thiết kế để xâm nhập, khai thác, làm gián đoạn hoặc mô phỏng tấn công chống lại các hệ thống.  
_Ví dụ: Pentesting (Kiểm thử xâm nhập), SQL Injection, Mô phỏng Phishing, Red Teaming._

### 1. Tuyên bố từ chối trách nhiệm "Chỉ dành cho mục đích sử dụng đã được phê duyệt"

Mỗi skill tấn công **BẮT BUỘC** phải bắt đầu bằng tuyên bố từ chối trách nhiệm chính xác như sau trong file `SKILL.md`:

> **⚠️ CHỈ DÀNH CHO MỤC ĐÍCH SỬ DỤNG ĐÃ ĐƯỢC PHÊ DUYỆT**  
> Skill này chỉ dành cho mục đích giáo dục hoặc đánh giá bảo mật đã được cấp phép.  
> Bạn phải có sự cho phép rõ ràng bằng văn bản từ chủ sở hữu hệ thống trước khi sử dụng công cụ này.  
> Việc lạm dụng công cụ này là bất hợp pháp và bị nghiêm cấm hoàn toàn.

### 2. Yêu cầu Xác nhận từ Người dùng

Các skill tấn công **KHÔNG BAO GIỜ** được chạy hoàn toàn tự động một cách tự ý (autonomously).

- **Yêu cầu**: Mô tả hoặc hướng dẫn của skill phải yêu cầu agent (trợ lý AI) *hỏi xác nhận của người dùng* trước khi thực thi bất kỳ lệnh khai thác hoặc tấn công nào.
- **Hướng dẫn cho Agent**: "Yêu cầu người dùng xác minh URL/IP mục tiêu trước khi chạy."

### 3. Thiết kế để An toàn

- **Không chứa mã độc (Weaponized Payloads)**: Các skill không được bao gồm malware hoạt động, ransomware, hoặc các mã khai thác không mang tính giáo dục.
- **Khuyến nghị dùng Sandbox**: Các hướng dẫn nên khuyến nghị chạy trong môi trường cô lập (Docker/VM).

---

## 🔵 Chính sách đối với Skill Phòng thủ

**Skill Phòng thủ là gì?**
Các công cụ dùng để tăng cường bảo mật (hardening), kiểm tra (auditing), giám sát (monitoring), hoặc bảo vệ hệ thống.  
_Ví dụ: Linting (Kiểm tra lỗi code), Phân tích Log, Kiểm tra Cấu hình._

- **Quyền riêng tư dữ liệu**: Các kỹ năng phòng thủ không được tải dữ liệu lên các máy chủ bên thứ ba mà không có sự đồng ý rõ ràng của người dùng.
- **Không gây hư tổn (Non-Destructive)**: Các quy trình kiểm tra (audits) nên mặc định ở chế độ chỉ đọc (read-only).

---

## ⚖️ Tuyên bố Pháp lý

Bằng việc sử dụng repository này, bạn đồng ý rằng:

1. Bạn tự chịu trách nhiệm về hành động của mình.
2. Các tác giả và người đóng góp không chịu trách nhiệm cho bất kỳ thiệt hại nào do các công cụ này gây ra.
3. Bạn sẽ tuân thủ tất cả các luật địa phương, tiểu bang và liên bang liên quan đến an ninh mạng.
