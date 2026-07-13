# AI and LLM Attack Patterns

## Prompt Injection

Look for:
- User input concatenated into LLM prompts
- System prompt construction from external data
- Lack of input sanitization before LLM calls

## Data Exfiltration via LLM

Look for:
- LLM responses containing sensitive data
- Indirect prompt injection leading to data leakage
- LLM accessing external resources without controls

## Model Poisoning

Look for:
- Training data from untrusted sources
- Fine-tuning without integrity checks
- Feedback loops that could corrupt model behavior

## Tool Use Vulnerabilities

Look for:
- LLM tools with unrestricted access
- Tool parameters constructed from user input
- Missing validation on tool execution results

## RAG (Retrieval-Augmented Generation) Risks

Look for:
- Untrusted document sources
- Missing content filtering
- Vector database injection possibilities

## LLM-Specific Security Controls

- Input validation and sanitization
- Output filtering and redaction
- Rate limiting on LLM endpoints
- Audit logging of LLM interactions
- Content security policies for LLM responses
