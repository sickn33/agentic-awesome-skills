# Hướng dẫn Nhanh bằng Hình ảnh (Visual Guide)

**Học qua hình ảnh!** Hướng dẫn này sử dụng các sơ đồ và ví dụ trực quan để giúp bạn hiểu về các kỹ năng (skills).

---

## Cái nhìn Tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                       BẠN (Lập trình viên)                  │
│                          ↓                                  │
│              "Giúp tôi xây dựng hệ thống thanh toán"        │
│                          ↓                                  │
├─────────────────────────────────────────────────────────────┤
│                  TRỢ LÝ AI (AI ASSISTANT)                   │
│                          ↓                                  │
│              Tải kỹ năng @stripe-integration                │
│                          ↓                                  │
│         Trở thành chuyên gia về thanh toán Stripe           │
│                          ↓                                  │
│    Cung cấp hỗ trợ chuyên sâu kèm các ví dụ code            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Cấu trúc Repository (Trực quan)

```
antigravity-awesome-skills/
│
├── 📄 README.md                    ← Tổng quan & danh sách skill
├── 📄 CONTRIBUTING.md              ← Cách thức đóng góp
│
├── 📁 skills/                      ← Nơi chứa tất cả hơn 250 skills
│   │
│   ├── 📁 brainstorming/
│   │   └── 📄 SKILL.md             ← Định nghĩa skill
│   │
│   ├── 📁 stripe-integration/
│   │   ├── 📄 SKILL.md
│   │   └── 📁 examples/            ← Các phần bổ sung tùy chọn
│   │
│   └── ... (Hơn 250 skills khác)
│
├── 📁 scripts/                     ← Quản lý & Xác thực
│   ├── validate_skills.py          ← Công cụ kiểm soát chất lượng
│   └── generate_index.py           ← Công cụ tạo danh mục (registry)
│
├── 📁 .github/
│   └── 📄 MAINTENANCE.md           ← Hướng dẫn cho người duy trì
│
└── 📁 docs/                        ← Tài liệu hướng dẫn
    ├── 📄 GETTING_STARTED.md       ← Bắt đầu tại đây! (MỚI)
    ├── 📄 FAQ.md                   ← Giải đáp thắc mắc
    ├── 📄 BUNDLES.md               ← Gói khởi đầu (MỚI)
    ├── 📄 QUALITY_BAR.md           ← Tiêu chuẩn chất lượng
    ├── 📄 SKILL_ANATOMY.md         ← Cách thức skill hoạt động
    └── 📄 VISUAL_GUIDE.md          ← Chính là file này!
```

---

## Cách Skills Hoạt động (Sơ đồ Luồng)

```
┌──────────────┐
│ 1. CÀI ĐẶT   │  Sao chép skills vào .agent/skills/
1 └──────┬───────┘
       │
       ↓
┌──────────────┐
│ 2. GỌI LỆNH  │  Gõ: @ten-skill trong chat với AI
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ 3. TẢI DỮ LIỆU│  AI đọc file SKILL.md
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ 4. THỰC THI  │  AI tuân theo hướng dẫn trong skill
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ 5. KẾT QUẢ   │  Bạn nhận được hỗ trợ chuyên sâu!
└──────────────┘
```

---

## 🎯 Phân loại Skills (Bản đồ Trực quan)

```
                    ┌─────────────────────────┐
                    │   250+ AWESOME SKILLS   │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   ┌────▼────┐            ┌──────▼──────┐         ┌──────▼──────┐
   │ SÁNG TẠO│            │ PHÁT TRIỂN  │         │  BẢO MẬT    │
   │ (10)    │            │    (25)     │         │    (50)     │
   └────┬────┘            └──────┬──────┘         └──────┬──────┘
        │                        │                        │
   • Thiết kế UI/UX        • TDD                    • Hacking Đạo đức
   • Nghệ thuật Canvas     • Debugging              • Metasploit
   • Giao diện/Themes      • Mẫu thiết kế React     • Burp Suite
                                                    • SQLMap
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   ┌────▼────┐            ┌──────▼──────┐         ┌──────▼──────┐
   │   AI    │            │  TÀI LIỆU   │         │  MARKETING  │
   │  (30)   │            │     (4)     │         │    (23)     │
   └────┬────┘            └──────┬──────┘         └──────┬──────┘
        │                        │                        │
   • Hệ thống RAG          • DOCX                   • SEO
   • LangGraph             • PDF                    • Copywriting
   • Prompt Eng.           • PPTX                   • CRO
   • Voice Agents          • XLSX                   • Quảng cáo trả phí
```

