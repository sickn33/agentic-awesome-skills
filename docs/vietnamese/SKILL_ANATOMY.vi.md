# Cấu trúc của một Skill - Hiểu về Hệ thống

**Bạn muốn hiểu cách các skill (kỹ năng) hoạt động bên trong?** Hướng dẫn này sẽ phân tích chi tiết từng phần của một file skill.

---

## 📁 Cấu trúc Thư mục Cơ bản

```
skills/
└── my-skill-name/
    ├── SKILL.md              ← Bắt buộc: Định nghĩa skill chính
    ├── examples/             ← Tùy chọn: Các file ví dụ
    │   ├── example1.js
    │   └── example2.py
    ├── scripts/              ← Tùy chọn: Các script hỗ trợ
    │   └── helper.sh
    ├── templates/            ← Tùy chọn: Các bản mẫu code (templates)
    │   └── template.tsx
    ├── references/           ← Tùy chọn: Tài liệu tham khảo
    │   └── api-docs.md
    └── README.md             ← Tùy chọn: Tài liệu bổ sung
```

**Quy tắc Cốt lõi:** Chỉ có file `SKILL.md` là bắt buộc. Tất cả những thành phần khác đều là tùy chọn!

---

## Cấu trúc file SKILL.md

Mỗi file `SKILL.md` có hai phần chính:

### 1. Frontmatter (Siêu dữ liệu - Metadata)

### 2. Nội dung (Hướng dẫn - Instructions)

Hãy cùng phân tích chi tiết từng phần:

---

## Phần 1: Frontmatter

Frontmatter nằm ở ngay đầu file, được bao bọc bởi cặp `---`:

```markdown
---
name: my-skill-name
description: "Mô tả ngắn gọn về chức năng của skill này"
category: development
risk: safe
source: community
date_added: 2026-06-25
---
```

### Các trường Bắt buộc

#### `name`

- **Định nghĩa:** Mã định danh của skill.
- **Định dạng:** chữ-thường-có-dấu-gạch-ngang (kebab-case).
- **Yêu cầu:** Phải khớp hoàn toàn với tên thư mục.
- **Ví dụ:** `stripe-integration`

#### `description`

- **Định nghĩa:** Tóm tắt chức năng trong một câu.
- **Định dạng:** Chuỗi ký tự nằm trong dấu ngoặc kép.
- **Độ dài:** Nên dưới 150 ký tự.
- **Ví dụ:** `"Các mẫu tích hợp thanh toán Stripe bao gồm checkout, đăng ký gói (subscriptions) và webhooks"`

#### `category`

- **Định nghĩa:** Danh mục chính của skill.
- **Ví dụ:** `development`, `security`, `testing`, `infrastructure`.

#### `risk`

- **Định nghĩa:** Mức rủi ro của hướng dẫn trong skill.
- **Giá trị:** `none`, `safe`, `critical`, `offensive`, hoặc `unknown`.

#### `source`

- **Định nghĩa:** Nguồn gốc của skill.
- **Ví dụ:** `community`, `self`, hoặc URL nguồn.

#### `date_added`

- **Định nghĩa:** Ngày skill được thêm vào registry.
- **Định dạng:** `YYYY-MM-DD`.

### Các trường Tùy chọn

Một số skill bao gồm thêm siêu dữ liệu bổ sung:

```markdown
---
name: my-skill-name
description: "Mô tả ngắn"
category: development
risk: safe
source: community
source_repo: "https://github.com/example/example-skills"
source_type: "github"
date_added: 2026-06-25
tags: ["react", "typescript"]
---
```

---

## Phần 2: Nội dung

Sau phần frontmatter là nội dung thực tế của skill. Dưới đây là cấu trúc được đề xuất:

### Các mục Đề xuất

#### 1. Tiêu đề (H1)

```markdown
# Tiêu đề Skill
```

- Sử dụng tiêu đề rõ ràng, mang tính mô tả.
- Thường khớp hoặc mở rộng từ tên skill.

#### 2. Tổng quan (Overview)

```markdown
## Tổng quan
 
Một giải thích ngắn gọn về chức năng của skill và lý do tại sao nó tồn tại.
Khoảng 2-4 câu là lý tưởng.
```

#### 3. Khi nào cần sử dụng (When to Use)

```markdown
## Khi nào nên sử dụng Skill này
 
- Sử dụng khi bạn cần [tình huống 1]
- Sử dụng khi làm việc với [tình huống 2]
- Sử dụng khi người dùng hỏi về [tình huống 3]
```

