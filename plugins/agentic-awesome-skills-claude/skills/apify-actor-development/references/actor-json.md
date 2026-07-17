# Actor Configuration (actor.json)

The `.actor/actor.json` file contains the Actor's configuration including metadata, schema references, and platform settings.

## Structure

```json
{
    "actorSpecification": 1,
    "name": "project-name",
    "title": "Project Title",
    "description": "Actor description",
    "version": "0.0",
    "meta": {
        "templateId": "template-id"
    },
    "input": "./input_schema.json",
    "output": "./output_schema.json",
    "storages": {
        "dataset": "./dataset_schema.json"
    },
    "dockerfile": "../Dockerfile"
}
```

## Example

```json
{
    "actorSpecification": 1,
    "name": "project-cheerio-crawler-javascript",
    "title": "Project Cheerio Crawler Javascript",
    "description": "Crawlee and Cheerio project in javascript.",
    "version": "0.0",
    "meta": {
        "templateId": "js-crawlee-cheerio"
    },
    "input": "./input_schema.json",
    "output": "./output_schema.json",
    "storages": {
        "dataset": "./dataset_schema.json"
    },
    "dockerfile": "../Dockerfile"
}
```

## Properties

- `actorSpecification` (integer, required) - Version of actor specification (currently 1)
- `name` (string, required) - Actor identifier (lowercase, hyphens allowed)
- `title` (string, required) - Human-readable title displayed in UI
- `description` (string, optional) - Actor description for marketplace
- `version` (string, required) - Semantic version number
- `meta` (object, optional) - Actor metadata
  - `templateId` (string) - ID of template used to create the actor
- `input` (string, optional) - Path to input schema file
- `output` (string, optional) - Path to output schema file
- `storages` (object, optional) - Storage schema references
  - `dataset` (string) - Path to dataset schema file
  - `keyValueStore` (string) - Path to key-value store schema file
- `dockerfile` (string, optional) - Path to Dockerfile

The current Actor definition documents `templateId` as the supported `meta` field. Do not add undocumented metadata keys unless Apify's specification explicitly supports them.
