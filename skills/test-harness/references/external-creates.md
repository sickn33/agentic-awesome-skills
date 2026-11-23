# Recovery for non-idempotent external creates

**Map every external write before the change goes to its first review.** Use this when an external create has no idempotency guarantee. It assumes one worker runs a given operation at a time; several workers need a claim first. For each external write, put the durable state before and after it in a step table. Record what a rerun does after a crash at each point.

| External write | Durable state before | Durable state after | What a rerun does |
|---|---|---|---|
| Create an object | Intent with a unique lookup tag that the create writes into the object | External identifier saved once known | After intent is saved and before the identifier is saved, look up the tag. After the identifier is saved, continue from that record. |

**Treat a create as refused only when the API documents that nothing was created.** A timeout, a 5xx, or a 409 that can mean the object exists leaves the result unknown. Look up the tag the create wrote. If found, record the identifier and resume. If absent, hold the operation for a person and keep it from creating again while the result is unknown.

**Commit one fault-injection test per crash point with the code.** For example, let the server create the object, lose the reply, and prove that a rerun finds the tagged object with one create call in total.

(`2026-11-18`, recovery after a lost reply or a crash accounted for 16 of 41 findings above Low in the first review series for a desktop tool that writes to an external system's API. It was the largest class and recurred in the second series. Fixing paths individually kept exposing failures on adjacent paths.)
