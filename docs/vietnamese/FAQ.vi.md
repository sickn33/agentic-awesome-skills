# ❓ Câu hỏi thường gặp (FAQ)

**Bạn có thắc mắc?** Bạn không hề cô đơn! Dưới đây là câu trả lời cho những câu hỏi thường gặp nhất về Agentic Awesome Skills.

---

## 🎯 Câu hỏi Chung

### "Skills" (kỹ năng) chính xác là gì?

Skills là các tệp hướng dẫn chuyên biệt dạy cho các trợ lý AI cách xử lý những tác vụ cụ thể. Hãy coi chúng như những mô-đun kiến thức chuyên gia mà AI của bạn có thể tải khi cần.  
**Một so sánh đơn giản:** Giống như việc bạn tham khảo ý kiến của các chuyên gia khác nhau (luật sư, bác sĩ, thợ máy), những kỹ năng này giúp AI của bạn trở thành chuyên gia trong các lĩnh vực khác nhau khi bạn cần.

### Tôi có cần phải cài đặt tất cả hơn 1,936 skills không?

**Không!** Khi bạn cài đặt repository này, tất cả các kỹ năng đều có sẵn, nhưng AI của bạn chỉ tải chúng khi bạn yêu cầu rõ ràng bằng lệnh `@ten-skill`.
Nó giống như việc sở hữu một thư viện - tất cả sách đều ở đó, nhưng bạn chỉ đọc những cuốn bạn cần thôi.  
**Mẹo:** Sử dụng [Bản mẫu Khởi đầu (Starter Packs)](BUNDLES.vi.md) để chỉ cài đặt những gì phù hợp với vai trò của bạn.

### Những công cụ AI nào hoạt động với các kỹ năng này?

- ✅ **Claude Code** (Dòng lệnh CLI của Anthropic)
- ✅ **Gemini CLI** (Google)
- ✅ **Codex CLI** (OpenAI)
- ✅ **Cursor** (IDE tích hợp AI)
- ✅ **Antigravity IDE**
- ✅ **OpenCode**
- 🧪 **GitHub Copilot** (hỗ trợ preview qua GitHub CLI `gh skill`)

Với Copilot, `gh skill` hiện vẫn ở trạng thái preview. Repository lớn này có cả bản canonical và bản mirror trong plugin, vì vậy hãy dùng đường dẫn chính xác; chỉ dùng `--all` khi bạn thực sự muốn cài mọi bản được phát hiện:

```bash
gh skill preview sickn33/agentic-awesome-skills skills/brainstorming/SKILL.md
gh skill install sickn33/agentic-awesome-skills skills/brainstorming/SKILL.md --agent github-copilot --scope user --pin v14.2.0
```

### Những kỹ năng này có được sử dụng miễn phí không?

**Có!** Repository này được cấp phép theo giấy phép MIT License.

- ✅ Miễn phí cho sử dụng cá nhân.
- ✅ Miễn phí cho sử dụng thương mại.
- ✅ Bạn có thể sửa đổi chúng.

### Các kỹ năng có hoạt động ngoại tuyến (offline) không?

Bản thân các file skill được lưu trữ cục bộ trên máy tính của bạn, nhưng trợ lý AI của bạn vẫn cần kết nối internet để hoạt động.

---

## 🔒 Bảo mật & Tin cậy

### Các Nhãn rủi ro (Risk Labels) có ý nghĩa gì?

Chúng tôi phân loại các kỹ năng để bạn biết mình đang chạy cái gì. Các giá trị này khớp trực tiếp với trường `risk:` trong frontmatter của mỗi `SKILL.md`:

- ⚪ **`unknown`**: Nội dung cũ hoặc chưa được phân loại. Hãy xem xét skill thủ công trước khi dùng.
- 🟢 **`none`**: Nội dung tham khảo hoặc lập kế hoạch thuần túy; không có lệnh shell, thay đổi trạng thái hoặc truy cập mạng.
- 🔵 **`safe`**: Hướng dẫn không phá hủy như lệnh chỉ đọc, lập kế hoạch, review code hoặc phân tích.
- 🟠 **`critical`**: Skill sửa đổi file, xóa dữ liệu, dùng công cụ quét mạng hoặc thực hiện hành động có thể phá hủy. **Hãy sử dụng thận trọng.**
- 🔴 **`offensive`**: Kỹ thuật tấn công bảo mật như pentesting hoặc khai thác. **Chỉ dùng khi được cấp phép** và luôn xác nhận mục tiêu nằm trong phạm vi cho phép.

### Những kỹ năng này có thể hack máy tính của tôi không?

**Không.** Kỹ năng là các file văn bản. Tuy nhiên, chúng *hướng dẫn* AI chạy các dòng lệnh. Nếu một skill nói "xóa toàn bộ file", một AI tuân thủ có thể sẽ thử làm việc đó.  
_Luôn kiểm tra nhãn rủi ro và xem xét mã nguồn trước khi dùng._

---

## 📦 Cài đặt & Thiết lập

### Tôi nên cài đặt các kỹ năng này ở đâu?

Đường dẫn mặc định của installer là `~/.agents/skills/` cho Antigravity global:

