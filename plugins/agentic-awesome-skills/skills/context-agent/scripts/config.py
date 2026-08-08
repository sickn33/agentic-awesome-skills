"""
Configuração centralizada do Context Agent.
Todos os paths, constantes e limites usados pelos demais módulos.
"""

from pathlib import Path

# ── Raízes ──────────────────────────────────────────────────────────
SKILLS_ROOT = Path(r"C:\Users\renat\skills")
CONTEXT_AGENT_ROOT = SKILLS_ROOT / "context-agent"

# ── Dados do agente ─────────────────────────────────────────────────
DATA_DIR = CONTEXT_AGENT_ROOT / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
ARCHIVE_DIR = DATA_DIR / "archive"
LOGS_DIR = DATA_DIR / "logs"
ACTIVE_CONTEXT_PATH = DATA_DIR / "ACTIVE_CONTEXT.md"
PROJECT_REGISTRY_PATH = DATA_DIR / "PROJECT_REGISTRY.md"
DB_PATH = DATA_DIR / "context.db"

# ── Claude Code session logs ────────────────────────────────────────
CLAUDE_PROJECTS_DIR = Path(r"C:\Users\renat\.claude\projects")
CLAUDE_SESSION_DIR = CLAUDE_PROJECTS_DIR / "C--Users-renat-skills"
MEMORY_DIR = CLAUDE_SESSION_DIR / "memory"
MEMORY_MD_PATH = MEMORY_DIR / "MEMORY.md"

# ── Limites ─────────────────────────────────────────────────────────
MAX_ACTIVE_CONTEXT_LINES = 150      # MEMORY.md é truncado em 200 linhas
MAX_RECENT_SESSIONS = 5             # Sessões recentes carregadas no briefing
ARCHIVE_AFTER_SESSIONS = 20         # Arquivar sessões mais antigas que N
MAX_DECISIONS_AGE_DAYS = 30         # Decisões mais velhas são podadas
MAX_SEARCH_RESULTS = 10             # Resultados padrão de busca

# ── Padrões de detecção ────────────────────────────────────────────
# Palavras que indicam decisões no texto
DECISION_MARKERS_PT = [
    "decidimos", "vamos usar", "optamos por", "escolhemos",
    "a decisão foi", "ficou decidido", "definimos que",
    "a abordagem será", "seguiremos com",
]
DECISION_MARKERS_EN = [
    "we decided", "let's use", "we'll go with", "the decision is",
    "we chose", "going with", "the approach will be", "decided to",
]
DECISION_MARKERS = DECISION_MARKERS_PT + DECISION_MARKERS_EN

# Palavras que indicam tarefas pendentes
PENDING_MARKERS_PT = [
    "falta", "ainda precisa", "pendente", "todo:", "TODO:",
    "depois vamos", "próximo passo", "faltando",
]
PENDING_MARKERS_EN = [
    "todo:", "TODO:", "still need", "pending", "next step",
    "remaining", "left to do", "needs to be done",
]
PENDING_MARKERS = PENDING_MARKERS_PT + PENDING_MARKERS_EN

# Ferramentas que modificam arquivos (para detectar files_modified)
FILE_MODIFYING_TOOLS = {"Edit", "Write", "NotebookEdit"}
FILE_READING_TOOLS = {"Read", "Glob", "Grep"}

# ── Projetos conhecidos ────────────────────────────────────────────
# Mapeamento de subdiretórios de SKILLS_ROOT para nomes de projeto
KNOWN_PROJECTS = {
    "instagram": "Instagram Integration",
    "juntas-comerciais": "Juntas Comerciais Scraper",
    "whatsapp-cloud-api": "WhatsApp Cloud API",
    "context-agent": "Context Agent",
}
