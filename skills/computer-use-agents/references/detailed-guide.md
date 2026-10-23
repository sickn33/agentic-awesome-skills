# Computer Use Agents - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

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
        # Keep native display coordinates. If resizing, map every action back
        # to the actual display dimensions before execution.

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
                    "success": False,
                    "status": "verification_required",
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
      - "127.0.0.1:5900:5900"  # VNC for observation
      - "127.0.0.1:8080:8080"  # API for control

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

### Runtime boundary and provider adapter

The Dockerfile and Compose above are incomplete deployment sketches: supply reviewed requirements, supervisor configuration, authenticated control service and a tested seccomp profile. Bind observation/control ports to loopback, authenticate them, and use ephemeral storage. `--add-host` changes name resolution; it does **not** restrict network access. Use `--network none` for offline tasks or an independently enforced egress proxy/firewall with DNS and redirect controls. Never interpolate model output into shell commands, container names or network flags.

Launch containers with a validated argument list and `subprocess.run(..., check=True, timeout=...)`, a unique name and a non-root user. Enforce the deadline from the host supervisor and remove the container in `finally`. A host HTTP client cannot reach an unpublished container service; explicitly configure authenticated loopback transport or a scoped exec transport before submitting tasks. Do not expose the host Docker socket or credentials.

For Anthropic computer use, select a currently supported model/tool/beta combination from the provider documentation. This repository does not bundle a tested SDK adapter. Historical 20241022 classes are not a portable current implementation. Keep the virtual display dimensions identical to the coordinates supplied to the tool; map crop/resize coordinates explicitly if images are transformed. Check every subprocess result and capture screenshots into fresh private files to prevent stale observations.

Expose only the computer tool needed for the task. A substring blacklist cannot make arbitrary shell execution safe. Shell and editor capabilities require a separate, explicit authorization boundary, disposable execution environment and filesystem policy; omit them by default. Resolve editor paths inside a dedicated workspace, reject symlink escapes and bound reads/writes. Encode tool results using the SDK's supported text/image content blocks, retaining tool-use IDs and errors. Model end-of-turn indicates a proposed result, which must be checked against observable success criteria.

Primary reference: [Anthropic computer use documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool).

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
        snapshot = await self.page.locator("body").aria_snapshot()  # Requires a Playwright version supporting aria_snapshot

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
                # Verify the task-specific postcondition; networkidle can time out
                # on continuously connected pages even after a successful click.
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
                return {"success": True, "text": (text or "")[:5000]}

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
                return {"success": False, "status": "verification_required", "result": action_dict.get("result")}

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
            rank = {ActionSeverity.LOW: 0, ActionSeverity.MEDIUM: 1,
                    ActionSeverity.HIGH: 2, ActionSeverity.CRITICAL: 3}
            return max(base_severity, ActionSeverity.HIGH, key=rank.get)

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
- Screenshot before/after only with explicit capture and retention policy
- Success/failure status
- Brief observable decision summary; do not request private chain of thought

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
            "error": "[error recorded]" if self.error else None,
            "screenshot_before": self.screenshot_before,
            "screenshot_after": self.screenshot_after,
            "model_reasoning": "[not persisted]",
            "duration_ms": self.duration_ms
        }

    def _sanitize_params(self, params: dict) -> dict:
        """Remove sensitive data from params."""
        sanitized = {}
        sensitive_keys = ['password', 'secret', 'token', 'key', 'credit_card']

        for k, v in params.items():
            if k.lower() in {"text", "task", "content", "value"} or any(s in k.lower() for s in sensitive_keys):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = self._sanitize_params(v)
            elif isinstance(v, list):
                sanitized[k] = "[REDACTED: collection]"
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
            "task": "[not persisted]",
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
            "final_result": "[not persisted]"
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

1. Sandboxing (limits host impact; does not stop misuse of an authorized website):
   ```python
   # Docker with strict isolation
   docker run \
       --security-opt no-new-privileges \
       --cap-drop ALL \
       --network none \
       --read-only \
       computer-use-agent
   ```

2. Heuristic warning only; pattern matching cannot establish that content is safe:
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

### Respect site controls and preserve targeting accuracy

A blocked action, CAPTCHA or access restriction calls for the site's supported automation route or a user handoff. Randomizing coordinates, fingerprints and user agents is not a reliability or authorization mechanism. Keep clicks inside verified targets, use stable accessible locators when available and report blocked operations accurately.

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

### Measure latency on representative tasks

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
await page.locator("input[name=message]").fill("hello world")

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
Image token use varies by provider, dimensions and preprocessing; the following numbers are illustrative, not a bound. A screenshot might use ~1500-3000 tokens. A task with 30 screenshots
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

Complex task: 50 turns × average 25 images in context = 1250 image appearances (not tokens)
Plus text = could easily hit $5-10 per task.

Recommended fix:


## Monitor and limit costs

```python
class CostTracker:
    """Track and limit computer use costs."""

    # Illustrative rates only: configure verified current provider rates
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
        """Illustrative post-call estimate; input_tokens includes image_tokens.
        Not a hard budget: reject the next call using a conservative preflight
        reservation and reconcile provider usage/cache rates separately.
        """
        if not 0 <= image_tokens <= input_tokens:
            raise ValueError("image_tokens must be included in input_tokens")
        cost = (
            (input_tokens - image_tokens) / 1000 * self.INPUT_COST_PER_1K +
            output_tokens / 1000 * self.OUTPUT_COST_PER_1K +
            image_tokens / 1000 * self.IMAGE_COST_PER_1K
        )
        self.current_cost += cost
        self.total_tokens += input_tokens + output_tokens  # input_tokens includes images

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

# 2. JPEG can reduce transfer bytes; token billing may not decrease
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
    network: str = "none"  # A domain list requires an external egress enforcement layer
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

Message: Docker normally applies its default seccomp profile. Review that policy; use a custom profile only when tested and available.

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
