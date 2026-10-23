# Details (moved from SKILL.md)

> Extended reference content for `asset-inventory`, kept under `references/` so the entrypoint stays within the audit budget.

## CMDB Integration

The adapter assumes a reviewed operator-owned CMDB origin and API contract.
Use dry-run/diff approval before writes, server-side upsert/idempotency and ETag
conflict handling for concurrent syncs. The collection format below is illustrative;
map every required schema field and distinguish stopped from retired. Never mark
assets deleted solely because one scan lacked permissions or visibility.


```python
"""
CMDB sync script - Normalize cloud assets and push to CMDB API.
"""
import json
import requests
from urllib.parse import quote, urlsplit
from datetime import datetime, timezone


class CMDBSync:
    def __init__(self, cmdb_url, api_token):
        if urlsplit(cmdb_url).scheme != "https":
            raise ValueError("Approved HTTPS CMDB origin required")
        self.cmdb_url = cmdb_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

    def normalize_aws_instance(self, instance, account_id, region):
        """Convert AWS EC2 instance to common asset schema."""
        tags = {t["Key"]: t["Value"] for t in (instance.get("Tags") or [])}
        return {
            "asset_id": f"aws:{account_id}:{region}:{instance['InstanceId']}",
            "name": instance.get("Name", tags.get("Name", instance["InstanceId"])),
            "type": "compute",
            "provider": "aws",
            "region": region,
            "account_or_subscription": account_id,
            "configuration": {
                "instance_type": instance.get("Type"),
                "state": instance.get("State"),
                "vpc_id": instance.get("VpcId"),
            },
            "owner": instance.get("Owner", tags.get("Owner", "unassigned")),
            "environment": instance.get("Environment", tags.get("Environment", "unknown")),
            "data_classification": tags.get("DataClassification", "unknown"),
            "status": "active" if instance.get("State") == "running" else "stopped",
            "last_seen": datetime.now(timezone.utc).isoformat(),
        }

    def sync_assets(self, assets):
        """Push normalized assets to CMDB."""
        results = {"created": 0, "updated": 0, "errors": 0}
        for asset in assets:
            try:
                resp = requests.get(
                    f"{self.cmdb_url}/assets/{quote(asset['asset_id'], safe='')}",
                    headers=self.headers, timeout=30, allow_redirects=False,
                )
                if resp.status_code == 200:
                    written = requests.put(
                        f"{self.cmdb_url}/assets/{quote(asset['asset_id'], safe='')}",
                        headers=self.headers, timeout=30, allow_redirects=False,
                        json=asset,
                    )
                    written.raise_for_status()
                    if not 200 <= written.status_code < 300: raise ValueError("Unexpected write status")
                    results["updated"] += 1
                elif resp.status_code == 404:
                    written = requests.post(
                        f"{self.cmdb_url}/assets",
                        headers=self.headers, timeout=30, allow_redirects=False,
                        json=asset,
                    )
                    written.raise_for_status()
                    if not 200 <= written.status_code < 300: raise ValueError("Unexpected write status")
                    results["created"] += 1
                else:
                    raise ValueError("CMDB lookup failed; refusing create")
            except Exception:
                results["errors"] += 1
        return results
```


## Asset Inventory Checklist

```yaml
asset_inventory_checklist:
  discovery:
    - [ ] Automated discovery scripts running for all cloud accounts
    - [ ] Discovery covers all resource types (compute, storage, network, IAM)
    - [ ] Multi-region discovery enabled
    - [ ] On-premise assets cataloged
    - [ ] SaaS subscriptions inventoried
    - [ ] Discovery runs daily (minimum weekly)

  classification:
    - [ ] Required tags defined (Owner, Environment, DataClassification, CostCenter)
    - [ ] Tag enforcement via AWS Organizations tag policies
    - [ ] Tag enforcement via Terraform default_tags
    - [ ] Tag enforcement via CI/CD policy checks (Checkov, OPA)
    - [ ] Untagged resource reports generated and tracked

  configuration_management:
    - [ ] AWS Config enabled in all regions
    - [ ] Config rules enforce encryption, tagging, and security baselines
    - [ ] Configuration compliance summary reviewed weekly
    - [ ] Drift detection enabled for IaC-managed resources

  cmdb:
    - [ ] CMDB sync automated from cloud discovery
    - [ ] Common schema defined across all providers
    - [ ] Reconciliation process identifies orphaned records
    - [ ] New resources auto-assigned default owner
    - [ ] Asset lifecycle tracked (created, active, decommissioning, retired)

  governance:
    - [ ] Asset owners assigned and current
    - [ ] Quarterly inventory reconciliation conducted
    - [ ] Compliance scope tagging accurate (SOC2, HIPAA, PCI)
    - [ ] Asset inventory available for auditor review
    - [ ] Decommissioned assets tracked for data retention compliance
```


## Best Practices

- Automate discovery rather than relying on manual inventory: cloud environments change too fast for spreadsheets
- Use AWS Config, Azure Resource Graph, and GCP Cloud Asset Inventory as authoritative data sources
- Enforce tagging at provisioning time through IaC defaults and policy-as-code guardrails
- Assign every asset an owner: unowned resources become security and cost liabilities
- Reconcile inventory regularly and investigate orphaned assets (CMDB record with no real resource and vice versa)
- Track data classification as a mandatory tag to support compliance scoping decisions
- Maintain asset lifecycle states to distinguish active resources from those being decommissioned
- Integrate asset inventory with incident response to quickly identify affected systems during investigations
- Export inventory data for compliance audits in accessible formats (CSV, JSON)
- Review untagged and unclassified resource reports weekly to maintain inventory quality

