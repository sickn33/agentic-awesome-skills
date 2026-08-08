# Python Actorization

## Install the Apify SDK

```bash
pip install apify
```

## Wrap Main Function with Actor Context Manager

```python
import asyncio
from apify import Actor

async def main() -> None:
    async with Actor:
        # ============================================
        # Your existing code goes here
        # ============================================

        # Example: Get input from Apify Console or API
        actor_input = await Actor.get_input()
        print(f'Input: {actor_input}')

        # Example: Your crawler or processing logic
        # crawler = PlaywrightCrawler(...)
        # await crawler.run([actor_input.get('startUrl')])

        # Example: Push results to dataset
        # await Actor.push_data({'result': 'data'})

        # ============================================
        # End of your code
        # ============================================

if __name__ == '__main__':
    asyncio.run(main())
```

## Key Points

- `async with Actor:` handles both initialization and cleanup
- Automatically manages platform event listeners and graceful shutdown
- Local execution remains unchanged - the SDK automatically detects the environment

## Crawlee Python Projects

```python
import asyncio
from apify import Actor
from crawlee.playwright_crawler import PlaywrightCrawler

async def main() -> None:
    async with Actor:
        # Get and validate input
        actor_input = await Actor.get_input() or {}
        start_url = actor_input.get('startUrl', 'https://example.com')
        max_items = actor_input.get('maxItems', 100)

        item_count = 0

        async def request_handler(context):
            nonlocal item_count
            if item_count >= max_items:
                return

            title = await context.page.title()
            await context.push_data({'url': context.request.url, 'title': title})
            item_count += 1

        crawler = PlaywrightCrawler(request_handler=request_handler)
        await crawler.run([start_url])

if __name__ == '__main__':
    asyncio.run(main())
```

## Batch Processing Scripts

```python
import asyncio
from apify import Actor

async def main() -> None:
    async with Actor:
        actor_input = await Actor.get_input() or {}
        items = actor_input.get('items', [])

        for item in items:
            result = process_item(item)
            await Actor.push_data(result)

if __name__ == '__main__':
    asyncio.run(main())
```