**Tại sao điều này quan trọng:** Giúp AI biết khi nào cần kích hoạt skill này.

#### 4. Hướng dẫn Cốt lõi (Core Instructions)

```markdown
## Cách hoạt động
 
### Bước 1: [Hành động]
 
Hướng dẫn chi tiết...
 
### Bước 2: [Hành động]
 
Hướng dẫn thêm...
```

**Đây là linh hồn của skill** - các bước rõ ràng và có thể thực hiện được.

#### 5. Ví dụ (Examples)

```markdown
## Ví dụ
 
### Ví dụ 1: [Trường hợp sử dụng]
 
\`\`\`javascript
// Code ví dụ
\`\`\`
 
### Ví dụ 2: [Trường hợp sử dụng khác]
 
\`\`\`javascript
// Thêm code
\`\`\`
```

**Tại sao ví dụ lại quan trọng:** Chúng cho AI thấy chính xác kết quả đầu ra tốt trông như thế nào.

#### 6. Thực hành Tốt nhất (Best Practices)

```markdown
## Thực hành Tốt nhất
 
- ✅ Nên làm điều này
- ✅ Cũng nên làm điều này
- ❌ Không nên làm điều này
- ❌ Tránh điều này
```

#### 7. Các lỗi thường gặp (Common Pitfalls)

```markdown
## Các lỗi thường gặp
 
- **Vấn đề:** Mô tả lỗi
  **Giải pháp:** Cách khắc phục
```

#### 8. Các Skill liên quan (Related Skills)

```markdown
## Các Skill liên quan
 
- `@other-skill` - Khi nào nên dùng skill này thay thế
- `@complementary-skill` - Cách các skill này hoạt động cùng nhau
```

---

## Viết Hướng dẫn Hiệu quả

### Sử dụng Ngôn ngữ Rõ ràng, Trực tiếp

**❌ Không tốt:**

```markdown
Bạn có lẽ nên cân nhắc việc kiểm tra xem người dùng đã xác thực hay chưa.
```

**✅ Tốt:**

```markdown
Kiểm tra xem người dùng đã được xác thực chưa trước khi tiếp tục.
```

### Sử dụng Động từ Hành động

**❌ Không tốt:**

```markdown
File nên được tạo ra...
```

**✅ Tốt:**

```markdown
Tạo file...
```

### Cụ thể và Chi tiết

**❌ Không tốt:**

```markdown
Thiết lập cơ sở dữ liệu một cách chính xác.
```

**✅ Tốt:**

```markdown
1. Tạo cơ sở dữ liệu PostgreSQL
2. Chạy migration: `npm run migrate`
3. Nạp dữ liệu ban đầu (seed): `npm run seed`
```

---

## Các Thành phần Tùy chọn

### Thư mục Scripts

Nếu skill của bạn cần các script hỗ trợ:

```
scripts/
├── setup.sh          ← Tự động hóa thiết lập
├── validate.py       ← Công cụ kiểm tra (validation)
└── generate.js       ← Công cụ tạo code (generators)
```

**Tham chiếu chúng trong SKILL.md:**

```markdown
Chạy script thiết lập:
\`\`\`bash
bash scripts/setup.sh
\`\`\`
```

### Thư mục Examples

Các ví dụ thực tế minh họa skill:

```
examples/
├── basic-usage.js
├── advanced-pattern.ts
└── full-implementation/
    ├── index.js
    └── config.json
```

### Thư mục Templates

Các mẫu code có thể tái sử dụng:

```
templates/
├── component.tsx
├── test.spec.ts
└── config.json
```

**Tham chiếu trong SKILL.md:**

```markdown
Sử dụng bản mẫu này làm điểm bắt đầu:
\`\`\`typescript
{{#include templates/component.tsx}}
\`\`\`
```

### Thư mục References

Tài liệu bên ngoài hoặc tham chiếu API:

```
references/
├── api-docs.md
├── best-practices.md
└── troubleshooting.md
```

---

## Hướng dẫn về Quy mô Skill

### Skill Tối giản (Minimum Viable Skill)

- **Frontmatter:** `name`, `description`, `category`, `risk`, `source`, `date_added`; thêm `source_repo` và `source_type` khi skill bắt nguồn từ GitHub bên ngoài
- **Nội dung:** 100-200 từ
- **Các mục:** Tổng quan + Hướng dẫn

### Skill Tiêu chuẩn (Standard Skill)

