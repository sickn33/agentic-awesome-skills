# Chapter 3: The EARS Patterns

## Core Idea
EARS provides a small set of sentence templates; you choose one by asking what *triggers* the behaviour. Every pattern ends in the same response clause — "the `<system>` shall `<response>`" — and differs only in the preamble that sets the condition.

## Frameworks Introduced
- **Ubiquitous**: an always-active requirement with no trigger. Form: *The `<system>` shall `<response>`.*
  - When to use: a property that holds at all times (a standing capability, a continuous constraint).
- **Event-driven** (keyword **When**): triggered by a discrete event. Form: *When `<trigger>`, the `<system>` shall `<response>`.*
  - When to use: a behaviour that fires in response to something happening.
- **State-driven** (keyword **While**): active throughout a state. Form: *While `<in-state>`, the `<system>` shall `<response>`.*
  - When to use: a behaviour that persists as long as the system is in a particular mode/state.
- **Optional-feature** (keyword **Where**): applies only if a feature is present. Form: *Where `<feature is included>`, the `<system>` shall `<response>`.*
  - When to use: product-line or configurable requirements that apply only to certain variants.
- **Unwanted-behaviour** (keyword **If/Then**): handles error or undesired conditions. Form: *If `<unwanted condition>`, then the `<system>` shall `<response>`.*
  - When to use: faults, exceptions, out-of-range inputs, and safety responses.
- **Complex**: combinations of the above (e.g. While + When) for richer conditions, built by composing the keywords.
  - When to use: a behaviour gated by both a state and an event; keep it readable or split it.

## Key Concepts
- **Trigger**: the event, state, feature, or condition that determines which pattern fits.
- **Response**: the single observable action the named system must take.
- **Keyword discipline**: the leading word (When/While/Where/If) signals the pattern to every reader and to tooling.

## Mental Models
- **Pattern follows trigger.** Always → Ubiquitous; an event → When; a mode → While; a variant → Where; a fault → If/Then.
- **One response per requirement.** If the response clause contains "and", you probably have two requirements — split them.

## Worked Example
The same need, written in each relevant pattern (original examples):
- *Ubiquitous:* "The pump controller shall maintain outlet pressure within ±0.2 bar of the setpoint."
- *Event-driven:* "When the operator presses Start, the pump controller shall ramp the motor to the target speed within 3 seconds."
- *State-driven:* "While in Maintenance mode, the pump controller shall inhibit motor commands."
- *Optional-feature:* "Where the remote-telemetry option is installed, the pump controller shall publish outlet pressure once per second."
- *Unwanted-behaviour:* "If outlet pressure exceeds 8 bar, then the pump controller shall stop the motor."
- *Unwanted-behaviour:* "If outlet pressure exceeds 8 bar, then the pump controller shall raise an over-pressure alarm."
- *Complex (While + When):* "While the controller is in Maintenance mode, when the outlet pressure exceeds 8 bar, the pump controller shall activate the over-pressure warning light."

## Key Takeaways
1. Choose the pattern from the trigger; the response clause is identical across all of them.
2. The keyword (When/While/Where/If) is a signal — keep it at the front so reviewers and tools can classify the requirement instantly.
3. Use Unwanted-behaviour (If/Then) deliberately for faults and safety — these are the requirements most often forgotten in free-form prose.
4. Keep Complex requirements rare and readable; if a combined condition gets long, split it.

## Connects To
- **Applying EARS (Ch 4)**: how to pick a pattern and convert existing requirements.
- **Defects & anti-patterns (Ch 5)**: how EARS prevents compound and trigger-less requirements.
- **MIL-STD-882 / NASA safety (`mil-std-882`, `nasa-system-safety`)**: the Unwanted-behaviour pattern is the natural home for safety and hazard responses.
