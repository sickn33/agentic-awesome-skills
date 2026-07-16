"""
Configuracao central da skill Sentinel.

Paths, thresholds de analise, pesos de scoring e padroes de seguranca.
Importado por todos os outros scripts.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

# -- Paths --------------------------------------------------------------------
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
DATA_DIR = ROOT_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
DB_PATH = DATA_DIR / "sentinel.db"

# Raiz do ecossistema de skills
SKILLS_ROOT = ROOT_DIR.parent

# Garante que diretorios existem
DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# -- Skill Discovery ----------------------------------------------------------
# Locais onde skills podem estar (relativo a SKILLS_ROOT)
SKILL_SEARCH_PATHS: List[Path] = [
    SKILLS_ROOT,                           # skills de primeiro nivel
    SKILLS_ROOT / ".claude" / "skills",    # skills built-in do Claude
]

# Subdiretorios a escanear recursivamente (para skills aninhadas)
SKILL_MAX_DEPTH = 3

# Diretorios a ignorar durante o scan
IGNORE_DIRS = {
    "__pycache__", ".git", "node_modules", ".venv", "venv",
    "data", "exports", "static", ".claude",
    "skill-sentinel",  # nao auditar a si mesmo
}

# -- Scoring Weights (devem somar 1.0) ----------------------------------------
DIMENSION_WEIGHTS: Dict[str, float] = {
    "code_quality":   0.20,
    "security":       0.20,
    "performance":    0.15,
    "governance":     0.15,
    "documentation":  0.15,
    "dependencies":   0.15,
}

# -- Score Labels --------------------------------------------------------------
SCORE_LABELS: List[Tuple[int, int, str]] = [
    (90, 100, "Excelente"),
    (75, 89,  "Bom"),
    (50, 74,  "Adequado"),
    (25, 49,  "Precisa melhorar"),
    (0,  24,  "Critico"),
]

def get_score_label(score: float) -> str:
    """Retorna label textual para um score numerico."""
    for low, high, label in SCORE_LABELS:
        if low <= score <= high:
            return label
    return "Desconhecido"

# -- Code Quality Thresholds ---------------------------------------------------
MAX_FUNCTION_LINES = 50
MAX_CYCLOMATIC_COMPLEXITY = 10
MAX_FILE_LINES = 500
MIN_DOCSTRING_COVERAGE = 0.5

# Penalidades (pontos subtraidos de 100)
PENALTY_HIGH_COMPLEXITY = 5       # por funcao acima do limite
PENALTY_LONG_FUNCTION = 3         # por funcao acima do limite
PENALTY_LONG_FILE = 5             # por arquivo acima do limite
PENALTY_NO_DOCSTRING = 1          # por funcao/classe sem docstring
PENALTY_BARE_EXCEPT = 8           # por bare except
PENALTY_BROAD_EXCEPT = 3          # por except Exception sem log

# -- Security Patterns ---------------------------------------------------------
SECRET_PATTERNS: List[re.Pattern] = [
    re.compile(r'(?:password|passwd|pwd)\s*=\s*["\'][^"\']{8,}["\']', re.I),
    re.compile(r'(?:secret|secret_key)\s*=\s*["\'][^"\']{8,}["\']', re.I),
    re.compile(r'(?:api_key|apikey|api_secret)\s*=\s*["\'][^"\']{8,}["\']', re.I),
    re.compile(r'(?:access_token|auth_token)\s*=\s*["\'][^"\']{8,}["\']', re.I),
    re.compile(r'(?:private_key|ssh_key)\s*=\s*["\']', re.I),
    re.compile(r'(?:aws_access_key_id|aws_secret)\s*=\s*["\']', re.I),
]

# Padroes que sao excepcoes conhecidas (nao sao secrets reais)
SECRET_EXCEPTIONS: List[str] = [
    "546c25a59c58ad7",  # Imgur public anonymous upload key
]

SQL_INJECTION_PATTERNS: List[re.Pattern] = [
    re.compile(r'f["\'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE).*\{', re.I),
    re.compile(r'\.format\(.*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)', re.I),
    re.compile(r'%\s*\(.*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)', re.I),
]

# -- Performance Thresholds ----------------------------------------------------
MAX_SEQUENTIAL_API_CALLS = 5  # sugerir batching se > este numero
WARN_NO_RETRY = True          # avisar se nao tem retry/backoff
WARN_NO_TIMEOUT = True        # avisar se requests sem timeout

# -- Governance Maturity Levels ------------------------------------------------
GOVERNANCE_LEVELS: Dict[int, str] = {
    0: "Nenhuma",
    1: "Basica (action logging)",
    2: "Padrao (logging + rate limiting)",
    3: "Completa (logging + rate limit + confirmacoes)",
    4: "Avancada (completa + alertas + trends)",
}

# -- Documentation Required Sections -------------------------------------------
SKILL_MD_REQUIRED_SECTIONS: List[str] = [
    "name",          # frontmatter
    "description",   # frontmatter
]

SKILL_MD_RECOMMENDED_SECTIONS: List[str] = [
    "version",       # frontmatter
    "instalacao",    # ou "installation"
    "comandos",      # ou "commands", "uso", "usage"
    "governanca",    # ou "governance"
    "referencias",   # ou "references"
]

# -- Severity Ordering ---------------------------------------------------------
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

# -- Gap Analysis Taxonomy -----------------------------------------------------
CAPABILITY_TAXONOMY: Dict[str, str] = {
    "data-extraction":       "Extracao de dados de fontes externas",
    "social-media":          "Integracao com redes sociais",
    "messaging":             "Sistemas de mensageria",
    "government-data":       "Dados governamentais e registros publicos",
    "web-automation":        "Automacao de browser e interacoes web",
    "api-integration":       "Integracao com APIs externas",
    "analytics":             "Analise de dados e metricas",
    "content-management":    "Gestao e criacao de conteudo",
    "testing":               "Testes automatizados e QA",
    "monitoring":            "Monitoramento e alertas",
    "ci-cd":                 "Integracao e deploy continuo",
    "documentation-gen":     "Geracao automatica de documentacao",
    "data-pipeline":         "ETL e pipelines de dados",
    "scheduling":            "Agendamento e cron jobs",
    "notification":          "Notificacoes multi-canal",
    "email-integration":     "Integracao com email",
    "database-management":   "Gestao de bancos de dados",
    "file-management":       "Gestao de arquivos e storage",
    "security-audit":        "Auditoria de seguranca",
    "cost-optimization":     "Otimizacao de custos e recursos",
}
