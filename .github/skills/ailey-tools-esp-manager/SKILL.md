---
id: ailey-tools-esp-manager
name: ailey-tools-esp-manager
description: Comprehensive ESP32/ESP8266 device management toolkit with USB serial flashing, OTA Wi-Fi updates, mDNS device discovery, health monitoring, configuration provisioning, firmware backup, and bulk/batch operations across device fleets. Use when flashing firmware, updating devices over-the-air, discovering ESP devices, monitoring device health, provisioning configurations, or managing multiple IoT microcontrollers.
keywords: [esp32, esp8266, firmware, flash, ota, serial, usb, arduino, platformio, iot, microcontroller, device, monitoring, windows, linux, macos]
tools: [commander, serialport, axios, mdns, glob, dotenv]
---

# AI-ley ESP Device Manager

Manage and update ESP32/ESP8266 devices over USB (serial) and OTA (Wi-Fi) with fleet-wide batch operations.

## Overview

The ailey-tools-esp-manager skill provides complete ESP device lifecycle management:

- **Device Discovery**: Auto-detect devices on USB serial ports and via mDNS on local network
- **Firmware Flashing**: Flash firmware binaries over USB using esptool.py
- **OTA Updates**: Push firmware wirelessly via ArduinoOTA or ESP-IDF OTA protocols
- **Serial Monitor**: Real-time device console output for debugging
- **Health Monitoring**: Query device uptime, free heap, Wi-Fi RSSI, and temperature
- **Config Provisioning**: Push Wi-Fi credentials, MQTT endpoints, and custom parameters
- **Batch Operations**: Bulk flash, update, or configure multiple devices with concurrency control
- **Device Registry**: JSON-based fleet inventory with aliases, MACs, and last-seen timestamps
- **Firmware Backup**: Read and save current firmware from device flash memory
- **Flash Erase**: Full or partial flash memory erase for factory reset

## When to Use

- **Flash Firmware**: Upload a compiled binary to an ESP board over USB serial
- **OTA Update**: Push firmware to one or many devices wirelessly
- **Discover Devices**: Find connected USB boards or networked ESP devices via mDNS
- **Monitor Health**: Check device vitals (heap, RSSI, uptime) across a fleet
- **Provision Config**: Set Wi-Fi, MQTT, or custom parameters on new or existing devices
- **Batch Operations**: Roll out firmware or configuration changes to many devices at once
- **Debug**: Open a serial console to read device logs in real time
- **Backup/Restore**: Save current firmware before updating, restore on failure

## Installation

```bash
cd .github/skills/ailey-tools-esp-manager
npm install
```

### Prerequisites

**esptool.py** (required for USB serial operations):

