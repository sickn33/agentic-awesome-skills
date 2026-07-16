---
name: computer-use-agents
description: Build AI agents that interact with computers like humans do -
  viewing screens, moving cursors, clicking buttons, and typing text. Covers
  Anthropic's Computer Use, OpenAI's Operator/CUA, and open-source alternatives.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Computer Use Agents

Build AI agents that interact with computers like humans do - viewing screens,
moving cursors, clicking buttons, and typing text. Covers Anthropic's Computer
Use, OpenAI's Operator/CUA, and open-source alternatives. Critical focus on
sandboxing, security, and handling the unique challenges of vision-based control.

## Patterns

### Perception-Reasoning-Action Loop

The fundamental architecture of computer use agents: observe screen,
reason about next action, execute action, repeat. This loop integrates
vision models with action execution through an iterative pipeline.

Key components:
1. PERCEPTION: Screenshot captures current screen state
2. REASONING: Vision-language model analyzes and plans
3. ACTION: Execute mouse/keyboard operations
4. FEEDBACK: Observe result, continue or correct

Critical insight: Vision agents are completely still during "thinking"
phase (1-5 seconds), creating a detectable pause pattern.

**When to use**: Building any computer use agent from scratch,Integrating vision models with desktop control,Understanding agent behavior patterns

from anthropic import Anthropic
from PIL import Image
import base64
import pyautogui
import time

class ComputerUseAgent:
    """
    Perception-Reasoning-Action loop implementation.
    Based on Anthropic Computer Use patterns.
    """

    def __init__(self, client: Anthropic, model: str = "claude-sonnet-4-20250514"):
        self.client = client
        self.model = model
        self.max_steps = 50  # Prevent runaway loops
        self.action_delay = 0.5  # Seconds between actions

    def capture_screenshot(self) -> str:
        """Capture screen and return base64 encoded image."""
        screenshot = pyautogui.screenshot()
        # Resize for token efficiency (1280x800 is good balance)
        screenshot = screenshot.resize((1280, 800), Image.LANCZOS)

        import io
        buffer = io.BytesIO()
        screenshot.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()

    def execute_action(self, action: dict) -> dict:
        """Execute mouse/keyboard action on the computer."""
        action_type = action.get("type")

        if action_type == "click":
            x, y = action["x"], action["y"]
            button = action.get("button", "left")
            pyautogui.click(x, y, button=button)
            return {"success": True, "action": f"clicked at ({x}, {y})"}

        elif action_type == "type":
            text = action["text"]
            pyautogui.typewrite(text, interval=0.02)
            return {"success": True, "action": f"typed {len(text)} chars"}

        elif action_type == "key":
            key = action["key"]
            pyautogui.press(key)
            return {"success": True, "action": f"pressed {key}"}

        elif action_type == "scroll":
            direction = action.get("direction", "down")
            amount = action.get("amount", 3)
            scroll = -amount if direction == "down" else amount
            pyautogui.scroll(scroll)
            return {"success": True, "action": f"scrolled {direction}"}

        elif action_type == "move":
            x, y = action["x"], action["y"]
            pyautogui.moveTo(x, y)
            return {"success": True, "action": f"moved to ({x}, {y})"}

        else:
            return {"success": False, "error": f"Unknown action: {action_type}"}

    def run(self, task: str) -> dict:
        """
        Run perception-reasoning-action loop until task complete.

        The loop:
        1. Screenshot current state
        2. Send to vision model with task context
        3. Parse action from response
        4. Execute action
        5. Repeat until done or max steps
        """
        messages = []
        step_count = 0

        system_prompt = """You are a computer use agent. You can see the screen
        and control mouse/keyboard.

        Available actions (respond with JSON):
        - {"type": "click", "x": 100, "y": 200, "button": "left"}
        - {"type": "type", "text": "hello world"}
        - {"type": "key", "key": "enter"}
        - {"type": "scroll", "direction": "down", "amount": 3}
        - {"type": "done", "result": "task completed successfully"}

        Always respond with ONLY a JSON action object.
        Be precise with coordinates - click exactly where needed.
        If you see an error, try to recover.
        """

        while step_count < self.max_steps:
            step_count += 1

            # 1. PERCEPTION: Capture current screen
            screenshot_b64 = self.capture_screenshot()

            # 2. REASONING: Send to vision model
            user_content = [
                {"type": "text", "text": f"Task: {task}\n\nStep {step_count}. What action should I take?"},
                {"type": "image", "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": screenshot_b64
                }}
            ]

            messages.append({"role": "user", "content": user_content})

            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages
            )

            assistant_message = response.content[0].text
            messages.append({"role": "assistant", "content": assistant_message})

            # 3. Parse action from response
            import json
            try:
                action = json.loads(assistant_message)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                match = re.search(r'\{[^}]+\}', assistant_message)
                if match:
                    action = json.loads(match.group())
                else:
                    continue

            # Check if done
            if action.get("type") == "done":
                return {
                    "success": True,
                    "result": action.get("result"),
                    "steps": step_count
                }

            # 4. ACTION: Execute
            result = self.execute_action(action)

            # Small delay for UI to update
            time.sleep(self.action_delay)

        return {
            "success": False,
            "error": "Max steps reached",
            "steps": step_count
        }

# Usage
agent = ComputerUseAgent(Anthropic())
result = agent.run("Open Chrome and search for 'weather today'")

### Anti_patterns

