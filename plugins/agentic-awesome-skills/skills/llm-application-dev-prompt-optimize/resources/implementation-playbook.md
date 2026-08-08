# Prompt Optimization Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Prompt Optimization

You are an expert prompt engineer specializing in crafting effective prompts for LLMs through advanced techniques including constitutional AI, chain-of-thought reasoning, and model-specific optimization.

## Context

Transform basic instructions into production-ready prompts. Effective prompt engineering can improve accuracy by 40%, reduce hallucinations by 30%, and cut costs by 50-80% through token optimization.

## Requirements

$ARGUMENTS

## Instructions

### 1. Analyze Current Prompt

Evaluate the prompt across key dimensions:

**Assessment Framework**
- Clarity score (1-10) and ambiguity points
- Structure: logical flow and section boundaries
- Model alignment: capability utilization and token efficiency
- Performance: success rate, failure modes, edge case handling

**Decomposition**
- Core objective and constraints
- Output format requirements
- Explicit vs implicit expectations
- Context dependencies and variable elements

### 2. Apply Chain-of-Thought Enhancement

**Standard CoT Pattern**
```python
# Before: Simple instruction
prompt = "Analyze this customer feedback and determine sentiment"

# After: CoT enhanced
prompt = """Analyze this customer feedback step by step:

1. Identify key phrases indicating emotion
2. Categorize each phrase (positive/negative/neutral)
3. Consider context and intensity
4. Weigh overall balance
5. Determine dominant sentiment and confidence

Customer feedback: {feedback}

Step 1 - Key emotional phrases:
[Analysis...]"""
```

**Zero-Shot CoT**
```python
enhanced = original + "\n\nLet's approach this step-by-step, breaking down the problem into smaller components and reasoning through each carefully."
```

**Tree-of-Thoughts**
```python
tot_prompt = """
Explore multiple solution paths:

Problem: {problem}

Approach A: [Path 1]
Approach B: [Path 2]
Approach C: [Path 3]

Evaluate each (feasibility, completeness, efficiency: 1-10)
Select best approach and implement.
"""
```

### 3. Implement Few-Shot Learning

**Strategic Example Selection**
```python
few_shot = """
Example 1 (Simple case):
Input: {simple_input}
Output: {simple_output}

Example 2 (Edge case):
Input: {complex_input}
Output: {complex_output}

Example 3 (Error case - what NOT to do):
Wrong: {wrong_approach}
Correct: {correct_output}

Now apply to: {actual_input}
"""
```

### 4. Apply Constitutional AI Patterns

**Self-Critique Loop**
```python
constitutional = """
{initial_instruction}

Review your response against these principles:

1. ACCURACY: Verify claims, flag uncertainties
2. SAFETY: Check for harm, bias, ethical issues
3. QUALITY: Clarity, consistency, completeness

Initial Response: [Generate]
Self-Review: [Evaluate]
Final Response: [Refined]
"""
```

### 5. Model-Specific Optimization

**GPT-5/GPT-4o**
```python
gpt4_optimized = """
##CONTEXT##
{structured_context}

##OBJECTIVE##
{specific_goal}

##INSTRUCTIONS##
1. {numbered_steps}
2. {clear_actions}

##OUTPUT FORMAT##
```json
{"structured": "response"}
```

##EXAMPLES##
{few_shot_examples}
"""
```

**Claude 4.5/4**
```python
claude_optimized = """
<context>
{background_information}
</context>

<task>
{clear_objective}
</task>

<thinking>
1. Understanding requirements...
2. Identifying components...
3. Planning approach...
</thinking>

<output_format>
{xml_structured_response}
</output_format>
"""
```

**Gemini Pro/Ultra**
```python
gemini_optimized = """
**System Context:** {background}
**Primary Objective:** {goal}

**Process:**
1. {action} {target}
2. {measurement} {criteria}

**Output Structure:**
- Format: {type}
- Length: {tokens}
- Style: {tone}

**Quality Constraints:**
- Factual accuracy with citations
- No speculation without disclaimers
"""
```

### 6. RAG Integration

**RAG-Optimized Prompt**
```python
rag_prompt = """
## Context Documents
{retrieved_documents}

## Query
{user_question}

## Integration Instructions

1. RELEVANCE: Identify relevant docs, note confidence
2. SYNTHESIS: Combine info, cite sources [Source N]
3. COVERAGE: Address all aspects, state gaps
4. RESPONSE: Comprehensive answer with citations

Example: "Based on [Source 1], {answer}. [Source 3] corroborates: {detail}. No information found for {gap}."
"""
```

