# AAS Core — Agentic Awesome Skills

> **Ghép stack kỹ năng cục bộ, xác định cho coding agent: từ hồ sơ dự án tường minh đến kế hoạch có thể xem lại trước mọi thay đổi trên target.**

Codex hoặc Claude tự kiểm tra dự án; AAS không quét repository. Agent tìm kiếm catalog cục bộ đầy đủ theo thứ tự ổn định, tự đánh giá kết quả không có điểm số hay xếp hạng, rồi gửi `profile` cùng chính xác các ID đã chọn tới `compose_stack`. AAS Core ghi nhận lựa chọn trong `aas-stack.json` schema 2; CLI xác thực manifest và tạo kế hoạch preview bất biến trước khi thay đổi kỹ năng.

> **Ranh giới phát hành:** Gói npm 14.6.0 đã phát hành trước AAS Core và không thể dùng để bootstrap Core. Các gói hỗ trợ Core bắt đầu từ dòng 15.x; chỉ dùng một phiên bản chính xác có release notes tuyên bố rõ rằng nó bao gồm Core. Luồng preview được hỗ trợ dừng sau khi xem kế hoạch; `apply` và `recover` vẫn mang tính thử nghiệm. [Tìm hiểu AAS Core](AAS_CORE.vi.md).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Anthropic-purple)](https://claude.ai)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-Google-blue)](https://github.com/google-gemini/gemini-cli)
[![Codex CLI](https://img.shields.io/badge/Codex%20CLI-OpenAI-green)](https://github.com/openai/codex)
[![Cursor](https://img.shields.io/badge/Cursor-AI%20IDE-orange)](https://cursor.sh)
[![Copilot](https://img.shields.io/badge/GitHub%20Copilot-VSCode-lightblue)](https://github.com/features/copilot)
[![OpenCode](https://img.shields.io/badge/OpenCode-CLI-gray)](https://github.com/opencode-ai/opencode)
[![Antigravity](https://img.shields.io/badge/Antigravity-DeepMind-red)](https://github.com/sickn33/agentic-awesome-skills)

Catalog gồm **1,968+ kỹ năng `SKILL.md`**, plugin chuyên biệt, bundle, workflow và installer trực tiếp vẫn rất quan trọng. Chúng là lớp nội dung, tuyển chọn, phân phối và tương thích xung quanh AAS Core, không phải sản phẩm chính cạnh tranh với Core:

- 🟣 **Claude Code** (Anthropic CLI)
- 🔵 **Gemini CLI** (Google DeepMind)
- 🟢 **Codex CLI** (OpenAI)
- 🔴 **Antigravity IDE** và **Antigravity CLI (`agy`)**
- 🩵 **GitHub Copilot** (VSCode Extension)
- 🟠 **Cursor** (AI-native IDE)
- ⚪ **OpenCode** (Mã nguồn mở CLI)
- 🟡 **Kiro CLI / IDE** và **AdaL CLI**

**Ranh giới phiên bản:** Dòng 14.x là baseline phân phối kỹ năng trực tiếp và không chứa AAS Core; các gói hỗ trợ Core bắt đầu từ dòng 15.x. GitHub là nguồn chuẩn cho Core, catalog, plugin và tài liệu; website được host chỉ là bề mặt duyệt catalog và review trong trình duyệt, không phải control plane được host.

### 1. 🐣 Bối cảnh: Đây là gì?

**Agentic Awesome Skills** là repository chuẩn của AAS Core. Core là lớp sản phẩm cục bộ và xác định; catalog, bundle, workflow, plugin và installer CLI cung cấp bằng chứng, tuyển chọn, phân phối và khả năng tương thích xung quanh Core.

Các trợ lý AI (như Claude Code, Cursor, hoặc Gemini) rất thông minh, nhưng chúng thiếu các **công cụ chuyên biệt**. Chúng không biết "Quy trình Triển khai" của công ty bạn hoặc cú pháp cụ thể cho "AWS CloudFormation".  
**Skills** là các tệp markdown nhỏ dạy cho chúng cách thực hiện những tác vụ cụ thể này một cách chính xác trong mọi lần thực thi.
Repository này cung cấp các kỹ năng thiết yếu để biến trợ lý AI của bạn thành một **đội ngũ chuyên gia số toàn năng**, bao gồm các khả năng chính thức từ **Anthropic**, **OpenAI**, **Google**, **Supabase**, **Apify**, và **Vercel Labs**.
Cho dù bạn đang sử dụng **Gemini CLI**, **Claude Code**, **Codex CLI**, **Cursor**, **GitHub Copilot**, **Antigravity**, hay **OpenCode**, những kỹ năng này được thiết kế để có thể sử dụng ngay lập tức và tăng cường sức mạnh cho trợ lý AI của bạn.

Repository này tập hợp những khả năng tốt nhất từ khắp cộng đồng mã nguồn mở, biến trợ lý AI của bạn thành một đội ngũ chuyên gia số toàn năng có khả năng Kỹ thuật, Thiết kế, Bảo mật, Marketing và Vận hành Tự động.

## Tính năng & Danh mục

Repository được tổ chức thành các lĩnh vực chuyên biệt để biến AI của bạn thành một chuyên gia trên toàn bộ vòng đời phát triển phần mềm:

| Danh mục          | Trọng tâm                                                      | Ví dụ kỹ năng                                                                   |
| :---------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| Kiến trúc         | Thiết kế hệ thống, ADRs, C4 và các mẫu có thể mở rộng          | `architecture`, `c4-context`, `senior-architect`                                |
| Kinh doanh        | Tăng trưởng, định giá, CRO, SEO và thâm nhập thị trường        | `copywriting`, `pricing-strategy`, `seo-audit`                                  |
| Dữ liệu & AI      | Ứng dụng LLM, RAG, agents, khả năng quan sát, phân tích        | `rag-engineer`, `prompt-engineer`, `langgraph`                                  |
| Phát triển        | Làm chủ ngôn ngữ, mẫu thiết kế framework, chất lượng code      | `typescript-expert`, `python-patterns`, `react-patterns`                        |
| Tổng quát         | Lập kế hoạch, tài liệu, vận hành sản phẩm, viết bài, hướng dẫn | `brainstorming`, `doc-coauthoring`, `writing-plans`                             |
| Hạ tầng           | DevOps, cloud, serverless, triển khai, CI/CD                   | `docker-expert`, `aws-serverless`, `vercel-deployment`                          |
| Bảo mật           | AppSec, pentesting, phân tích lỗ hổng, tuân thủ                | `api-security-best-practices`, `sql-injection-testing`, `vulnerability-scanner` |
| Kiểm thử          | TDD, thiết kế kiểm thử, sửa lỗi, quy trình QA                  | `test-driven-development`, `testing-patterns`, `test-fixing`                    |
| Quy trình         | Tự động hóa, điều phối, công việc, agents                      | `workflow-automation`, `inngest`, `trigger-dev`                                 |

## Bộ sưu tập Tuyển chọn

[Xem các Gói khởi đầu tại docs/vietnamese/BUNDLES.md](BUNDLES.vi.md) để tìm bộ công cụ hoàn hảo cho vai trò của bạn.

## Duyệt hơn 1,967 Kỹ năng

Chúng tôi đã chuyển danh sách đầy đủ các kỹ năng sang một danh mục riêng biệt để giữ cho file README này gọn gàng.

👉 **[Xem Danh mục Kỹ năng Đầy đủ (../../CATALOG.md)](../../CATALOG.md)**

## Cài đặt

Để sử dụng các kỹ năng này với **Claude Code**, **Gemini CLI**, **Codex CLI**, **Cursor**, **Antigravity**, **Kiro**, **OpenCode** hoặc **AdaL**, hãy dùng installer CLI:

```bash
npx agentic-awesome-skills

# Ví dụ theo công cụ:
npx agentic-awesome-skills --claude
npx agentic-awesome-skills --gemini
npx agentic-awesome-skills --codex
npx agentic-awesome-skills --cursor
npx agentic-awesome-skills --kiro
npx agentic-awesome-skills --agy
```

---

## Cách thức Đóng góp

Chúng tôi chào đón mọi sự đóng góp từ cộng đồng! Để thêm một kỹ năng mới:

1. **Fork** repository.
2. **Tạo một thư mục mới** bên trong `skills/` cho kỹ năng của bạn.
3. **Thêm file `SKILL.md`** theo mẫu `docs/contributors/skill-template.md`.
4. **Chạy kiểm tra xác thực**: `npm run validate`.
5. **Gửi một Pull Request**.

Vui lòng đảm bảo kỹ năng của bạn tuân thủ các thực hành tốt nhất của Antigravity/Claude Code.

---

## Người đóng góp & Ghi công

Chúng tôi đứng trên vai của những người khổng lồ.

👉 **[Xem Sổ cái Ghi công Đầy đủ (docs/vietnamese/SOURCES.vi.md)](SOURCES.vi.md)**

Các nguồn đóng góp và nguồn chính bao gồm:

- **HackTricks**
- **OWASP**
- **Anthropic / OpenAI / Google**
- **Cộng đồng mã nguồn mở**

Bộ sưu tập này sẽ không thể hình thành nếu không có công việc tuyệt vời của cộng đồng Claude Code và các nguồn chính thức:

### Các nguồn Chính thức

- **[anthropics/skills](https://github.com/anthropics/skills)**: Thư mục skill chính thức của Anthropic - Xử lý tài liệu (DOCX, PDF, PPTX, XLSX), Hướng dẫn thương hiệu, Giao tiếp nội bộ.
- **[anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)**: Các notebook và công thức chính thức để xây dựng với Claude.
- **[remotion-dev/skills](https://github.com/remotion-dev/skills)**: Skills chính thức của Remotion - Tạo video trong React với 28 quy tắc mô-đun.
- **[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)**: Skills chính thức của Vercel Labs - Thực hành tốt nhất cho React, Hướng dẫn thiết kế Web.
- **[openai/skills](https://github.com/openai/skills)**: Danh mục skill của OpenAI Codex - Các kỹ năng của Agent, Trình tạo Skill, Lập kế hoạch Súc tích.
- **[supabase/agent-skills](https://github.com/supabase/agent-skills)**: Skills chính thức của Supabase - Thực hành tốt nhất cho Postgres.
- **[apify/agent-skills](https://github.com/apify/agent-skills)**: Skills chính thức của Apify - Web scraping, data extraction and automation.

### Những người đóng góp từ Cộng đồng

- **[rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills)**: Cho sự đóng góp khổng lồ của hơn 300+ kỹ năng Enterprise và logic tạo danh mục.
- **[obra/superpowers](https://github.com/obra/superpowers)**: Bản "Superpowers" gốc bởi Jesse Vincent.
- **[guanyang/antigravity-skills](https://github.com/guanyang/antigravity-skills)**: Các bản mở rộng Antigravity cốt lõi.
- **[diet103/claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)**: Cơ sở hạ tầng và Hướng dẫn cho Backend/Frontend.
- **[ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)**: Các mẫu React UI và Hệ thống Thiết kế.
- **[travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)**: Loki Mode và tích hợp Playwright.
- **[zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)**: Bộ công cụ bảo mật toàn diện & Hướng dẫn (Nguồn cho khoảng 60 kỹ năng mới).
- **[alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)**: Bộ công cụ Kỹ sư cao cấp và PM.
- **[karanb192/awesome-claude-skills](https://github.com/karanb192/awesome-claude-skills)**: Một danh sách khổng lồ các kỹ năng đã được xác thực cho Claude Code.
- **[zircote/.claude](https://github.com/zircote/.claude)**: Kho cấu hình/dotfiles Claude Code đã được lưu trữ, có tham chiếu kỹ năng phát triển Shopify.
- **[vibeforge1111/vibeship-spawner-skills](https://github.com/vibeforge1111/vibeship-spawner-skills)**: Bộ kỹ năng quy mô lớn cho AI agent, tích hợp, maker tools và nhiều lĩnh vực khác.
- **[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)**: Các kỹ năng Marketing cho CRO, copywriting, SEO, quảng cáo trả phí và tăng trưởng (23 kỹ năng, MIT).
- **[vudovn/antigravity-kit](https://github.com/vudovn/antigravity-kit)**: Các mẫu AI Agent với Kỹ năng, Agents và Quy trình làm việc (33 kỹ năng, MIT).
- **[affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)**: Bộ sưu tập lớn về cấu hình và quy trình làm việc cho Claude Code từ người chiến thắng hackathon của Anthropic (MIT).
- **[webzler/agentMemory](https://github.com/webzler/agentMemory)**: Nguồn cho kỹ năng agent-memory-mcp.

### Nguồn cảm hứng

- **[f/awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts)**: Cảm hứng cho Thư viện Prompt.
- **[leonardomso/33-js-concepts](https://github.com/leonardomso/33-js-concepts)**: Cảm hứng cho việc Làm chủ JavaScript.

---

## Giấy phép

Giấy phép MIT. Xem file [LICENSE](../../LICENSE) để biết chi tiết.

## Cộng đồng

- [Cộng đồng (Community Guidelines)](../../CODE_OF_CONDUCT.md)
- [Chính sách Bảo mật (Security Policy)](SECURITY_GUARDRAILS.vi.md)

---

## Những người đóng góp cho Repo

Chúng tôi chính thức cảm ơn những người đóng góp sau đây đã giúp làm cho repository này trở nên tuyệt vời!

- [mvanhorn](https://github.com/mvanhorn)
- [rookie-ricardo](https://github.com/rookie-ricardo)
- [sck_0](https://github.com/sck_0)
- [Munir Abbasi](https://github.com/munirabbasi)
- [Mohammad Faiz](https://github.com/mohdfaiz2k9)
- [Ianj332](https://github.com/Ianj332)
- [sickn33](https://github.com/sickn33)
- [GuppyTheCat](https://github.com/GuppyTheCat)
- [Tiger-Foxx](https://github.com/Tiger-Foxx)
- [arathiesh](https://github.com/arathiesh)
- [1bcMax](https://github.com/1bcMax)
- [Ahmed Rehan](https://github.com/ar27111994)
- [BenedictKing](https://github.com/BenedictKing)
- [Nguyen Huu Loc](https://github.com/LocNguyenSGU)
- [Owen Wu](https://github.com/yubing744)
- [SuperJMN](https://github.com/SuperJMN)
- [Viktor Ferenczi](https://github.com/viktor-ferenczi)
- [krisnasantosa15](https://github.com/krisnasantosa15)
- [raeef1001](https://github.com/raeef1001)
- [taksrules](https://github.com/taksrules)
- [zebbern](https://github.com/zebbern)
- [Đỗ Khắc Gia Khoa](https://github.com/dokhacgiakhoa)
- [vuth-dogo](https://github.com/vuth-dogo)

## Lịch sử Star

<a href="https://www.star-history.com/?repos=sickn33%2Fagentic-awesome-skills&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=sickn33/agentic-awesome-skills&type=date&theme=dark&legend=top-left&sealed_token=5UEckOplDlF6KsKi881R_B44YTNBEFj0fRwovC_U0W2Um19HD9wLMQXclNblk6wFKgeGn0RzW0rGZkVCqzoKxaGB3IMaiN8tP8yqLRbhs6lf-kO3KeJWjftxgtV1zdrTVHjfEYfnevKZuYFww2_H2vC8IlXgfaTdNinFb3MD9CcMlu44hpLYu2iABkYy" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=sickn33/agentic-awesome-skills&type=date&legend=top-left&sealed_token=5UEckOplDlF6KsKi881R_B44YTNBEFj0fRwovC_U0W2Um19HD9wLMQXclNblk6wFKgeGn0RzW0rGZkVCqzoKxaGB3IMaiN8tP8yqLRbhs6lf-kO3KeJWjftxgtV1zdrTVHjfEYfnevKZuYFww2_H2vC8IlXgfaTdNinFb3MD9CcMlu44hpLYu2iABkYy" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=sickn33/agentic-awesome-skills&type=date&legend=top-left&sealed_token=5UEckOplDlF6KsKi881R_B44YTNBEFj0fRwovC_U0W2Um19HD9wLMQXclNblk6wFKgeGn0RzW0rGZkVCqzoKxaGB3IMaiN8tP8yqLRbhs6lf-kO3KeJWjftxgtV1zdrTVHjfEYfnevKZuYFww2_H2vC8IlXgfaTdNinFb3MD9CcMlu44hpLYu2iABkYy" />
 </picture>
</a>
