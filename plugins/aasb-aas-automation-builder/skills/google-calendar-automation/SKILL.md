---
name: google-calendar-automation
description: Plan and perform authorized Google Calendar workflows through an existing authenticated integration; inspect events, draft changes and verify results.
license: Apache-2.0
metadata:
  author: sanjay3290
  version: '1.0'
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-05'
---

# Google Calendar Automation

## When to Use

- Inspect calendars, schedules and event details through an already configured integration.
- Draft or perform explicitly authorized event creation, edits, cancellations or invitation responses.
- Find possible free slots using only availability the authenticated account may access.

## Prerequisites and limitations

This skill ships instructions only: no OAuth helper, Python client, server or token store is bundled. Discover the available authenticated connector or project-owned Calendar client and inspect its actual tool schema. Do not assume a particular account type, command, authentication flow, notification flag or automatic token refresh. If no integration is configured, provide a draft and explain the missing setup; do not invent commands or fetch a moving external script.

Authenticate through the integration's existing consent flow when separately authorized. Never request or echo passwords, cookies, OAuth secrets or token values in chat. Use the least permissions required. Do not inspect calendars outside the task's scope or copy attendee details into unrelated services.

## Workflow

1. Confirm the account, calendar ID, requested date window, IANA timezone and operation. Resolve ambiguous relative dates and daylight-saving changes before any write.
2. Read the relevant calendars or events with bounded results. Preserve event IDs, recurrence instance IDs and timezone information; distinguish all-day events from timed events.
3. Prepare the proposed title, start/end, description, location, attendees and notification behavior. Use only fields supported by the actual integration.
4. For writes, confirm authorization for the specific change and its notification effects. A request to inspect availability does not authorize creating an event or notifying attendees. Show deletion and recurrence scope before executing a cancellation.
5. Execute the approved operation once. On a timeout, read the event state before retrying so a duplicate is not created. Do not automatically broaden calendar access or fall back to a different account.
6. Read back the resulting event when permitted. Report observed state, event ID, timezone and whether notifications were requested. If the provider cannot establish notification delivery or final state, state that uncertainty.

## Example

User: "Check my work calendar for a 30-minute slot next Tuesday afternoon in Europe/Rome."

Assistant: Resolve Tuesday's date, inspect the explicitly selected calendar's permitted availability, and return candidate slots. Prepare an event draft only if requested. Creating the event, adding attendees or sending invitations requires authorization for that action.

## Limitations

- Availability, scopes, account policy and API capabilities depend on the configured integration.
- Missing availability is unknown, not proof that an attendee is free.
- No bundled runtime or real provider execution is implied by installing this skill.
- Do not create, update, cancel or respond to an event without authorization matching that operation.
