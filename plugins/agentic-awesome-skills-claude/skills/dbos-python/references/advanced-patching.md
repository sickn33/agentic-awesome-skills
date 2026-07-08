---
title: Use Patching for Safe Workflow Upgrades
impact: LOW
impactDescription: Deploy breaking changes without disrupting in-progress workflows
tags: patching, upgrade, versioning, migration
---

## Use Patching for Safe Workflow Upgrades

Use `DBOS.patch()` to safely deploy breaking workflow changes. Breaking changes alter what steps run or their order.

**Incorrect (breaking change without patch):**

```python
# Original
@DBOS.workflow()
def workflow():
    foo()
    bar()

# Updated - breaks in-progress workflows!
@DBOS.workflow()
def workflow():
    baz()  # Replaced foo() - checkpoints don't match
    bar()
```

**Correct (using patch):**

```python
# Enable patching in config
config: DBOSConfig = {
    "name": "my-app",
    "enable_patching": True,
}
DBOS(config=config)

@DBOS.workflow()
def workflow():
    if DBOS.patch("use-baz"):
        baz()  # New workflows use baz
    else:
        foo()  # Old workflows continue with foo
    bar()
```

Deprecating patches after all old workflows complete:

```python
# Step 1: Deprecate (runs all workflows, stops inserting marker)
@DBOS.workflow()
def workflow():
    DBOS.deprecate_patch("use-baz")
    baz()
    bar()

# Step 2: Remove entirely (after all deprecated workflows complete)
@DBOS.workflow()
def workflow():
    baz()
    bar()
```

`DBOS.patch(name)` returns:
- `True` for new workflows (started after patch deployed)
- `False` for old workflows (started before patch deployed)

Reference: [Patching](https://docs.dbos.dev/python/tutorials/upgrading-workflows#patching)
