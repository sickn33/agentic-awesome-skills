---
name: linux-shell-scripting
description: "Provide production-ready shell script templates for common Linux system administration tasks including backups, monitoring, user management, log analysis, and automation. These scripts serve as building blocks for security operations and penetration testing environments."
risk: unknown
source: community
author: zebbern
date_added: "2026-02-27"
---

# Linux Production Shell Scripts

## Purpose

Provide production-ready shell script templates for common Linux system administration tasks including backups, monitoring, user management, log analysis, and automation. These scripts serve as building blocks for security operations and penetration testing environments.

## Prerequisites

### Required Environment
- Linux/Unix system (bash shell)
- Appropriate permissions for tasks
- Required utilities installed (rsync, openssl, etc.)

### Required Knowledge
- Basic bash scripting
- Linux file system structure
- System administration concepts

## Outputs and Deliverables

1. **Backup Solutions** - Automated file and database backups
2. **Monitoring Scripts** - Resource usage tracking
3. **Automation Tools** - Scheduled task execution
4. **Security Scripts** - Password management, encryption

## Core Workflow

### Phase 1: File Backup Scripts

**Basic Directory Backup**
```bash
#!/bin/bash
backup_dir="/path/to/backup"
source_dir="/path/to/source"

# Create a timestamped backup of the source directory
tar -czf "$backup_dir/backup_$(date +%Y%m%d_%H%M%S).tar.gz" "$source_dir"
echo "Backup completed: backup_$(date +%Y%m%d_%H%M%S).tar.gz"
```

**Remote Server Backup**
```bash
#!/bin/bash
source_dir="/path/to/source"
remote_server="user@remoteserver:/path/to/backup"

# Backup files/directories to a remote server using rsync
rsync -avz --progress "$source_dir" "$remote_server"
echo "Files backed up to remote server."
```

**Backup Rotation Script**
```bash
#!/bin/bash
backup_dir="/path/to/backups"
max_backups=5

# Rotate backups by deleting the oldest if more than max_backups
while [ $(ls -1 "$backup_dir" | wc -l) -gt "$max_backups" ]; do
    oldest_backup=$(ls -1t "$backup_dir" | tail -n 1)
    rm -r "$backup_dir/$oldest_backup"
    echo "Removed old backup: $oldest_backup"
done
echo "Backup rotation completed."
```

**Database Backup Script**
```bash
#!/bin/bash
database_name="your_database"
db_user="username"
db_pass="password"
output_file="database_backup_$(date +%Y%m%d).sql"

# Perform database backup using mysqldump
mysqldump -u "$db_user" -p"$db_pass" "$database_name" > "$output_file"
gzip "$output_file"
echo "Database backup created: $output_file.gz"
```

### Phase 2: System Monitoring Scripts

**CPU Usage Monitor**
```bash
#!/bin/bash
threshold=90

# Monitor CPU usage and trigger alert if threshold exceeded
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1)

if [ "$cpu_usage" -gt "$threshold" ]; then
    echo "ALERT: High CPU usage detected: $cpu_usage%"
    # Add notification logic (email, slack, etc.)
    # mail -s "CPU Alert" admin@example.com <<< "CPU usage: $cpu_usage%"
fi
```

**Disk Space Monitor**
```bash
#!/bin/bash
threshold=90
partition="/dev/sda1"

# Monitor disk usage and trigger alert if threshold exceeded
disk_usage=$(df -h | grep "$partition" | awk '{print $5}' | cut -d% -f1)

if [ "$disk_usage" -gt "$threshold" ]; then
    echo "ALERT: High disk usage detected: $disk_usage%"
    # Add alert/notification logic here
fi
```

**CPU Usage Logger**
```bash
#!/bin/bash
output_file="cpu_usage_log.txt"

# Log current CPU usage to a file with timestamp
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
cpu_usage=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d. -f1)
echo "$timestamp - CPU Usage: $cpu_usage%" >> "$output_file"
echo "CPU usage logged."
```

**System Health Check**
```bash
#!/bin/bash
output_file="system_health_check.txt"

# Perform system health check and save results to a file
{
    echo "System Health Check - $(date)"
    echo "================================"
    echo ""
    echo "Uptime:"
    uptime
    echo ""
    echo "Load Average:"
    cat /proc/loadavg
    echo ""
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Disk Usage:"
    df -h
    echo ""
    echo "Top Processes:"
    ps aux --sort=-%cpu | head -10
} > "$output_file"

echo "System health check saved to $output_file"
```

