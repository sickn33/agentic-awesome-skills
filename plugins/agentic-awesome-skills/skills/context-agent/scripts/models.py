"""
Modelos de dados do Context Agent.
Dataclasses puras sem dependências externas.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class SessionEntry:
    """Uma entrada individual do log JSONL do Claude Code."""
    type: str                          # "user" | "assistant" | "queue-operation"
    timestamp: str                     # ISO 8601
    session_id: str
    slug: str = ""
    role: str = ""                     # "user" | "assistant"
    content: str = ""                  # Texto da mensagem
    tool_calls: list = field(default_factory=list)   # [{name, input}]
    token_usage: dict = field(default_factory=dict)  # {input, output, cache_read}
    model: str = ""
    files_modified: list = field(default_factory=list)


@dataclass
class PendingTask:
    """Tarefa pendente identificada em uma sessão."""
    description: str
    priority: str = "medium"           # "high" | "medium" | "low"
    source_session: int = 0            # Número da sessão onde foi criada
    created_date: str = ""
    context: str = ""                  # Contexto adicional sobre a tarefa
    completed: bool = False


@dataclass
class ProjectInfo:
    """Informações de um projeto/skill rastreado."""
    name: str
    path: str = ""
    status: str = "active"             # "active" | "paused" | "completed"
    last_touched: str = ""             # Data da última interação
    last_session: int = 0              # Número da última sessão
    next_actions: list = field(default_factory=list)
    dependencies: list = field(default_factory=list)


@dataclass
class SessionSummary:
    """Resumo estruturado de uma sessão do Claude Code."""
    session_number: int
    session_id: str = ""
    slug: str = ""
    date: str = ""                     # YYYY-MM-DD
    start_time: str = ""               # HH:MM
    end_time: str = ""                 # HH:MM
    duration_minutes: int = 0
    model: str = ""

    # Conteúdo
    topics: list = field(default_factory=list)
    decisions: list = field(default_factory=list)
    tasks_completed: list = field(default_factory=list)
    tasks_pending: list = field(default_factory=list)       # list[PendingTask]
    files_modified: list = field(default_factory=list)      # list[{path, action}]
    key_findings: list = field(default_factory=list)
    errors_resolved: list = field(default_factory=list)     # list[{error, solution}]
    open_questions: list = field(default_factory=list)
    technical_debt: list = field(default_factory=list)

    # Métricas
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cache_tokens: int = 0
    message_count: int = 0
    tool_call_count: int = 0

    # Projetos tocados nesta sessão
    projects_touched: list = field(default_factory=list)


@dataclass
class ActiveContext:
    """Contexto ativo consolidado de todas as sessões."""
    last_updated: str = ""
    projects: list = field(default_factory=list)             # list[ProjectInfo]
    pending_tasks: list = field(default_factory=list)        # list[PendingTask]
    recent_decisions: list = field(default_factory=list)     # list[{session, text}]
    active_blockers: list = field(default_factory=list)
    conventions: list = field(default_factory=list)
    recent_sessions: list = field(default_factory=list)      # list[{number, summary}]
    total_sessions: int = 0


@dataclass
class SearchResult:
    """Resultado de busca no histórico de sessões."""
    session_number: int
    date: str
    snippet: str
    section: str                       # Em qual seção foi encontrado
    relevance: float = 0.0
