# Technical checks for town and service pages

Load before /boring-marketing-service-area-pages Phase 5. Each check comes with the command or tool that settles it, because these are facts from the page, never guesses. Run them only against real URLs the user gave or the site's own pages, never a placeholder domain, and keep the results in `notes.md`.

## Markup (JSON-LD)

- **One business entity.** Publish one LocalBusiness (or the trade's subtype, such as Plumber) for the real business, ideally on the homepage or contact page, with the real name, phone, URL and the address only if the business shows it publicly. Town pages describe where the business works with `areaServed`, on a `Service` or by referencing that one entity. Never a separate LocalBusiness per town with an invented address or empty coordinates.
- **No star ratings in your own markup.** Google doesn't show review stars for a business's reviews of itself, and a rating typed into a template goes stale the day it ships.
- **Markup only repeats what the page shows.** Prices, hours, ratings, services and questions in JSON-LD must appear on the visible page and be true.
- **FAQ markup** only mirrors questions that are visibly on the page. It earns no rich result anymore. Its remaining value is that machines can read the question and answer cleanly.
- **Validate** with the Schema Markup Validator (validator.schema.org) or Google's Rich Results Test, and read the page source to confirm what actually shipped.

What these rules prevent, from one audit of a service-area business's site (anonymized):
- FAQ markup carried a price range the business didn't actually charge.
- Every page carried a hardcoded perfect rating in its markup.
- The site declared a separate LocalBusiness entity per town, many with blank coordinates and addresses the business didn't have.

## Titles and headings

- Title: service, town, business name, once each. For the sample business: "Water Heater Repair in Garland, TX | Hartline Plumbing".
- H1: the same idea in plain words. One H1.
- No town lists in titles, headings or footers.

## Images

- Sized for phones and served in a modern format. Check weight: `curl -sI <image-url> | grep -i content-length`.
- One audit found a multi-megabyte hero image on the page template while a small version of the same image sat unused on the server.
- Real job photos over stock. Alt text describes the photo, not a keyword list.

## Redirects

- Every retired or renamed URL answers with one 301 to a page that returns 200: `curl -sIL <old-url> | grep -iE "^(HTTP|location)"`.
- Watch trailing-slash rules. In one audit, several old URLs redirected with a 308 to addresses that returned 404, because the redirect rule and the site's slash setting disagreed.
- After retiring pages, update internal links and the sitemap so nothing points at a redirect.

## One page per query

- Search Console, Performance, filter the query (for example "water heater repair garland"), then the Pages tab. More than one page with impressions means they compete. Pick the owner page, link the others to it, and stop the homepage targeting town queries that have a town page.

## Canonicals and indexing

- Each town page canonicals to itself. Never canonical all town pages to the hub; that tells Google they are duplicates.
- New pages go in the sitemap. Check indexing in Search Console's URL Inspection before adding the next batch.
