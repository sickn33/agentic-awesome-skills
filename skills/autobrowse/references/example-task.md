# Task: <Short Description>

One sentence describing what the agent must accomplish.

## URL

https://example.com/the-page

## Inputs

List the data the agent needs (credentials, form values, etc.):

- Field 1: value
- Field 2: value

## Steps

1. Navigate to the URL
2. Describe each step the agent should take
3. Submit / confirm / extract result

## Output

Return a JSON object:

```json
{
  "success": true,
  "confirmation": "CONF-12345",
  "error_reasoning": null
}
```

- If task succeeds: `success: true`, populate relevant fields
- If task fails: `success: false`, populate `error_reasoning` with extracted error text
