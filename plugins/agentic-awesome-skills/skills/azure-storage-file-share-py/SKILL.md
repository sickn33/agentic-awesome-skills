---
name: azure-storage-file-share-py
description: Azure Storage File Share SDK for Python. Use for SMB file shares, directories, and file operations in the cloud.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Storage File Share SDK for Python

Manage SMB file shares for cloud-native and lift-and-shift scenarios.

## Installation

```bash
pip install azure-storage-file-share
```

## Environment Variables

```bash
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...
# Or
AZURE_STORAGE_ACCOUNT_URL=https://<account>.file.core.windows.net
```

## Authentication

### Connection String

```python
from azure.storage.fileshare import ShareServiceClient

service = ShareServiceClient.from_connection_string(
    os.environ["AZURE_STORAGE_CONNECTION_STRING"]
)
```

### Entra ID

```python
from azure.storage.fileshare import ShareServiceClient
from azure.identity import DefaultAzureCredential

service = ShareServiceClient(
    account_url=os.environ["AZURE_STORAGE_ACCOUNT_URL"],
    credential=DefaultAzureCredential()
)
```

## Share Operations

### Create Share

```python
share = service.create_share("my-share")
```

### List Shares

```python
for share in service.list_shares():
    print(f"{share.name}: {share.quota} GB")
```

### Get Share Client

```python
share_client = service.get_share_client("my-share")
```

### Delete Share

```python
service.delete_share("my-share")
```

## Directory Operations

### Create Directory

```python
share_client = service.get_share_client("my-share")
share_client.create_directory("my-directory")

# Nested directory
share_client.create_directory("my-directory/sub-directory")
```

### List Directories and Files

```python
directory_client = share_client.get_directory_client("my-directory")

for item in directory_client.list_directories_and_files():
    if item["is_directory"]:
        print(f"[DIR] {item['name']}")
    else:
        print(f"[FILE] {item['name']} ({item['size']} bytes)")
```

### Delete Directory

```python
share_client.delete_directory("my-directory")
```

## File Operations

### Upload File

```python
file_client = share_client.get_file_client("my-directory/file.txt")

# From string
file_client.upload_file("Hello, World!")

# From file
with open("local-file.txt", "rb") as f:
    file_client.upload_file(f)

# From bytes
file_client.upload_file(b"Binary content")
```

### Download File

```python
file_client = share_client.get_file_client("my-directory/file.txt")

# To bytes
data = file_client.download_file().readall()

# To file
with open("downloaded.txt", "wb") as f:
    data = file_client.download_file()
    data.readinto(f)

# Stream chunks
download = file_client.download_file()
for chunk in download.chunks():
    process(chunk)
```

### Get File Properties

```python
properties = file_client.get_file_properties()
print(f"Size: {properties.size}")
print(f"Content type: {properties.content_settings.content_type}")
print(f"Last modified: {properties.last_modified}")
```

### Delete File

```python
file_client.delete_file()
```

### Copy File

```python
source_url = "https://account.file.core.windows.net/share/source.txt"
dest_client = share_client.get_file_client("destination.txt")
dest_client.start_copy_from_url(source_url)
```

## Range Operations

### Upload Range

```python
# Upload to specific range
file_client.upload_range(data=b"content", offset=0, length=7)
```

### Download Range

```python
# Download specific range
download = file_client.download_file(offset=0, length=100)
data = download.readall()
```

## Snapshot Operations

### Create Snapshot

```python
snapshot = share_client.create_snapshot()
print(f"Snapshot: {snapshot['snapshot']}")
```

### Access Snapshot

```python
snapshot_client = service.get_share_client(
    "my-share",
    snapshot=snapshot["snapshot"]
)
```

## Async Client

```python
from azure.storage.fileshare.aio import ShareServiceClient
from azure.identity.aio import DefaultAzureCredential

async def upload_file():
    credential = DefaultAzureCredential()
    service = ShareServiceClient(account_url, credential=credential)
    
    share = service.get_share_client("my-share")
    file_client = share.get_file_client("test.txt")
    
    await file_client.upload_file("Hello!")
    
    await service.close()
    await credential.close()
```

## Client Types

| Client | Purpose |
|--------|---------|
| `ShareServiceClient` | Account-level operations |
| `ShareClient` | Share operations |
| `ShareDirectoryClient` | Directory operations |
| `ShareFileClient` | File operations |

## Best Practices

1. **Use connection string** for simplest setup
2. **Use Entra ID** for production with RBAC
3. **Stream large files** using chunks() to avoid memory issues
4. **Create snapshots** before major changes
5. **Set quotas** to prevent unexpected storage costs
6. **Use ranges** for partial file updates
7. **Close async clients** explicitly

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