---

## Cấu trúc File Skill (Trực quan)

````
┌─────────────────────────────────────────────────────────┐
│ SKILL.md                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ FRONTMATTER (Siêu dữ liệu)                    │     │
│  │ ───────────────────────────────────────────── │     │
│  │ ---                                           │     │
│  │ name: my-skill                                │     │
│  │ description: "Công dụng của skill này"        │     │
│  │ ---                                           │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │ NỘI DUNG (Hướng dẫn)                          │     │
│  │ ───────────────────────────────────────────── │     │
│  │                                               │     │
│  │ # Tiêu đề Skill                               │     │
│  │                                               │     │
│  │ ## Tổng quan                                  │     │
│  │ Skill này làm gì...                           │     │
│  │                                               │     │
│  │ ## Khi nào nên dùng                           │     │
│  │ - Sử dụng khi...                              │     │
│  │                                               │     │
│  │ ## Hướng dẫn                                  │     │
│  │ 1. Bước đầu tiên...                           │     │
│  │ 2. Bước thứ hai...                            │     │
│  │                                               │     │
│  │ ## Ví dụ                                      │     │
│  │ ```javascript                                 │     │
│  │ // Code ví dụ                                 │     │
│  │ ```                                           │     │
│  │                                               │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
````

---

## Cài đặt (Các bước Trực quan)

### Bước 1: Sao chép Repository

```
┌─────────────────────────────────────────┐
│ Terminal                                │
├─────────────────────────────────────────┤
│ $ git clone https://github.com/        │
│   sickn33/antigravity-awesome-skills    │
│   .agent/skills                         │
│                                         │
│ ✓ Đang sao chép vào '.agent/skills'... │
│ ✓ Hoàn tất!                             │
└─────────────────────────────────────────┘
```

### Bước 2: Xác minh Cài đặt

```
┌─────────────────────────────────────────┐
│ File Explorer                           │
├─────────────────────────────────────────┤
│ 📁 .agent/                              │
│   └── 📁 skills/                        │
│       ├── 📁 brainstorming/             │
│       ├── 📁 stripe-integration/        │
│       ├── 📁 react-best-practices/      │
│       └── ... (Thêm 176 mục nữa)        │
└─────────────────────────────────────────┘
```

### Bước 3: Sử dụng Skill

```
┌─────────────────────────────────────────┐
│ AI Assistant Chat                       │
├─────────────────────────────────────────┤
│ Bạn: @brainstorming giúp tôi thiết kế   │
│      một ứng dụng todo                  │
│                                         │
│ AI:  Tuyệt vời! Hãy để tôi giúp bạn suy │
│      nghĩ kỹ về việc này. Đầu tiên, hãy │
│      tìm hiểu các yêu cầu của bạn...    │
│                                         │
│      Mục đích sử dụng chính là gì?      │
│      a) Quản lý công việc cá nhân       │
│      b) Hợp tác nhóm                    │
│      c) Lập kế hoạch dự án              │
└─────────────────────────────────────────┘
```

---

## Ví dụ: Sử dụng Skill (Từng bước)

### Tình huống: Bạn muốn thêm thanh toán Stripe vào ứng dụng của mình

