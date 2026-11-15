# Install Locations

## Default paths

| Item type | Default install path                  | Configured by                       |
| --------- | ------------------------------------- | ----------------------------------- |
| Block     | `compositions/<name>.html`            | `hyperframes.json#paths.blocks`     |
| Component | `compositions/components/<name>.html` | `hyperframes.json#paths.components` |

## How path remapping works

The `target` field in each item's `registry-item.json` specifies a default install path. The `add` command remaps the prefix based on `hyperframes.json#paths`:

- Block targets starting with `compositions/` get remapped to `<paths.blocks>/`
- Component targets starting with `compositions/components/` get remapped to `<paths.components>/`

## hyperframes.json

Created automatically by `hyperframes init`. If it doesn't exist when you run `add`, the CLI creates it with defaults:

```json
{
  "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  "paths": {
    "blocks": "compositions",
    "components": "compositions/components",
    "assets": "assets"
  }
}
```

## Custom layouts

To install blocks into a `scenes/` directory instead of `compositions/`:

```json
{
  "paths": {
    "blocks": "scenes"
  }
}
```

Then `hyperframes add data-chart` writes to `scenes/data-chart.html` instead of `compositions/data-chart.html`. The snippet output reflects the remapped path.