```bash
npx agentic-awesome-skills
```

**Các đường dẫn cụ thể cho từng công cụ:**

- Claude Code: `.claude/skills/`
- Gemini CLI: `.gemini/skills/`
- Codex CLI: `.codex/skills/`
- Kiro CLI / IDE: `~/.kiro/skills/` hoặc `.kiro/skills/`
- Antigravity: `~/.agents/skills/` hoặc `.agent/skills/`
- Antigravity CLI (`agy`): `~/.gemini/antigravity-cli/skills/`
- Cursor: `.cursor/skills/`
- OpenCode: `.agents/skills/`
- AdaL CLI: `.adal/skills/`

### Repo này có hoạt động trên Windows không?

**Có.** Hãy dùng lệnh cài đặt chuẩn:

```bash
npx agentic-awesome-skills
```

Không còn cần workaround cũ `core.symlinks=true` hoặc bật Developer Mode chỉ để cài repository này.

### Làm thế nào để cập nhật các kỹ năng?

Chạy lại installer để lấy phiên bản mới nhất, hoặc nếu bạn cài bằng git clone thì pull trong thư mục đã clone:

```bash
npx agentic-awesome-skills

# hoặc, nếu bạn tự clone repository:
cd ~/.agents/skills
git pull origin main
```

---

## 🛠️ Cách sử dụng Skills

### Làm thế nào để gọi một kỹ năng?

Sử dụng biểu tượng `@` theo sau là tên skill:

```bash
@brainstorming giúp tôi thiết kế một ứng dụng todo
```

### Tôi có thể dùng nhiều kỹ năng cùng một lúc không?

**Có!** Bạn có thể gọi nhiều kỹ năng:

```bash
@brainstorming giúp tôi thiết kế phần này, sau đó dùng @writing-plans để tạo danh sách nhiệm vụ.
```

### Làm thế nào để tôi biết nên dùng kỹ năng nào?

1. **Duyệt qua danh mục**: Xem [Danh mục Skill (Skill Catalog)](../../CATALOG.md).
2. **Tìm kiếm**: `ls skills/ | grep "từ-khóa"`
3. **Hỏi AI của bạn**: "Bạn có kỹ năng nào để kiểm thử (testing) không?"

---

## 🏗️ Xử lý sự cố

### Trợ lý AI của tôi không nhận diện được kỹ năng

**Các nguyên nhân có thể xảy ra:**

1. **Sai đường dẫn cài đặt**: Kiểm tra tài liệu hướng dẫn của công cụ bạn dùng. Hãy thử installer mặc định `~/.agents/skills/` hoặc cờ theo công cụ phù hợp.
2. **Cần khởi động lại**: Khởi động lại AI/IDE sau khi cài đặt.
3. **Lỗi đánh máy**: Bạn có gõ lầm `@brain-storming` thay vì `@brainstorming` không?

### Một kỹ năng đưa ra lời khuyên sai hoặc lỗi thời

Hãy [Mở một issue](https://github.com/sickn33/agentic-awesome-skills/issues)!  
Vui lòng gửi kèm:

- Skill nào?
- Điều gì đã xảy ra?
- Đáng lẽ điều gì nên xảy ra?

---

## 🤝 Đóng góp

### Tôi là người mới đối với mã nguồn mở. Tôi có thể đóng góp không?

**Chắc chắn là có!** Chúng tôi chào đón những người mới bắt đầu.

- Sửa lỗi đánh máy.
- Thêm ví dụ.
- Cải thiện tài liệu hướng dẫn.  
Hãy xem [CONTRIBUTING.md](../../CONTRIBUTING.md) để biết hướng dẫn chi tiết.

### Pull Request (PR) của tôi thất bại khi kiểm tra "Quality Bar". Tại sao?

Quality Bar áp dụng kiểm soát chất lượng tự động. Skill của bạn có thể đang thiếu:

1. Một `description` (mô tả) hợp lệ.
2. Các ví dụ sử dụng.  
Hãy chạy `npm run validate` cục bộ để kiểm tra trước khi đẩy code lên.

### Tôi có thể cập nhật các kỹ năng "Official" không?

**Không trực tiếp.** Các skill nhập từ nguồn bên ngoài được phân biệt bằng frontmatter như `source`, `source_repo` và `source_type`. Nếu một skill bắt nguồn từ nhà cung cấp hoặc repository khác, hãy mở issue hoặc PR nhỏ kèm nguồn rõ ràng thay vì sửa tùy tiện.

---

## 💡 Mẹo Chuyên nghiệp

- Bắt đầu với `@brainstorming` trước khi xây dựng bất kỳ thứ gì mới.
- Sử dụng `@systematic-debugging` khi gặp lỗi khó nhằn.
- Thử `@test-driven-development` để code có chất lượng tốt hơn.
- Khám phá `@skill-creator` để tự tạo kỹ năng của riêng bạn.

**Vẫn còn thắc mắc?** [Mở một cuộc thảo luận (Discussion)](https://github.com/sickn33/agentic-awesome-skills/discussions) và chúng tôi sẽ giúp bạn! 🙌
