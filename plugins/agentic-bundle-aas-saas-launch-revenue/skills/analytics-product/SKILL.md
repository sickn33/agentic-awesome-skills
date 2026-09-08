---
name: analytics-product
description: Analytics de produto — PostHog, Mixpanel, eventos, funnels, cohorts, retencao, north star metric, OKRs e dashboards de produto.
metadata:
  aas-risk: none
  aas-source: community
  aas-date-added: '2026-03-06'
  aas-author: renat
  aas-tags: '["analytics","product","metrics","posthog","mixpanel"]'
  aas-tools: '["claude-code","antigravity","cursor","gemini-cli","codex-cli"]'
---

# ANALYTICS-PRODUCT — Decida com Dados

## Overview

Analytics de produto — PostHog, Mixpanel, eventos, funnels, cohorts, retencao, north star metric, OKRs e dashboards de produto. Ativar para: configurar tracking de eventos, criar funil de conversao, analise de cohort, retencao, DAU/MAU, feature flags, A/B testing, north star metric, OKRs, dashboard de produto.

## When to Use This Skill

- Use para definir um evento de ativacao, investigar queda de funil ou calcular retencao com denominador e janela explicitos.
- Antes de instrumentar, registre a decisao de produto, a fonte de dados, o consentimento aplicavel, o fuso horario e a unidade de analise.

## Do Not Use This Skill When

- The task is unrelated to analytics product
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

```
[objeto]_[verbo_passado]

Correto:   user_signed_up, conversation_started, upgrade_completed
Errado:    signup, click, conversion
```

## Analytics-Product — Decida Com Dados

> "In God we trust. All others must bring data." — W. Edwards Deming

---

## Exemplo ilustrativo: eventos de um assistente

```python
AURI_EVENTS = {
    # Aquisicao
    "user_signed_up":        {"props": ["source", "medium", "campaign"]},
    "onboarding_started":    {"props": ["step_count"]},
    "onboarding_completed":  {"props": ["time_to_complete", "steps_skipped"]},

    # Ativacao
    "first_conversation":    {"props": ["intent", "response_time"]},
    "aha_moment_reached":    {"props": ["trigger", "session_number"]},
    "feature_discovered":    {"props": ["feature_name", "discovery_method"]},

    # Retencao
    "conversation_started":  {"props": ["intent", "user_tier", "device"]},
    "conversation_completed":{"props": ["messages_count", "duration", "rating"]},
    "session_started":       {"props": ["days_since_last", "platform"]},

    # Receita
    "upgrade_viewed":        {"props": ["trigger", "current_tier"]},
    "upgrade_started":       {"props": ["target_tier", "trigger"]},
    "upgrade_completed":     {"props": ["tier", "plan", "revenue"]},
    "subscription_canceled": {"props": ["reason", "tier", "tenure_days"]},
    "payment_failed":        {"props": ["attempt_count", "error_code"]},
}
```

## Implementacao Posthog (Python)

```python
from posthog import Posthog
import os

posthog = Posthog(
    project_api_key=os.environ["POSTHOG_API_KEY"],
    host=os.environ.get("POSTHOG_HOST", "https://app.posthog.com")
)

def track(user_id: str, event: str, properties: dict = None):
    posthog.capture(
        distinct_id=user_id,
        event=event,
        properties=properties or {}
    )

def identify(user_id: str, traits: dict):
    posthog.identify(
        distinct_id=user_id,
        properties=traits
    )

## Uso:

track("user_123", "conversation_started", {
    "intent": "business_advice",
    "device": "alexa",
    "user_tier": "pro"
})
```

---

## Funil ilustrativo de ativacao (numeros hipoteticos)

```
Visita landing page          (100%)
    | [meta: 40%]
Clicou "Experimentar"         (40%)
    | [meta: 70%]
Completou cadastro            (28%)
    | [meta: 60%]
Fez primeira conversa         (17%)  <- AHA MOMENT
    | [meta: 50%]
Voltou no dia seguinte        (8.5%)
    | [meta: 40%]
Usou 3+ dias na semana        (3.4%)
    | [meta: 20%]
Converteu para Pro            (0.7%)
```

