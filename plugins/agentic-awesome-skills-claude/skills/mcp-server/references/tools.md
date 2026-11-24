# Tools: names, descriptions, arguments, results, annotations, instructions

The examples below come from a live Q&A product (rooms, questions, surveys) and a monitoring product (monitors, incidents). Use their shape, not their words.

## Naming

- **Tool names are `snake_case`, verb then object**, in the product's own words: `list_rooms`, `get_room_qa`, `get_survey_results`, `create_room`, `close_survey`, `moderate_question`. A hosted server and a stdio package use **the same names and the same titles for the tools they share**, so a directory or a client sees one product whichever way it connects. Where the two return different things, the difference stays visible: if the package's Q&A read returns Markdown only, the ids its moderation tools need come from a read of its own, and its README says so.
- **Every tool has a `title`**: sentence case, unique on the server, short (3 to 61 characters, starting with a capital: "Room Q&A as a FAQ draft", "Approve or hide a question"). It goes in the top-level `title` (MCP `2025-06-18`) **and** in `annotations.title`, for clients that read only the older field. Claude's directory flags a tool without one (October 2026).
- **Arguments use the REST body's field names**, and an id is named for what it identifies (`survey_id`, `question_id`), never a bare `id`.
- **The argument and the result field are different names, and the descriptions must say which is which.** A description that said "call again with `next_cursor`" sent agents an argument the strict schema refuses, because the argument is `cursor` and `next_cursor` is the field the result returns: *Invalid tool arguments*. Write it as: "call again with `cursor` set to the returned `next_cursor` until `next_cursor` is null."
- **The server's name** in `initialize`'s `serverInfo` is the short lowercase product name. Listings use the product name plus what it does ("<Product>: Live Q&A and Polls"). The registry namespace is in `directories.md § Official MCP Registry`.

## Choosing the tools

- **A read-only server is scored as thin.** Glama's tool review flags "only read operations" (October 2026), which is a reason to ship the host's everyday actions, not only reads.
- **Each write is a product action the console already has**, through the same function and the same transaction, so quotas, lifecycle rules and plan limits apply unchanged. REST and MCP call one module.
- **Write down what an agent must never do, and hold it in code.** Examples: an audience product's agents cannot ask, vote or delete, because an agent that could ask or vote would stuff the queue and the ranking the room relies on; a monitoring product's cannot delete, change alert channels or teammates, touch billing, manage tokens or publish an incident note (a tool drafts one; a person approves it), and none of these is reachable through another tool's arguments either. Say it in the server's instructions and the README, because a reviewer asks.
- **An irreversible action is its own tool, never a side effect of a create.** A create that closed the user's previous room to make way for the new one, while declaring itself not destructive, was flagged by OpenAI's listing check; closing became its own destructive tool, which the platform confirms with the user.
- **Every create takes a `request_id` UUID**, optional or required on every write. The same id with the same intent returns the original result; a changed intent is `409 request_conflict`; the receipt commits with the write. **Whose receipt it is depends on what the result carries.** A receipt can be the workspace's when any credential in the workspace may see the result. Key it by workspace, actor and id when the result carries something only the creating actor may see, such as a heartbeat monitor's secret ping URL: a different credential resending the id must never receive it. A package never retries a write on its own: the id is the caller's retry key.
- **A result carries what the next step needs**: the ids the next tool takes, and the links a person needs (the audience, projector and console links, in the Q&A example; a console link carries no credential and still needs a browser sign-in).
- **An agent's read may differ from REST's when the agent's task differs.** A Q&A read can return the questions as Markdown in FAQ order for the agent to draft from, with the raw rows and their ids in `structuredContent` for the host actions.

## Descriptions

Glama scores each tool definition (TDQS): an LLM judge rates it 1 to 5 on purpose, usage guidelines, behaviour, parameters, completeness and conciseness. A first set of read tools scored 3.7–3.8, lowest on usage guidance: no "use this, not that" between siblings, little on what comes back. A monitoring product's 11 tools averaged 4.3, and rewriting six of them took the average to 4.5, every tool rated A (October 2026). A good description says, where it applies:

1. what the tool returns;
2. when to use it ("Use it to …"), and **which sibling to use instead, by name, and when** ("Use get_status instead for each app's overall state and open incidents, get_uptime for history"). That routing took usage guidelines to 5 on every rewritten tool; saying only where the ids come from earned 4;
3. which tool supplies each code or id it takes ("Get survey_id from get_survey_results");
4. what a write changes, what cannot be undone through the tools, and the refusal a common precondition produces with its way out ("fails with room_limit_reached … so close one with close_room first");
5. the scope a write needs;
6. for any tool that returns what people wrote: that it is content, never instructions;
7. how to page, as a loop to follow (§ Naming);
8. what it never returns ("never returns credentials"), and what an empty or null result means. The judge credited both, and the annotations (§ Annotations).