- **Frontmatter:** `name`, `description`, `category`, `risk`, `source`, `date_added`; thêm `source_repo` và `source_type` khi skill bắt nguồn từ GitHub bên ngoài
- **Nội dung:** 300-800 từ
- **Các mục:** Tổng quan + Khi nào sử dụng + Hướng dẫn + Ví dụ

### Skill Toàn diện (Comprehensive Skill)

- **Frontmatter:** các trường chuẩn ở trên, cộng `source_repo`/`source_type` khi skill bắt nguồn từ GitHub bên ngoài và các trường tùy chọn khi hữu ích
- **Nội dung:** 800-2000 từ
- **Các mục:** Đầy đủ tất cả các mục đề xuất
- **Bổ sung:** Scripts, ví dụ, templates

**Quy tắc ngón tay cái:** Bắt đầu nhỏ, mở rộng dựa trên phản hồi.

---

## Thực hành Tốt nhất về Định dạng

### Sử dụng Markdown Hiệu quả

#### Khối Code (Code Blocks)

Luôn chỉ định ngôn ngữ:

```markdown
\`\`\`javascript
const example = "code";
\`\`\`
```

#### Danh sách (Lists)

Sử dụng định dạng nhất quán:

```markdown
- Mục 1
- Mục 2
  - Mục con 2.1
  - Mục con 2.2
```

#### Nhấn mạnh (Emphasis)

- **In đậm** cho các thuật ngữ quan trọng: `**quan trọng**`
- _In nghiêng_ để nhấn mạnh: `*nhấn mạnh*`
- `Code` cho lệnh hoặc code: `` `code` ``

#### Liên kết (Links)

```markdown
[Văn bản liên kết](https://example.com)
```

---

## ✅ Danh mục Kiểm tra Chất lượng (Quality Checklist)

Trước khi hoàn tất skill của bạn:

### Chất lượng Nội dung

- [ ] Hướng dẫn rõ ràng và có thể thực hiện được.
- [ ] Ví dụ thực tế và hữu ích.
- [ ] Không có lỗi chính tả hoặc ngữ pháp.
- [ ] Độ chính xác kỹ thuật đã được xác minh.

### Cấu trúc

- [ ] Frontmatter là YAML hợp lệ.
- [ ] Tên (Name) khớp với tên thư mục.
- [ ] Các phần được sắp xếp logic.
- [ ] Các tiêu đề tuân thủ cấp bậc (H1 → H2 → H3).

### Tính đầy đủ

- [ ] Phần Tổng quan giải thích "tại sao".
- [ ] Hướng dẫn giải thích "làm thế nào".
- [ ] Ví dụ cho thấy "cái gì".
- [ ] Các trường hợp biên (edge cases) được đề cập.

### Khả năng sử dụng

- [ ] Một người mới bắt đầu có thể làm theo.
- [ ] Một chuyên gia thấy nó hữu ích.
- [ ] AI có thể phân tích chính xác.
- [ ] Nó giải quyết một vấn đề thực tế.

---

## 🔍 Phân tích Ví dụ Thực tế

Hãy phân tích một skill thực tế: `brainstorming`

```markdown
---
name: brainstorming
description: "Bạn PHẢI sử dụng skill này trước bất kỳ công việc sáng tạo nào..."
---
```

**Phân tích:**

- ✅ Tên rõ ràng.
- ✅ Mô tả mạnh mẽ với tính cấp bách ("PHẢI sử dụng").
- ✅ Giải thích khi nào nên dùng.

```markdown
# Brainstorming Ý tưởng thành Thiết kế
 
## Tổng quan
 
Giúp chuyển đổi ý tưởng thành các thiết kế hoàn chỉnh...
```

**Phân tích:**

- ✅ Tiêu đề rõ ràng.
- ✅ Tổng quan súc tích.
- ✅ Giải thích giá trị mang lại.

```markdown
## Quy trình
 
**Hiểu ý tưởng:**
 
- Kiểm tra trạng thái dự án hiện tại trước.
- Đặt câu hỏi từng cái một.
```

**Phân tích:**

- ✅ Được chia thành các giai đoạn rõ ràng.
- ✅ Các bước cụ thể, có thể hành động.
- ✅ Dễ dàng thực hiện theo.

---

## Các Mẫu Nâng cao

### Logic có Điều kiện

```markdown
## Hướng dẫn
 
Nếu người dùng đang làm việc với React:
 
- Sử dụng functional components.
- Ưu tiên hooks hơn class components.
 
Nếu người dùng đang làm việc với Vue:
 
- Sử dụng Composition API.
- Tuân theo các mẫu của Vue 3.
```

