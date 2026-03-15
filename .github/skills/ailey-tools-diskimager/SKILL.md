---
id: ailey-tools-diskimager
name: ailey-tools-diskimager
description: Comprehensive disk imaging toolkit for creating, duplicating, and cloning disk images across drives and SD cards. List and detect drives by type, create images from physical disks, clone images to empty drives only (safety enforced), and perform direct disk-to-disk cloning. Use when creating disk backups, duplicating SD cards, cloning drives, writing images to removable media, or managing disk image files.
keywords: [disk, image, clone, dd, sdcard, drive, backup, restore, iso, img, usb, removable, partition, diskpart, wmic]
tools: [diskutil, dd, lsblk, fdisk, hdiutil, pv, diskpart, wmic, PowerShell]
---

# AI-ley Disk Imager

Create, duplicate, and clone disk images across drives and SD cards with safety-enforced empty-disk-only write policy.

## Overview

The ailey-tools-diskimager skill provides:

- **Drive Listing**: Enumerate all attached drives with type, size, and mount status
- **Drive Detection**: Identify drive type (internal, USB, SD card) and connection bus
- **Image Creation**: Read a physical drive/SD card into an image file (.img, .iso, .dmg)
- **Image Cloning**: Write an image file to an empty drive or SD card
- **Disk-to-Disk Cloning**: Direct byte-for-byte clone from source drive to empty target
- **Safety Enforcement**: All write operations require target to be empty (no partitions/filesystem)
- **Progress Monitoring**: Real-time throughput and ETA via `pv` or `dd` status
- **Compression**: Optional gzip/xz compression for image creation and decompression on restore

## When to Use

- **List Drives**: Show all attached disks, USB drives, SD cards with sizes and types
- **Create Disk Image**: Back up a drive or SD card to a `.img` / `.iso` / `.dmg` file
- **Clone Image to Drive**: Write an image file to an empty SD card or USB drive
- **Disk-to-Disk Clone**: Copy one drive directly to another empty drive
- **Detect Drive Type**: Identify whether a device is an SD card, USB, internal SSD/HDD
- **Verify Image**: Compare image against source or target for integrity
- **Compress/Decompress**: Create compressed images or restore from compressed archives

## Prerequisites

### macOS (primary)

Built-in tools available on all macOS systems:

| Tool | Purpose | Included |
|------|---------|----------|
| `diskutil` | Drive listing, unmounting, partition info | ✅ Built-in |
| `dd` | Byte-level read/write | ✅ Built-in |
| `hdiutil` | DMG creation and mounting | ✅ Built-in |
| `system_profiler` | Hardware bus detection (USB/SD) | ✅ Built-in |

Optional for progress monitoring:

```bash
brew install pv          # Pipe viewer for progress bars
brew install coreutils   # GNU dd with status=progress support
```

### Linux

```bash
# All tools typically pre-installed
which lsblk dd fdisk    # Verify availability

# Optional
sudo apt install pv      # Progress monitoring
```

### Windows

Built-in tools available on all Windows systems:

| Tool | Purpose | Included |
|------|---------|----------|
| `diskpart` | Disk management, partition info, clean | ✅ Built-in |
| `wmic` | Drive listing, hardware detection | ✅ Built-in |
| `PowerShell Get-Disk` | Modern drive enumeration | ✅ Built-in |
| `PowerShell Get-Partition` | Partition inspection | ✅ Built-in |

Optional for image creation/writing:

```powershell
# dd for Windows (ported)
winget install chrysocome.dd

# Or use the built-in PowerShell approach (no extra tools needed)
# See Image Creation section below
```

### Permissions

Disk operations require elevated privileges:

```bash
# macOS: prefix with sudo
sudo dd if=/dev/disk4 of=backup.img bs=4m

# Linux: use sudo or ensure user is in 'disk' group
sudo usermod -aG disk $USER
```

