# Key-Value Store Schema Reference

The key-value store schema organizes keys into logical groups called collections for easier data management.

## Examples

### JavaScript and TypeScript

Consider an example Actor that calls `Actor.setValue()` to save records into the key-value store:

```javascript
import { Actor } from 'apify';
// Initialize the JavaScript SDK
await Actor.init();

/**
 * Actor code
 */
await Actor.setValue('document-1', 'my text data', { contentType: 'text/plain' });

await Actor.setValue(`image-${imageID}`, imageBuffer, { contentType: 'image/jpeg' });

// Exit successfully
await Actor.exit();
```

### Python

Consider an example Actor that calls `Actor.set_value()` to save records into the key-value store:

```python
# Key-Value Store set example (Python)
import asyncio
from apify import Actor

async def main():
    await Actor.init()

    # Actor code
    await Actor.set_value('document-1', 'my text data', content_type='text/plain')

    image_id = '123'          # example placeholder
    image_buffer = b'...'     # bytes buffer with image data
    await Actor.set_value(f'image-{image_id}', image_buffer, content_type='image/jpeg')

    # Exit successfully
    await Actor.exit()

if __name__ == '__main__':
    asyncio.run(main())
```

## Configuration

To configure the key-value store schema, reference a schema file in `.actor/actor.json`:

```json
{
    "actorSpecification": 1,
    "name": "data-collector",
    "title": "Data Collector",
    "version": "1.0.0",
    "storages": {
        "keyValueStore": "./key_value_store_schema.json"
    }
}
```

Then create the key-value store schema in `.actor/key_value_store_schema.json`:

```json
{
    "actorKeyValueStoreSchemaVersion": 1,
    "title": "Key-Value Store Schema",
    "collections": {
        "documents": {
            "title": "Documents",
            "description": "Text documents stored by the Actor",
            "keyPrefix": "document-"
        },
        "images": {
            "title": "Images",
            "description": "Images stored by the Actor",
            "keyPrefix": "image-",
            "contentTypes": ["image/jpeg"]
        }
    }
}
```

## Structure

```json
{
    "actorKeyValueStoreSchemaVersion": 1,
    "title": "string (required)",
    "description": "string (optional)",
    "collections": {
        "<COLLECTION_NAME>": {
            "title": "string (required)",
            "description": "string (optional)",
            "key": "string (conditional - use key OR keyPrefix)",
            "keyPrefix": "string (conditional - use key OR keyPrefix)",
            "contentTypes": ["string (optional)"],
            "jsonSchema": "object (optional)"
        }
    }
}
```

## Properties

### Key-Value Store Schema Properties

- `actorKeyValueStoreSchemaVersion` (integer, required) - Version of key-value store schema structure document (currently only version 1)
- `title` (string, required) - Title of the schema
- `description` (string, optional) - Description of the schema
- `collections` (Object, required) - Object where each key is a collection ID and value is a Collection object

### Collection Properties

- `title` (string, required) - Collection title shown in UI tabs
- `description` (string, optional) - Description appearing in UI tooltips
- `key` (string, conditional) - Single specific key for this collection
- `keyPrefix` (string, conditional) - Prefix for keys included in this collection
- `contentTypes` (string[], optional) - Allowed content types for validation
- `jsonSchema` (object, optional) - JSON Schema Draft 07 format for `application/json` content type validation

Either `key` or `keyPrefix` must be specified for each collection, but not both.
