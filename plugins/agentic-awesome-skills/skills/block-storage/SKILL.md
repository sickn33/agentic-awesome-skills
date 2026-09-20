---
name: block-storage
description: Manage block storage volumes and LVM. Configure cloud block storage and
  local disks. Use when managing disk storage.
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

# Block Storage

Manage block storage volumes including LVM, cloud-based EBS, filesystem creation, snapshots, and RAID configurations. Covers the full lifecycle from provisioning raw disks to extending volumes in production.

## When to Use

- Adding, partitioning, or formatting new disks on Linux servers
- Managing LVM logical volumes for flexible storage allocation
- Provisioning and attaching cloud block storage (AWS EBS)
- Creating and restoring snapshots for backup or migration
- Configuring software RAID for redundancy or performance
- Extending existing volumes without downtime

## Prerequisites

- Root or sudo access on the target system
- `lvm2` package installed for LVM operations
- `mdadm` package installed for software RAID
- AWS CLI configured for EBS operations
- Understanding of the workload's I/O characteristics (IOPS, throughput)

## Disk Discovery and Partitioning

```bash
# List all block devices
lsblk
lsblk -f    # Show filesystem types and mount points

# Show detailed disk information
fdisk -l /dev/sdb

# Identify disk model and health (requires smartmontools)
smartctl -a /dev/sda
smartctl -H /dev/sda    # Quick health check

# Create a GPT partition table and a single partition
parted /dev/sdb mklabel gpt
parted /dev/sdb mkpart primary ext4 0% 100%

# Alternative: use fdisk for MBR partitioning
fdisk /dev/sdb
# n -> new partition, p -> primary, Enter defaults, w -> write

# Inform the kernel of partition table changes
partprobe /dev/sdb

# Wipe filesystem signatures (prepare for LVM or RAID)
wipefs -a /dev/sdb1
```

## Filesystem Creation and Management

```bash
# Create an ext4 filesystem
mkfs.ext4 /dev/sdb1

# Create an ext4 filesystem with label and reserved block tuning
mkfs.ext4 -L appdata -m 1 /dev/sdb1    # 1% reserved blocks (default is 5%)

# Create an XFS filesystem (recommended for large volumes)
mkfs.xfs /dev/sdb1

# Create an XFS filesystem with label
mkfs.xfs -L appdata /dev/sdb1

# Mount the filesystem
mkdir -p /data
mount /dev/sdb1 /data

# Add persistent mount to fstab (use UUID for reliability)
blkid /dev/sdb1    # Get the UUID
echo 'UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /data  ext4  defaults,noatime  0  2' >> /etc/fstab

# Mount all entries in fstab
mount -a

# Check and repair a filesystem (unmount first)
umount /data
fsck.ext4 -y /dev/sdb1
xfs_repair /dev/sdb1    # For XFS

# Resize ext4 (can grow online while mounted)
resize2fs /dev/sdb1

# Resize XFS (must be mounted to grow)
xfs_growfs /data

# Check filesystem usage
df -hT
```

## LVM Management

### Creating an LVM Stack

```bash
# Step 1: Create physical volumes
pvcreate /dev/sdb /dev/sdc

# View physical volumes
pvs
pvdisplay /dev/sdb

# Step 2: Create a volume group from physical volumes
vgcreate data_vg /dev/sdb /dev/sdc

# View volume groups
vgs
vgdisplay data_vg

# Step 3: Create logical volumes
# Fixed size
lvcreate -L 100G -n app_lv data_vg

# Use percentage of free space
lvcreate -l 50%FREE -n logs_lv data_vg

# Use all remaining space
lvcreate -l 100%FREE -n backup_lv data_vg

# View logical volumes
lvs
lvdisplay /dev/data_vg/app_lv

# Step 4: Create filesystem and mount
mkfs.ext4 /dev/data_vg/app_lv
mkdir -p /data/app
mount /dev/data_vg/app_lv /data/app

# Add to fstab
echo '/dev/data_vg/app_lv  /data/app  ext4  defaults,noatime  0  2' >> /etc/fstab
```

### Extending Volumes (Online)

```bash
# Extend a logical volume by 20 GB
lvextend -L +20G /dev/data_vg/app_lv

# Extend to fill all free space in the VG
lvextend -l +100%FREE /dev/data_vg/app_lv

# Grow the ext4 filesystem (online, no unmount needed)
resize2fs /dev/data_vg/app_lv

# Grow XFS filesystem (online)
xfs_growfs /data/app

# Combined: extend LV and resize filesystem in one command
lvextend -L +20G --resizefs /dev/data_vg/app_lv
```

### Adding a New Disk to an Existing VG

```bash
# Add a new physical volume
pvcreate /dev/sdd

# Extend the volume group
vgextend data_vg /dev/sdd

# Now extend any logical volume using the new space
lvextend -l +100%FREE --resizefs /dev/data_vg/app_lv
```

### LVM Snapshots

```bash
# Create a snapshot (requires free space in VG)
lvcreate -L 10G -s -n app_snap /dev/data_vg/app_lv

# Mount the snapshot read-only for backup
mkdir -p /mnt/snapshot
mount -o ro /dev/data_vg/app_snap /mnt/snapshot

# Perform backup from the snapshot
tar czf /backup/app-$(date +%Y%m%d).tar.gz -C /mnt/snapshot .

# Unmount and remove the snapshot when done
umount /mnt/snapshot
lvremove -f /dev/data_vg/app_snap

# Restore from snapshot (reverts LV to snapshot point -- destructive)
lvconvert --merge /dev/data_vg/app_snap
# Note: if the LV is mounted, merge happens at next activation (reboot)
```

### Reducing and Removing LVM Components