```powershell
# Windows: Run PowerShell or CMD as Administrator
# Right-click → "Run as Administrator"
```

---

## Drive Detection

### Platform-Specific Detection

**macOS**:

```bash
# List all disks with sizes and types
diskutil list

# Detailed info for a specific disk
diskutil info /dev/disk4

# External/removable detection via system_profiler
system_profiler SPUSBDataType 2>/dev/null    # USB drives
system_profiler SPCardReaderDataType 2>/dev/null  # SD cards
```

**Linux**:

```bash
# List block devices with type, size, model
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL,TRAN,RM

# Identify removable media
lsblk -d -o NAME,RM,SIZE,MODEL,TRAN | grep "1$"   # RM=1 means removable
```

**Windows** (PowerShell, run as Administrator):

```powershell
# List all physical disks
Get-Disk | Format-Table Number, FriendlyName, Size, PartitionStyle, OperationalStatus, BusType

# List only USB/removable disks
Get-Disk | Where-Object { $_.BusType -eq 'USB' -or $_.BusType -eq 'SD' } | Format-Table Number, FriendlyName, Size, BusType

# Detailed disk info
Get-Disk -Number 2 | Format-List *

# List partitions on a disk
Get-Partition -DiskNumber 2 | Format-Table PartitionNumber, DriveLetter, Size, Type

# Legacy: wmic (still works on all Windows versions)
wmic diskdrive list brief
wmic diskdrive get Model,InterfaceType,MediaType,Size,Status
```

### Drive Type Classification

| Type | macOS Detection | Linux Detection | Windows Detection |
|------|-----------------|-----------------|-------------------|
| Internal SSD/HDD | `diskutil info` → `Internal: Yes` | `lsblk` → `TRAN=sata/nvme`, `RM=0` | `Get-Disk` → `BusType=SATA/NVMe` |
| USB Drive | `system_profiler SPUSBDataType` | `lsblk` → `TRAN=usb` | `Get-Disk` → `BusType=USB` |
| SD Card | `system_profiler SPCardReaderDataType` | `lsblk` → `TRAN=usb`, model contains `SD` | `Get-Disk` → `BusType=SD` |
| Disk Image | `hdiutil info` (mounted images) | `losetup -l` (loop devices) | `Get-Disk` → `BusType=File Backed Virtual` |

### Safety: Empty Disk Detection

Before any write operation, verify the target is empty:

**macOS**:

```bash
# Check if disk has partitions (beyond the physical disk entry itself)
PARTITIONS=$(diskutil list /dev/disk4 | grep -c "^   [0-9]")
if [ "$PARTITIONS" -gt 0 ]; then
  echo "❌ ABORT: Target disk has $PARTITIONS partition(s). Must be empty."
  echo "   To erase: diskutil eraseDisk free EMPTY /dev/disk4"
  exit 1
fi
```

**Linux**:

```bash
# Check for partitions
PARTITIONS=$(lsblk -n -o NAME /dev/sdb | wc -l)
if [ "$PARTITIONS" -gt 1 ]; then
  echo "❌ ABORT: Target has partitions. Must be empty."
  echo "   To wipe: sudo wipefs -a /dev/sdb"
  exit 1
fi

# Check for filesystem signatures
FSTYPE=$(blkid -o value -s TYPE /dev/sdb 2>/dev/null)
if [ -n "$FSTYPE" ]; then
  echo "❌ ABORT: Target has filesystem: $FSTYPE"
  exit 1
fi
```

**Windows** (PowerShell):

