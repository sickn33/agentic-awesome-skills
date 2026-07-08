---
name: monetization
description: "Estrategia e implementacao de monetizacao para produtos digitais - Stripe, subscriptions, pricing experiments, freemium, upgrade flows, churn prevention, revenue optimization e modelos de negocio SaaS."
risk: none
source: community
date_added: '2026-03-06'
author: renat
tags:
- monetization
- stripe
- saas
- pricing
- subscriptions
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# MONETIZATION - Do Produto ao Revenue

## Overview

Estrategia e implementacao de monetizacao para produtos digitais - Stripe, subscriptions, pricing experiments, freemium, upgrade flows, churn prevention, revenue optimization e modelos de negocio SaaS. Ativar para: integrar Stripe, criar planos de assinatura, pricing strategy, upgrade/downgrade, webhook de pagamento, trial gratuito, churn, LTV/CAC, unit economics, modelo de negocio.

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to monetization
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

> Price is what you pay. Value is what you get. - Warren Buffett
> A monetizacao perfeita captura valor proporcional ao valor entregue.

---

## A Regra De Ouro

Usuarios pagam quando:
1. O produto resolve um problema real (need)
2. A solucao e melhor que alternativas (differentiation)
3. O preco e percebido como justo (value perception)
4. O momento de cobranca e natural (timing)

## Erros Classicos

- Cobranca antes de mostrar valor (kill activation)
- Preco muito baixo (sinaliza baixa qualidade)
- Planos demais (paralisia de escolha)
- Trial sem carta de credito (baixa conversao)
- Churn invisivel (sem alertas de cancelamento iminente)

---

## Setup Inicial

```bash
pip install stripe

## Ou

npm install stripe
```

```python

## Config.Py

import stripe
import os

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]

PLANS = {
    "free": None,
    "pro": os.environ["STRIPE_PRICE_PRO"],
    "business": os.environ["STRIPE_PRICE_BIZ"],
}
```

## Criar Customer E Subscription

```python
def create_customer(email: str, name: str, user_id: str) -> str:
    customer = stripe.Customer.create(
        email=email,
        name=name,
        metadata={"user_id": user_id}
    )
    return customer.id

def create_subscription(customer_id: str, price_id: str, trial_days: int = 14):
    subscription = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        trial_period_days=trial_days,
        payment_behavior="default_incomplete",
        expand=["latest_invoice.payment_intent"],
    )
    return {
        "subscription_id": subscription.id,
        "client_secret": subscription.latest_invoice.payment_intent.client_secret,
        "status": subscription.status
    }
```

## Checkout Session (Recomendado Para Conversao)

```python
def create_checkout_session(
    customer_id: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
    trial_days: int = 14
) -> str:
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={"trial_period_days": trial_days},
        success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=cancel_url,
        allow_promotion_codes=True,
    )
    return session.url
```

## Customer Portal (Self-Service)

```python
def create_portal_session(customer_id: str, return_url: str) -> str:
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url
```

## Webhook - Processar Eventos

```python
from fastapi import Request, HTTPException
import stripe

async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    handlers = {
        "customer.subscription.created": handle_subscription_created,
        "customer.subscription.updated": handle_subscription_updated,
        "customer.subscription.deleted": handle_subscription_deleted,
        "invoice.payment_succeeded": handle_payment_succeeded,
        "invoice.payment_failed": handle_payment_failed,
        "customer.subscription.trial_will_end": handle_trial_ending,
    }

    handler = handlers.get(event["type"])
    if handler:
        await handler(event["data"]["object"])

    return {"status": "ok"}
```

## Verificar Status Da Subscription

```python
def get_subscription_status(customer_id: str) -> dict:
    subscriptions = stripe.Subscription.list(
        customer=customer_id,
        status="all",
        limit=1
    )
    if not subscriptions.data:
        return {"tier": "free", "status": "none"}

    sub = subscriptions.data[0]
    return {
        "tier": get_tier_from_price(sub.items.data[0].price.id),
        "status": sub.status,
        "trial_end": sub.trial_end,
        "current_period_end": sub.current_period_end,
        "cancel_at_period_end": sub.cancel_at_period_end,
    }
```

---

## Framework De Pricing Para Saas

**Metodo 1: Value-Based Pricing (Recomendado)**
```
1. Calcule o valor economico entregue ao usuario
   Ex: produto economiza 2h/semana = R$ 200/mes de valor
2. Capture 10-30% do valor criado
   Ex: R$ 29/mes = 14% do valor
3. Valide com pesquisa de willingness-to-pay
4. Teste 3 price points (A/B test)
```

**Metodo 2: Competitive Anchor**
```
Referencia: ChatGPT Plus = $20/mes (R$ 100)
Anchor: Notion = R$ 32/mes
Posicao: Pro = R$ 29/mes (mais barato que ChatGPT, similar ao Notion)
Mensagem: Tudo que o ChatGPT faz, por voz no Alexa
```

## Psicologia De Pricing

```
R$ 29/mes (nao R$ 30 - efeito do digito esquerdo)
Plano anual com desconto claro: R$ 249/ano (economize R$ 99)
Destaque no plano que voce quer vender (visual hierarchy)
Ancoragem: mostra o plano caro primeiro
Trial sem cartao para ativacao, com cartao para retencao
Badge Mais popular no plano middle
```