- Running without step limits (infinite loops)
- No delay between actions (UI can't keep up)
- Screenshots at full resolution (token explosion)
- Ignoring action failures (no recovery)

### Sandboxed Environment Pattern

Computer use agents MUST run in isolated, sandboxed environments.
Never give agents direct access to your main system - the security
risks are too high. Use Docker containers with virtual desktops.

Key isolation requirements:
1. NETWORK: Restrict to necessary endpoints only
2. FILESYSTEM: Read-only or scoped to temp directories
3. CREDENTIALS: No access to host credentials
4. SYSCALLS: Filter dangerous system calls
5. RESOURCES: Limit CPU, memory, time

The goal is "blast radius minimization" - if the agent goes wrong,
damage is contained to the sandbox.

**When to use**: Deploying any computer use agent,Testing agent behavior safely,Running untrusted automation tasks

# Dockerfile for sandboxed computer use environment
# Based on Anthropic's reference implementation pattern

FROM ubuntu:22.04

# Install desktop environment
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    xterm \
    firefox \
    python3 \
    python3-pip \
    supervisor

# Security: Create non-root user
RUN useradd -m -s /bin/bash agent && \
    mkdir -p /home/agent/.vnc

# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip3 install -r /tmp/requirements.txt

# Security: Drop capabilities
RUN apt-get install -y --no-install-recommends libcap2-bin && \
    setcap -r /usr/bin/python3 || true

# Copy agent code
COPY --chown=agent:agent . /app
WORKDIR /app

# Supervisor config for virtual display + VNC
COPY supervisord.conf /etc/supervisor/conf.d/

# Expose VNC port only (not desktop directly)
EXPOSE 5900

# Run as non-root
USER agent

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

---

# docker-compose.yml with security constraints
version: '3.8'

services:
  computer-use-agent:
    build: .
    ports:
      - "5900:5900"  # VNC for observation
      - "8080:8080"  # API for control

    # Security constraints
    security_opt:
      - no-new-privileges:true
      - seccomp:seccomp-profile.json

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 1G

    # Network isolation
    networks:
      - agent-network

    # No access to host filesystem
    volumes:
      - agent-tmp:/tmp

    # Read-only root filesystem
    read_only: true
    tmpfs:
      - /run
      - /var/run

    # Environment
    environment:
      - DISPLAY=:99
      - NO_PROXY=localhost

networks:
  agent-network:
    driver: bridge
    internal: true  # No internet by default

volumes:
  agent-tmp:

---

# Python wrapper with additional runtime sandboxing
import subprocess
import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class SandboxConfig:
    """Configuration for agent sandbox."""
    network_allowed: list[str] = None  # Allowed domains
    max_runtime_seconds: int = 300
    max_memory_mb: int = 2048
    allow_downloads: bool = False
    allow_clipboard: bool = False

class SandboxedAgent:
    """
    Run computer use agent in Docker sandbox.
    """

    def __init__(self, config: SandboxConfig):
        self.config = config
        self.container_id: Optional[str] = None

    def start(self):
        """Start sandboxed environment."""
        # Build network rules
        network_rules = ""
        if self.config.network_allowed:
            for domain in self.config.network_allowed:
                network_rules += f"--add-host={domain}:$(dig +short {domain}) "
        else:
            network_rules = "--network=none"

        cmd = f"""
        docker run -d \
            --name computer-use-sandbox-$$ \
            --security-opt no-new-privileges \
            --cap-drop ALL \
            --memory {self.config.max_memory_mb}m \
            --cpus 2 \
            --read-only \
            --tmpfs /tmp \
            {network_rules} \
            computer-use-agent:latest
        """

        result = subprocess.run(cmd, shell=True, capture_output=True)
        self.container_id = result.stdout.decode().strip()

        # Set up kill timer
        subprocess.Popen([
            "sh", "-c",
            f"sleep {self.config.max_runtime_seconds} && docker kill {self.container_id}"
        ])

        return self.container_id

    def execute_task(self, task: str) -> dict:
        """Execute task in sandbox."""
        if not self.container_id:
            self.start()

        # Send task to agent via API
        import requests
        response = requests.post(
            f"http://localhost:8080/task",
            json={"task": task},
            timeout=self.config.max_runtime_seconds
        )

        return response.json()

    def stop(self):
        """Stop and remove sandbox."""
        if self.container_id:
            subprocess.run(f"docker rm -f {self.container_id}", shell=True)
            self.container_id = None

### Anti_patterns

- Running agents on host system directly
- Giving sandbox full network access
- Running as root in container
- No resource limits (denial of service)
- Persistent storage (data can leak between runs)

### Anthropic Computer Use Implementation

Official implementation pattern using Claude's computer use capability.
Claude 3.5 Sonnet was the first frontier model to offer computer use.
Claude Opus 4.5 is now the "best model in the world for computer use."

Key capabilities:
- screenshot: Capture current screen state
- mouse: Click, move, drag operations
- keyboard: Type text, press keys
- bash: Run shell commands
- text_editor: View and edit files

Tool versions:
- computer_20251124 (Opus 4.5): Adds zoom action for detailed inspection
- computer_20250124 (All other models): Standard capabilities

Critical limitation: "Some UI elements (like dropdowns and scrollbars)
might be tricky for Claude to manipulate" - Anthropic docs

**When to use**: Building production computer use agents,Need highest quality vision understanding,Full desktop control (not just browser)

from anthropic import Anthropic
from anthropic.types.beta import (
    BetaToolComputerUse20241022,
    BetaToolBash20241022,
    BetaToolTextEditor20241022,
)
import subprocess
import base64
from PIL import Image
import io

class AnthropicComputerUse:
    """
    Official Anthropic Computer Use implementation.

    Requires:
    - Docker container with virtual display
    - VNC for viewing agent actions
    - Proper tool implementations
    """

    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-sonnet-4-20250514"  # Best for computer use
        self.screen_size = (1280, 800)

    def get_tools(self) -> list:
        """Define computer use tools."""
        return [
            BetaToolComputerUse20241022(
                type="computer_20241022",
                name="computer",
                display_width_px=self.screen_size[0],
                display_height_px=self.screen_size[1],
            ),
            BetaToolBash20241022(
                type="bash_20241022",
                name="bash",
            ),
            BetaToolTextEditor20241022(
                type="text_editor_20241022",
                name="str_replace_editor",
            ),
        ]

    def execute_tool(self, name: str, input: dict) -> dict:
        """Execute a tool and return result."""

        if name == "computer":
            return self._handle_computer_action(input)
        elif name == "bash":
            return self._handle_bash(input)
        elif name == "str_replace_editor":
            return self._handle_editor(input)
        else:
            return {"error": f"Unknown tool: {name}"}

    def _handle_computer_action(self, input: dict) -> dict:
        """Handle computer control actions."""
        action = input.get("action")

        if action == "screenshot":
            # Capture via xdotool/scrot
            subprocess.run(["scrot", "/tmp/screenshot.png"])

            with open("/tmp/screenshot.png", "rb") as f:
                img_data = f.read()

            # Resize for efficiency
            img = Image.open(io.BytesIO(img_data))
            img = img.resize(self.screen_size, Image.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format="PNG")

            return {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": base64.b64encode(buffer.getvalue()).decode()
                }
            }

        elif action == "mouse_move":
            x, y = input.get("coordinate", [0, 0])
            subprocess.run(["xdotool", "mousemove", str(x), str(y)])
            return {"success": True}

        elif action == "left_click":
            subprocess.run(["xdotool", "click", "1"])
            return {"success": True}

        elif action == "right_click":
            subprocess.run(["xdotool", "click", "3"])
            return {"success": True}

        elif action == "double_click":
            subprocess.run(["xdotool", "click", "--repeat", "2", "1"])
            return {"success": True}

        elif action == "type":
            text = input.get("text", "")
            # Use xdotool type with delay for reliability
            subprocess.run(["xdotool", "type", "--delay", "50", text])
            return {"success": True}

        elif action == "key":
            key = input.get("key", "")
            # Map common key names
            key_map = {
                "return": "Return",
                "enter": "Return",
                "tab": "Tab",
                "escape": "Escape",
                "backspace": "BackSpace",
            }
            xdotool_key = key_map.get(key.lower(), key)
            subprocess.run(["xdotool", "key", xdotool_key])
            return {"success": True}

        elif action == "scroll":
            direction = input.get("direction", "down")
            amount = input.get("amount", 3)
            button = "5" if direction == "down" else "4"
            for _ in range(amount):
                subprocess.run(["xdotool", "click", button])
            return {"success": True}

        return {"error": f"Unknown action: {action}"}

    def _handle_bash(self, input: dict) -> dict:
        """Execute bash command."""
        command = input.get("command", "")

        # Security: Sanitize and limit commands
        dangerous_patterns = ["rm -rf", "mkfs", "dd if=", "> /dev/"]
        for pattern in dangerous_patterns:
            if pattern in command:
                return {"error": "Dangerous command blocked"}

        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            return {
                "stdout": result.stdout[:10000],  # Limit output
                "stderr": result.stderr[:1000],
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"error": "Command timed out"}

    def _handle_editor(self, input: dict) -> dict:
        """Handle text editor operations."""
        command = input.get("command")
        path = input.get("path")

        if command == "view":
            try:
                with open(path, "r") as f:
                    content = f.read()
                return {"content": content[:50000]}  # Limit size
            except Exception as e:
                return {"error": str(e)}

        elif command == "str_replace":
            old_str = input.get("old_str")
            new_str = input.get("new_str")
            try:
                with open(path, "r") as f:
                    content = f.read()
                if old_str not in content:
                    return {"error": "old_str not found in file"}
                content = content.replace(old_str, new_str, 1)
                with open(path, "w") as f:
                    f.write(content)
                return {"success": True}
            except Exception as e:
                return {"error": str(e)}

        return {"error": f"Unknown editor command: {command}"}

    def run_task(self, task: str, max_steps: int = 50) -> dict:
        """Run computer use task with agentic loop."""
        messages = [{"role": "user", "content": task}]
        tools = self.get_tools()

        for step in range(max_steps):
            response = self.client.beta.messages.create(
                model=self.model,
                max_tokens=4096,
                tools=tools,
                messages=messages,
                betas=["computer-use-2024-10-22"]
            )

            # Check for completion
            if response.stop_reason == "end_turn":
                return {
                    "success": True,
                    "result": response.content[0].text if response.content else "",
                    "steps": step + 1
                }

            # Handle tool use
            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = self.execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result
                        })

                messages.append({"role": "user", "content": tool_results})

        return {"success": False, "error": "Max steps reached"}