```powershell
# Check if disk has partitions
$partitions = Get-Partition -DiskNumber 2 -ErrorAction SilentlyContinue
if ($partitions) {
  Write-Host "❌ ABORT: Disk 2 has $($partitions.Count) partition(s). Must be empty."
  Write-Host "   To clean: diskpart → select disk 2 → clean"
  exit 1
}

# Check if disk has a RAW (uninitialised) partition style = OK (considered empty)
$disk = Get-Disk -Number 2
if ($disk.PartitionStyle -ne 'RAW') {
  Write-Host "❌ ABORT: Disk 2 has partition style '$($disk.PartitionStyle)'. Must be RAW/empty."
  Write-Host "   To clean: Clear-Disk -Number 2 -RemoveData -Confirm:`$false"
  exit 1
}
```

---

## Commands

### List Drives

Enumerate all attached drives with type, size, and mount status.

**macOS**:

```bash
# Simple listing
diskutil list

# Detailed external drives only
diskutil list external

# JSON-style detailed info for scripting
diskutil info -all | grep -E "Device Identifier|Device Node|Volume Name|Total Size|Device / Media Name|Removable Media|Protocol"
```

**Linux**:

```bash
# Full listing with transport
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL,TRAN,RM,FSTYPE

# Only physical disks (no partitions)
lsblk -d -o NAME,SIZE,MODEL,TRAN,RM

# Removable only
lsblk -d -o NAME,SIZE,MODEL,TRAN,RM | awk '$5==1'
```

**Formatted Output** (macOS example):

```bash
echo "=== Attached Drives ==="
for disk in $(diskutil list | grep "^/dev/disk" | awk '{print $1}'); do
  INFO=$(diskutil info "$disk")
  NAME=$(echo "$INFO" | grep "Device / Media Name" | cut -d: -f2 | xargs)
  SIZE=$(echo "$INFO" | grep "Disk Size" | cut -d: -f2 | cut -d'(' -f1 | xargs)
  REMOVABLE=$(echo "$INFO" | grep "Removable Media" | cut -d: -f2 | xargs)
  PROTOCOL=$(echo "$INFO" | grep "Protocol" | cut -d: -f2 | xargs)
  printf "%-15s %-30s %-12s %-10s %s\n" "$disk" "$NAME" "$SIZE" "$REMOVABLE" "$PROTOCOL"
done
```

**Windows** (PowerShell, run as Administrator):

```powershell
# Full listing with bus type
Get-Disk | Format-Table -AutoSize Number, FriendlyName, @{N='Size(GB)';E={[math]::Round($_.Size/1GB,2)}}, PartitionStyle, OperationalStatus, BusType

# Only removable / USB / SD
Get-Disk | Where-Object { $_.BusType -in 'USB','SD' } |
  Format-Table -AutoSize Number, FriendlyName, @{N='Size(GB)';E={[math]::Round($_.Size/1GB,2)}}, BusType

# List volumes (drive letters)
Get-Volume | Format-Table -AutoSize DriveLetter, FileSystemLabel, FileSystem, @{N='Size(GB)';E={[math]::Round($_.Size/1GB,2)}}, DriveType
```

### Create Image from Drive

Read a physical disk or SD card into an image file.

**Standard image creation**:

```bash
# macOS: Unmount first, then image
sudo diskutil unmountDisk /dev/disk4
sudo dd if=/dev/rdisk4 of=./backup.img bs=4m status=progress

# Linux
sudo umount /dev/sdb*
sudo dd if=/dev/sdb of=./backup.img bs=4M status=progress
```

> **Note**: On macOS, use `/dev/rdisk4` (raw device) instead of `/dev/disk4` for 2-10x faster reads.

**With compression**:

```bash
# gzip (good balance of speed and compression)
sudo dd if=/dev/rdisk4 bs=4m | gzip -9 > backup.img.gz

# xz (best compression, slower)
sudo dd if=/dev/rdisk4 bs=4m | xz -9 -T0 > backup.img.xz

# With progress via pv
sudo dd if=/dev/rdisk4 bs=4m | pv -s $(diskutil info /dev/disk4 | grep "Disk Size" | awk -F'[()]' '{print $2}' | awk '{print $1}') | gzip > backup.img.gz
```

**macOS DMG creation**:

```bash
# Create DMG from drive
sudo hdiutil create -srcdevice /dev/disk4 -format UDZO backup.dmg

