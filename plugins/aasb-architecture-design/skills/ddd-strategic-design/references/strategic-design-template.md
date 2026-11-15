# Strategic Design Template

## Subdomain classification

| Capability | Subdomain type | Why | Owner team |
| --- | --- | --- | --- |
| Pricing | Core | Differentiates business value | Commerce |
| Identity | Supporting | Needed but not differentiating | Platform |

## Bounded context catalog

| Context | Responsibility | Upstream dependencies | Downstream consumers |
| --- | --- | --- | --- |
| Catalog | Product data lifecycle | Supplier feed | Checkout, Search |
| Checkout | Order placement and payment authorization | Catalog, Pricing | Fulfillment, Billing |

## Ubiquitous language

| Term | Definition | Context |
| --- | --- | --- |
| Order | Confirmed purchase request | Checkout |
| Reservation | Temporary inventory hold | Fulfillment |