### Phase 3: User Management Scripts

**User Account Creation**
```bash
#!/bin/bash
username="newuser"

# Check if user exists; if not, create new user
if id "$username" &>/dev/null; then
    echo "User $username already exists."
else
    useradd -m -s /bin/bash "$username"
    echo "User $username created."
    
    # Set password interactively
    passwd "$username"
fi
```

**Password Expiry Checker**
```bash
#!/bin/bash
output_file="password_expiry_report.txt"

# Check password expiry for users with bash shell
echo "Password Expiry Report - $(date)" > "$output_file"
echo "=================================" >> "$output_file"

IFS=$'\n'
for user in $(grep "/bin/bash" /etc/passwd | cut -d: -f1); do
    password_expires=$(chage -l "$user" 2>/dev/null | grep "Password expires" | awk -F: '{print $2}')
    echo "User: $user - Password Expires: $password_expires" >> "$output_file"
done
unset IFS

echo "Password expiry report saved to $output_file"
```

### Phase 4: Security Scripts

**Password Generator**
```bash
#!/bin/bash
length=${1:-16}

# Generate a random password
password=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9!@#$%^&*' | head -c"$length")
echo "Generated password: $password"
```

**File Encryption Script**
```bash
#!/bin/bash
file="$1"
action="${2:-encrypt}"

if [ -z "$file" ]; then
    echo "Usage: $0 <file> [encrypt|decrypt]"
    exit 1
fi

if [ "$action" == "encrypt" ]; then
    # Encrypt file using AES-256-CBC
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$file" -out "$file.enc"
    echo "File encrypted: $file.enc"
elif [ "$action" == "decrypt" ]; then
    # Decrypt file
    output_file="${file%.enc}"
    openssl enc -aes-256-cbc -d -pbkdf2 -in "$file" -out "$output_file"
    echo "File decrypted: $output_file"
fi
```

### Phase 5: Log Analysis Scripts

**Error Log Extractor**
```bash
#!/bin/bash
logfile="${1:-/var/log/syslog}"
output_file="error_log_$(date +%Y%m%d).txt"

# Extract lines with "ERROR" from the log file
grep -i "error\|fail\|critical" "$logfile" > "$output_file"
echo "Error log created: $output_file"
echo "Total errors found: $(wc -l < "$output_file")"
```

**Web Server Log Analyzer**
```bash
#!/bin/bash
log_file="${1:-/var/log/apache2/access.log}"

echo "Web Server Log Analysis"
echo "========================"
echo ""
echo "Top 10 IP Addresses:"
awk '{print $1}' "$log_file" | sort | uniq -c | sort -rn | head -10
echo ""
echo "Top 10 Requested URLs:"
awk '{print $7}' "$log_file" | sort | uniq -c | sort -rn | head -10
echo ""
echo "HTTP Status Code Distribution:"
awk '{print $9}' "$log_file" | sort | uniq -c | sort -rn
```

### Phase 6: Network Scripts

**Network Connectivity Checker**
```bash
#!/bin/bash
hosts=("8.8.8.8" "1.1.1.1" "google.com")

echo "Network Connectivity Check"
echo "=========================="

for host in "${hosts[@]}"; do
    if ping -c 1 -W 2 "$host" &>/dev/null; then
        echo "[UP] $host is reachable"
    else
        echo "[DOWN] $host is unreachable"
    fi
done
```

**Website Uptime Checker**
```bash
#!/bin/bash
websites=("https://google.com" "https://github.com")
log_file="uptime_log.txt"

echo "Website Uptime Check - $(date)" >> "$log_file"

for website in "${websites[@]}"; do
    if curl --output /dev/null --silent --head --fail --max-time 10 "$website"; then
        echo "[UP] $website is accessible" | tee -a "$log_file"
    else
        echo "[DOWN] $website is inaccessible" | tee -a "$log_file"
    fi
done
```

**Network Interface Info**
```bash
#!/bin/bash
interface="${1:-eth0}"

echo "Network Interface Information: $interface"
echo "========================================="
ip addr show "$interface" 2>/dev/null || ifconfig "$interface" 2>/dev/null
echo ""
echo "Routing Table:"
ip route | grep "$interface"
```

### Phase 7: Automation Scripts

**Automated Package Installation**
```bash
#!/bin/bash
packages=("vim" "htop" "curl" "wget" "git")

echo "Installing packages..."

for package in "${packages[@]}"; do
    if dpkg -l | grep -q "^ii  $package"; then
        echo "[SKIP] $package is already installed"
    else
        sudo apt-get install -y "$package"
        echo "[INSTALLED] $package"
    fi
done

echo "Package installation completed."
```