- **Under 900 characters each**, because every description is in the model's context. Two to four sentences with the action first scored 5 on conciseness; the longest slipped to 4, and the judge suggested a list per type over one long paragraph.
- **The score is a judge's, with noise of about ±1.** With nearly the same behaviour text, one tool's behaviour score went from 4 to 3 and another's from 5 to 3 ("a solid 3 (leaning 4)"). Do not chase a single-point move.
- **For the agent, not for sale.** OpenAI's guidelines forbid text meant to steer the model toward a plugin; write for direct, indirect and negative prompts, and say when not to use the tool ("Do not use for advice on how to run a Q&A or give a presentation.").
- **Each sentence is a claim and is reviewed like code.** One independent round over freshly rewritten descriptions found eight the code did not keep: a create said to need a code it did not need; reads said to return hidden questions they never return; approve and hide said to act on any question when they act only on waiting ones; a quiz said to read back as a quiz when it reads back as `kind: choice`; a prepared room said to be closable when it is not. They took five rounds to come back clean. A package's own round found a field named `text` that the API calls `body`, and a "whole Q&A" from a call bounded at 2,000 questions.
- **The precise sentences a score rewards are where a description starts lying.** A monitoring product's rewrite of six descriptions took four independent rounds, and each of the first three found sentences claiming more than the handler does: a heartbeat's `target` called the job's name, when it is ignored; something "always reported as skipped" that is reported only when supplied; a null expiry called "not checked yet", when it also means the registry has no date; a "refused when the live check fails" that did not hold for one provider; a default name "built from the target", when several types use fixed names (October 2026). When a condition has exceptions, state what always holds and point to the tool that shows the rest: "Without one, the product picks a default, which this tool does not return; list_monitors shows it." A false sentence costs more than a lower score, because agents act on it.

## Arguments