| Platform | Install Command | Notes |
|----------|----------------|-------|
| **macOS** | `brew install esptool` or `pip install esptool` | Homebrew or pip |
| **Linux** | `pip install esptool` | May need `pip3` on Ubuntu/Debian |
| **Windows** | `pip install esptool` | Requires [Python](https://www.python.org/downloads/). Install CP210x or CH340 USB driver if needed |

```bash
# Verify installation (all platforms)
esptool.py version
```

**PlatformIO CLI** (optional, for project builds):

| Platform | Install Command |
|----------|----------------|
| **All** | `pip install platformio` |

```bash
pio --version
```

**Arduino CLI** (optional, alternative build system):

| Platform | Install Command |
|----------|----------------|
| **macOS** | `brew install arduino-cli` |
| **Linux** | `curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh \| sh` or `snap install arduino-cli` |
| **Windows** | `winget install ArduinoSA.ArduinoCLI` or `choco install arduino-cli` |

```bash
arduino-cli version
```

> **Windows USB Drivers**: ESP32/ESP8266 boards typically use CP210x (Silicon Labs) or CH340 (WCH) USB-to-serial chips. Install the appropriate driver from the manufacturer's website if the device is not recognised in Device Manager.

### Environment Setup

Create `.env` in the skill directory or use project-level `.env`:

```bash
# Serial connection
# macOS:  /dev/tty.usbserial-0001
# Linux:  /dev/ttyUSB0 or /dev/ttyACM0
# Windows: COM3
ESP_SERIAL_PORT=auto
ESP_BAUD_RATE=460800
ESP_CHIP=esp32

# OTA settings
OTA_PASSWORD=
OTA_PORT=3232

# Device registry
DEVICE_REGISTRY_PATH=./.devices/registry.json

# mDNS discovery
MDNS_TIMEOUT=5000
```

> **Port Auto-Detection**: When `ESP_SERIAL_PORT=auto`, the skill scans platform-appropriate paths:
> - **macOS**: `/dev/tty.usb*`
> - **Linux**: `/dev/ttyUSB*`, `/dev/ttyACM*`
> - **Windows**: `COM1`–`COM256`

## Quick Start

```bash
# Discover all devices (USB + network)
npm run esp discover

# Flash firmware to USB-connected board
# macOS:  npm run esp flash -f firmware.bin -p /dev/tty.usbserial-0001
# Linux:  npm run esp flash -f firmware.bin -p /dev/ttyUSB0
# Windows: npm run esp flash -f firmware.bin -p COM3
npm run esp flash -f firmware.bin   # auto-detect port

# OTA update a networked device
npm run esp ota -f firmware.bin -t mydevice.local

# Open serial monitor
npm run esp monitor   # auto-detect port

# Check health of all registered devices
npm run esp health --all

# Get device info
npm run esp info   # auto-detect port
```

---

## Connection Detection

The skill auto-detects available connection methods and adapts commands accordingly.

### Tier 1: USB/Serial

Direct physical connection via USB cable. Used for initial flashing, debugging, and recovery.

| Capability | Details |
|------------|---------|
| Flash firmware | esptool.py write_flash |
| Serial monitor | 115200/460800 baud |
| Erase flash | Full or region erase |
| Read device info | Chip ID, MAC, flash size |
| Backup firmware | Read flash to file |

**Detection**: Scans `/dev/tty.usb*`, `/dev/ttyUSB*`, `/dev/ttyACM*`, `COM*` for active serial ports.

### Tier 2: OTA/Wi-Fi

Wireless updates via ArduinoOTA or ESP-IDF native OTA. Requires device on same network.

| Capability | Details |
|------------|---------|
| OTA firmware update | ArduinoOTA / ESP-IDF OTA |
| Health monitoring | HTTP health endpoint |
| Config provisioning | HTTP config endpoint |
| mDNS discovery | `_arduino._tcp` service browse |

**Detection**: mDNS service browse for `_arduino._tcp.local` and `_http._tcp.local`.

### Tier 3: No Devices Found

If no devices are detected:

1. **USB**:
   - **macOS**: `ls /dev/tty.usb*` — check cable, try different USB port
   - **Linux**: `ls /dev/ttyUSB* /dev/ttyACM*` — check drivers, cable, port
   - **Windows**: Open **Device Manager** → **Ports (COM & LPT)** — install CP210x/CH340 driver if missing
2. **Network**: Verify device and host on same subnet, check firewall
3. **mDNS**:
   - **macOS**: `dns-sd -B _arduino._tcp local.` (Bonjour built-in)
   - **Linux**: `avahi-browse -r _arduino._tcp` (install `avahi-utils` if needed)
   - **Windows**: `dns-sd -B _arduino._tcp local.` (requires [Bonjour SDK](https://developer.apple.com/bonjour/) or use `--network` with direct IP scanning)
4. **Permissions**:
   - **Linux**: `sudo usermod -aG dialout $USER` then re-login
   - **Windows**: Run terminal as Administrator if access denied
   - **macOS**: No special permissions needed

---

## Commands

All commands use the `npm run esp` prefix.

### esp discover

Discover devices on USB serial ports and local network via mDNS.

```bash
npm run esp discover              # All devices (USB + mDNS)
npm run esp discover --usb         # USB only
npm run esp discover --network     # Network only (mDNS)
npm run esp discover --json        # JSON output
npm run esp discover --network --timeout 10000
```

### esp flash

Flash firmware binary to a device over USB serial.

```bash
npm run esp flash -f firmware.bin                          # Auto-detect port
npm run esp flash -f firmware.bin -p /dev/tty.usbserial-0001 --chip esp32
npm run esp flash -f firmware.bin -p /dev/tty.usbserial-0001 --baud 921600 --offset 0x10000
```

### esp ota

Update firmware over Wi-Fi using ArduinoOTA or HTTP OTA.

```bash
npm run esp ota -f firmware.bin -t mydevice.local                              # By hostname
npm run esp ota -f firmware.bin -t mydevice.local --password secret123          # With auth
npm run esp ota -f firmware.bin -t 192.168.1.42 --port 3232                    # By IP
npm run esp ota -f firmware.bin -t 192.168.1.42 --method http --endpoint /update  # ESP-IDF
```

### esp monitor

Open serial monitor to device console.

```bash
npm run esp monitor -p /dev/tty.usbserial-0001                   # Default 115200 baud
npm run esp monitor -p /dev/tty.usbserial-0001 --baud 460800     # Custom baud
npm run esp monitor -p /dev/tty.usbserial-0001 --log ./device.log --timestamps
```

### esp health

Check device health via HTTP endpoint (device must expose `/health` API).

```bash
npm run esp health -t esp32-kitchen.local            # Single device
npm run esp health --all                              # All registered
npm run esp health --all --json                       # JSON output
npm run esp health -t 192.168.1.42 --endpoint /api/status
```

Devices must expose a `GET /health` endpoint returning `{ uptime, freeHeap, wifiRssi, chipTemp, version, hostname }`.

### esp config

Provision device configuration over HTTP.

```bash
npm run esp config -t mydevice.local --wifi-ssid "MyNetwork" --wifi-pass "pass123"
npm run esp config -t mydevice.local --mqtt-host broker.local --mqtt-port 1883
npm run esp config -t mydevice.local --file device-config.json
npm run esp config -p /dev/tty.usbserial-0001 --file device-config.json --serial
```

### esp batch

Run operations across multiple devices with concurrency control.

```bash
npm run esp batch ota -f firmware.bin --all                    # All devices
npm run esp batch ota -f firmware.bin --all --concurrency 3    # Limit concurrency
npm run esp batch ota -f firmware.bin --tag sensors            # By tag
npm run esp batch health --all                                 # Batch health
npm run esp batch config --all --file config.json              # Batch config
npm run esp batch ota -f firmware.bin --all --dry-run          # Preview only
```

Defaults to concurrency 2. Use `--stop-on-error` to halt on first failure.

### esp info

Get detailed device information.

```bash
npm run esp info -p /dev/tty.usbserial-0001    # USB device
npm run esp info -t mydevice.local             # Network device
```

Returns chip type, MAC, flash size, SDK version, firmware version, and hostname.

### esp erase

Erase flash memory for factory reset.

```bash
npm run esp erase -p /dev/tty.usbserial-0001                                    # Full erase (confirms)
npm run esp erase -p /dev/tty.usbserial-0001 --offset 0x10000 --size 0x100000   # Region erase
npm run esp erase -p /dev/tty.usbserial-0001 --yes                               # Skip confirmation
```

### esp backup

Read current firmware from device flash to a file.

```bash
npm run esp backup -p /dev/tty.usbserial-0001 -o backup.bin                                    # Entire flash
npm run esp backup -p /dev/tty.usbserial-0001 -o app.bin --offset 0x10000 --size 0x100000      # Region
```

---

## Device Registry

Track known devices in a JSON registry file for fleet management.

**Default path:** `.devices/registry.json`

```json
{
  "devices": [{
    "id": "esp32-kitchen-01", "alias": "Kitchen Sensor", "chip": "esp32",
    "mac": "AA:BB:CC:DD:EE:01", "hostname": "esp32-kitchen.local", "ip": "192.168.1.42",
    "port": 3232, "tags": ["sensors", "kitchen"], "firmware": "1.2.0",
    "lastSeen": "2026-02-21T10:30:00Z", "connection": "ota"
  }]
}
```

```bash
npm run esp registry add --alias "Kitchen Sensor" --mac AA:BB:CC:DD:EE:01 --hostname esp32-kitchen.local --tag sensors
npm run esp discover --register          # Auto-register discovered devices
npm run esp registry remove --id esp32-kitchen-01
npm run esp registry list
npm run esp registry tag --id esp32-kitchen-01 --tag production
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ESP_SERIAL_PORT` | auto-detect | Default serial port path |
| `ESP_BAUD_RATE` | `460800` | Serial baud rate for flashing |
| `ESP_CHIP` | `esp32` | Default chip type (`esp32`, `esp8266`, `esp32s2`, `esp32s3`, `esp32c3`) |
| `OTA_PASSWORD` | _(empty)_ | Default OTA authentication password |
| `OTA_PORT` | `3232` | Default OTA port |
| `DEVICE_REGISTRY_PATH` | `.devices/registry.json` | Path to device registry file |
| `MDNS_TIMEOUT` | `5000` | mDNS discovery timeout in ms |

---

## API Reference

```typescript
async function discoverDevices(opts?: { usb?: boolean; network?: boolean; timeout?: number }): Promise<Device[]>
async function flashFirmware(firmwarePath: string, port: string, opts?: { chip?: string; baud?: number; offset?: number }): Promise<FlashResult>
async function otaUpdate(firmwarePath: string, target: string, opts?: { port?: number; password?: string; method?: 'arduino' | 'http' }): Promise<OtaResult>
async function getHealth(target: string, opts?: { endpoint?: string }): Promise<HealthStatus>
async function pushConfig(target: string, config: Record<string, unknown>, opts?: { method?: 'http' | 'serial'; port?: string }): Promise<ConfigResult>
async function batchOperation(op: 'ota' | 'health' | 'config', targets: Device[], opts?: { concurrency?: number; stopOnError?: boolean }): Promise<BatchResult>
async function getDeviceInfo(portOrTarget: string, opts?: { method?: 'serial' | 'http' }): Promise<DeviceInfo>
async function backupFirmware(port: string, outputPath: string, opts?: { offset?: number; size?: number }): Promise<void>

interface Device {
  id: string; alias?: string; chip: 'esp32' | 'esp8266' | 'esp32s2' | 'esp32s3' | 'esp32c3';
  mac: string; hostname?: string; ip?: string; port?: number;
  tags?: string[]; firmware?: string; lastSeen?: string; connection: 'usb' | 'ota';
}
interface HealthStatus { uptime: number; freeHeap: number; wifiRssi: number; chipTemp?: number; version: string; hostname: string; }
interface BatchResult { total: number; succeeded: number; failed: number; results: { device: Device; success: boolean; error?: string }[]; }
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Port is busy` | Another process holds the serial port | Close serial monitors, IDE terminals, or other flashers |
| `Permission denied` on port | User lacks serial port access | Linux: `sudo usermod -aG dialout $USER` then re-login. Windows: run as Administrator |
| `Failed to connect` | Device not in download mode or bad cable | Hold BOOT button while connecting, try a different USB cable |
| `Chip mismatch` | Wrong `--chip` flag for connected device | Use `npm run esp info` to detect chip, set `ESP_CHIP` accordingly |
| `OTA timeout` | Device unreachable or firewall blocking | Verify same subnet, check port `3232` is open, ping hostname |
| `OTA auth failed` | Incorrect OTA password | Check `OTA_PASSWORD` matches device firmware setting |
| `MD5 mismatch` | Corrupted firmware binary or transfer error | Re-download binary, verify checksum, retry |
| `esptool.py not found` | esptool not installed or not in PATH | `pip install esptool` and ensure it is on PATH |
| `mDNS timeout` | No devices advertising or mDNS disabled | Check device firmware includes mDNS, increase `MDNS_TIMEOUT` |
| `Health endpoint unreachable` | Device has no HTTP health server | Ensure firmware exposes `GET /health` endpoint |
| `COM port not found` (Windows) | USB driver not installed or wrong COM port | Install CP210x/CH340 driver, check Device Manager for correct COM number |
| `Access is denied` (Windows) | Port locked by another process or needs elevation | Close other serial tools, run terminal as Administrator |

---

## Examples

### 1. Flash a Development Board

```bash
npm run esp discover --usb
npm run esp info -p /dev/tty.usbserial-0001
npm run esp erase -p /dev/tty.usbserial-0001 --yes
npm run esp flash -f firmware.bin -p /dev/tty.usbserial-0001
npm run esp monitor -p /dev/tty.usbserial-0001
npm run esp registry add --alias "Dev Board" --mac AA:BB:CC:DD:EE:01 --tag dev
```

### 2. OTA Fleet Update

```bash
npm run esp batch health --tag production --json > pre-update-health.json
npm run esp backup -p /dev/tty.usbserial-0001 -o firmware-prev.bin
npm run esp batch ota -f firmware-v1.3.0.bin --tag production --dry-run
npm run esp batch ota -f firmware-v1.3.0.bin --tag production --concurrency 3
npm run esp batch health --tag production
```

### 3. Health Check Dashboard

Monitor all devices and output structured data:

```bash
# JSON health for all devices
npm run esp health --all --json

# Filter unhealthy devices (low heap or weak signal)
# macOS / Linux (requires jq)
npm run esp health --all --json | jq '.[] | select(.freeHeap < 50000 or .wifiRssi < -70)'
# Windows (PowerShell)
npm run esp health --all --json | ConvertFrom-Json | Where-Object { $_.freeHeap -lt 50000 -or $_.wifiRssi -lt -70 }

# Watch health every 60 seconds
# macOS / Linux
watch -n 60 'npm run esp health --all --json'
# Windows (PowerShell)
while ($true) { npm run esp health --all --json; Start-Sleep -Seconds 60 }
```

### 4. Provision a New Device

```bash
npm run esp flash -f firmware.bin -p /dev/tty.usbserial-0001
npm run esp config -p /dev/tty.usbserial-0001 --serial --file initial-config.json
npm run esp discover --network && npm run esp discover --register
npm run esp health -t newdevice.local
```

**`initial-config.json`:** `{ "wifi": { "ssid": "...", "password": "..." }, "mqtt": { "host": "mqtt.local", "port": 1883 }, "hostname": "esp32-new-sensor" }`

---

## Performance Tips

1. **Increase Baud Rate** for faster USB flashing:
   ```bash
   npm run esp flash -f firmware.bin -p /dev/tty.usbserial-0001 --baud 921600
   ```

2. **Limit Batch Concurrency** to avoid network saturation:
   ```bash
   npm run esp batch ota -f firmware.bin --all --concurrency 2
   ```

3. **Use Tags** to scope operations to device subsets:
   ```bash
   npm run esp batch health --tag kitchen
   ```

4. **Auto-Register on Discover** to keep registry current:
   ```bash
   npm run esp discover --register
   ```

5. **Compressed OTA** — use gzip-compressed firmware to reduce OTA transfer time:
   ```bash
   # macOS / Linux
   gzip -k firmware.bin
   # Windows (PowerShell)
   # Compress-Archive -Path firmware.bin -DestinationPath firmware.bin.gz
   npm run esp ota -f firmware.bin.gz -t mydevice.local --compressed
   ```

---

version: 1.1.0
updated: 2026-03-03
reviewed: 2026-03-03
score: 4.6
---