# Create read-write DMG
sudo hdiutil create -srcdevice /dev/disk4 -format UDRW backup.dmg
```

**Set target file path**:

```bash
# Specify output directory
TARGET_DIR="./disk-images"
mkdir -p "$TARGET_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEVICE_NAME=$(diskutil info /dev/disk4 | grep "Device / Media Name" | cut -d: -f2 | xargs | tr ' ' '-')
TARGET_FILE="${TARGET_DIR}/${DEVICE_NAME}_${TIMESTAMP}.img"

sudo dd if=/dev/rdisk4 of="$TARGET_FILE" bs=4m status=progress
echo "✅ Image saved to: $TARGET_FILE"
```

**Windows** (PowerShell, run as Administrator):

```powershell
# Using dd for Windows (if installed via winget install chrysocome.dd)
dd if=\\.\PhysicalDrive2 of=.\backup.img bs=4M --progress

# Pure PowerShell approach (no extra tools)
$source = '\\.\PhysicalDrive2'
$target = '.\backup.img'
$bufferSize = 4MB
$stream = [System.IO.File]::OpenRead($source)
$writer = [System.IO.File]::OpenWrite($target)
$buffer = New-Object byte[] $bufferSize
$totalRead = 0
$diskSize = (Get-Disk -Number 2).Size
while (($read = $stream.Read($buffer, 0, $bufferSize)) -gt 0) {
    $writer.Write($buffer, 0, $read)
    $totalRead += $read
    $pct = [math]::Round(($totalRead / $diskSize) * 100, 1)
    Write-Progress -Activity "Creating image" -Status "$pct% ($([math]::Round($totalRead/1GB,2)) GB)" -PercentComplete $pct
}
$writer.Close(); $stream.Close()
Write-Host "✅ Image saved to: $target"
```

### Clone Image to Drive

Write an image file to an empty target drive or SD card.

**⚠️ Safety: Only writes to empty disks (no partitions/filesystem).**

**macOS**:

```bash
# 1. Verify target is empty
TARGET=/dev/disk4
PARTITIONS=$(diskutil list "$TARGET" | grep -c "^   [0-9]")
if [ "$PARTITIONS" -gt 0 ]; then
  echo "❌ ABORT: $TARGET has partitions. Erase first:"
  echo "   diskutil eraseDisk free EMPTY $TARGET"
  exit 1
fi

# 2. Unmount target
sudo diskutil unmountDisk "$TARGET"

# 3. Clone image to drive
sudo dd if=./backup.img of=/dev/rdisk4 bs=4m status=progress

# 4. Eject when done
sudo diskutil eject "$TARGET"
echo "✅ Image cloned to $TARGET"
```

**From compressed image**:

```bash
# gzip
gunzip -c backup.img.gz | sudo dd of=/dev/rdisk4 bs=4m status=progress

# xz
xz -dc backup.img.xz | sudo dd of=/dev/rdisk4 bs=4m status=progress

# With progress via pv
pv backup.img.gz | gunzip | sudo dd of=/dev/rdisk4 bs=4m
```

**Linux**:

```bash
# 1. Verify target is empty
TARGET=/dev/sdb
PARTITIONS=$(lsblk -n -o NAME "$TARGET" | wc -l)
FSTYPE=$(blkid -o value -s TYPE "$TARGET" 2>/dev/null)
if [ "$PARTITIONS" -gt 1 ] || [ -n "$FSTYPE" ]; then
  echo "❌ ABORT: $TARGET is not empty."
  echo "   To wipe: sudo wipefs -a $TARGET"
  exit 1
fi

# 2. Unmount
sudo umount "$TARGET"* 2>/dev/null

# 3. Clone
sudo dd if=./backup.img of="$TARGET" bs=4M status=progress conv=fsync

