# 🤝 Hướng dẫn Đóng góp

**Cảm ơn bạn đã muốn làm cho repository này trở nên tốt hơn!** Hướng dẫn này sẽ chỉ cho bạn chính xác cách thức đóng góp, ngay cả khi bạn là người mới đối với mã nguồn mở.  
Chúng tôi duy trì tiêu chuẩn chất lượng tự động cho skill và tài liệu. Vui lòng đọc kỹ **Quality Bar** bên dưới.

---

## 🧐 "Quy chuẩn Chất lượng" (Quality Bar)

**Quan trọng đối với các skill mới:** Mỗi skill được gửi đi phải vượt qua **5 bước Kiểm tra Chất lượng** (xem `docs/vietnamese/QUALITY_BAR.vi.md` để biết chi tiết):

1.  **Siêu dữ liệu (Metadata)**: Phần frontmatter chính xác (`name`, `description`, `category`, `risk`, `source`, `date_added`; thêm `source_repo` và `source_type` cho skill bắt nguồn từ GitHub bên ngoài).
2.  **An toàn (Safety)**: Không chứa các lệnh gây hại mà không có nhãn rủi ro ("Risk").
3.  **Rõ ràng (Clarity)**: Có phần "Khi nào nên dùng" (When to use) rõ ràng.
4.  **Ví dụ (Examples)**: Ít nhất một ví dụ sử dụng có thể sao chép và dùng được ngay.
5.  **Hành động (Actions)**: Phải định nghĩa các bước hành động cụ thể cho AI, không chỉ là các "ý nghĩ".

---

## Các Cách để Đóng góp

Bạn không cần phải là một chuyên gia! Dưới đây là những cách mà bất kỳ ai cũng có thể giúp đỡ:

### 1. Cải thiện Tài liệu (Dễ nhất!)

- Sửa lỗi chính tả hoặc ngữ pháp.
- Làm cho các giải thích trở nên rõ ràng hơn.
- Thêm ví dụ vào các kỹ năng hiện có.
- Dịch tài liệu sang các ngôn ngữ khác.

### 2. Báo cáo Vấn đề (Issues)

- Thấy điều gì đó khó hiểu? Hãy cho chúng tôi biết!
- Kỹ năng không hoạt động? Hãy báo cho chúng tôi!
- Bạn có đề xuất? Chúng tôi luôn sẵn sàng lắng nghe!

### 3. Tạo Kỹ năng (Skill) mới

- Chia sẻ chuyên môn của bạn dưới dạng một kỹ năng.
- Lấp đầy các khoảng trống trong bộ sưu tập hiện tại.
- Cải thiện các kỹ năng sẵn có.

### 4. Kiểm thử và Xác thực

- Thử nghiệm các kỹ năng và báo cáo những gì hoạt động hoặc không hoạt động.
- Kiểm tra trên các công cụ AI khác nhau.
- Đề xuất các cải tiến.

---

## Cách Tạo một Kỹ năng mới

### Hướng dẫn Từng bước

#### Bước 1: Chọn Chủ đề cho Kỹ năng của bạn

Hãy tự hỏi: "Tôi ước trợ lý AI của mình hiểu rõ hơn về điều gì?".  
Ví dụ: "Tôi giỏi về Docker, tôi sẽ tạo một kỹ năng về Docker".

#### Bước 2: Tạo Cấu trúc Thư mục

Các kỹ năng nằm trong thư mục `skills/`. Sử dụng định dạng `kebab-case` cho tên thư mục.

```bash
# Di chuyển đến thư mục skills
cd skills/

# Tạo thư mục cho skill của bạn
mkdir my-awesome-skill
cd my-awesome-skill

# Tạo file SKILL.md
touch SKILL.md
```

#### Bước 3: Viết Nội dung cho SKILL.md

Mỗi kỹ năng đều cần cấu trúc cơ bản này. **Hãy sao chép mẫu dưới đây:**

