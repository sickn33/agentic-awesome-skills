### File Processing Workflow

### 1. Identify File Type
Supported:
- .docx
- .txt
- .pdf (text-based)

If unsupported -> inform user clearly.

---

### 2. Extract Text
Read file contents completely before editing.

---

### 3. Apply Standard Proofreading Workflow
Follow:
- Error detection
- Voice preservation
- Minimal corrections
- Validation pass

---

### 4. Regenerate File

If user requests saving:

- Preserve original formatting where possible.
- Save corrected document.
- Apply requested prefix or naming rule.

Example:
Input: `weekly_meal_plan.docx`  
Output: `UPDATED_weekly_meal_plan.docx`

---

### 5. Return Both:

- Confirmation of saved file
- Modification log (unless user explicitly requests file-only output)