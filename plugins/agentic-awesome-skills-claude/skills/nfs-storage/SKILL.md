---
name: nfs-storage
description: Configure NFS servers and clients. Implement network file sharing for
  Linux systems. Use when setting up shared storage.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# NFS Storage

Configure NFS servers and clients for network file sharing across Linux systems. Covers NFSv4 server setup, export options, client mounting, autofs for on-demand mounts, Kerberos security, performance tuning, and Kubernetes integration.

## When to Use

- Sharing directories between multiple Linux servers (web farms, build clusters)
- Providing shared storage for containerized workloads (Kubernetes ReadWriteMany)
- Centralizing home directories or application data across a fleet
- Setting up a development environment with shared project files
- Migrating from local storage to network-attached storage

## Prerequisites

- NFS server: `nfs-kernel-server` (Debian/Ubuntu) or `nfs-utils` (RHEL/CentOS)
- NFS client: `nfs-common` (Debian/Ubuntu) or `nfs-utils` (RHEL/CentOS)
- Network connectivity between server and clients (TCP/UDP 2049 for NFSv4)
- Firewall rules allowing NFS traffic
- For NFSv4 Kerberos: `krb5-user` and a functioning KDC

## NFS Server Setup

### Installation

```bash
# Debian / Ubuntu
apt update && apt install -y nfs-kernel-server

# RHEL / CentOS
dnf install -y nfs-utils

# Enable and start the NFS server
systemctl enable --now nfs-server

# Verify NFS is running
systemctl status nfs-server
rpcinfo -p | grep nfs
```

### Export Configuration (/etc/exports)

```bash
# /etc/exports
# Syntax: <directory> <client-spec>(options)

# Share /data to a specific subnet with read-write access
/data 10.0.0.0/24(rw,sync,no_subtree_check,no_root_squash)

# Share /shared read-only to everyone
/shared *(ro,sync,no_subtree_check)

# Share /home to specific hosts
/home server01.example.com(rw,sync,no_subtree_check)
/home server02.example.com(rw,sync,no_subtree_check)

# Share /var/nfs/projects with root squash (default, map root to nobody)
/var/nfs/projects 10.0.0.0/24(rw,sync,no_subtree_check,root_squash)

# NFSv4 pseudo-root export (recommended for NFSv4)
/srv/nfs 10.0.0.0/24(rw,sync,fsid=0,crossmnt,no_subtree_check)
/srv/nfs/data 10.0.0.0/24(rw,sync,no_subtree_check,no_root_squash)
/srv/nfs/shared 10.0.0.0/24(ro,sync,no_subtree_check)
```

### Export Options Explained

| Option | Description |
|---|---|
| `rw` | Read-write access |
| `ro` | Read-only access |
| `sync` | Write data to disk before replying (safe, slower) |
| `async` | Reply before data is written to disk (fast, risk of corruption) |
| `no_subtree_check` | Disable subtree checking (improves reliability) |
| `root_squash` | Map remote root (UID 0) to `nobody` (default, more secure) |
| `no_root_squash` | Allow remote root to act as root on the server (use cautiously) |
| `all_squash` | Map all remote UIDs/GIDs to `nobody` |
| `anonuid=1000` | Map anonymous users to a specific UID |
| `anongid=1000` | Map anonymous groups to a specific GID |
| `crossmnt` | Allow clients to traverse into sub-mounts |
| `fsid=0` | Mark as the NFSv4 pseudo-root |

### Applying Export Changes

```bash
# Apply changes to exports (no server restart needed)
exportfs -ra

# Show current exports
exportfs -v

# Export a new directory on the fly (temporary, not persistent)
exportfs -o rw,sync,no_subtree_check 10.0.0.0/24:/tmp/share

# Unexport a directory
exportfs -u 10.0.0.0/24:/tmp/share
```

### Server Firewall Configuration

```bash
# UFW (Ubuntu)
ufw allow from 10.0.0.0/24 to any port nfs
ufw allow from 10.0.0.0/24 to any port 111   # rpcbind (NFSv3)

# firewalld (RHEL/CentOS)
firewall-cmd --permanent --add-service=nfs
firewall-cmd --permanent --add-service=rpc-bind
firewall-cmd --permanent --add-service=mountd
firewall-cmd --reload

# NFSv4 only needs TCP 2049 (no rpcbind or mountd)
firewall-cmd --permanent --add-port=2049/tcp
firewall-cmd --reload
```

## NFS Client Configuration

### Manual Mounting

```bash
# Install NFS client
apt install -y nfs-common        # Debian/Ubuntu
dnf install -y nfs-utils         # RHEL/CentOS

# Discover exports from the server
showmount -e nfs-server.example.com

# Mount an NFS share manually
mkdir -p /mnt/data
mount -t nfs nfs-server.example.com:/data /mnt/data

# Mount with specific NFS version and options
mount -t nfs -o vers=4.2,tcp,hard,intr nfs-server.example.com:/data /mnt/data

# Verify the mount
mount | grep nfs
df -hT /mnt/data

# Unmount
umount /mnt/data
```

### Persistent Mounts via /etc/fstab

```bash
# /etc/fstab entries for NFS

# Basic NFSv4 mount
nfs-server.example.com:/data  /mnt/data  nfs4  defaults,_netdev  0  0

# Mount with performance and reliability options
nfs-server.example.com:/data  /mnt/data  nfs4  hard,intr,rsize=1048576,wsize=1048576,timeo=600,retrans=3,_netdev  0  0

# Read-only mount
nfs-server.example.com:/shared  /mnt/shared  nfs4  ro,_netdev  0  0

# Mount with specific UID/GID mapping (useful for containers)
nfs-server.example.com:/data  /mnt/data  nfs4  defaults,_netdev,uid=1000,gid=1000  0  0
```