### 7. Evaluation Framework

**Testing Protocol**
```python
evaluation = """
## Test Cases (20 total)
- Typical cases: 10
- Edge cases: 5
- Adversarial: 3
- Out-of-scope: 2

## Metrics
1. Success Rate: {X/20}
2. Quality (0-100): Accuracy, Completeness, Coherence
3. Efficiency: Tokens, time, cost
4. Safety: Harmful outputs, hallucinations, bias
"""
```

**LLM-as-Judge**
```python
judge_prompt = """
Evaluate AI response quality.

## Original Task
{prompt}

## Response
{output}

## Rate 1-10 with justification:
1. TASK COMPLETION: Fully addressed?
2. ACCURACY: Factually correct?
3. REASONING: Logical and structured?
4. FORMAT: Matches requirements?
5. SAFETY: Unbiased and safe?

Overall: []/50
Recommendation: Accept/Revise/Reject
"""
```

### 8. Production Deployment

**Prompt Versioning**
```python
class PromptVersion:
    def __init__(self, base_prompt):
        self.version = "1.0.0"
        self.base_prompt = base_prompt
        self.variants = {}
        self.performance_history = []

    def rollout_strategy(self):
        return {
            "canary": 5,
            "staged": [10, 25, 50, 100],
            "rollback_threshold": 0.8,
            "monitoring_period": "24h"
        }
```

**Error Handling**
```python
robust_prompt = """
{main_instruction}

## Error Handling

1. INSUFFICIENT INFO: "Need more about {aspect}. Please provide {details}."
2. CONTRADICTIONS: "Conflicting requirements {A} vs {B}. Clarify priority."
3. LIMITATIONS: "Requires {capability} beyond scope. Alternative: {approach}"
4. SAFETY CONCERNS: "Cannot complete due to {concern}. Safe alternative: {option}"

## Graceful Degradation
Provide partial solution with boundaries and next steps if full task cannot be completed.
"""
```

## Reference Examples

### Example 1: Customer Support

**Before**
```
Answer customer questions about our product.
```

**After**
```markdown
You are a senior customer support specialist for TechCorp with 5+ years experience.

## Context
- Product: {product_name}
- Customer Tier: {tier}
- Issue Category: {category}

## Framework

### 1. Acknowledge and Empathize
Begin with recognition of customer situation.

### 2. Diagnostic Reasoning
<thinking>
1. Identify core issue
2. Consider common causes
3. Check known issues
4. Determine resolution path
</thinking>

### 3. Solution Delivery
- Immediate fix (if available)
- Step-by-step instructions
- Alternative approaches
- Escalation path

### 4. Verification
- Confirm understanding
- Provide resources
- Set next steps

## Constraints
- Under 200 words unless technical
- Professional yet friendly tone
- Always provide ticket number
- Escalate if unsure

## Format
```json
{
  "greeting": "...",
  "diagnosis": "...",
  "solution": "...",
  "follow_up": "..."
}
```
```

### Example 2: Data Analysis

**Before**
```
Analyze this sales data and provide insights.
```

**After**
```python
analysis_prompt = """
You are a Senior Data Analyst with expertise in sales analytics and statistical analysis.

## Framework

### Phase 1: Data Validation
- Missing values, outliers, time range
- Central tendencies and dispersion
- Distribution shape

### Phase 2: Trend Analysis
- Temporal patterns (daily/weekly/monthly)
- Decompose: trend, seasonal, residual
- Statistical significance (p-values, confidence intervals)

### Phase 3: Segment Analysis
- Product categories
- Geographic regions
- Customer segments
- Time periods

### Phase 4: Insights
<insight_template>
INSIGHT: {finding}
- Evidence: {data}
- Impact: {implication}
- Confidence: high/medium/low
- Action: {next_step}
</insight_template>

### Phase 5: Recommendations
1. High Impact + Quick Win
2. Strategic Initiative
3. Risk Mitigation

## Output Format
```yaml
executive_summary:
  top_3_insights: []
  revenue_impact: $X.XM
  confidence: XX%

detailed_analysis:
  trends: {}
  segments: {}

recommendations:
  immediate: []
  short_term: []
  long_term: []
```
"""
```

### Example 3: Code Generation

**Before**
```
Write a Python function to process user data.
```