## Estrutura De Planos (3 E O Numero Certo)

| Feature             | Free    | Pro        | Business   |
|---------------------|---------|------------|------------|
| Preco               | Gratis  | R$ 29/mes  | R$ 99/mes  |
| Conversas/mes       | 50      | Ilimitado  | Ilimitado  |
| Memoria             | 7 dias  | 1 ano      | Permanente |
| Board especialistas | Nao     | Sim        | Sim        |
| Multi-usuarios      | Nao     | Nao        | Ate 10     |
| API access          | Nao     | Nao        | Sim        |
| Suporte             | Nao     | Email      | Priority   |

---

## Sinais De Churn Iminente

```python
CHURN_SIGNALS = {
    "high_risk": [
        "nao logou nos ultimos 14 dias",
        "uso caiu >70% em 2 semanas",
        "abriu cancelamento mas nao concluiu",
        "ticket de suporte aberto sem resolucao",
    ],
    "medium_risk": [
        "nao logou em 7 dias",
        "uso caiu >40%",
        "nao completou onboarding",
        "nunca usou feature core",
    ]
}
```

## Sequencia Anti-Churn

```
Dia 0:  Usuario nao usa por 7 dias
        -> Email: Sentimos sua falta. O que aconteceu?

Dia 3:  Sem resposta
        -> Push/Email: case study de usuario similar com sucesso

Dia 7:  Nao voltou
        -> Email: oferta especial (20% off por 3 meses)

Dia 14: Trial expirando
        -> In-app modal + email urgente: Sua conta vai dormir em 3 dias

Dia 30: Cancelou
        -> Offboarding email: Lamentamos ver voce ir.
        -> 3 meses depois: reativacao com novidades
```

## Exit Survey (Obrigatorio)

```python
CANCELLATION_REASONS = [
    "Muito caro",
    "Nao uso o suficiente",
    "Falta funcionalidade X",
    "Encontrei alternativa melhor",
    "Problemas tecnicos",
    "Outro"
]

## Falta Feature -> Roadmap + Notificacao Quando Lancar

```

---

## Calculos Essenciais

```python
def calculate_unit_economics(
    mrr: float,
    customers: int,
    new_customers: int,
    churned: int,
    cac_total: float,
):
    arpu = mrr / customers
    churn_rate = churned / customers
    ltv = arpu / churn_rate
    cac = cac_total / new_customers
    ltv_cac = ltv / cac
    months_to_recover_cac = cac / arpu

    return {
        "ARPU": f"R$ {arpu:.2f}",
        "Churn Rate": f"{churn_rate*100:.1f}%",
        "LTV": f"R$ {ltv:.0f}",
        "CAC": f"R$ {cac:.0f}",
        "LTV/CAC": f"{ltv_cac:.1f}x",
        "Payback": f"{months_to_recover_cac:.1f} meses",
        "Status": "Saudavel" if ltv_cac > 3 else "Otimizar"
    }
```

## Benchmarks Saas B2C Brasil

| Metrica               | Ruim  | Ok     | Bom    | Excelente |
|-----------------------|-------|--------|--------|-----------|
| Churn Mensal          | >7%   | 5-7%   | 2-5%   | <2%       |
| LTV/CAC               | <1x   | 1-3x   | 3-5x   | >5x       |
| Payback               | >18m  | 12-18m | 6-12m  | <6m       |
| Conversao trial->pago | <3%   | 3-8%   | 8-15%  | >15%      |
| MoM Growth            | <5%   | 5-10%  | 10-20% | >20%      |

---

## Dashboard De Revenue (Metricas Diarias)

```
MRR atual: R$ XX.XXX
  New MRR (novos assinantes): +R$ X.XXX
  Expansion MRR (upgrades): +R$ XXX
  Contraction MRR (downgrades): -R$ XXX
  Churned MRR (cancelamentos): -R$ XXX
  Net New MRR: +/- R$ XXX

ARR (Annualized): R$ XX.XXX x 12
Churn Rate: X.X%
Net Revenue Retention: XXX% (meta: >100%)
```

## Automacao De Revenue Com Stripe

```python
async def check_usage_and_upsell(user_id: str, usage: dict):
    if usage["conversations_this_month"] >= 45:
        await send_upgrade_prompt(
            user_id=user_id,
            message="Voce esta usando 90% do seu limite. Faca upgrade para Pro.",
            cta_url=f"/upgrade?utm=usage-limit"
        )
```

---

## 7. Comandos Rapidos

| Comando              | Acao                                     |
|----------------------|------------------------------------------|
| /stripe-setup        | Configura Stripe do zero                 |
| /pricing-analysis    | Analisa estrategia de pricing atual      |
| /churn-playbook      | Sequencia anti-churn personalizada       |
| /unit-economics      | Calcula LTV/CAC e saude financeira       |
| /upgrade-flow        | Design do fluxo de upgrade               |
| /revenue-dashboard   | Template de dashboard de revenue         |
| /trial-optimization  | Otimiza conversao de trial               |

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `analytics-product` - Complementary skill for enhanced analysis
- `growth-engine` - Complementary skill for enhanced analysis
- `product-design` - Complementary skill for enhanced analysis
- `product-inventor` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