```markdown
---
name: my-awesome-skill
description: "Mô tả ngắn gọn về chức năng của skill này"
risk: safe
source: community
date_added: 2026-06-25
---

# Tiêu đề Skill

## Tổng quan

Giải thích skill này làm gì và khi nào nên sử dụng nó.

## Khi nào nên sử dụng Skill này

- Sử dụng khi [tình huống 1]
- Sử dụng khi [tình huống 2]

## Cách hoạt động

Hướng dẫn chi tiết từng bước cho AI...

## Ví dụ

### Ví dụ 1

\`\`\`
code ví dụ ở đây
\`\`\`

## Thực hành tốt nhất

- ✅ Nên làm điều này
- ❌ Không nên làm điều này
```

#### Bước 4: Xác thực

Chạy script xác thực (validation) tại máy của bạn. **Chúng tôi sẽ không chấp nhận các Pull Request (PR) thất bại ở bước kiểm tra này.**

```bash
# Chế độ thông thường
npm run validate

# Chế độ nghiêm ngặt (chế độ mà hệ thống CI sẽ chạy)
npm run validate:strict
```

Bước này sẽ kiểm tra:

- ✅ File `SKILL.md` có tồn tại hay không.
- ✅ Phần Frontmatter có chính xác không.
- ✅ Tên (Name) có khớp với tên thư mục không.
- ✅ Có vượt qua các kiểm tra của Quality Bar không.

#### Bước 5: Gửi Kỹ năng của bạn

```bash
git add skills/my-awesome-skill/
git commit -m "feat: add my-awesome-skill"
git push origin my-branch
```

---

## Bản mẫu (Template) Kỹ năng (Copy & Paste)

Tiết kiệm thời gian! Hãy sao chép bản mẫu này:

```markdown
---
name: your-skill-name
description: "Mô tả trong một câu về chức năng của skill và khi nào cần dùng"
risk: safe
source: community
date_added: 2026-06-25
---

# Tên Kỹ năng của bạn

## Tổng quan

[2-3 câu giải thích skill này làm gì]

## Khi nào nên sử dụng Skill này

- Sử dụng khi bạn cần [tình huống 1]
- Sử dụng khi bạn muốn [tình huống 2]

## Hướng dẫn Từng bước

### 1. [Tên Bước đầu tiên]

[Hướng dẫn chi tiết]

## Ví dụ

### Ví dụ 1: [Tên Trường hợp sử dụng]

\`\`\`language
// Code ví dụ ở đây
\`\`\`

## Thực hành tốt nhất

- ✅ **Nên:** [Thực hành tốt]
- ❌ **Không nên:** [Điều cần tránh]

## Xử lý Sự cố

**Vấn đề:** [Lỗi thường gặp]
**Giải pháp:** [Cách khắc phục]
```

---

## Hướng dẫn về Thông điệp Commit (Commit Message)

Sử dụng các tiền tố sau:

- `feat:` - Kỹ năng mới hoặc tính năng lớn.
- `docs:` - Cải thiện tài liệu hướng dẫn.
- `fix:` - Sửa lỗi.
- `refactor:` - Cải thiện code mà không thay đổi chức năng.
- `test:` - Thêm hoặc cập nhật các bài kiểm tra.
- `chore:` - Các tác vụ bảo trì.

**Ví dụ:**

```
feat: add kubernetes-deployment skill
docs: improve getting started guide
fix: correct typo in stripe-integration skill
```

---

## Tài liệu Học tập

### Bạn mới sử dụng Git/GitHub?

- [Hướng dẫn Hello World của GitHub](https://guides.github.com/activities/hello-world/)
- [Cơ bản về Git](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)

### Bạn mới sử dụng Markdown?

- [Hướng dẫn Markdown](https://www.markdownguide.org/basic-syntax/)

---

## Quy tắc Ứng xử (Code of Conduct)

- Luôn tôn trọng và hòa nhập.
- Chào đón những người mới.
- Tập trung vào các phản hồi mang tính xây dựng.
- **Không chứa nội dung gây hại**: Xem `docs/vietnamese/SECURITY_GUARDRAILS.md`.

---

**Cảm ơn bạn đã làm cho dự án này trở nên tốt đẹp hơn cho mọi người!**  
Mọi sự đóng góp, dù nhỏ đến đâu, đều tạo nên sự khác biệt. Dù bạn sửa một lỗi chính tả, cải thiện một câu văn, hay tạo ra một kỹ năng hoàn toàn mới - bạn đang giúp đỡ hàng ngàn lập trình viên khác!