## Otimizando O Funil

```
Para cada drop-off > benchmark:
1. Identificar: onde exatamente o usuario sai?
2. Entender: por que? (session recordings, surveys)
3. Hipotese: qual mudanca poderia melhorar?
4. Testar: A/B test com amostra estatisticamente significante
5. Medir: janela e amostra predefinidas, efeito com intervalo, qualidade e guardrails
   Nao encerrar cedo por um p-value favoravel; investigar SRM e perdas de tracking
6. Aprender: mesmo se falhar, entende-se o usuario melhor
```

---

## Analise De Cohort (Retencao Semanal)

```python
def calculate_cohort_retention(events_df):
    """
    events_df: DataFrame com colunas [user_id, event_date, event_name]
    Retorna: matriz de retencao [cohort_week x week_number]
    """
    import pandas as pd

    first_session = events_df[events_df.event_name == "session_started"] \
        .groupby("user_id")["event_date"].min() \
        .dt.to_period("W")

    sessions = events_df[events_df.event_name == "session_started"].copy()
    sessions["cohort"] = sessions["user_id"].map(first_session)
    sessions["weeks_since"] = (
        sessions["event_date"].dt.to_period("W") - sessions["cohort"]
    ).apply(lambda x: x.n)

    cohort_data = sessions.groupby(["cohort", "weeks_since"])["user_id"].nunique()
    cohort_sizes = cohort_data.unstack().iloc[:, 0]
    retention = cohort_data.unstack().divide(cohort_sizes, axis=0) * 100

    return retention
```

## Faixas ilustrativas de retencao (nao sao benchmarks de mercado)

Estes numeros nao possuem fonte ou validacao externa. Use apenas como exemplo de formato; substitua por baseline observado de cohorts comparaveis e maturas.

| Semana | Faixa A | Faixa B | Faixa C | Faixa D |
|--------|---------|-----|-----|-----------|
| W1 | <20% | 20-35% | 35-50% | >50% |
| W4 | <10% | 10-20% | 20-30% | >30% |
| W8 | <5% | 5-12% | 12-20% | >20% |

---

## Hipotese ilustrativa de North Star

```
Framework:
1. O que cria valor real para o usuario? -> Conversas que geram insight/acao
2. Hipotese a validar: usuarios com 3+ conversas/semana recebem valor recorrente
3. Como medir? -> "Weekly Active Conversationalists" (WAC)

North Star: WAC (Weekly Active Conversationalists)
Definicao: Usuarios com >= 3 conversas na semana que duraram >= 2 minutos

Meta Ano 1: 10.000 WAC
Meta Ano 2: 100.000 WAC
```

## Dashboard North Star

Sketch: adapte `db.query` e `calculate_wow_growth` ao projeto. Use limites de janela explicitos e o mesmo fuso; conte usuarios qualificados no resultado agregado, nao uma linha por usuario.

```python
def calculate_north_star(db, window_start, window_end):
    wac = db.query("""
        SELECT COUNT(*) as wac
        FROM (
            SELECT user_id
            FROM conversations
            WHERE created_at >= :window_start AND created_at < :window_end
              AND duration_seconds >= 120
            GROUP BY user_id
            HAVING COUNT(*) >= 3
        ) AS qualifying_users
    """, {"window_start": window_start, "window_end": window_end}).scalar()

    return {
        "wac": wac,
        "wow_growth": calculate_wow_growth(db, "wac"),
        "target": 10000,
        "progress": f"{wac/10000*100:.1f}%"
    }
```

---

## Feature Flags Com Posthog