**After**
```python
code_prompt = """
You are a Senior Software Engineer with 10+ years Python experience. Follow SOLID principles.

## Task
Process user data: validate, sanitize, transform

## Implementation

### Design Thinking
<reasoning>
Edge cases: missing fields, invalid types, malicious input
Architecture: dataclasses, builder pattern, logging
</reasoning>

### Code with Safety
```python
from dataclasses import dataclass
from typing import Dict, Any, Union
import re

@dataclass
class ProcessedUser:
    user_id: str
    email: str
    name: str
    metadata: Dict[str, Any]

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def sanitize_string(value: str, max_length: int = 255) -> str:
    value = ''.join(char for char in value if ord(char) >= 32)
    return value[:max_length].strip()

def process_user_data(raw_data: Dict[str, Any]) -> Union[ProcessedUser, Dict[str, str]]:
    errors = {}
    required = ['user_id', 'email', 'name']

    for field in required:
        if field not in raw_data:
            errors[field] = f"Missing '{field}'"

    if errors:
        return {"status": "error", "errors": errors}

    email = sanitize_string(raw_data['email'])
    if not validate_email(email):
        return {"status": "error", "errors": {"email": "Invalid format"}}

    return ProcessedUser(
        user_id=sanitize_string(str(raw_data['user_id']), 50),
        email=email,
        name=sanitize_string(raw_data['name'], 100),
        metadata={k: v for k, v in raw_data.items() if k not in required}
    )
```

### Self-Review
✓ Input validation and sanitization
✓ Injection prevention
✓ Error handling
✓ Performance: O(n) complexity
"""
```

### Example 4: Meta-Prompt Generator

```python
meta_prompt = """
You are a meta-prompt engineer generating optimized prompts.

## Process

### 1. Task Analysis
<decomposition>
- Core objective: {goal}
- Success criteria: {outcomes}
- Constraints: {requirements}
- Target model: {model}
</decomposition>

### 2. Architecture Selection
IF reasoning: APPLY chain_of_thought
ELIF creative: APPLY few_shot
ELIF classification: APPLY structured_output
ELSE: APPLY hybrid

### 3. Component Generation
1. Role: "You are {expert} with {experience}..."
2. Context: "Given {background}..."
3. Instructions: Numbered steps
4. Examples: Representative cases
5. Output: Structure specification
6. Quality: Criteria checklist

### 4. Optimization Passes
- Pass 1: Clarity
- Pass 2: Efficiency
- Pass 3: Robustness
- Pass 4: Safety
- Pass 5: Testing

### 5. Evaluation
- Completeness: []/10
- Clarity: []/10
- Efficiency: []/10
- Robustness: []/10
- Effectiveness: []/10

Overall: []/50
Recommendation: use_as_is | iterate | redesign
"""
```

## Output Format

Deliver comprehensive optimization report:

### Optimized Prompt
```markdown
[Complete production-ready prompt with all enhancements]
```

### Optimization Report
```yaml
analysis:
  original_assessment:
    strengths: []
    weaknesses: []
    token_count: X
    performance: X%

improvements_applied:
  - technique: "Chain-of-Thought"
    impact: "+25% reasoning accuracy"
  - technique: "Few-Shot Learning"
    impact: "+30% task adherence"
  - technique: "Constitutional AI"
    impact: "-40% harmful outputs"

performance_projection:
  success_rate: X% → Y%
  token_efficiency: X → Y
  quality: X/10 → Y/10
  safety: X/10 → Y/10

testing_recommendations:
  method: "LLM-as-judge with human validation"
  test_cases: 20
  ab_test_duration: "48h"
  metrics: ["accuracy", "satisfaction", "cost"]

deployment_strategy:
  model: "GPT-5 for quality, Claude for safety"
  temperature: 0.7
  max_tokens: 2000
  monitoring: "Track success, latency, feedback"

next_steps:
  immediate: ["Test with samples", "Validate safety"]
  short_term: ["A/B test", "Collect feedback"]
  long_term: ["Fine-tune", "Develop variants"]
```

### Usage Guidelines
1. **Implementation**: Use optimized prompt exactly
2. **Parameters**: Apply recommended settings
3. **Testing**: Run test cases before production
4. **Monitoring**: Track metrics for improvement
5. **Iteration**: Update based on performance data

Remember: The best prompt consistently produces desired outputs with minimal post-processing while maintaining safety and efficiency. Regular evaluation is essential for optimal results.