```
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 1: Xác định Nhu cầu                                    │
├─────────────────────────────────────────────────────────────┤
│ "Tôi cần thêm xử lý thanh toán vào ứng dụng của mình"       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 2: Tìm đúng Skill                                      │
├─────────────────────────────────────────────────────────────┤
│ Tìm kiếm: "payment" hoặc "stripe"                           │
│ Tìm thấy: @stripe-integration                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 3: Gọi lệnh Skill                                      │
├─────────────────────────────────────────────────────────────┤
│ Bạn: @stripe-integration giúp tôi thêm thanh toán định kỳ   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 4: AI Tải Kiến thức của Skill                          │
├─────────────────────────────────────────────────────────────┤
│ • Các mẫu Stripe API                                        │
│ • Xử lý Webhook                                             │
│ • Quản lý gói đăng ký (Subscription)                        │
│ • Thực hành tốt nhất                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 5: Nhận Hỗ trợ Chuyên gia                              │
├─────────────────────────────────────────────────────────────┤
│ AI cung cấp:                                                │
│ • Các ví dụ code                                            │
│ • Hướng dẫn thiết lập                                       │
│ • Các lưu ý về bảo mật                                      │
│ • Chiến lược kiểm thử                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Tìm kiếm Skills (Hướng dẫn Trực quan)

### Cách 1: Duyệt theo Danh mục

```
README.md → Cuộn xuống "Full Skill Registry" → Tìm danh mục → Chọn skill
```

### Cách 2: Tìm theo Từ khóa

```
Terminal → ls skills/ | grep "từ-khóa" → Xem các skill khớp
```

### Cách 3: Sử dụng Index

```
Mở file skills_index.json → Tìm từ khóa → Tìm đường dẫn đến skill
```

---

## Tạo Skill đầu tiên của bạn (Quy trình Trực quan)

```
┌──────────────┐
│ 1. Ý TƯỞNG   │  "Tôi muốn chia sẻ kiến thức về Docker"
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ 2. KHỞI TẠO  │  mkdir skills/docker-mastery
└──────┬───────┘  touch skills/docker-mastery/SKILL.md
       │
       ↓
┌──────────────┐
│ 3. VIẾT      │  Thêm frontmatter + nội dung
└──────┬───────┘  (Dùng template từ CONTRIBUTING.vi.md)
       │
       ↓
┌──────────────┐
│ 4. KIỂM THỬ  │  Sao chép vào .agent/skills/
└──────┬───────┘  Thử: @docker-mastery
       │
       ↓
┌──────────────┐
│ 5. XÁC THỰC  │  python3 scripts/validate_skills.py
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ 6. GỬI ĐI    │  git commit + push + Pull Request
└──────────────┘
```

---

## Các Cấp độ Phức tạp của Skill

```
┌─────────────────────────────────────────────────────────────┐
│                    ĐỘ PHỨC TẠP CỦA SKILL                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ĐƠN GIẢN                  TIÊU CHUẨN            PHỨC TẠP   │
│  ────────                  ──────────            ────────   │
│                                                             │
│  • 1 file                  • 1 file              • Nhiều file│
│  • 100-200 từ              • 300-800 từ          • 800-2000 từ│
│  • Cấu trúc cơ bản         • Cấu trúc đầy đủ     • Có scripts │
│  • Không có phần phụ       • Có ví dụ            • Có ví dụ   │
│                            • Thực hành tốt nhất  • Có template│
│                                                  • Có tài liệu│
│  Ví dụ:                    Ví dụ:                Ví dụ:       │
│  git-pushing               brainstorming         loki-mode    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Tác động của việc Đóng góp (Trực quan)

```
Sự đóng góp của bạn
       │
       ├─→ Cải thiện tài liệu hướng dẫn
       │        │
       │        └─→ Giúp hàng ngàn dev dễ hiểu hơn
       │
       ├─→ Tạo ra Skill mới
       │        │
       │        └─→ Mang lại khả năng mới cho mọi người
       │
       ├─→ Sửa lỗi/Lỗi chính tả
       │        │
       │        └─→ Tránh hiểu lầm cho người dùng tương lai
       │
       └─→ Thêm ví dụ
                │
                └─→ Giúp người mới học dễ dàng hơn
```