Use a API da versao instalada. O SDK atual oferece `evaluate_flags`; em versoes antigas, a ordem de `feature_enabled` era `(feature, user_id)`. Em erro ou ausencia de valor, preserve o fluxo de controle seguro. Veja a [documentacao Python oficial](https://posthog.com/docs/libraries/python). Nao envie eventos/identificacao antes da autorizacao e das regras de consentimento do projeto.

```python
def is_feature_enabled(user_id: str, feature: str) -> bool:
    flags = posthog.evaluate_flags(user_id)
    return flags.is_enabled(feature) is True

if is_feature_enabled(user_id, "new-onboarding-v2"):
    show_new_onboarding()
else:
    show_old_onboarding()
```

## Calculadora De Significancia Estatistica

```python
from scipy import stats

def ab_test_significance(
    control_conversions: int,
    control_visitors: int,
    variant_conversions: int,
    variant_visitors: int,
    confidence: float = 0.95
) -> dict:
    counts = (control_conversions, control_visitors, variant_conversions, variant_visitors)
    if any(type(value) is not int or value < 0 for value in counts):
        raise ValueError("Contagens devem ser inteiros nao negativos")
    if not (0 < control_visitors and 0 < variant_visitors
            and control_conversions <= control_visitors
            and variant_conversions <= variant_visitors and 0 < confidence < 1):
        raise ValueError("Denominadores, conversoes ou confianca invalidos")
    control_rate = control_conversions / control_visitors
    variant_rate = variant_conversions / variant_visitors
    lift = (variant_rate - control_rate) / control_rate * 100 if control_rate else None

    table = [
        [control_conversions, control_visitors - control_conversions],
        [variant_conversions, variant_visitors - variant_conversions]
    ]
    if any(sum(row) == 0 for row in zip(*table)):
        return {"status": "insufficient-variation", "recommendation": "No automatic decision"}
    _, p_value, _, expected = stats.chi2_contingency(table)
    if (expected < 5).any():
        return {"status": "sparse-counts", "recommendation": "Use a pre-specified exact method"}

    significant = p_value < (1 - confidence)

    return {
        "control_rate": f"{control_rate*100:.2f}%",
        "variant_rate": f"{variant_rate*100:.2f}%",
        "lift": f"{lift:+.1f}%" if lift is not None else None,
        "p_value": round(p_value, 4),
        "significant": significant,
        "absolute_difference_pp": (variant_rate - control_rate) * 100,
        "recommendation": "Review pre-specified effect, uncertainty and guardrails; no automatic deploy"
    }
```

---

## 6. Sugestoes de prompts (nao instalam comandos no cliente)

| Comando | Acao |
|---------|------|
| `/event-taxonomy` | Define taxonomia de eventos |
| `/funnel-analysis` | Analisa funil de conversao |
| `/cohort-retention` | Calcula retencao por cohort |
| `/north-star` | Define ou revisa North Star Metric |
| `/ab-test` | Calcula significancia de A/B test |
| `/dashboard-setup` | Cria dashboard de produto |
| `/okr-template` | Template de OKRs para produto |

## Exemplo verificavel

Entrada sintetica: em uma janela fechada, usuario A tem tres conversas de 120 segundos, B tem duas e C tem quatro de 60 segundos. O resultado WAC esperado e **1**, nao varias linhas com valor 1. Em retencao, reporte tamanho da cohort e idade observavel; uma semana ainda nao encerrada nao representa zero retencao.

Para um experimento, registre unidade de randomizacao, metrica primaria, janela, efeito minimo, regra de parada e guardrails antes de calcular o teste. O exemplo de significancia rejeita denominadores invalidos e contagens esparsas; ele nao e um mecanismo de decisao de rollout.

## Limitations

- As metas, faixas e eventos de assistente acima sao hipoteticos; nao provam benchmarks ou comportamento dos usuarios.
- O trecho de cohort assume timestamps ja normalizados e dados completos; semanas imaturas precisam ser mascaradas e cohorts sem usuarios nao devem dividir por zero.
- Um p-value isolado nao mede valor do produto, elimina vieses ou substitui intervalos e desenho experimental.
- SDKs podem enviar dados para servicos externos. Minimize propriedades, evite texto de conversas e valide consentimento, residencia e retencao antes de ativar tracking.
- Os exemplos de banco e interface dependem de adaptadores do projeto; nao representam uma aplicacao pronta.
