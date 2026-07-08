# Sankhya Dashboard Custom Best Practices

This skill provides a comprehensive set of best practices, advanced patterns, and structural guidelines for developing custom HTML/JSP dashboards within the Sankhya ecosystem. 

Sankhya ERP deployments frequently demand the creation of custom visualizations, operational dashboards, and dynamic reports. Developing these components effectively requires adhering to specific architectural patterns, secure querying practices, and consistent user interface designs. This skill serves as a collaborative blueprint, injecting community-driven standards directly into your development workflow.

## Features

- **JSP/JSTL Code Quality**: Enforces `core_rt`, safe parameters, global state patterns, and strict separation of business logic from presentation.
- **Visual Identity Standard**: Injects basic CSS tokens for standardizing the UI of dashboards across the ecosystem, ensuring visual consistency and an improved user experience.
- **SQL Best Practices**: Emphasizes safe query parameters, database exploration techniques using `DBExplorer`, and proper indexing mapping within Sankhya.
- **BI Component Flow**: Outlines methodologies for building interactive components, covering drill-downs, multi-level navigation (`openLevel`), modal actions, and resilience in asynchronous data loading.
- **Security Protocols**: Guidelines on preventing direct SQL injection, handling user sessions (`CODUSU_LOG`), and scoping row-level security per user group permissions.

## Installation

This skill can be installed locally per-repository or globally for use across all your Sankhya development projects.

### Global Installation (Recommended)
This approach sets up a symlink that makes the skill available no matter which repository you are working in. Run these commands from the root of the cloned `cli-ai-skills` directory:

#### For Claude Code
```bash
mkdir -p ~/.claude/skills
ln -sf $(pwd)/skills/sankhya-dashboard-html-jsp-custom-best-pratices ~/.claude/skills/sankhya-dashboard-html-jsp-custom-best-pratices
```

#### For GitHub Copilot CLI
```bash
mkdir -p ~/.copilot/skills
ln -sf $(pwd)/skills/sankhya-dashboard-html-jsp-custom-best-pratices ~/.copilot/skills/sankhya-dashboard-html-jsp-custom-best-pratices
```

### Local Repository Installation
If you prefer to restrict the skill to a specific project workspace, simply move or copy the directory into your project's local AI registry folder (e.g., `.claude/skills/` or `.github/skills/`).

## Usage Examples

Once installed, this skill is automatically triggered when discussing Sankhya dashboards. Try these example prompts with your AI assistant:

- *"Crie a estrutura inicial de um dashboard Sankhya com uma tabela básica e integração JSTL."*
- *"Quais são as melhores práticas do Sankhya para montar uma query SQL parametrizada no JSP?"*
- *"Analise este JSP do meu widget do Sankhya e sugira melhorias com base no sankhya-dashboard skill."*
- *"Como uso a função openLevel para criar um drill-down multi-nível em HTML5 no Sankhya?"*
- *"Gere o CSS padrão (.card, variáveis de cor) recomendado pela skill do Sankhya."*

By referring to this skill, the AI will contextualize its response using the specific technical notes mapped out for Sankhya development.