---

## Lộ trình Học tập (Roadmap Trực quan)

```
BẮT ĐẦU TẠI ĐÂY
    │
    ↓
┌─────────────────┐
│ Đọc             │
│ GETTING_STARTED │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Thử dùng 2-3 Skill│
│ với Trợ lý AI   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Đọc             │
│ SKILL_ANATOMY   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Nghiên cứu      │
│ Skills hiện có  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Tạo Skill       │
│ đơn giản        │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Đọc             │
│ CONTRIBUTING    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Gửi PR          │
└────────┬────────┘
         │
         ↓
 TRỞ THÀNH CONTRIBUTOR! 🎉
```

---

## 💡 Mẹo Nhanh (Bản ghi chú Trực quan)

```
┌─────────────────────────────────────────────────────────────┐
│                      THAM KHẢO NHANH                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📥 CÀI ĐẶT                                                 │
│  git clone [repo] .agent/skills                             │
│                                                             │
│  🎯 SỬ DỤNG                                                 │
│  @ten-skill [yêu cầu của bạn]                               │
│                                                             │
│  🔍 TÌM KIẾM                                                │
│  ls skills/ | grep "từ-khóa"                                │
│                                                             │
│  ✅ XÁC THỰC                                                │
│  python3 scripts/validate_skills.py                         │
│                                                             │
│  📝 TẠO SKILL                                               │
│  1. mkdir skills/ten-skill-cua-ban                          │
│  2. Tạo SKILL.md với frontmatter                            │
│  3. Thêm nội dung                                           │
│  4. Thử nghiệm & xác thực                                   │
│  5. Gửi Pull Request (PR)                                   │
│                                                             │
│  🆘 TRỢ GIÚP                                                │
│  • docs/GETTING_STARTED.md - Cơ bản                         │
│  • CONTRIBUTING.md - Cách đóng góp                          │
│  • SKILL_ANATOMY.md - Tìm hiểu sâu                          │
│  • GitHub Issues - Đặt câu hỏi                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Câu chuyện Thành công (Dòng thời gian Trực quan)

```
Ngày 1: Cài đặt skills
  │
  └─→ "Oa, @brainstorming đã giúp mình thiết kế ứng dụng!"

Ngày 3: Dùng 5 skills khác nhau
  │
  └─→ "Những kỹ năng này giúp mình tiết kiệm bao nhiêu thời gian!"

Tuần 1: Tạo skill đầu tiên
  │
  └─→ "Mình đã chia sẻ kiến thức của mình dưới dạng một skill!"

Tuần 2: Skill được gộp (merge) vào máy chủ
  │
  └─→ "Kỹ năng của mình đang giúp đỡ người khác! 🎉"

Tháng 1: Trở thành người đóng góp thường xuyên
  │
  └─→ "Mình đã đóng góp 5 skills và cải thiện rất nhiều tài liệu!"
```

---

## Các Bước Tiếp theo

1. ✅ **Hiểu** cấu trúc trực quan.
2. ✅ **Cài đặt** skills vào công cụ AI của bạn.
3. ✅ **Thử dùng** 2-3 skills từ các danh mục khác nhau.
4. ✅ **Đọc** file CONTRIBUTING.md.
5. ✅ **Tạo** skill đầu tiên của bạn.
6. ✅ **Chia sẻ** với cộng đồng.

---

**Bạn là người học qua hình ảnh?** Hy vọng hướng dẫn này sẽ giúp ích! Bạn vẫn còn thắc mắc? Hãy kiểm tra:

- [GETTING_STARTED.md](GETTING_STARTED.vi.md) - Giới thiệu bằng văn bản.
- [SKILL_ANATOMY.md](SKILL_ANATOMY.vi.md) - Phân tích chi tiết.
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Cách thức đóng góp.

**Sẵn sàng đóng góp?** Bạn làm được mà! 💪
