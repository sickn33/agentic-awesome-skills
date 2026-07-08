---
title: Use DBOS Decorators with Classes
impact: MEDIUM
impactDescription: Enables stateful workflow patterns with class instances
tags: classes, dbos_class, instance, oop
---

## Use DBOS Decorators with Classes

DBOS decorators work with class methods. Workflow classes must inherit from `DBOSConfiguredInstance`.

**Incorrect (missing class setup):**

```python
class MyService:
    def __init__(self, url):
        self.url = url

    @DBOS.workflow()  # Won't work without proper setup
    def fetch_data(self):
        return self.fetch()
```

**Correct (proper class setup):**

```python
from dbos import DBOS, DBOSConfiguredInstance

@DBOS.dbos_class()
class URLFetcher(DBOSConfiguredInstance):
    def __init__(self, url: str):
        self.url = url
        # instance_name must be unique and passed to super()
        super().__init__(instance_name=url)

    @DBOS.workflow()
    def fetch_workflow(self):
        return self.fetch_url()

    @DBOS.step()
    def fetch_url(self):
        return requests.get(self.url).text

# Instantiate BEFORE DBOS.launch()
example_fetcher = URLFetcher("https://example.com")
api_fetcher = URLFetcher("https://api.example.com")

if __name__ == "__main__":
    DBOS.launch()
    print(example_fetcher.fetch_workflow())
```

Requirements:
- Class must be decorated with `@DBOS.dbos_class()`
- Class must inherit from `DBOSConfiguredInstance`
- `instance_name` must be unique and passed to `super().__init__()`
- All instances must be created before `DBOS.launch()`

Steps can be added to any class without these requirements.

Reference: [Python Classes](https://docs.dbos.dev/python/tutorials/classes)
