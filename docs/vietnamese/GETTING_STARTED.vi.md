# Hướng dẫn Bắt đầu với Agentic Awesome Skills (V13.2.0)

**Bạn mới đến đây? Hướng dẫn này sẽ giúp bạn tăng cường sức mạnh cho trợ lý trợ lý AI của mình chỉ trong 5 phút.**

---

## 🤔 "Skills" (Kỹ năng) là gì?

Các trợ lý AI (như **Claude Code**, **Codex CLI**, **Gemini CLI**, **Cursor**, **Antigravity**, **Kiro** và **OpenCode**) rất thông minh, nhưng chúng thiếu kiến thức cụ thể về các công cụ và quy trình làm việc của bạn.
**Skills** là các hướng dẫn sử dụng chuyên biệt (dưới dạng file markdown) dạy cho AI của bạn cách thực hiện các tác vụ cụ thể một cách hoàn hảo trong mọi lần thực hiện.

**Một phép so sánh:** AI của bạn là một thực tập sinh xuất sắc. **Skills** là các SOP (Quy trình vận hành tiêu chuẩn) biến họ thành một Kỹ sư cao cấp.

---

## ⚡️ Khởi động nhanh: Các "Gói khởi đầu" (Starter Packs)

Đừng lo lắng về con số hơn 1,684 kỹ năng. Bạn không cần dùng tất cả chúng cùng một lúc.
Chúng tôi đã tuyển chọn các **Gói khởi đầu** để bạn có thể bắt đầu sử dụng ngay lập tức.

### 1. Cài đặt Repository

Khuyến nghị dùng installer CLI. Mặc định, lệnh này cài vào `~/.agents/skills` cho Antigravity global:

```bash
npx agentic-awesome-skills
```

Bạn cũng có thể dùng cờ theo công cụ, ví dụ `--claude`, `--gemini`, `--codex`, `--cursor`, `--kiro`, `--antigravity`, `--agy`, hoặc `--path <dir>` để chọn thư mục đích.

### 2. Chọn vai trò của bạn

Tìm gói kỹ năng phù hợp với vị trí của bạn (xem [BUNDLES.md](BUNDLES.vi.md)):

| Vai trò               | Tên Gói kỹ năng | Bên trong có những gì?                            |
| :-------------------- | :-------------- | :------------------------------------------------ |
| **Web Developer**     | `Web Wizard`    | React Patterns, Tailwind mastery, Frontend Design |
| **Security Engineer** | `Hacker Pack`   | OWASP, Metasploit, Pentest Methodology            |
| **Manager / PM**      | `Product Pack`  | Brainstorming, Planning, SEO, Strategy            |
| **Cơ bản cho tất cả** | `Essentials`    | Clean Code, Planning, Validation (Những thứ cơ bản nhất) |

---

## 🚀 Cách sử dụng một Skill

Sau khi cài đặt, bạn chỉ cần trò chuyện với AI một cách tự nhiên.

### Ví dụ 1: Lập kế hoạch cho một Tính năng (**Essentials**)

> "Sử dụng **@brainstorming** để giúp tôi thiết kế một luồng đăng nhập mới."

**Điều gì sẽ xảy ra:** AI sẽ tải kỹ năng brainstorming, đặt cho bạn các câu hỏi có cấu trúc và tạo ra một bản đặc tả chuyên nghiệp.

### Ví dụ 2: Kiểm tra Code của bạn (**Web Wizard**)

> "Chạy **@lint-and-validate** trên file này và sửa các lỗi."

**Điều gì sẽ xảy ra:** AI sẽ tuân theo các quy tắc linting nghiêm ngặt được định nghĩa trong skill để làm sạch code của bạn.

### Ví dụ 3: Kiểm tra Bảo mật (**Hacker Pack**)

> "Sử dụng **@api-security-best-practices** để xem xét các endpoint API của tôi."

**Điều gì sẽ xảy ra:** AI sẽ kiểm tra code của bạn dựa trên các tiêu chuẩn OWASP.

---

## 🔌 Các công cụ được hỗ trợ

| Công cụ          | Trạng thái      | Đường dẫn         |
| :--------------- | :-------------- | :---------------- |
| **Claude Code**  | ✅ Hỗ trợ đầy đủ | `.claude/skills/` hoặc Claude plugin marketplace |
| **Gemini CLI**   | ✅ Hỗ trợ đầy đủ | `.gemini/skills/` |
| **Codex CLI**    | ✅ Hỗ trợ đầy đủ | `.codex/skills/` |
| **Kiro CLI / IDE** | ✅ Hỗ trợ đầy đủ | `~/.kiro/skills/` hoặc `.kiro/skills/` |
| **Antigravity**  | ✅ Hỗ trợ gốc   | `~/.agents/skills/` hoặc `.agent/skills/` |
| **Antigravity CLI (`agy`)** | ✅ Hỗ trợ đầy đủ | `~/.gemini/antigravity-cli/skills/` |
| **Cursor**       | ✅ Hỗ trợ gốc   | `.cursor/skills/` |
| **OpenCode**     | ✅ Hỗ trợ đầy đủ | `.agents/skills/` |
| **AdaL CLI**     | ✅ Hỗ trợ đầy đủ | `.adal/skills/` |
| **Copilot**      | ⚠️ Chỉ văn bản  | Copy-paste thủ công |

---

## 🛡️ Sự tin cậy & An toàn

Chúng tôi phân loại các kỹ năng để bạn biết mình đang chạy những gì. Các giá trị này khớp trực tiếp với trường `risk:` trong frontmatter của mỗi `SKILL.md`:

- ⚪ **`unknown`**: Nội dung cũ hoặc chưa được phân loại, vẫn cần maintainer phân loại.
- 🟢 **`none`**: Hướng dẫn thuần văn bản hoặc lập luận.
- 🔵 **`safe`**: Hướng dẫn chỉ đọc hoặc vận hành rủi ro thấp.
- 🟠 **`critical`**: Hướng dẫn thay đổi trạng thái hoặc có thể ảnh hưởng đến triển khai.
- 🔴 **`offensive`**: Hướng dẫn pentesting/red-team với cảnh báo Authorized Use Only rõ ràng.

_Kiểm tra [Danh mục Skill (Skill Catalog)](../../CATALOG.md) để xem danh sách đầy đủ._

---

## ❓ FAQ

**H: Tôi có cần cài đặt tất cả 1,684+ kỹ năng không?**
Đ: Bạn tải toàn bộ repo về, nhưng AI của bạn chỉ _đọc_ những kỹ năng bạn yêu cầu (hoặc những kỹ năng có liên quan). Nó rất nhẹ!

**H: Tôi có thể tự tạo kỹ năng cho riêng mình không?**  
Đ: Có! Sử dụng kỹ năng **@skill-creator** để tự xây dựng.

**H: Nó có miễn phí không?**  
Đ: Có, Giấy phép MIT. Mã nguồn mở mãi mãi.

---

## ⏭️ Các bước tiếp theo

1. [Duyệt qua các Gói kỹ năng (Bundles)](BUNDLES.vi.md)
2. [Xem các Ví dụ thực tế (Examples)](EXAMPLES.vi.md)
3. [Đóng góp một Skill mới](../../CONTRIBUTING.md)