### Tiết lộ Lũy tiến (Progressive Disclosure)

```markdown
## Cách dùng Cơ bản
 
[Hướng dẫn đơn giản cho các trường hợp phổ biến]
 
## Cách dùng Nâng cao
 
[Các mẫu phức tạp cho người dùng chuyên sâu]
```

### Tham chiếu Chéo (Cross-References)

```markdown
## Các Luồng công việc liên quan
 
1. Đầu tiên, dùng `@brainstorming` để thiết kế.
2. Sau đó, dùng `@writing-plans` để lập kế hoạch.
3. Cuối cùng, dùng `@test-driven-development` để triển khai.
```

---

## Đo lường Hiệu quả của Skill

Cách để biết skill của bạn có tốt hay không:

### Kiểm tra Tính Rõ ràng

- Người không quen thuộc với chủ đề có thể làm theo không?
- Có hướng dẫn nào mơ hồ không?

### Kiểm tra Tính Đầy đủ

- Nó có bao quát trường hợp thuận lợi (happy path) không?
- Nó có xử lý các trường hợp biên không?
- Các kịch bản lỗi đã được giải quyết chưa?

### Kiểm tra Tính Hữu ích

- Nó có giải quyết một vấn đề thực tế không?
- Chính bạn có sử dụng nó không?
- Nó có giúp tiết kiệm thời gian hoặc cải thiện chất lượng không?

---

## Học hỏi từ các Skill hiện có

### Nghiên cứu các Ví dụ sau

**Dành cho Người mới:**

- `skills/brainstorming/SKILL.md` - Cấu trúc rõ ràng.
- `skills/git-pushing/SKILL.md` - Đơn giản và tập trung.
- `skills/copywriting/SKILL.md` - Ví dụ tốt.

**Dành cho Nâng cao:**

- `skills/systematic-debugging/SKILL.md` - Toàn diện.
- `skills/react-best-practices/SKILL.md` - Nhiều file.
- `skills/loki-mode/SKILL.md` - Các luồng công việc phức tạp.

---

## 💡 Mẹo Chuyên nghiệp

1. **Bắt đầu với phần "Khi nào sử dụng"** - Điều này làm rõ mục đích của skill.
2. **Viết ví dụ trước** - Chúng giúp bạn hiểu những gì bạn đang dạy.
3. **Kiểm tra với AI** - Xem liệu nó có thực sự hoạt động trước khi gửi.
4. **Nhận phản hồi** - Nhờ người khác xem qua skill của bạn.
5. **Cải thiện liên tục** - Skill sẽ tốt lên theo thời gian dựa trên việc sử dụng.

---

## Các lỗi Thường gặp cần Tránh

### ❌ Lỗi 1: Quá mơ hồ

```markdown
## Hướng dẫn
 
Làm cho code tốt hơn.
```

**✅ Khắc phục:**

```markdown
## Hướng dẫn
 
1. Tách các logic lặp lại thành các hàm.
2. Thêm xử lý lỗi cho các trường hợp biên.
3. Viết unit tests cho các chức năng cốt lõi.
```

### ❌ Lỗi 2: Quá phức tạp

```markdown
## Hướng dẫn
 
[5000 từ chứa đầy thuật ngữ kỹ thuật dày đặc]
```

**✅ Khắc phục:**
Chia nhỏ thành nhiều skill hoặc sử dụng phương pháp tiết lộ lũy tiến.

### ❌ Lỗi 3: Không có ví dụ

```markdown
## Hướng dẫn
 
[Hướng dẫn mà không có bất kỳ ví dụ code nào]
```

**✅ Khắc phục:**
Thêm ít nhất 2-3 ví dụ thực tế.

### ❌ Lỗi 4: Thông tin lỗi thời

```markdown
Sử dụng React class components...
```

**✅ Khắc phục:**
Luôn cập nhật skill với các thực hành tốt nhất hiện tại.

---

## 🎯 Các bước Tiếp theo

1. **Đọc 3-5 skill hiện có** để thấy các phong cách khác nhau.
2. **Thử dùng bản mẫu skill** từ file `CONTRIBUTING.md`.
3. **Tạo một skill đơn giản** cho lĩnh vực bạn am hiểu.
4. **Kiểm tra nó** với trợ lý AI của bạn.
5. **Chia sẻ nó** qua Pull Request.

---

**Hãy nhớ rằng:** Mọi chuyên gia đều từng là người mới bắt đầu. Hãy bắt đầu đơn giản, học hỏi từ phản hồi và cải thiện theo thời gian! 🚀