**Task Scheduler (Cron Setup)**
```bash
#!/bin/bash
scheduled_task="/path/to/your_script.sh"
schedule_time="0 2 * * *"  # Run at 2 AM daily

# Add task to crontab
(crontab -l 2>/dev/null; echo "$schedule_time $scheduled_task") | crontab -
echo "Task scheduled: $schedule_time $scheduled_task"
```

**Service Restart Script**
```bash
#!/bin/bash
service_name="${1:-apache2}"

# Restart a specified service
if systemctl is-active --quiet "$service_name"; then
    echo "Restarting $service_name..."
    sudo systemctl restart "$service_name"
    echo "Service $service_name restarted."
else
    echo "Service $service_name is not running. Starting..."
    sudo systemctl start "$service_name"
    echo "Service $service_name started."
fi
```

### Phase 8: File Operations

**Directory Synchronization**
```bash
#!/bin/bash
source_dir="/path/to/source"
destination_dir="/path/to/destination"

# Synchronize directories using rsync
rsync -avz --delete "$source_dir/" "$destination_dir/"
echo "Directories synchronized successfully."
```

**Data Cleanup Script**
```bash
#!/bin/bash
directory="${1:-/tmp}"
days="${2:-7}"

echo "Cleaning files older than $days days in $directory"

# Remove files older than specified days
find "$directory" -type f -mtime +"$days" -exec rm -v {} \;
echo "Cleanup completed."
```

**Folder Size Checker**
```bash
#!/bin/bash
folder_path="${1:-.}"

echo "Folder Size Analysis: $folder_path"
echo "===================================="

# Display sizes of subdirectories sorted by size
du -sh "$folder_path"/* 2>/dev/null | sort -rh | head -20
echo ""
echo "Total size:"
du -sh "$folder_path"
```

### Phase 9: System Information

**System Info Collector**
```bash
#!/bin/bash
output_file="system_info_$(hostname)_$(date +%Y%m%d).txt"

{
    echo "System Information Report"
    echo "Generated: $(date)"
    echo "========================="
    echo ""
    echo "Hostname: $(hostname)"
    echo "OS: $(uname -a)"
    echo ""
    echo "CPU Info:"
    lscpu | grep -E "Model name|CPU\(s\)|Thread"
    echo ""
    echo "Memory:"
    free -h
    echo ""
    echo "Disk Space:"
    df -h
    echo ""
    echo "Network Interfaces:"
    ip -br addr
    echo ""
    echo "Logged In Users:"
    who
} > "$output_file"

echo "System info saved to $output_file"
```

### Phase 10: Git and Development

**Git Repository Updater**
```bash
#!/bin/bash
git_repos=("/path/to/repo1" "/path/to/repo2")

for repo in "${git_repos[@]}"; do
    if [ -d "$repo/.git" ]; then
        echo "Updating repository: $repo"
        cd "$repo"
        git fetch --all
        git pull origin "$(git branch --show-current)"
        echo "Updated: $repo"
    else
        echo "Not a git repository: $repo"
    fi
done

echo "All repositories updated."
```

**Remote Script Execution**
```bash
#!/bin/bash
remote_server="${1:-user@remote-server}"
remote_script="${2:-/path/to/remote/script.sh}"

# Execute a script on a remote server via SSH
ssh "$remote_server" "bash -s" < "$remote_script"
echo "Remote script executed on $remote_server"
```

## Quick Reference

### Common Script Patterns

| Pattern | Purpose |
|---------|---------|
| `#!/bin/bash` | Shebang for bash |
| `$(date +%Y%m%d)` | Date formatting |
| `$((expression))` | Arithmetic |
| `${var:-default}` | Default value |
| `"$@"` | All arguments |

### Useful Commands

| Command | Purpose |
|---------|---------|
| `chmod +x script.sh` | Make executable |
| `./script.sh` | Run script |
| `nohup ./script.sh &` | Run in background |
| `crontab -e` | Edit cron jobs |
| `source script.sh` | Run in current shell |

### Cron Format
Minute(0-59) Hour(0-23) Day(1-31) Month(1-12) Weekday(0-7, 0/7=Sun)

## Constraints and Limitations

- Always test scripts in non-production first
- Use absolute paths to avoid errors
- Quote variables to handle spaces properly
- Many scripts require root/sudo privileges
- Use `bash -x script.sh` for debugging

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