# 4. Sync and eject
sync
sudo eject "$TARGET"
echo "✅ Image cloned to $TARGET"
```

**Windows** (PowerShell, run as Administrator):

```powershell
# 1. Verify target is empty (RAW / no partitions)
$disk = Get-Disk -Number 2
$partitions = Get-Partition -DiskNumber 2 -ErrorAction SilentlyContinue
if ($partitions) {
  Write-Host "❌ ABORT: Disk 2 has partitions. Clean first:"
  Write-Host "   Clear-Disk -Number 2 -RemoveData -Confirm:`$false"
  exit 1
}

# 2. Set disk online and writable
Set-Disk -Number 2 -IsOffline $false
Set-Disk -Number 2 -IsReadOnly $false

# 3. Clone image to drive (dd for Windows)
dd if=.\backup.img of=\\.\PhysicalDrive2 bs=4M --progress

# Or pure PowerShell:
$source = '.\backup.img'
$target = '\\.\PhysicalDrive2'
$bufferSize = 4MB
$stream = [System.IO.File]::OpenRead($source)
$writer = [System.IO.File]::OpenWrite($target)
$buffer = New-Object byte[] $bufferSize
$totalRead = 0
$fileSize = (Get-Item $source).Length
while (($read = $stream.Read($buffer, 0, $bufferSize)) -gt 0) {
    $writer.Write($buffer, 0, $read)
    $totalRead += $read
    $pct = [math]::Round(($totalRead / $fileSize) * 100, 1)
    Write-Progress -Activity "Cloning image" -Status "$pct%" -PercentComplete $pct
}
$writer.Close(); $stream.Close()
Write-Host "✅ Image cloned to Disk 2"
```

### Disk-to-Disk Clone

Directly clone one drive to another empty drive (byte-for-byte copy).

**⚠️ Safety: Target must be empty. Source and target should be same size or target larger.**

**macOS**:

```bash
SOURCE=/dev/disk3
TARGET=/dev/disk4

# 1. Verify target is empty
PARTITIONS=$(diskutil list "$TARGET" | grep -c "^   [0-9]")
if [ "$PARTITIONS" -gt 0 ]; then
  echo "❌ ABORT: $TARGET has partitions. Erase first."
  exit 1
fi

# 2. Verify sizes (target >= source)
SRC_SIZE=$(diskutil info "$SOURCE" | grep "Disk Size" | awk -F'[()]' '{print $2}' | awk '{print $1}')
TGT_SIZE=$(diskutil info "$TARGET" | grep "Disk Size" | awk -F'[()]' '{print $2}' | awk '{print $1}')
if [ "$TGT_SIZE" -lt "$SRC_SIZE" ]; then
  echo "❌ ABORT: Target ($TGT_SIZE bytes) smaller than source ($SRC_SIZE bytes)"
  exit 1
fi

# 3. Unmount both
sudo diskutil unmountDisk "$SOURCE"
sudo diskutil unmountDisk "$TARGET"

# 4. Clone
sudo dd if=/dev/rdisk3 of=/dev/rdisk4 bs=4m status=progress

# 5. Eject target
sudo diskutil eject "$TARGET"
echo "✅ Disk cloned: $SOURCE → $TARGET"
```

**Linux**:

```bash
SOURCE=/dev/sda
TARGET=/dev/sdb

# 1. Verify target is empty
PARTITIONS=$(lsblk -n -o NAME "$TARGET" | wc -l)
FSTYPE=$(blkid -o value -s TYPE "$TARGET" 2>/dev/null)
if [ "$PARTITIONS" -gt 1 ] || [ -n "$FSTYPE" ]; then
  echo "❌ ABORT: $TARGET is not empty. Wipe first."
  exit 1
fi

