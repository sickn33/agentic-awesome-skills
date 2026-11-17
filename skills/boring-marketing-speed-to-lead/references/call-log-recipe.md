# Call log recipe: by hand, by script, by API

Load when the script can't read an export, when doing the analysis in a spreadsheet, or when
pulling calls and messages from a phone system's API (directly or through Composio or
Zapier). API details move; the gotchas below are dated.

## The fields you need

Per call: start time, direction (inbound or outbound), status (answered, missed,
voicemail), duration, the customer's number, the business line. Per message: time,
direction, the customer's number. Column names differ by system; the script prints the
columns it picked and takes `--time-col`, `--direction-col`, `--status-col`,
`--duration-col`, `--from-col`, `--to-col`, `--party-col` and `--line-col` overrides.

Watch for these when reading any export:

- **Time zones.** API exports are often in UTC. Convert to local time before splitting
  into business hours (`--utc-offset -6` for Dallas in winter, -5 in summer).
- **Missed vs voicemail.** Some systems log a voicemail as a missed call with a recording,
  some as answered with a duration. Check five rows by hand against what you know happened.
- **Transfers and ring groups** can log one customer call as several rows. Dedupe on
  customer number and start time within a minute.
- **The customer's number** is the "from" on inbound and the "to" on outbound.

## By hand in a spreadsheet

1. Add columns: `date` (the day), `hour`, `weekday`, `in_hours` (TRUE when weekday and
   hour fall inside business hours), `real` (answered and duration of 30 seconds or more).
2. Pivot inbound calls by `in_hours` and status for the answer rates.
3. Pivot missed inbound calls by `weekday` and `hour` for the heat map.
4. For follow-up time: sort by customer number, then time. For each missed inbound call,
   the next outbound call or text to the same number is the follow-up; subtract the times.
   A later answered call from the customer counts as reached, not as a fast follow-up.
5. Callers never reached: numbers with a missed call and no outbound contact or answered
   call within 24 hours.

## What callers ask (optional, when the system keeps summaries or transcripts)

Label each call's ask from its summary (the problem, a status check on a booked job, a
price question, out of area, a service the business doesn't offer). An agent can draft the
labels; spot-check a sample by hand before trusting them. In one month's analysis every spot-checked label held up.
The labels show which calls ads bring, which calls the website should answer instead
(service area, prices, hours), and how many calls are status checks a text could prevent.

## API gotchas (Quo, through Composio, as seen September 2026)

- The Composio Quo toolkit had no tools for call summaries or transcripts. A proxy call to
  Quo's own API worked: `https://api.quo.com/v1/call-summaries/{callId}` and
  `/v1/call-transcripts/{callId}`. The old `api.openphone.com` host was rejected by the
  proxy.
- Listing calls took a **single** participant (a one-item array) plus the phone number ID.
  To pull every call, loop over the customer numbers. Listing messages took
  `participants`. A wrong shape failed validation inside the run with an exception, not a
  clean error.
- **Conversation `updated_after` over-counts.** A status change (marking a conversation
  done, say) updates the conversation, so old conversations come back as new activity.
  Filter on the last activity time instead.
- Pull the raw records into a workspace file first, then analyze. Re-pulling for every
  question is slow and can hit rate limits.

## Calls you can't count with

- **Automatic call classifiers** with thin coverage. In one log a classifier had marked every call in a month "uncertain".
  Check coverage before using any auto label as a count.
- **Raw inbound counts** without the 30-second filter. Spam and misdials can be a large
  share of short calls.
- **Calls from every line.** A tech's personal line or a vendor line distorts the answer
  rate. Use `--line` to keep the lines the public dials.

## Privacy

The log is customer data. Keep exports and the never-reached list in the workspace, out
of version control (add them to `.gitignore`), and delete working copies when the job is
done. Reports carry counts and rates, never numbers or names.
