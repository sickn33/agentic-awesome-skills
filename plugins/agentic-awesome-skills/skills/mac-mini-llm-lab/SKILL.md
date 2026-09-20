---
name: mac-mini-llm-lab
description: Configure a Mac mini as a reliable local LLM server with remote access,
  observability, and power-safe operation. Use when building an always-on private
  AI inference server on Apple Silicon.
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

# Mac mini LLM Lab

Turn a Mac mini into a low-noise, always-on local AI appliance.

## When to Use This Skill

Use this skill when:
- Setting up a dedicated local LLM inference server
- Building a private AI development environment
- Need always-on model serving without cloud costs
- Running models that require Apple Silicon unified memory (32-192GB)
- Creating a home lab AI server for a small team

## Prerequisites

- Mac mini with Apple Silicon (M2/M3/M4, 16GB+ unified memory recommended)
- macOS Sonoma 14+ or Sequoia 15+
- Ethernet connection (recommended over Wi-Fi)
- UPS for power protection (optional but recommended)

## Initial System Setup

```bash
# Update macOS
softwareupdate --install --all

# Install Xcode command-line tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Core packages
brew install tmux htop btop wget jq git neovim

# Python environment (for MLX and custom scripts)
brew install python@3.12 uv

# Monitoring
brew install prometheus node_exporter
```

## Ollama Setup

```bash
# Install Ollama
brew install ollama

# Pull models based on your RAM
# 16GB Mac mini:
ollama pull llama3.1:8b
ollama pull nomic-embed-text
ollama pull codellama:7b

# 32GB Mac mini:
ollama pull llama3.1:8b
ollama pull qwen2.5:14b
ollama pull deepseek-coder-v2:16b
ollama pull nomic-embed-text

# 64GB+ Mac mini:
ollama pull llama3.1:70b
ollama pull qwen2.5:32b
ollama pull codellama:34b

# Verify Metal acceleration
ollama run llama3.1:8b --verbose
# Look for: "metal" in output
```

## MLX Framework (Apple Silicon Native)

MLX runs models natively on Apple Silicon with excellent performance:

```bash
# Install MLX
uv pip install mlx mlx-lm

# Run a model
python3 -c "
from mlx_lm import load, generate
model, tokenizer = load('mlx-community/Llama-3.1-8B-Instruct-4bit')
response = generate(model, tokenizer, prompt='Explain Docker in 3 sentences', max_tokens=200)
print(response)
"

# MLX server (OpenAI-compatible API)
uv pip install mlx-lm[server]
mlx_lm.server --model mlx-community/Llama-3.1-8B-Instruct-4bit --port 8080
```

## Auto-Start with launchd

```xml
<!-- ~/Library/LaunchAgents/com.ollama.serve.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.serve</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_HOST</key>
        <string>0.0.0.0</string>
        <key>OLLAMA_NUM_PARALLEL</key>
        <string>4</string>
        <key>OLLAMA_MAX_LOADED_MODELS</key>
        <string>2</string>
        <key>OLLAMA_FLASH_ATTENTION</key>
        <string>1</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ollama.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ollama.err</string>
</dict>
</plist>
```

```bash
# Load the service
launchctl load ~/Library/LaunchAgents/com.ollama.serve.plist

# Check status
launchctl list | grep ollama

# Unload if needed
launchctl unload ~/Library/LaunchAgents/com.ollama.serve.plist
```

## Power & Reliability

```bash
# Prevent sleep (keeps running with lid closed on Mac mini)
sudo pmset -a disablesleep 1
sudo pmset -a sleep 0

# Auto-restart after power failure
sudo pmset -a autorestart 1

# Schedule weekly reboot (Sunday 4 AM)
sudo pmset repeat shutdown MTWRFSU 03:55:00
sudo pmset repeat poweron MTWRFSU 04:00:00

# Check power settings
pmset -g
```

## Remote Access

### Tailscale (Recommended)

```bash
# Install Tailscale for easy secure remote access
brew install --cask tailscale

# Enable from menu bar, authenticate
# Access your Mac mini from anywhere: http://mac-mini:11434
```

### SSH Hardening

```bash
# Enable remote login
sudo systemsetup -setremotelogin on

# Edit SSH config
sudo nano /etc/ssh/sshd_config
# Add:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin no
# AllowUsers yourusername

# Restart SSH
sudo launchctl unload /System/Library/LaunchDaemons/ssh.plist
sudo launchctl load /System/Library/LaunchDaemons/ssh.plist
```