```bash
# Shrink a logical volume (ext4 only -- XFS cannot shrink)
# MUST unmount first
umount /data/app
e2fsck -f /dev/data_vg/app_lv
resize2fs /dev/data_vg/app_lv 80G
lvreduce -L 80G /dev/data_vg/app_lv
mount /data/app

# Remove a logical volume
umount /data/app
lvremove /dev/data_vg/app_lv

# Remove a disk from a volume group (migrate data off first)
pvmove /dev/sdc            # Migrate extents to other PVs
vgreduce data_vg /dev/sdc  # Remove PV from VG
pvremove /dev/sdc           # Clean PV metadata
```

## AWS EBS Management

```bash
# Create a gp3 volume (general purpose SSD)
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --iops 3000 \
  --throughput 125 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=app-data},{Key=Environment,Value=production}]'

# Create an io2 volume (provisioned IOPS SSD for databases)
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 500 \
  --volume-type io2 \
  --iops 10000

# List volumes with filters
aws ec2 describe-volumes \
  --filters "Name=tag:Environment,Values=production" \
  --query 'Volumes[*].{ID:VolumeId,Size:Size,Type:VolumeType,State:State,AZ:AvailabilityZone}' \
  --output table

# Attach a volume to an instance
aws ec2 attach-volume \
  --volume-id vol-0abc123def456789 \
  --instance-id i-0abc123def456789 \
  --device /dev/xvdf

# After attaching, format and mount on the instance
lsblk                               # Identify the new device (e.g., /dev/nvme1n1)
mkfs.ext4 /dev/nvme1n1
mkdir -p /data
mount /dev/nvme1n1 /data

# Modify a volume (resize without detaching -- gp3/io2)
aws ec2 modify-volume \
  --volume-id vol-0abc123def456789 \
  --size 200

# After resize, grow the filesystem on the instance
growpart /dev/nvme1n1 1              # If partitioned
resize2fs /dev/nvme1n1               # ext4
# xfs_growfs /data                   # XFS

# Create a snapshot
aws ec2 create-snapshot \
  --volume-id vol-0abc123def456789 \
  --description "Pre-upgrade snapshot $(date +%Y-%m-%d)" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=pre-upgrade}]'

# List snapshots
aws ec2 describe-snapshots \
  --owner-ids self \
  --query 'Snapshots[*].{ID:SnapshotId,Vol:VolumeId,Size:VolumeSize,Date:StartTime,Desc:Description}' \
  --output table

# Create a volume from a snapshot (for restore or migration)
aws ec2 create-volume \
  --snapshot-id snap-0abc123def456789 \
  --availability-zone us-east-1a \
  --volume-type gp3

# Detach a volume
aws ec2 detach-volume --volume-id vol-0abc123def456789

# Delete a volume (ensure it is detached first)
aws ec2 delete-volume --volume-id vol-0abc123def456789
```

## Software RAID (mdadm)

```bash
# Install mdadm
apt install -y mdadm    # Debian/Ubuntu
dnf install -y mdadm    # RHEL/CentOS

# Create RAID 1 (mirror) with 2 disks
mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc

# Create RAID 5 (striped with parity) with 3 disks + 1 spare
mdadm --create /dev/md0 --level=5 --raid-devices=3 --spare-devices=1 /dev/sdb /dev/sdc /dev/sdd /dev/sde

# Create RAID 10 (striped mirrors) with 4 disks
mdadm --create /dev/md0 --level=10 --raid-devices=4 /dev/sdb /dev/sdc /dev/sdd /dev/sde

# Check RAID status
cat /proc/mdstat
mdadm --detail /dev/md0

# Save RAID configuration (persists across reboot)
mdadm --detail --scan >> /etc/mdadm/mdadm.conf     # Debian
mdadm --detail --scan >> /etc/mdadm.conf            # RHEL
update-initramfs -u                                  # Debian

# Create filesystem on RAID device
mkfs.ext4 /dev/md0
mkdir -p /data
mount /dev/md0 /data

# Replace a failed disk
mdadm --manage /dev/md0 --fail /dev/sdc
mdadm --manage /dev/md0 --remove /dev/sdc
# Insert new disk, then:
mdadm --manage /dev/md0 --add /dev/sdf

# Monitor rebuild progress
watch cat /proc/mdstat

# RAID level recommendations:
# RAID 1:  2+ disks, mirroring, good for OS / boot drives
# RAID 5:  3+ disks, single parity, good read performance
# RAID 6:  4+ disks, double parity, survives 2 disk failures
# RAID 10: 4+ disks, mirrored stripes, best I/O performance
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| Disk not showing up | `lsblk`, `dmesg \| tail` | Check physical connection; rescan SCSI bus |
| Filesystem read-only | `dmesg \| grep error`, `mount` | Filesystem errors detected; run `fsck` after unmount |
| LVM: no free space in VG | `vgs`, `pvs` | Add a new PV with `vgextend` |
| EBS volume not visible | `lsblk` on instance | Check attach status in AWS console; NVMe naming differs |
| RAID degraded | `cat /proc/mdstat` | Replace failed disk with `mdadm --manage --add` |
| Cannot resize filesystem | `lvs`, `df -h` | Extend LV first, then resize FS; XFS needs to be mounted |
| Slow I/O on EBS | `iostat -x 2`, check volume type | Upgrade to gp3/io2, increase IOPS/throughput |
| Snapshot taking too long | AWS Console: snapshot progress | Snapshots are incremental; first one takes longest |

## Related Skills

- `linux-administration` -- Disk and filesystem basics
- `performance-tuning` -- I/O scheduler and benchmarking with fio
- `nfs-storage` -- Network filesystems built on top of block storage
- `backup-recovery` -- Snapshot-based and file-level backup strategies
- `object-storage` -- Alternative storage model for unstructured data

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

