# Example Data

Add example data to a Weaviate collection for users without their own data or wanting a quick example. Downloads data from the huggingface hub.

```bash
uv run scripts/example_data.py --domain "DOMAIN_NAME" [--vectorizer "..."] [--nrows X]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--domain` | `-d` | No | `academic` | Defines which dataset is being used. One of 'academic', 'finance', 'ecommerce', 'medical', or 'customer_support'. |
| `--vectorizer` | `-v` | No | `text2vec_weaviate` | Optional vectorizer (e.g., `text2vec_openai`, `text2vec_cohere`, `none`) |
| `--nrows` | `-n` | No | `None` | Optionally subset the data. If not supplied uses full dataset. |

**When to use:** Creating example data for immediate use of other skills, if no data is available or user requests some toy data.

**Domain Datasets:**
- `academic` is the `jamescalam/ai-arxiv2` dataset, contains a selection of chunked papers from Arxiv on the topic of AI/ML. Creates the `AI_Arxiv` collection in the Weaviate instance
- `finance` is the `AgamiAI/Indian-Income-Tax-Returns` dataset, fully synthetic Indian Income Tax Return forms. Creates the `Income_Tax_Returns` collection in the Weaviate instance
- `ecommerce` is the `pkghf/ecom-product-catalog` dataset, containing structured e-commerce product information including product details, pricing, categorization. Creates the `Product_Catalog` collection in the Weaviate instance
- `medical` is the `Amod/hair_medical_sit`, containing information about common hair related diseases. Creates the `Hair_Medical` collection in the Weaviate instance
- `customer_support` is the `Console-AI/IT-helpdesk-synthetic-tickets`, synthetic customer support tickets from IT. Creates the `IT_Support_Tickets` collection in the Weaviate instance