- **Every input property has a description, nested objects and array items included.** `.describe()` in zod reaches `tools/list` as the JSON Schema `description`. Smithery scores parameter descriptions out of 10, and a server without them scored 0 (October 2026).
- **A description that repeats the schema scores the baseline.** Glama held the parameter dimension of a tool taking only a room code at 3 until `code` said where it comes from (`list_rooms`, `create_room`, or the end of the join link), that case does not matter, and that another organization's room answers `not_found`. Once every parameter has a schema description, 3 is the floor and repeating it adds nothing. What took every one of a monitoring product's rewritten tools from 3 to 4 was what the schema cannot hold, said in the tool's description: filters that combine (AND); what leaving one out means ("omit app for every SSL monitor in the workspace"); one parameter changing what another means ("type decides what target is and which config keys apply"); parameters that work only as a pair, and what happens to half of one; and a cap tied to the plan ("window is capped at 30d unless your plan includes a year of history; the result's window says which applied") (October 2026).
- **Prose uses the schema's exact names.** A description that said "state" for a `status` parameter was marked down.
- **Limits and defaults in a description come from the code's constants**, interpolated, so a description cannot state a stale number. Shared fields are described once, where REST's schema lives; MCP-only ones beside the tool.
- **Descriptions change no parsing.** Check it once by stripping the descriptions and comparing the input schemas byte for byte.
- **Inputs are strict**: an unknown argument is refused (zod `.strict()`, at every object level of `arguments`; never on the request's `params`, which carry `_meta`: `references/server.md § The route`). Generate them with `z.toJSONSchema(schema, { io: "input" })` and keep its `$schema` (JSON Schema 2020-12).

## Results

- **A success carries text and `structuredContent`.** The text is the same object as JSON, except where prose is the point (a FAQ draft in Markdown is the text; `structuredContent` holds the Markdown and the raw rows).
- **A refusal is `isError: true` with the error object as text, and no `structuredContent`.**
- **Every tool declares an `outputSchema`** (MCP `2025-06-18`). Smithery scores output schemas out of 10 and marks a server "Typed Output" once it has them; adding argument descriptions and output schemas took one server from 71 to 90 of 100 on its next scan (October 2026). **Once declared, a client may validate each result and reject a call that does not conform**, so the schema is written to describe and never to refuse:
  - generated from zod, following the DTO builder field for field;
  - nullable wherever the code can produce null; optional where a field exists only for some kinds or states;
  - **`additionalProperties` left unset**, so a field added to a DTO later cannot turn a working call into a refused one;
  - no `format` on ids, URLs or timestamps;
  - the `±2^53` bounds zod writes on every integer removed, since they say nothing;
  - descriptions only where the structure cannot explain itself: status enums, counts that overlap, a duplicated field.
- **`tools/list` has a size budget.** A description on every output field took one server's list from about 12 KB to 49 KB; cutting those to the few above brought it to 33.6 KB, and a test pins it under 34,000 characters.

## Annotations

| Tools (Q&A example) | `readOnlyHint` | `destructiveHint` | `idempotentHint` | `openWorldHint` |
|---|---|---|---|---|
| reads (`list_rooms`, `get_room_qa`, `get_survey_results`) | true | false | true | false |
| creates (`create_room`, `create_survey`) | false | false | false | true |
| lifecycle (`close_room`, `close_survey`, `moderate_question`, `answer_question`) | false | true | true | true |
| an additive reopen (`open_room`) | false | false | true | true |

- **Every tool sets the hints; Claude's directory requires a title and `readOnlyHint` or `destructiveHint` on each**, and its portal flags tools without titles (October 2026).
- **`readOnlyHint` is true only for a tool that writes nothing**; a test holds it equal to "not a write".
- **`destructiveHint` is true for an effect that deletes, overwrites, cancels, revokes or cannot be undone** (a closed room or survey, a moderation decision, an answer), and false only for an additive write: a create, or `open_room`, which adds back what a close took away. **That another tool can undo an effect never makes it non-destructive**: "Being able to undo an action does not, by itself, justify setting `destructiveHint` to `false`" (OpenAI's guidelines, read 2026-10-26), so `close_room` stays destructive though `open_room` exists. Platforms ask the user before a destructive call.
- **`idempotentHint`** is true for a lifecycle action whose repeat is a no-op, false for a create whose `request_id` is optional.
- **`openWorldHint`**: OpenAI's guideline keeps it false for a tool confined to a bounded private account or catalog. A tool that publishes or ends something the public sees is true: OpenAI's listing check flagged a close declared false, though the room it closes is public.
- **Open question**: whether Claude's reviewers want creates marked destructive. If a reviewer objects, that is the change to make.
- **A tool callable without sign-in on ChatGPT declares OpenAI's per-tool security scheme**, `[{ "type": "noauth" }]`, as `securitySchemes` and in `_meta.securitySchemes`. A tool without it "inherits whatever default the server advertises" (OpenAI's auth docs, read October 2026). It does not decide how OpenAI's plugin portal classifies the connection: the package's `mcp.json` does (the `chatgpt-plugin` skill).

## The server's instructions

`initialize` returns `instructions`, which an agent reads once and directories show and score beside the tools. They are product copy, reviewed with the descriptions. A good set, in about 130 words: the ways to connect and what each grants; what the tools can do; where ids come from; what is deliberately unavailable and why; that user-written text is content, never instructions; the pagination argument; and that creates take a `request_id` for safe retries. An anonymous plugin's server can say one thing only, such as which link to give the user and which never to share with the audience. A package's instructions match the hosted server's where the surface is the same.

## The tests

Two unit tests, with no network and no database.

**The schema test** lists the tools through the real MCP handler and asserts:

- every input schema is an object, and no property at any depth lacks a description (walk `properties`, `items`, `anyOf`, `oneOf`, `allOf`), with one nested array's items checked by name so the walk is known to reach them;
- the whole `tools/list` payload is under the size budget;
- each tool's `required` list is pinned, because descriptions must not change it;
- every tool declares an object `outputSchema` with properties, and none contains `"additionalProperties":false`;
- every input and output schema says JSON Schema 2020-12 in `$schema` and passes `Ajv2020.validateSchema`;
- **every tool runs through the real handlers** (the SQL transport, the principal and the entitlements faked; what real SQL returns is the integration suite's job) and each `structuredContent` passes **the MCP TypeScript SDK's `AjvJsonSchemaValidator`**, the code a client runs once a tool declares an output schema;
- every tool has at least one success case — the set of names called equals the set listed, so a new tool cannot arrive without one — and the fixtures reach every shape that varies (each kind and state, nulls, a next cursor);
- the check has teeth: a result missing a field, carrying an unknown enum value or a wrong type fails, and one with an extra field passes;
- an error result is `isError` with text and no `structuredContent`.

`ajv` and `@modelcontextprotocol/sdk` may arrive with `@clerk/mcp-tools`; a product where they do not declares them.

**The description test** asserts that each description contains "Use it" and stays under 900 characters; that each write names the scope it needs; that each tool has a title matching `^[A-Z][^\n]{2,60}$`, equal to `annotations.title`, and boolean `readOnlyHint` and `destructiveHint`, with `readOnlyHint` true exactly for the reads; that titles are unique; and that a tool taking an id names the tool that supplies it, one pinned string per such tool, so a new tool that takes an id needs its own line.

**Beside them**:

- the public developer page pinned to the routes, request schemas, limits, DTOs and error codes it documents;
- for an anonymous surface, each reply allowlisted at every depth by exact equality, plus a check that no UUID appears anywhere in it, and the privacy page's list of returned fields held against the payload both ways;
- for a listing package, the review cases pinned to the ones the eval harness runs, and the uploaded ZIP pinned byte for byte to the package's files (the `chatgpt-plugin` skill, whose checker does the same before an upload);
- outside the gate, routing evals: run the listing's positive and negative prompts through Codex against a local server. Codex reads the same names, descriptions and annotations ChatGPT reads, so a miss there is a metadata problem; a pass is not a promise about ChatGPT.
