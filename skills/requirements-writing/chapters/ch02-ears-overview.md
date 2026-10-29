# Chapter 2: EARS — The Easy Approach to Requirements Syntax

## Core Idea
Most requirement ambiguity comes from unconstrained natural language; EARS removes most of it by channelling each requirement into one of a small number of sentence templates, so the structure itself forces the author to state the trigger, the condition, and the response.

## Frameworks Introduced
- **EARS (Easy Approach to Requirements Syntax)**: a lightweight set of natural-language requirement templates, originated by Alistair Mavin and colleagues (Mavin et al., 2009). It keeps requirements readable plain English while constraining their *shape* to remove common ambiguities.
  - When to use: whenever you write or rewrite a behavioural requirement and want it unambiguous without resorting to a formal language.

## Key Concepts
- **Constrained natural language**: ordinary prose limited to a few fixed sentence forms; readable by any stakeholder yet far less ambiguous than free text.
- **The response clause**: the part that always reads "the `<system name>` shall `<response>`" — naming the responsible system and a single observable behaviour.
- **The condition/trigger clause**: the optional preamble (When/While/Where/If) that says *under what circumstances* the response applies.
- **Why a small ruleset helps**: a handful of patterns is easy to learn in an afternoon, easy to review against, and easy to tool — unlike a full controlled-language grammar.

## Mental Models
- **Think of EARS as guard-rails, not a cage.** You still write English; the templates just stop you from omitting the trigger or hiding two requirements in one sentence.
- **Name the system, every time.** EARS forces "the `<system>` shall …", which kills the passive-voice ambiguity of "it shall be possible to …".
- **Pick the pattern from the trigger.** The decision of which EARS form to use is driven entirely by *what causes the behaviour* (always? an event? a state? a feature? an unwanted condition?).

## Anti-patterns
- **Free-form requirement prose**: invites missing triggers, compound statements, and weasel words — the very defects EARS is designed to remove.
- **Forcing everything into one template**: EARS has several patterns precisely because triggers differ; using only "the system shall" loses the event/state distinction.

## Key Takeaways
1. EARS is a *method* (a set of sentence templates), not a tool or a standard — you can adopt it for free, in your own words, today.
2. The value is structural: by mandating a named system and an explicit trigger, EARS eliminates the two most common sources of ambiguity.
3. It is deliberately small — a few patterns learnable in an afternoon — which is why teams actually adopt it.
4. Credit the method to Mavin et al. (2009); the patterns themselves are a technique anyone may apply.

## Connects To
- **The EARS patterns (Ch 3)**: the specific templates and when each applies.
- **Quality characteristics (Ch 1)**: EARS directly improves *unambiguous*, *singular*, and *complete*.
- **Applying EARS (Ch 4)**: worked examples of converting vague requirements into EARS form.