```bash
# Mount all fstab entries
mount -a

# Test fstab entry without actually mounting
mount --fake -a -v
```

### Mount Options Explained

| Option | Description |
|---|---|
| `hard` | Retry NFS requests indefinitely (recommended for data integrity) |
| `soft` | Return error after `retrans` retries (risk of data corruption) |
| `intr` | Allow interruption of hard-mounted NFS requests |
| `rsize=1048576` | Read buffer size in bytes (1 MB, max for NFSv4) |
| `wsize=1048576` | Write buffer size in bytes (1 MB) |
| `timeo=600` | Timeout in tenths of a second (60 seconds) |
| `retrans=3` | Number of retries before error (soft) or message (hard) |
| `_netdev` | Wait for network before mounting (critical for boot) |
| `noatime` | Do not update access time (improves performance) |
| `nconnect=8` | Use multiple TCP connections (kernel 5.3+, improves throughput) |

## Autofs (On-Demand Mounting)

```bash
# Install autofs
apt install -y autofs        # Debian/Ubuntu
dnf install -y autofs        # RHEL/CentOS

# Configure the master map
# /etc/auto.master or /etc/auto.master.d/nfs.autofs
/mnt/nfs  /etc/auto.nfs  --timeout=300
```

### /etc/auto.nfs

```text
# Format: mount-point  options  location
# Mounts will appear under /mnt/nfs/<mount-point>

data    -rw,hard,intr,rsize=1048576,wsize=1048576    nfs-server.example.com:/data
shared  -ro,hard,intr                                  nfs-server.example.com:/shared
home    -rw,hard,intr                                  nfs-server.example.com:/home/&

# Wildcard: mount any subdirectory from the server automatically
# /etc/auto.master entry:  /mnt/nfs  /etc/auto.nfs
*       -rw,hard,intr    nfs-server.example.com:/srv/nfs/&
```

```bash
# Enable and start autofs
systemctl enable --now autofs

# Test: simply cd into the mount point and it appears
ls /mnt/nfs/data    # Triggers auto-mount
# The share unmounts automatically after the timeout (300 seconds idle)

# Check autofs status
systemctl status autofs
automount -v    # Verbose debugging mode (foreground)
```

## Performance Tuning

### Server-Side Tuning

```bash
# Increase the number of NFS daemon threads (default is 8)
# /etc/default/nfs-kernel-server (Debian) or /etc/sysconfig/nfs (RHEL)
RPCNFSDCOUNT=32

# Or set at runtime
echo 32 > /proc/fs/nfsd/threads

# Restart NFS to apply
systemctl restart nfs-server

# Tune NFS server read/write sizes in sysctl
# These are auto-negotiated but can be adjusted
echo 1048576 > /proc/fs/nfsd/max_block_size

# Kernel network buffer tuning (see performance-tuning skill)
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
```

### Client-Side Tuning

```bash
# Use large read/write buffer sizes in mount options
mount -t nfs4 -o rsize=1048576,wsize=1048576,noatime nfs-server:/data /mnt/data

# Use multiple TCP connections (Linux kernel 5.3+)
mount -t nfs4 -o nconnect=8 nfs-server:/data /mnt/data

# Check current mount options and NFS statistics
nfsstat -c                    # Client NFS statistics
nfsstat -s                    # Server NFS statistics
mountstats /mnt/data          # Detailed per-mount stats

# Test NFS throughput with dd
dd if=/dev/zero of=/mnt/data/testfile bs=1M count=1024 oflag=direct
dd if=/mnt/data/testfile of=/dev/null bs=1M iflag=direct
rm /mnt/data/testfile

# Test with fio for more realistic workloads
fio --name=nfs-test --directory=/mnt/data --ioengine=libaio --direct=1 \
  --rw=randrw --bs=4k --numjobs=4 --size=1G --runtime=60 --group_reporting
```

## Kubernetes NFS Integration

```yaml
# nfs-pv.yaml -- Static PersistentVolume
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    server: nfs-server.example.com
    path: /data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs
  resources:
    requests:
      storage: 100Gi
```

```bash
# For dynamic provisioning, install the NFS CSI driver via Helm
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs --namespace kube-system
# Then create a StorageClass pointing to your NFS server and share path.
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| mount: access denied | `showmount -e server`, `exportfs -v` | Check /etc/exports, run `exportfs -ra`, verify subnet |
| mount hangs | `mount -v`, check network | Verify firewall allows TCP 2049; use `bg` mount option |
| Stale file handle | `ls /mnt/data` returns stale error | Unmount and remount: `umount -f /mnt/data && mount -a` |
| Permission denied on files | `ls -la`, check UID mapping | Match UIDs or use `all_squash,anonuid=1000,anongid=1000` |
| Slow NFS performance | `nfsstat -c`, `mountstats /mnt/data` | Increase rsize/wsize, add nconnect=8, tune NFS threads |
| Autofs not mounting | `systemctl status autofs`, `automount -v` | Check /etc/auto.master syntax, verify server is reachable |
| NFSv4 ID mapping wrong | `id username` on both sides | Ensure matching domain in `/etc/idmapd.conf` |
| Boot hangs waiting for NFS | Check fstab options | Add `_netdev` and `bg` options to fstab entry |
| Docker volume mount fails | `docker volume inspect`, `dmesg` | Verify NFS client packages installed on Docker host |

## Related Skills

- `linux-administration` -- Server setup and network configuration
- `block-storage` -- Underlying storage for NFS server data directories
- `performance-tuning` -- Kernel and network tuning for NFS throughput
- `backup-recovery` -- Backing up NFS-hosted data
- `object-storage` -- Alternative storage model for cloud-native workloads

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