# 2. Size check
SRC_SIZE=$(blockdev --getsize64 "$SOURCE")
TGT_SIZE=$(blockdev --getsize64 "$TARGET")
if [ "$TGT_SIZE" -lt "$SRC_SIZE" ]; then
  echo "❌ ABORT: Target too small ($TGT_SIZE < $SRC_SIZE)"
  exit 1
fi

# 3. Unmount
sudo umount "$SOURCE"* 2>/dev/null
sudo umount "$TARGET"* 2>/dev/null

# 4. Clone with progress
sudo dd if="$SOURCE" of="$TARGET" bs=4M status=progress conv=fsync

# 5. Sync
sync
echo "✅ Disk cloned: $SOURCE → $TARGET"
```

**Windows** (PowerShell, run as Administrator):

```powershell
$sourceDisk = 1
$targetDisk = 2

# 1. Verify target is empty
$partitions = Get-Partition -DiskNumber $targetDisk -ErrorAction SilentlyContinue
if ($partitions) {
  Write-Host "❌ ABORT: Disk $targetDisk has partitions. Clean first."
  exit 1
}

# 2. Size check
$srcSize = (Get-Disk -Number $sourceDisk).Size
$tgtSize = (Get-Disk -Number $targetDisk).Size
if ($tgtSize -lt $srcSize) {
  Write-Host "❌ ABORT: Target too small ($tgtSize < $srcSize)"
  exit 1
}

# 3. Set target online and writable
Set-Disk -Number $targetDisk -IsOffline $false
Set-Disk -Number $targetDisk -IsReadOnly $false

# 4. Clone with dd for Windows
dd if=\\.\PhysicalDrive$sourceDisk of=\\.\PhysicalDrive$targetDisk bs=4M --progress

# Or pure PowerShell:
$source = "\\.\PhysicalDrive$sourceDisk"
$target = "\\.\PhysicalDrive$targetDisk"
$bufferSize = 4MB
$stream = [System.IO.File]::OpenRead($source)
$writer = [System.IO.File]::OpenWrite($target)
$buffer = New-Object byte[] $bufferSize
$totalRead = 0
while (($read = $stream.Read($buffer, 0, $bufferSize)) -gt 0) {
    $writer.Write($buffer, 0, $read)
    $totalRead += $read
    Write-Progress -Activity "Cloning disk" -Status "$([math]::Round($totalRead/1GB,2)) GB" -PercentComplete (($totalRead / $srcSize) * 100)
}
$writer.Close(); $stream.Close()
Write-Host "✅ Disk cloned: Disk $sourceDisk → Disk $targetDisk"
```

### Verify Image

Compare a written drive against its source image for integrity.

**macOS / Linux**:

```bash
# Hash comparison
SOURCE_HASH=$(sudo dd if=/dev/rdisk4 bs=4m count=$(stat -f%z backup.img | awk '{print int($1/4194304)+1}') | shasum -a 256 | awk '{print $1}')
IMAGE_HASH=$(shasum -a 256 backup.img | awk '{print $1}')

if [ "$SOURCE_HASH" = "$IMAGE_HASH" ]; then
  echo "✅ Verification passed"
else
  echo "❌ Verification FAILED — hashes do not match"
fi
```

**Windows** (PowerShell):

```powershell
$imageHash = (Get-FileHash -Path .\backup.img -Algorithm SHA256).Hash
# Read same number of bytes from disk as the image size
$imageSize = (Get-Item .\backup.img).Length
$tempFile = "$env:TEMP\disk_verify_$([guid]::NewGuid()).bin"
dd if=\\.\PhysicalDrive2 of=$tempFile bs=4M count=$([math]::Ceiling($imageSize / 4MB))
$diskHash = (Get-FileHash -Path $tempFile -Algorithm SHA256).Hash
Remove-Item $tempFile
if ($imageHash -eq $diskHash) { Write-Host "✅ Verification passed" }
else { Write-Host "❌ Verification FAILED" }
```

### Erase Disk (Prepare Empty Target)

Prepare a drive for cloning by erasing all partitions.

**macOS**:

```bash
# Erase to free space (no filesystem, no partitions)
sudo diskutil eraseDisk free EMPTY /dev/disk4

