# Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all five questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** an uptime check running on the same server as the site.
  **Solution:** monitor from outside, ideally from a different provider or region. A
  self-hosted check cannot observe its own failure.
- **Problem:** monitoring the server, not the booking.
  **Solution:** add a synthetic check that completes a real transaction end to end. That is
  the signal that matches the business loss.
- **Problem:** twenty alerts, none read.
  **Solution:** three signals, `Critical` only for waking someone, and a quarterly review
  that deletes anything no human acted on. Alert fatigue is not a tooling problem.
- **Problem:** an SLO of 99.99% on a business that has never measured above 98%.
  **Solution:** measure the baseline, then set a target you can hold. A permanently firing
  alert is a target that has already failed.
- **Problem:** an alert with no runbook, discovered at 3am.
  **Solution:** blank `Runbook URL` blocks going live. Write the runbook first, and rehearse
  it while the site is up.
- **Problem:** the whole stack arrived at once and nothing is maintained after month two.
  **Solution:** phase it. Phase 2 only when phase 1 is being read and acted on.
- **Problem:** logs shipped to a third party, including personal data and card fragments.
  **Solution:** decide what may leave the business before the agent is installed, not after.
  Scrub at source.
- **Problem:** December arrived and the plan had never been tested under load.
  **Solution:** test in November. A peak season is the one time a monitoring plan must
  already be proven.
- **Problem:** a service with no named owner.
  **Solution:** assign one. An unowned service is unmonitored regardless of its dashboards.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.


See the [Related Skills](references/related-skills.md) reference for the full guidance.