### Anti_patterns

- Not using betas=['computer-use-2024-10-22'] flag
- Full resolution screenshots (wasteful)
- No command sanitization for bash tool
- Unbounded execution time

### Browser-Use Pattern (Playwright-based)

For browser-only automation, using structured DOM access is more efficient
than pixel-based computer use. Playwright MCP allows LLMs to control
browsers using accessibility snapshots rather than screenshots.

Advantages over vision-based:
- Faster: No image processing required
- Cheaper: Text tokens vs image tokens
- More precise: Direct element targeting
- More reliable: No coordinate drift

When to use vision vs structured:
- Vision: Desktop apps, complex UIs, visual verification
- Structured: Web automation, form filling, data extraction

**When to use**: Browser-only automation tasks,Form filling and web interactions,When speed and cost matter more than visual understanding

from playwright.async_api import async_playwright
from dataclasses import dataclass
from typing import Optional
import asyncio

@dataclass
class BrowserAction:
    """Structured browser action."""
    action: str  # click, type, navigate, scroll, extract
    selector: Optional[str] = None
    text: Optional[str] = None
    url: Optional[str] = None

class BrowserUseAgent:
    """
    Browser automation using Playwright with structured commands.
    More efficient than pixel-based for web tasks.
    """

    def __init__(self):
        self.browser = None
        self.page = None

    async def start(self, headless: bool = True):
        """Start browser session."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=headless)
        self.page = await self.browser.new_page()

    async def get_page_snapshot(self) -> dict:
        """
        Get structured snapshot of page for LLM.
        Uses accessibility tree for efficiency.
        """
        # Get accessibility tree
        snapshot = await self.page.accessibility.snapshot()

        # Get simplified DOM info
        elements = await self.page.evaluate('''() => {
            const interactable = [];
            const selector = 'a, button, input, select, textarea, [role="button"]';
            document.querySelectorAll(selector).forEach((el, i) => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    interactable.push({
                        index: i,
                        tag: el.tagName.toLowerCase(),
                        text: el.textContent?.trim().slice(0, 100),
                        type: el.type,
                        placeholder: el.placeholder,
                        name: el.name,
                        id: el.id,
                        class: el.className
                    });
                }
            });
            return interactable;
        }''')

        return {
            "url": self.page.url,
            "title": await self.page.title(),
            "accessibility_tree": snapshot,
            "interactable_elements": elements[:50]  # Limit for token efficiency
        }

    async def execute_action(self, action: BrowserAction) -> dict:
        """Execute structured browser action."""

        try:
            if action.action == "navigate":
                await self.page.goto(action.url, wait_until="domcontentloaded")
                return {"success": True, "url": self.page.url}

            elif action.action == "click":
                await self.page.click(action.selector, timeout=5000)
                await self.page.wait_for_load_state("networkidle", timeout=5000)
                return {"success": True}

            elif action.action == "type":
                await self.page.fill(action.selector, action.text)
                return {"success": True}

            elif action.action == "scroll":
                direction = action.text or "down"
                distance = 500 if direction == "down" else -500
                await self.page.evaluate(f"window.scrollBy(0, {distance})")
                return {"success": True}

            elif action.action == "extract":
                # Extract text content
                if action.selector:
                    text = await self.page.text_content(action.selector)
                else:
                    text = await self.page.text_content("body")
                return {"success": True, "text": text[:5000]}

            elif action.action == "screenshot":
                # Fall back to vision when needed
                screenshot = await self.page.screenshot(type="png")
                import base64
                return {
                    "success": True,
                    "image": base64.b64encode(screenshot).decode()
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

        return {"success": False, "error": f"Unknown action: {action.action}"}

    async def run_with_llm(self, task: str, llm_client, max_steps: int = 20):
        """
        Run browser task with LLM decision making.
        Uses structured DOM instead of screenshots.
        """

        system_prompt = """You are a browser automation agent. You receive
        page snapshots with interactable elements and decide actions.

        Respond with JSON action:
        - {"action": "navigate", "url": "https://..."}
        - {"action": "click", "selector": "button.submit"}
        - {"action": "type", "selector": "input[name='email']", "text": "..."}
        - {"action": "scroll", "text": "down"}
        - {"action": "extract", "selector": ".results"}
        - {"action": "done", "result": "task completed"}

        Use CSS selectors based on the element info provided.
        Prefer id > name > class > text content for selectors.
        """

        messages = []

        for step in range(max_steps):
            # Get current page state
            snapshot = await self.get_page_snapshot()

            user_message = f"""Task: {task}

            Current page:
            URL: {snapshot['url']}
            Title: {snapshot['title']}

            Interactable elements:
            {snapshot['interactable_elements']}

            What action should I take?"""

            messages.append({"role": "user", "content": user_message})

            # Get LLM decision
            response = llm_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=messages
            )

            assistant_text = response.content[0].text
            messages.append({"role": "assistant", "content": assistant_text})

            # Parse and execute
            import json
            action_dict = json.loads(assistant_text)

            if action_dict.get("action") == "done":
                return {"success": True, "result": action_dict.get("result")}

            action = BrowserAction(**action_dict)
            result = await self.execute_action(action)

            if not result.get("success"):
                messages.append({
                    "role": "user",
                    "content": f"Action failed: {result.get('error')}"
                })

            await asyncio.sleep(0.5)  # Rate limit

        return {"success": False, "error": "Max steps reached"}

    async def close(self):
        """Clean up browser."""
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()

# Usage
async def main():
    agent = BrowserUseAgent()
    await agent.start(headless=False)

    from anthropic import Anthropic
    result = await agent.run_with_llm(
        "Go to weather.com and find the weather for New York",
        Anthropic()
    )

    print(result)
    await agent.close()

asyncio.run(main())

### Anti_patterns

- Using screenshots when DOM access works
- Not waiting for page loads
- Hardcoded selectors that break
- No error recovery for stale elements

### User Confirmation Pattern

For sensitive actions, agents should pause and ask for human confirmation.
"ChatGPT agent also pauses and asks for confirmation prior to taking
sensitive steps such as completing a purchase."

Sensitivity levels:
1. LOW: Navigation, reading (auto-approve)
2. MEDIUM: Form filling, clicking (log, maybe confirm)
3. HIGH: Purchases, authentication, file operations (always confirm)
4. CRITICAL: Credential entry, financial transactions (confirm + review)

**When to use**: Actions with real-world consequences,Financial transactions,Authentication flows,File modifications

from enum import Enum
from dataclasses import dataclass
from typing import Callable, Optional
import asyncio

class ActionSeverity(Enum):
    LOW = "low"           # Auto-approve
    MEDIUM = "medium"     # Log, optional confirm
    HIGH = "high"         # Always confirm
    CRITICAL = "critical" # Confirm + review details

@dataclass
class SensitiveAction:
    """Action that may need user confirmation."""
    action_type: str
    description: str
    severity: ActionSeverity
    details: dict

class ConfirmationGate:
    """
    Gate sensitive actions through user confirmation.
    """

    # Action type -> severity mapping
    ACTION_SEVERITY = {
        # LOW - auto-approve
        "navigate": ActionSeverity.LOW,
        "scroll": ActionSeverity.LOW,
        "read": ActionSeverity.LOW,
        "screenshot": ActionSeverity.LOW,

        # MEDIUM - log and maybe confirm
        "click": ActionSeverity.MEDIUM,
        "type": ActionSeverity.MEDIUM,
        "search": ActionSeverity.MEDIUM,

        # HIGH - always confirm
        "download": ActionSeverity.HIGH,
        "submit_form": ActionSeverity.HIGH,
        "login": ActionSeverity.HIGH,
        "file_write": ActionSeverity.HIGH,

        # CRITICAL - confirm with full review
        "purchase": ActionSeverity.CRITICAL,
        "enter_password": ActionSeverity.CRITICAL,
        "enter_credit_card": ActionSeverity.CRITICAL,
        "send_money": ActionSeverity.CRITICAL,
        "delete": ActionSeverity.CRITICAL,
    }

    def __init__(
        self,
        confirm_callback: Callable[[SensitiveAction], bool] = None,
        auto_confirm_low: bool = True,
        auto_confirm_medium: bool = False
    ):
        self.confirm_callback = confirm_callback or self._default_confirm
        self.auto_confirm_low = auto_confirm_low
        self.auto_confirm_medium = auto_confirm_medium
        self.action_log = []

    def _default_confirm(self, action: SensitiveAction) -> bool:
        """Default confirmation via CLI prompt."""
        print(f"\n{'='*60}")
        print(f"ACTION CONFIRMATION REQUIRED")
        print(f"{'='*60}")
        print(f"Type: {action.action_type}")
        print(f"Severity: {action.severity.value.upper()}")
        print(f"Description: {action.description}")
        print(f"Details: {action.details}")
        print(f"{'='*60}")

        while True:
            response = input("Allow this action? [y/n]: ").lower().strip()
            if response in ['y', 'yes']:
                return True
            elif response in ['n', 'no']:
                return False

    def classify_action(self, action_type: str, context: dict) -> ActionSeverity:
        """Classify action severity, considering context."""
        base_severity = self.ACTION_SEVERITY.get(action_type, ActionSeverity.MEDIUM)

        # Escalate based on context
        if context.get("involves_credentials"):
            return ActionSeverity.CRITICAL
        if context.get("involves_money"):
            return ActionSeverity.CRITICAL
        if context.get("irreversible"):
            return max(base_severity, ActionSeverity.HIGH, key=lambda x: x.value)

        return base_severity

    def check_action(
        self,
        action_type: str,
        description: str,
        details: dict = None
    ) -> tuple[bool, str]:
        """
        Check if action should proceed.
        Returns (approved, reason).
        """
        details = details or {}
        severity = self.classify_action(action_type, details)

        action = SensitiveAction(
            action_type=action_type,
            description=description,
            severity=severity,
            details=details
        )

        # Log all actions
        self.action_log.append({
            "action": action,
            "timestamp": __import__('datetime').datetime.now().isoformat()
        })

        # Auto-approve low severity
        if severity == ActionSeverity.LOW and self.auto_confirm_low:
            return True, "auto-approved (low severity)"

        # Maybe auto-approve medium
        if severity == ActionSeverity.MEDIUM and self.auto_confirm_medium:
            return True, "auto-approved (medium severity)"

        # Request confirmation
        approved = self.confirm_callback(action)

        if approved:
            return True, "user approved"
        else:
            return False, "user rejected"

class ConfirmedComputerUseAgent:
    """
    Computer use agent with confirmation gates.
    """

    def __init__(self, base_agent, confirmation_gate: ConfirmationGate):
        self.agent = base_agent
        self.gate = confirmation_gate

    def execute_action(self, action: dict) -> dict:
        """Execute action with confirmation check."""
        action_type = action.get("type", "unknown")

        # Build description
        if action_type == "click":
            desc = f"Click at ({action.get('x')}, {action.get('y')})"
        elif action_type == "type":
            text = action.get('text', '')
            # Mask if looks like password
            if self._looks_sensitive(text):
                desc = f"Type sensitive text ({len(text)} chars)"
            else:
                desc = f"Type: {text[:50]}..."
        else:
            desc = f"Execute: {action_type}"

        # Context for severity classification
        context = {
            "involves_credentials": self._looks_sensitive(action.get("text", "")),
            "involves_money": self._mentions_money(action),
        }

        # Check with gate
        approved, reason = self.gate.check_action(
            action_type, desc, context
        )

        if not approved:
            return {
                "success": False,
                "error": f"Action blocked: {reason}",
                "action": action_type
            }

        # Execute if approved
        return self.agent.execute_action(action)

    def _looks_sensitive(self, text: str) -> bool:
        """Check if text looks like sensitive data."""
        if not text:
            return False
        # Common patterns
        patterns = [
            r'\b\d{16}\b',  # Credit card
            r'\b\d{3,4}\b.*\b\d{3,4}\b',  # CVV-like
            r'password',
            r'secret',
            r'api.?key',
            r'token'
        ]
        import re
        return any(re.search(p, text.lower()) for p in patterns)

    def _mentions_money(self, action: dict) -> bool:
        """Check if action involves money."""
        text = str(action)
        money_patterns = [
            r'\$\d+', r'pay', r'purchase', r'buy', r'checkout',
            r'credit', r'debit', r'invoice', r'payment'
        ]
        import re
        return any(re.search(p, text.lower()) for p in money_patterns)

# Usage
gate = ConfirmationGate(
    auto_confirm_low=True,
    auto_confirm_medium=False  # Confirm clicks, typing
)

agent = ConfirmedComputerUseAgent(base_agent, gate)
result = agent.execute_action({"type": "click", "x": 500, "y": 300})

### Anti_patterns

- Auto-approving all actions
- Not logging rejected actions
- Showing full passwords in confirmation
- No timeout on confirmation (hangs forever)

### Action Logging Pattern

All computer use agent actions should be logged for:
1. Debugging failed automations
2. Security auditing
3. Reproducibility
4. Compliance requirements

Log format should capture:
- Timestamp
- Action type and parameters
- Screenshot before/after
- Success/failure status
- Model reasoning (if available)

**When to use**: Production computer use deployments,Debugging automation failures,Security-sensitive environments

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
import json
import os

@dataclass
class ActionLogEntry:
    """Single action log entry."""
    timestamp: datetime
    action_type: str
    parameters: dict
    success: bool
    error: Optional[str] = None
    screenshot_before: Optional[str] = None  # Path to screenshot
    screenshot_after: Optional[str] = None
    model_reasoning: Optional[str] = None
    duration_ms: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "action_type": self.action_type,
            "parameters": self._sanitize_params(self.parameters),
            "success": self.success,
            "error": self.error,
            "screenshot_before": self.screenshot_before,
            "screenshot_after": self.screenshot_after,
            "model_reasoning": self.model_reasoning,
            "duration_ms": self.duration_ms
        }

    def _sanitize_params(self, params: dict) -> dict:
        """Remove sensitive data from params."""
        sanitized = {}
        sensitive_keys = ['password', 'secret', 'token', 'key', 'credit_card']

        for k, v in params.items():
            if any(s in k.lower() for s in sensitive_keys):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, str) and len(v) > 100:
                sanitized[k] = v[:100] + "...[truncated]"
            else:
                sanitized[k] = v

        return sanitized

@dataclass
class TaskSession:
    """A complete task execution session."""
    session_id: str
    task: str
    start_time: datetime
    end_time: Optional[datetime] = None
    actions: list[ActionLogEntry] = field(default_factory=list)
    success: bool = False
    final_result: Optional[str] = None

class ActionLogger:
    """
    Comprehensive action logging for computer use agents.
    """

    def __init__(self, log_dir: str = "./agent_logs"):
        self.log_dir = log_dir
        self.screenshot_dir = os.path.join(log_dir, "screenshots")
        os.makedirs(self.screenshot_dir, exist_ok=True)

        self.current_session: Optional[TaskSession] = None

    def start_session(self, task: str) -> str:
        """Start a new task session."""
        import uuid
        session_id = str(uuid.uuid4())[:8]

        self.current_session = TaskSession(
            session_id=session_id,
            task=task,
            start_time=datetime.now()
        )

        return session_id

    def log_action(
        self,
        action_type: str,
        parameters: dict,
        success: bool,
        error: Optional[str] = None,
        screenshot_before: bytes = None,
        screenshot_after: bytes = None,
        model_reasoning: str = None,
        duration_ms: int = None
    ):
        """Log a single action."""
        if not self.current_session:
            raise RuntimeError("No active session")

        # Save screenshots if provided
        screenshot_paths = {}
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

        if screenshot_before:
            path = os.path.join(
                self.screenshot_dir,
                f"{self.current_session.session_id}_{timestamp_str}_before.png"
            )
            with open(path, "wb") as f:
                f.write(screenshot_before)
            screenshot_paths["before"] = path

        if screenshot_after:
            path = os.path.join(
                self.screenshot_dir,
                f"{self.current_session.session_id}_{timestamp_str}_after.png"
            )
            with open(path, "wb") as f:
                f.write(screenshot_after)
            screenshot_paths["after"] = path

        # Create log entry
        entry = ActionLogEntry(
            timestamp=datetime.now(),
            action_type=action_type,
            parameters=parameters,
            success=success,
            error=error,
            screenshot_before=screenshot_paths.get("before"),
            screenshot_after=screenshot_paths.get("after"),
            model_reasoning=model_reasoning,
            duration_ms=duration_ms
        )

        self.current_session.actions.append(entry)

        # Also append to running log file
        self._append_to_log(entry)

    def _append_to_log(self, entry: ActionLogEntry):
        """Append entry to JSONL log file."""
        log_file = os.path.join(
            self.log_dir,
            f"session_{self.current_session.session_id}.jsonl"
        )

        with open(log_file, "a") as f:
            f.write(json.dumps(entry.to_dict()) + "\n")

    def end_session(self, success: bool, result: str = None):
        """End current session."""
        if not self.current_session:
            return

        self.current_session.end_time = datetime.now()
        self.current_session.success = success
        self.current_session.final_result = result

        # Write session summary
        summary_file = os.path.join(
            self.log_dir,
            f"session_{self.current_session.session_id}_summary.json"
        )

        summary = {
            "session_id": self.current_session.session_id,
            "task": self.current_session.task,
            "start_time": self.current_session.start_time.isoformat(),
            "end_time": self.current_session.end_time.isoformat(),
            "duration_seconds": (
                self.current_session.end_time -
                self.current_session.start_time
            ).total_seconds(),
            "total_actions": len(self.current_session.actions),
            "successful_actions": sum(
                1 for a in self.current_session.actions if a.success
            ),
            "failed_actions": sum(
                1 for a in self.current_session.actions if not a.success
            ),
            "success": success,
            "final_result": result
        }

        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)

        self.current_session = None

    def get_session_replay(self, session_id: str) -> list[dict]:
        """Get all actions from a session for replay/debugging."""
        log_file = os.path.join(self.log_dir, f"session_{session_id}.jsonl")

        actions = []
        with open(log_file, "r") as f:
            for line in f:
                actions.append(json.loads(line))

        return actions

# Integration with agent
class LoggedComputerUseAgent:
    """Computer use agent with comprehensive logging."""

    def __init__(self, base_agent, logger: ActionLogger):
        self.agent = base_agent
        self.logger = logger

    def run_task(self, task: str) -> dict:
        """Run task with full logging."""
        session_id = self.logger.start_session(task)

        try:
            result = self._run_with_logging(task)
            self.logger.end_session(
                success=result.get("success", False),
                result=result.get("result")
            )
            return result
        except Exception as e:
            self.logger.end_session(success=False, result=str(e))
            raise

    def _run_with_logging(self, task: str) -> dict:
        """Internal run with action logging."""
        # This would wrap the base agent's run method
        # and log each action
        pass

### Anti_patterns

- Not sanitizing sensitive data in logs
- Storing screenshots indefinitely (storage costs)
- Not rotating log files
- Logging synchronously (blocks agent)

## Sharp Edges

### Web Content Can Hijack Your Agent

Severity: CRITICAL

Situation: Computer use agent browsing the web

Symptoms:
Agent suddenly performs unexpected actions. Clicks malicious links.
Enters credentials on phishing sites. Downloads files it shouldn't.
Ignores your instructions and follows embedded commands instead.

Why this breaks:
"While all agents that process untrusted content are subject to prompt
injection risks, browser use amplifies this risk in two ways. First,
the attack surface is vast: every webpage, embedded document, advertisement,
and dynamically loaded script represents a potential vector for malicious
instructions. Second, browser agents can take many different actions—
navigating to URLs, filling forms, clicking buttons, downloading files—
that attackers can exploit."

Real attacks have already happened:
- "Microsoft Copilot agents were hijacked with emails containing malicious
  instructions, which allowed attackers to extract entire CRM databases."
- "Google's Workspace services were manipulated—hidden prompts inside
  calendar invites and emails tricked Gemini agents into deleting events
  and exposing sensitive messages."

Even a 1% attack success rate represents meaningful risk at scale.

Recommended fix:

## Defense in depth - no single solution works

1. Sandboxing (most effective):
   ```python
   # Docker with strict isolation
   docker run \
       --security-opt no-new-privileges \
       --cap-drop ALL \
       --network none \  # No internet!
       --read-only \
       computer-use-agent
   ```

2. Classifier-based detection:
   ```python
   def scan_for_injection(content: str) -> bool:
       """Detect prompt injection attempts."""
       patterns = [
           r"ignore.*instructions",
           r"disregard.*previous",
           r"new.*instructions",
           r"you are now",
           r"act as if",
           r"pretend to be",
       ]
       return any(re.search(p, content.lower()) for p in patterns)

   # Check page content before processing
   page_text = await page.text_content("body")
   if scan_for_injection(page_text):
       return {"error": "Potential injection detected"}
   ```

3. User confirmation for sensitive actions:
   ```python
   SENSITIVE_ACTIONS = {"download", "submit", "login", "purchase"}

   if action_type in SENSITIVE_ACTIONS:
       if not await get_user_confirmation(action):
           return {"error": "User rejected action"}
   ```

4. Scoped credentials:
   - Never give agent access to all credentials
   - Use temporary, limited tokens
   - Revoke after task completion

### Vision Agents Click Exact Centers

Severity: MEDIUM

Situation: Agent clicking on UI elements

Symptoms:
Agent's clicks are detectable as non-human. Websites may block or
CAPTCHA the agent. Anti-bot systems flag the interaction.

Why this breaks:
"When a vision model identifies a button, it calculates the center.
Click coordinates land at mathematically precise positions—often exact
element centers or grid-aligned pixel values. Humans don't click centers;
their click distributions follow a Gaussian pattern around targets."

The screenshot loop also creates detectable patterns:
"Predictable pauses. Vision agents are completely still during their
'thinking' phase. The pattern looks like: Action → Complete stillness
(1-5 seconds) → Action → Complete stillness → Action."

Sophisticated anti-bot systems detect:
- Perfect center clicks
- No mouse movement during "thinking"
- Consistent timing between actions
- Lack of micro-movements and hesitation

Recommended fix:

## Add human-like variance to actions

```python
import random
import time

def humanized_click(x: int, y: int) -> tuple[int, int]:
    """Add human-like variance to click coordinates."""
    # Gaussian distribution around target
    # Humans typically land within ~10px of target
    x_offset = int(random.gauss(0, 5))
    y_offset = int(random.gauss(0, 5))

    return (x + x_offset, y + y_offset)

def humanized_delay():
    """Add human-like delay between actions."""
    # Humans have variable reaction times
    base_delay = random.uniform(0.3, 0.8)
    # Occasionally longer pauses (reading, thinking)
    if random.random() < 0.2:
        base_delay += random.uniform(0.5, 2.0)
    time.sleep(base_delay)

def humanized_movement(from_pos: tuple, to_pos: tuple):
    """Move mouse in curved path like human."""
    # Bezier curve or similar
    # Humans don't move in straight lines
    steps = random.randint(10, 20)
    for i in range(steps):
        t = i / steps
        # Simple curve approximation
        x = from_pos[0] + (to_pos[0] - from_pos[0]) * t
        y = from_pos[1] + (to_pos[1] - from_pos[1]) * t
        # Add wobble
        x += random.gauss(0, 2)
        y += random.gauss(0, 2)
        pyautogui.moveTo(int(x), int(y))
        time.sleep(0.01)
```

## Rotate user agents and fingerprints

```python
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120...",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/...",
    # ... more realistic agents
]

await page.set_extra_http_headers({
    "User-Agent": random.choice(USER_AGENTS)
})
```

### Dropdowns, Scrollbars, and Drags Are Unreliable

Severity: HIGH

Situation: Agent interacting with complex UI elements

Symptoms:
Agent fails to select dropdown options. Scroll doesn't work as expected.
Drag and drop completely fails. Hover menus disappear before clicking.

Why this breaks:
"Computer Use currently struggles with certain interface interactions,
particularly scrolling, dragging, and zooming operations. Some UI elements
(like dropdowns and scrollbars) might be tricky for Claude to manipulate."
- Anthropic documentation

Why these are hard:
1. Dropdowns: Options appear after click, need second click to select
2. Scrollbars: Small targets, need precise positioning
3. Drag: Requires coordinated mouse down, move, mouse up
4. Hover menus: Disappear when mouse moves away
5. Canvas elements: No semantic information visible

Vision models see pixels, not DOM structure. They don't "know" that
a dropdown is a dropdown - they have to infer from visual cues.

Recommended fix:

## Use keyboard alternatives when possible

```python
# Instead of clicking dropdown, use keyboard
async def select_dropdown_option(page, dropdown_selector, option_text):
    # Focus the dropdown
    await page.click(dropdown_selector)
    await asyncio.sleep(0.3)

    # Use keyboard to find option
    await page.keyboard.type(option_text[:3])  # Type first letters
    await asyncio.sleep(0.2)
    await page.keyboard.press("Enter")
```

## Break complex actions into steps

```python
# Instead of drag-and-drop
async def reliable_drag(page, source, target):
    # Step 1: Click and hold
    await page.mouse.move(source["x"], source["y"])
    await page.mouse.down()
    await asyncio.sleep(0.2)

    # Step 2: Move in steps
    steps = 10
    for i in range(steps):
        x = source["x"] + (target["x"] - source["x"]) * i / steps
        y = source["y"] + (target["y"] - source["y"]) * i / steps
        await page.mouse.move(x, y)
        await asyncio.sleep(0.05)

    # Step 3: Release
    await page.mouse.move(target["x"], target["y"])
    await asyncio.sleep(0.1)
    await page.mouse.up()
```

## Fall back to DOM access for web

```python
# If vision fails, try direct DOM manipulation
async def robust_select(page, select_selector, value):
    try:
        # Try vision approach first
        await vision_agent.select(select_selector, value)
    except Exception:
        # Fall back to direct DOM
        await page.select_option(select_selector, value=value)
```

## Add verification after action

```python
async def verified_scroll(page, direction):
    # Get current scroll position
    before = await page.evaluate("window.scrollY")

    # Attempt scroll
    await page.mouse.wheel(0, 500 if direction == "down" else -500)
    await asyncio.sleep(0.3)

    # Verify it worked
    after = await page.evaluate("window.scrollY")
    if before == after:
        # Try alternative method
        await page.keyboard.press("PageDown" if direction == "down" else "PageUp")
```

### Agents Are 2-5x Slower Than Humans

Severity: MEDIUM

Situation: Automating any computer task

Symptoms:
Task that takes human 1 minute takes agent 3-5 minutes.
Users complain about speed. Timeouts occur.

Why this breaks:
"The technology can be slow compared to human operators, often requiring
multiple screenshots and analysis cycles."

Why so slow:
1. Screenshot capture: 100-500ms
2. Vision model inference: 1-5 seconds per screenshot
3. Action execution: 200-500ms
4. Wait for UI update: 500-1000ms
5. Total per action: 2-7 seconds

A task requiring 20 actions takes 40-140 seconds minimum.
Humans do the same actions in 20-30 seconds.

Recommended fix:

## Accept the tradeoff

Computer use is for:
- Tasks humans don't want to do (repetitive)
- Tasks that can run in background
- Tasks where accuracy > speed

## Optimize where possible

```python
# 1. Reduce screenshot resolution
SCREEN_SIZE = (1280, 800)  # Not 4K

# 2. Batch similar actions
# Instead of: type "hello", wait, type " world"
await page.type("hello world")

# 3. Parallelize independent tasks
# Run multiple sandboxed agents concurrently

# 4. Cache repeated computations
# If same screenshot, reuse analysis

# 5. Use smaller models for simple decisions
simple_model = "claude-haiku-..."  # For "is task done?"
complex_model = "claude-sonnet-..."  # For complex reasoning
```

## Set realistic expectations

```python
# Estimate task duration
def estimate_duration(task_complexity: str) -> int:
    """Estimate task duration in seconds."""
    estimates = {
        "simple": 30,    # Single page, few actions
        "medium": 120,   # Multi-page, moderate actions
        "complex": 300,  # Many pages, complex interactions
    }
    return estimates.get(task_complexity, 120)

# Inform users
estimated = estimate_duration("medium")
print(f"Estimated completion: {estimated // 60}m {estimated % 60}s")
```

### Screenshots Fill Up Context Window Fast

Severity: HIGH

Situation: Long-running computer use tasks

Symptoms:
Agent forgets earlier steps. Starts repeating actions.
Errors increase as task progresses. Costs explode.

Why this breaks:
Each screenshot is ~1500-3000 tokens. A task with 30 screenshots
uses 45,000-90,000 tokens just for images - before any text.

Claude's context window is finite. When full:
- Older context gets dropped
- Agent loses memory of earlier steps
- Task coherence decreases

"Getting agents to make consistent progress across multiple context
windows remains an open problem. The core challenge is that they must
work in discrete sessions, and each new session begins with no memory
of what came before." - Anthropic engineering blog

Recommended fix:

## Implement context management

```python
class ContextManager:
    """Manage context window usage for computer use."""

    MAX_SCREENSHOTS = 10  # Keep only recent screenshots
    MAX_TOKENS = 100000

    def __init__(self):
        self.messages = []
        self.screenshot_count = 0

    def add_screenshot(self, screenshot_b64: str, description: str):
        """Add screenshot with automatic pruning."""
        self.screenshot_count += 1

        # Keep only recent screenshots
        if self.screenshot_count > self.MAX_SCREENSHOTS:
            self._prune_old_screenshots()

        # Store with description for context
        self.messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": description},
                {"type": "image", "source": {...}}
            ]
        })

    def _prune_old_screenshots(self):
        """Remove old screenshots, keep text summaries."""
        new_messages = []
        screenshots_kept = 0

        for msg in reversed(self.messages):
            if self._has_image(msg):
                if screenshots_kept < self.MAX_SCREENSHOTS:
                    new_messages.insert(0, msg)
                    screenshots_kept += 1
                else:
                    # Convert to text summary
                    summary = self._summarize_screenshot(msg)
                    new_messages.insert(0, {
                        "role": msg["role"],
                        "content": summary
                    })
            else:
                new_messages.insert(0, msg)

        self.messages = new_messages

    def _summarize_screenshot(self, msg) -> str:
        """Summarize screenshot to text."""
        # Extract any text description
        for content in msg.get("content", []):
            if content.get("type") == "text":
                return f"[Previous screenshot: {content['text']}]"
        return "[Previous screenshot - details pruned]"

    def add_checkpoint(self):
        """Create a checkpoint summary."""
        summary = self._create_progress_summary()
        self.messages.append({
            "role": "user",
            "content": f"CHECKPOINT: {summary}"
        })
```

## Use checkpointing for long tasks

```python
async def run_with_checkpoints(task: str, checkpoint_every: int = 10):
    """Run task with periodic checkpoints."""
    context = ContextManager()
    step = 0

    while not task_complete:
        step += 1

        # Take action...

        if step % checkpoint_every == 0:
            # Create checkpoint
            context.add_checkpoint()

            # Optional: persist to disk
            save_checkpoint(context, step)
```

## Break into subtasks

```python
# Instead of one 50-step task:
subtasks = [
    "Navigate to the website and login",
    "Find the settings page",
    "Update the email address to ...",
    "Save and verify the change"
]

for subtask in subtasks:
    result = await agent.run(subtask)
    if not result["success"]:
        handle_error(subtask, result)
        break
```

### Costs Can Explode Quickly

Severity: HIGH

Situation: Running computer use at scale

Symptoms:
API bill is 10x higher than expected. Single task costs $5+ instead of $0.50.
Monthly costs reach thousands of dollars quickly.

Why this breaks:
Vision tokens are expensive. Each screenshot:
- ~2000-3000 tokens per image
- At $10/million tokens, that's $0.02-0.03 per screenshot
- Task with 30 screenshots = $0.60-0.90 just for images

But it compounds:
- Screenshots accumulate in context
- Model sees ALL previous screenshots each turn
- Turn 10 processes 10 screenshots = $0.20-0.30
- Turn 20 processes 20 screenshots = $0.40-0.60
- Quadratic growth!

Complex task: 50 turns × average 25 images in context = 1250 image tokens
Plus text = could easily hit $5-10 per task.

Recommended fix:

## Monitor and limit costs

```python
class CostTracker:
    """Track and limit computer use costs."""

    # Anthropic pricing (approximate)
    INPUT_COST_PER_1K = 0.003   # Text
    OUTPUT_COST_PER_1K = 0.015
    IMAGE_COST_PER_1K = 0.01    # Roughly

    def __init__(self, max_cost_per_task: float = 1.0):
        self.max_cost = max_cost_per_task
        self.current_cost = 0.0
        self.total_tokens = 0

    def add_turn(
        self,
        input_tokens: int,
        output_tokens: int,
        image_tokens: int
    ):
        """Track cost of a single turn."""
        cost = (
            input_tokens / 1000 * self.INPUT_COST_PER_1K +
            output_tokens / 1000 * self.OUTPUT_COST_PER_1K +
            image_tokens / 1000 * self.IMAGE_COST_PER_1K
        )
        self.current_cost += cost
        self.total_tokens += input_tokens + output_tokens + image_tokens

        if self.current_cost > self.max_cost:
            raise CostLimitExceeded(
                f"Cost limit exceeded: ${self.current_cost:.2f} > ${self.max_cost:.2f}"
            )

        return cost

class CostLimitExceeded(Exception):
    pass

# Usage
tracker = CostTracker(max_cost_per_task=2.0)

try:
    for turn in turns:
        tracker.add_turn(turn.input, turn.output, turn.images)
except CostLimitExceeded:
    print("Task aborted due to cost limit")
```

## Reduce image costs

```python
# 1. Lower resolution
SCREEN_SIZE = (1024, 768)  # Smaller = fewer tokens

# 2. JPEG instead of PNG (when quality ok)
screenshot.save(buffer, format="JPEG", quality=70)

# 3. Crop to relevant region
def crop_relevant(screenshot: Image, focus_area: tuple):
    """Crop to area of interest."""
    return screenshot.crop(focus_area)

# 4. Don't include screenshot every turn
if not needs_visual_update:
    # Text-only turn
    messages.append({"role": "user", "content": "Continue..."})
```

## Use cheaper models strategically

```python
async def tiered_model_selection(task_complexity: str):
    """Use appropriate model for task."""
    if task_complexity == "simple":
        return "claude-haiku-..."  # Cheapest
    elif task_complexity == "medium":
        return "claude-sonnet-4-20250514"  # Balanced
    else:
        return "claude-opus-4-5-..."  # Best but expensive
```

### Running Agent on Your Actual Computer

Severity: CRITICAL

Situation: Testing or deploying computer use

Symptoms:
Agent deletes important files. Sends emails from your account.
Posts on social media. Accesses sensitive documents.

Why this breaks:
Computer use agents make mistakes. They can:
- Misinterpret instructions
- Click wrong buttons
- Type in wrong fields
- Follow prompt injection attacks

Without sandboxing, these mistakes happen on your real system.
There's no undo for "agent sent email to all contacts" or
"agent deleted project folder."

"Autonomous agents that can access external systems and APIs
introduce new security risks. They may be vulnerable to prompt
injection attacks, unauthorized access to sensitive data, or
manipulation by malicious actors."

Recommended fix:

## ALWAYS use sandboxing

```python
# Minimum viable sandbox: Docker with restrictions

docker run -it --rm \
    --security-opt no-new-privileges \
    --cap-drop ALL \
    --network none \
    --read-only \
    --tmpfs /tmp \
    --memory 2g \
    --cpus 1 \
    computer-use-sandbox
```

## Layer your defenses

```python
# Defense 1: Docker isolation
# Defense 2: Non-root user
# Defense 3: Network restrictions
# Defense 4: Filesystem restrictions
# Defense 5: Resource limits
# Defense 6: Action confirmation
# Defense 7: Action logging

@dataclass
class SandboxConfig:
    docker_image: str = "computer-use-sandbox:latest"
    network: str = "none"  # or specific allowlist
    readonly_root: bool = True
    max_memory_mb: int = 2048
    max_cpu: float = 1.0
    max_runtime_seconds: int = 300
    require_confirmation: list = field(default_factory=lambda: [
        "download", "submit", "login", "delete"
    ])
    log_all_actions: bool = True
```

## Test in isolated environment first

```python
class SandboxedTestRunner:
    """Run tests in throwaway containers."""

    async def run_test(self, test_task: str) -> dict:
        # Spin up fresh container
        container_id = await self.create_container()

        try:
            # Run task
            result = await self.execute_in_container(container_id, test_task)

            # Capture state for verification
            state = await self.capture_container_state(container_id)

            return {
                "result": result,
                "final_state": state,
                "logs": await self.get_logs(container_id)
            }
        finally:
            # Always destroy container
            await self.destroy_container(container_id)
```

## Validation Checks

### Computer Use Without Sandbox

Severity: ERROR

Computer use agents MUST run in sandboxed environments

Message: Computer use without sandboxing detected. Use Docker containers with restrictions.

### Sandbox With Full Network Access

Severity: ERROR

Sandboxed agents should have restricted network access

Message: Sandbox has full network access. Use --network=none or specific allowlist.

### Running as Root in Container

Severity: ERROR

Container agents should run as non-root user

Message: Container running as root. Add --user flag or USER directive in Dockerfile.

### Container Without Capability Drops

Severity: WARNING

Containers should drop unnecessary capabilities

Message: Container has full capabilities. Add --cap-drop ALL.

### Container Without Seccomp Profile

Severity: WARNING

Containers should use seccomp profiles for syscall filtering

Message: No security options set. Consider --security-opt seccomp:profile.json

### No Maximum Step Limit

Severity: WARNING

Computer use loops should have maximum step limits

Message: Infinite loop risk. Add max_steps limit (recommended: 50).

### No Execution Timeout

Severity: WARNING

Computer use should have timeout limits

Message: No timeout on execution. Add timeout (recommended: 5-10 minutes).

### Container Without Memory Limit

Severity: WARNING

Containers should have memory limits to prevent DoS

Message: No memory limit on container. Add --memory 2g or similar.

### No Cost Tracking

Severity: WARNING

Computer use should track API costs

Message: No cost tracking. Monitor token usage to prevent bill surprises.

### No Maximum Cost Limit

Severity: INFO

Consider adding cost limits per task

Message: Consider adding max_cost_per_task to prevent expensive runaway tasks.

## Collaboration

### Delegation Triggers

- user needs web-only automation -> browser-automation (Playwright/Selenium more efficient for web)
- user needs security review -> security-specialist (Review sandboxing, prompt injection defenses)
- user needs container orchestration -> devops (Kubernetes, Docker Swarm for scaling)
- user needs vision model optimization -> llm-architect (Model selection, prompt engineering)
- user needs multi-agent coordination -> multi-agent-orchestration (Multiple computer use agents working together)

## When to Use
- User mentions or implies: computer use
- User mentions or implies: desktop automation agent
- User mentions or implies: screen control AI
- User mentions or implies: vision-based agent
- User mentions or implies: GUI automation
- User mentions or implies: Claude computer
- User mentions or implies: OpenAI Operator
- User mentions or implies: browser agent
- User mentions or implies: visual agent
- User mentions or implies: RPA with AI

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