# Erase to a specific format (creates a partition — NOT empty)
# diskutil eraseDisk JHFS+ "MyDisk" /dev/disk4   # ← Don't use for cloning targets
```

**Linux**:

```bash
# Wipe all filesystem signatures
sudo wipefs -a /dev/sdb

# Zero the first 1MB (partition table area)
sudo dd if=/dev/zero of=/dev/sdb bs=1M count=1
```

**Windows** (PowerShell, run as Administrator):

```powershell
# PowerShell: Clear disk (removes all partitions and data)
Clear-Disk -Number 2 -RemoveData -Confirm:$false

# Or via diskpart:
# diskpart
# > select disk 2
# > clean
# > exit

# Verify it's now RAW
Get-Disk -Number 2 | Select-Object Number, PartitionStyle, OperationalStatus
# PartitionStyle should be "RAW"
```

---

## Workflow Decision Tree

1. **What do you want to do?**

   - **List drives** → `diskutil list` / `lsblk` / `Get-Disk`
   - **Identify drive type** → Drive Detection section
   - **Back up a drive to file** → Create Image from Drive
   - **Write image to drive** → Clone Image to Drive (target must be empty)
   - **Copy drive to drive** → Disk-to-Disk Clone (target must be empty)
   - **Prepare empty target** → Erase Disk

2. **Is the target empty?**

   - **Yes** → Proceed with clone/write
   - **No** → Erase first, then proceed
   - **Contains important data** → Back up first, then erase, then proceed

3. **Do you want compression?**

   - **Yes** → Pipe through `gzip -9` or `xz -9 -T0`
   - **No** → Direct `dd` for fastest throughput

---

## Safety Rules

These rules are **mandatory** and must never be bypassed:

1. **Empty target only**: All write operations check for zero partitions and no filesystem signatures before proceeding
2. **Confirmation prompt**: Always display source → target summary and require explicit confirmation before writes
3. **No internal disk writes**: Refuse to write to internal/system drives (check `Internal: Yes` on macOS, `RM=0` + `TRAN=sata/nvme` on Linux, `BusType=SATA/NVMe` on Windows)
4. **Size validation**: Target must be ≥ source size for disk-to-disk and image-to-disk operations
5. **Unmount before write**: Always unmount/offline target volumes before writing
6. **Use raw device on macOS**: Prefer `/dev/rdiskN` over `/dev/diskN` for performance
7. **Elevated privileges required**: macOS/Linux → `sudo`; Windows → Administrator PowerShell

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `Permission denied` | Not running as root/sudo | Prefix command with `sudo` |
| `Resource busy` | Drive is mounted | `diskutil unmountDisk /dev/diskN` or `umount /dev/sdX*` |
| `No such file or directory` | Wrong device path | Re-run `diskutil list` or `lsblk` to verify |
| `Operation not permitted` | macOS SIP restriction | Boot to Recovery, `csrutil disable` (not recommended) |
| `No space left on device` | Target smaller than image | Use larger target or truncate image |
| `Input/output error` | Bad sectors or failing drive | Try `ddrescue` instead of `dd` |
| `Access is denied` (Win) | Not running as Administrator | Right-click PowerShell → Run as Administrator |
| `The disk is offline` (Win) | Disk set to offline | `Set-Disk -Number N -IsOffline $false` |
| `The media is write protected` (Win) | Read-only flag set | `Set-Disk -Number N -IsReadOnly $false` |
| `Virtual Disk Service error` (Win) | diskpart permission issue | Run `diskpart` from elevated CMD |

---

**Version**: 1.1.0
**Created**: 2026-03-01
**Updated**: 2026-03-02

---
version: 1.1.0
updated: 2026-03-02
reviewed: 2026-03-02
score: 4.2
---