### Reverse Proxy with Caddy

```bash
brew install caddy

# Caddyfile
cat > /opt/homebrew/etc/Caddyfile << 'EOF'
llm.local:443 {
    tls internal
    reverse_proxy localhost:11434

    @api path /v1/*
    handle @api {
        reverse_proxy localhost:11434
    }
}

webui.local:443 {
    tls internal
    reverse_proxy localhost:3000
}
EOF

brew services start caddy
```

## Open WebUI Setup

```bash
# Run Open WebUI via Docker
docker run -d \
  --name open-webui \
  -p 3000:8080 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -e WEBUI_AUTH=true \
  -v open-webui:/app/backend/data \
  --restart unless-stopped \
  ghcr.io/open-webui/open-webui:main

# Or install Docker first if not available
brew install --cask docker
```

## Monitoring

```bash
# Health check script
cat > ~/scripts/llm-health.sh << 'SCRIPT'
#!/bin/bash
# Check Ollama
if curl -sf http://localhost:11434/api/tags > /dev/null; then
    echo "$(date): Ollama OK"
    curl -s http://localhost:11434/api/ps | python3 -m json.tool
else
    echo "$(date): Ollama DOWN"
    # Restart
    launchctl kickstart -k gui/$(id -u)/com.ollama.serve
fi

# System stats
echo "CPU: $(top -l 1 -n 0 | grep 'CPU usage')"
echo "Memory: $(vm_stat | head -5)"
echo "Disk: $(df -h / | tail -1)"
echo "Thermal: $(sudo powermetrics --samplers smc -n 1 2>/dev/null | grep 'CPU die' || echo 'N/A')"
SCRIPT
chmod +x ~/scripts/llm-health.sh

# Schedule health check every 5 minutes
# Add to crontab: crontab -e
# */5 * * * * ~/scripts/llm-health.sh >> ~/logs/llm-health.log 2>&1
```

### Memory Usage by Model

| Model | RAM Required | Tokens/sec (M2) | Tokens/sec (M4) |
|-------|-------------|-----------------|-----------------|
| llama3.1:8b (Q4) | ~5 GB | ~25 t/s | ~45 t/s |
| qwen2.5:14b (Q4) | ~9 GB | ~15 t/s | ~30 t/s |
| llama3.1:70b (Q4) | ~40 GB | ~5 t/s | ~10 t/s |
| nomic-embed-text | ~300 MB | N/A | N/A |
| codellama:13b | ~8 GB | ~18 t/s | ~35 t/s |

## Security Checklist

```bash
# Enable FileVault disk encryption
sudo fdesetup enable

# Enable firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on

# Disable unnecessary sharing services
sudo launchctl disable system/com.apple.screensharing
sudo launchctl disable system/com.apple.AirPlayXPCHelper

# Set strong admin password
# System Settings > Users & Groups

# Restrict Ollama to local network only (if not using Tailscale)
# Set OLLAMA_HOST=127.0.0.1 in launchd plist
```

## Performance Tuning

```bash
# Increase file descriptor limits for concurrent requests
sudo launchctl limit maxfiles 65536 200000

# Check unified memory pressure
memory_pressure

# Monitor GPU usage (Metal)
sudo powermetrics --samplers gpu_power -n 1

# Optimize for inference (disable Spotlight indexing on model dirs)
mdutil -i off ~/.ollama
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Model loading slow | First load caches to memory; subsequent loads are fast |
| Out of memory | Use smaller quantization (Q4_K_M), reduce `OLLAMA_MAX_LOADED_MODELS` |
| Mac sleeping | Run `sudo pmset -a disablesleep 1` |
| Ollama not starting | Check `launchctl list | grep ollama`, view `/tmp/ollama.err` |
| Slow over Wi-Fi | Use Ethernet; Wi-Fi adds latency to streaming responses |
| Thermal throttling | Ensure adequate ventilation, check `powermetrics` |

## Related Skills

- ollama-stack (`ollama-stack`) — Software stack with Docker Compose and LiteLLM
- ssh-configuration (`ssh-configuration`) — Secure remote access
- vpn-setup (`vpn-setup`) — Remote access via WireGuard/Tailscale

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

