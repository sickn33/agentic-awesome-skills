---
name: slack-bot-builder
description: Build Slack apps using the Bolt framework across Python,
  JavaScript, and Java. Covers Block Kit for rich UIs, interactive components,
  slash commands, event handling, OAuth installation flows, and Workflow Builder
  integration.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Slack Bot Builder

Build Slack apps using the Bolt framework across Python, JavaScript, and Java.
Covers Block Kit for rich UIs, interactive components, slash commands,
event handling, OAuth installation flows, and Workflow Builder integration.
Focus on best practices for production-ready Slack apps.

## Patterns

### Bolt App Foundation Pattern

The Bolt framework is Slack's recommended approach for building apps.
It handles authentication, event routing, request verification, and
HTTP request processing so you can focus on app logic.

Key benefits:
- Event handling in a few lines of code
- Security checks and payload validation built-in
- Organized, consistent patterns
- Works for experiments and production

Available in: Python, JavaScript (Node.js), Java

**When to use**: Starting any new Slack app,Migrating from legacy Slack APIs,Building production Slack integrations

# Python Bolt App
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import os

# Initialize with tokens from environment
app = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"]
)

# Handle messages containing "hello"
@app.message("hello")
def handle_hello(message, say):
    """Respond to messages containing 'hello'."""
    user = message["user"]
    say(f"Hey there <@{user}>!")

# Handle slash command
@app.command("/ticket")
def handle_ticket_command(ack, body, client):
    """Handle /ticket slash command."""
    # Acknowledge immediately (within 3 seconds)
    ack()

    # Open a modal for ticket creation
    client.views_open(
        trigger_id=body["trigger_id"],
        view={
            "type": "modal",
            "callback_id": "ticket_modal",
            "title": {"type": "plain_text", "text": "Create Ticket"},
            "submit": {"type": "plain_text", "text": "Submit"},
            "blocks": [
                {
                    "type": "input",
                    "block_id": "title_block",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "title_input"
                    },
                    "label": {"type": "plain_text", "text": "Title"}
                },
                {
                    "type": "input",
                    "block_id": "desc_block",
                    "element": {
                        "type": "plain_text_input",
                        "multiline": True,
                        "action_id": "desc_input"
                    },
                    "label": {"type": "plain_text", "text": "Description"}
                },
                {
                    "type": "input",
                    "block_id": "priority_block",
                    "element": {
                        "type": "static_select",
                        "action_id": "priority_select",
                        "options": [
                            {"text": {"type": "plain_text", "text": "Low"}, "value": "low"},
                            {"text": {"type": "plain_text", "text": "Medium"}, "value": "medium"},
                            {"text": {"type": "plain_text", "text": "High"}, "value": "high"}
                        ]
                    },
                    "label": {"type": "plain_text", "text": "Priority"}
                }
            ]
        }
    )

# Handle modal submission
@app.view("ticket_modal")
def handle_ticket_submission(ack, body, client, view):
    """Handle ticket modal submission."""
    ack()

    # Extract values from the view
    values = view["state"]["values"]
    title = values["title_block"]["title_input"]["value"]
    desc = values["desc_block"]["desc_input"]["value"]
    priority = values["priority_block"]["priority_select"]["selected_option"]["value"]
    user_id = body["user"]["id"]

    # Create ticket in your system
    ticket_id = create_ticket(title, desc, priority, user_id)

    # Notify user
    client.chat_postMessage(
        channel=user_id,
        text=f"Ticket #{ticket_id} created: {title}"
    )

# Handle button clicks
@app.action("approve_button")
def handle_approval(ack, body, client):
    """Handle approval button click."""
    ack()

    # Get context from the action
    user = body["user"]["id"]
    action_value = body["actions"][0]["value"]

    # Update the message to remove interactive elements
    # (Best practice: prevent double-clicks)
    client.chat_update(
        channel=body["channel"]["id"],
        ts=body["message"]["ts"],
        text=f"Approved by <@{user}>",
        blocks=[]  # Remove interactive blocks
    )

# Listen for app_home_opened events
@app.event("app_home_opened")
def update_home_tab(client, event):
    """Update the Home tab when user opens it."""
    client.views_publish(
        user_id=event["user"],
        view={
            "type": "home",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Welcome to the Ticket Bot!*"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Create Ticket"},
                            "action_id": "create_ticket_button"
                        }
                    ]
                }
            ]
        }
    )

# Socket Mode for development (no public URL needed)
if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()

# For production, use HTTP mode with a web server
# from flask import Flask, request
# from slack_bolt.adapter.flask import SlackRequestHandler
#
# flask_app = Flask(__name__)
# handler = SlackRequestHandler(app)
#
# @flask_app.route("/slack/events", methods=["POST"])
# def slack_events():
#     return handler.handle(request)

### Anti_patterns

- Not acknowledging requests within 3 seconds
- Blocking operations in the ack handler
- Hardcoding tokens in source code
- Not using Socket Mode for development

### Block Kit UI Pattern

Block Kit is Slack's UI framework for building rich, interactive messages.
Compose messages using blocks (sections, actions, inputs) and elements
(buttons, menus, text inputs).

Limits:
- Up to 50 blocks per message
- Up to 100 blocks in modals/Home tabs
- Block text limited to 3000 characters

Use Block Kit Builder to prototype: https://app.slack.com/block-kit-builder

**When to use**: Building rich message layouts,Adding interactive components to messages,Creating forms in modals,Building Home tab experiences

from slack_bolt import App
import os

app = App(token=os.environ["SLACK_BOT_TOKEN"])

def build_notification_blocks(incident: dict) -> list:
    """Build Block Kit blocks for incident notification."""
    severity_emoji = {
        "critical": ":red_circle:",
        "high": ":large_orange_circle:",
        "medium": ":large_yellow_circle:",
        "low": ":white_circle:"
    }

    return [
        # Header
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{severity_emoji.get(incident['severity'], '')} Incident Alert"
            }
        },
        # Details section
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Incident:*\n{incident['title']}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Severity:*\n{incident['severity'].upper()}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Service:*\n{incident['service']}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Reported:*\n<!date^{incident['timestamp']}^{date_short} {time}|{incident['timestamp']}>"
                }
            ]
        },
        # Description
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Description:*\n{incident['description'][:2000]}"
            }
        },
        # Divider
        {"type": "divider"},
        # Action buttons
        {
            "type": "actions",
            "block_id": f"incident_actions_{incident['id']}",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Acknowledge"},
                    "style": "primary",
                    "action_id": "acknowledge_incident",
                    "value": incident['id']
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Resolve"},
                    "style": "danger",
                    "action_id": "resolve_incident",
                    "value": incident['id'],
                    "confirm": {
                        "title": {"type": "plain_text", "text": "Resolve Incident?"},
                        "text": {"type": "mrkdwn", "text": "Are you sure this incident is resolved?"},
                        "confirm": {"type": "plain_text", "text": "Yes, Resolve"},
                        "deny": {"type": "plain_text", "text": "Cancel"}
                    }
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "View Details"},
                    "action_id": "view_incident",
                    "value": incident['id'],
                    "url": f"https://incidents.example.com/{incident['id']}"
                }
            ]
        },
        # Context footer
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Incident ID: {incident['id']} | <https://runbook.example.com/{incident['service']}|View Runbook>"
                }
            ]
        }
    ]

def send_incident_notification(channel: str, incident: dict):
    """Send incident notification with Block Kit."""
    blocks = build_notification_blocks(incident)

    app.client.chat_postMessage(
        channel=channel,
        text=f"Incident: {incident['title']}",  # Fallback for notifications
        blocks=blocks
    )

# Handle button actions
@app.action("acknowledge_incident")
def handle_acknowledge(ack, body, client):
    """Handle incident acknowledgment."""
    ack()

    incident_id = body["actions"][0]["value"]
    user = body["user"]["id"]

    # Update your system
    acknowledge_incident(incident_id, user)

    # Update message to show acknowledgment
    original_blocks = body["message"]["blocks"]

    # Add acknowledgment to context
    original_blocks[-1]["elements"].append({
        "type": "mrkdwn",
        "text": f":white_check_mark: Acknowledged by <@{user}>"
    })

    # Remove acknowledge button (prevent double-click)
    action_block = next(b for b in original_blocks if b.get("block_id", "").startswith("incident_actions"))
    action_block["elements"] = [e for e in action_block["elements"] if e["action_id"] != "acknowledge_incident"]

    client.chat_update(
        channel=body["channel"]["id"],
        ts=body["message"]["ts"],
        blocks=original_blocks
    )

# Interactive select menus
def build_user_selector_blocks():
    """Build blocks with user selector."""
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "Assign this task:"},
            "accessory": {
                "type": "users_select",
                "action_id": "assign_user",
                "placeholder": {"type": "plain_text", "text": "Select assignee"}
            }
        }
    ]

# Overflow menu for more options
def build_task_blocks(task: dict):
    """Build task blocks with overflow menu."""
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*{task['title']}*"},
            "accessory": {
                "type": "overflow",
                "action_id": "task_overflow",
                "options": [
                    {
                        "text": {"type": "plain_text", "text": "Edit"},
                        "value": f"edit_{task['id']}"
                    },
                    {
                        "text": {"type": "plain_text", "text": "Delete"},
                        "value": f"delete_{task['id']}"
                    },
                    {
                        "text": {"type": "plain_text", "text": "Share"},
                        "value": f"share_{task['id']}"
                    }
                ]
            }
        }
    ]

### Anti_patterns

- Exceeding 50 blocks per message
- Not providing fallback text for accessibility
- Hardcoding action_ids (use dynamic IDs when needed)
- Not handling button clicks idempotently

### OAuth Installation Pattern

Enable users to install your app in their workspaces via OAuth 2.0.
Bolt handles most of the OAuth flow, but you need to configure it
and store tokens securely.

Key OAuth concepts:
- Scopes define permissions (request minimum needed)
- Tokens are workspace-specific
- Installation data must be stored persistently
- Users can add scopes later (additive)

70% of users abandon installation when confronted with excessive
permission requests - request only what you need!

**When to use**: Distributing app to multiple workspaces,Building public Slack apps,Enterprise-grade integrations

from slack_bolt import App
from slack_bolt.oauth.oauth_settings import OAuthSettings
from slack_sdk.oauth.installation_store import FileInstallationStore
from slack_sdk.oauth.state_store import FileOAuthStateStore
import os

# For production, use database-backed stores
# For example: PostgreSQL, MongoDB, Redis

class DatabaseInstallationStore:
    """Store installation data in your database."""

    async def save(self, installation):
        """Save installation when user completes OAuth."""
        await db.installations.upsert({
            "team_id": installation.team_id,
            "enterprise_id": installation.enterprise_id,
            "bot_token": encrypt(installation.bot_token),
            "bot_user_id": installation.bot_user_id,
            "bot_scopes": installation.bot_scopes,
            "user_id": installation.user_id,
            "installed_at": installation.installed_at
        })

    async def find_installation(self, *, enterprise_id, team_id, user_id=None, is_enterprise_install=False):
        """Find installation for a workspace."""
        record = await db.installations.find_one({
            "team_id": team_id,
            "enterprise_id": enterprise_id
        })

        if record:
            return Installation(
                bot_token=decrypt(record["bot_token"]),
                # ... other fields
            )
        return None

# Initialize OAuth-enabled app
app = App(
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
    oauth_settings=OAuthSettings(
        client_id=os.environ["SLACK_CLIENT_ID"],
        client_secret=os.environ["SLACK_CLIENT_SECRET"],
        scopes=[
            "channels:history",
            "channels:read",
            "chat:write",
            "commands",
            "users:read"
        ],
        user_scopes=[],  # User token scopes if needed
        installation_store=DatabaseInstallationStore(),
        state_store=FileOAuthStateStore(expiration_seconds=600)
    )
)

# OAuth routes are handled automatically by Bolt
# /slack/install - Initiates OAuth flow
# /slack/oauth_redirect - Handles callback

# Flask integration
from flask import Flask, request
from slack_bolt.adapter.flask import SlackRequestHandler

flask_app = Flask(__name__)
handler = SlackRequestHandler(app)

@flask_app.route("/slack/install", methods=["GET"])
def install():
    return handler.handle(request)

@flask_app.route("/slack/oauth_redirect", methods=["GET"])
def oauth_redirect():
    return handler.handle(request)

@flask_app.route("/slack/events", methods=["POST"])
def slack_events():
    return handler.handle(request)

# Handle installation success/failure
@app.oauth_success
def handle_oauth_success(args):
    """Called when OAuth completes successfully."""
    installation = args["installation"]

    # Send welcome message
    app.client.chat_postMessage(
        token=installation.bot_token,
        channel=installation.user_id,
        text="Thanks for installing! Type /help to get started."
    )

    return "Installation successful! You can close this window."

@app.oauth_failure
def handle_oauth_failure(args):
    """Called when OAuth fails."""
    error = args.get("error", "Unknown error")
    return f"Installation failed: {error}"

# Scope management - request additional scopes when needed
def request_additional_scopes(team_id: str, new_scopes: list):
    """
    Generate URL for user to add scopes.
    Note: Existing tokens retain old scopes.
    User must re-authorize for new scopes.
    """
    base_url = "https://slack.com/oauth/v2/authorize"
    params = {
        "client_id": os.environ["SLACK_CLIENT_ID"],
        "scope": ",".join(new_scopes),
        "team": team_id
    }
    return f"{base_url}?{urlencode(params)}"

### Anti_patterns

- Requesting unnecessary scopes upfront
- Storing tokens in plain text
- Not validating OAuth state parameter (CSRF risk)
- Assuming tokens have new scopes after config change

### Socket Mode Pattern

Socket Mode allows your app to receive events via WebSocket instead
of public HTTP endpoints. Perfect for development and apps behind
firewalls.

Benefits:
- No public URL needed
- Works behind corporate firewalls
- Simpler local development
- Real-time bidirectional communication

Limitation: Not recommended for high-volume production apps.

**When to use**: Local development,Apps behind corporate firewalls,Internal tools with security constraints,Prototyping and testing

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import os

# Socket Mode requires an app-level token (xapp-...)
# Create in App Settings > Basic Information > App-Level Tokens
# Needs 'connections:write' scope

app = App(token=os.environ["SLACK_BOT_TOKEN"])

@app.message("hello")
def handle_hello(message, say):
    say(f"Hey <@{message['user']}>!")

@app.command("/status")
def handle_status(ack, say):
    ack()
    say("All systems operational!")

@app.event("app_mention")
def handle_mention(event, say):
    say(f"You mentioned me, <@{event['user']}>!")

if __name__ == "__main__":
    # SocketModeHandler manages the WebSocket connection
    handler = SocketModeHandler(
        app,
        os.environ["SLACK_APP_TOKEN"]  # xapp-... token
    )

    print("Starting Socket Mode...")
    handler.start()

# For async apps
from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
import asyncio

async_app = AsyncApp(token=os.environ["SLACK_BOT_TOKEN"])

@async_app.message("hello")
async def handle_hello_async(message, say):
    await say(f"Hey <@{message['user']}>!")

async def main():
    handler = AsyncSocketModeHandler(async_app, os.environ["SLACK_APP_TOKEN"])
    await handler.start_async()

if __name__ == "__main__":
    asyncio.run(main())

### Anti_patterns

- Using Socket Mode for high-volume production apps
- Not handling WebSocket disconnections
- Forgetting to create app-level token
- Using bot token instead of app token

### Workflow Builder Step Pattern

Extend Slack's Workflow Builder with custom steps powered by your app.
Users can include your custom steps in their no-code workflows.

Workflow steps can:
- Collect input from users
- Execute custom logic
- Output data for subsequent steps

**When to use**: Integrating with Workflow Builder,Enabling non-technical users to use your features,Building reusable automation components

from slack_bolt import App
from slack_bolt.workflows.step import WorkflowStep
import os

app = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"]
)

# Define the workflow step
def edit(ack, step, configure):
    """Called when user adds/edits the step in Workflow Builder."""
    ack()

    # Show configuration modal
    blocks = [
        {
            "type": "input",
            "block_id": "ticket_type",
            "element": {
                "type": "static_select",
                "action_id": "type_select",
                "options": [
                    {"text": {"type": "plain_text", "text": "Bug"}, "value": "bug"},
                    {"text": {"type": "plain_text", "text": "Feature"}, "value": "feature"},
                    {"text": {"type": "plain_text", "text": "Task"}, "value": "task"}
                ]
            },
            "label": {"type": "plain_text", "text": "Ticket Type"}
        },
        {
            "type": "input",
            "block_id": "title_input",
            "element": {
                "type": "plain_text_input",
                "action_id": "title"
            },
            "label": {"type": "plain_text", "text": "Title"}
        },
        {
            "type": "input",
            "block_id": "assignee_input",
            "element": {
                "type": "users_select",
                "action_id": "assignee"
            },
            "label": {"type": "plain_text", "text": "Assignee"}
        }
    ]

    configure(blocks=blocks)

def save(ack, view, update):
    """Called when user saves step configuration."""
    ack()

    values = view["state"]["values"]

    # Define inputs (from user's configuration)
    inputs = {
        "ticket_type": {
            "value": values["ticket_type"]["type_select"]["selected_option"]["value"]
        },
        "title": {
            "value": values["title_input"]["title"]["value"]
        },
        "assignee": {
            "value": values["assignee_input"]["assignee"]["selected_user"]
        }
    }

    # Define outputs (available to subsequent steps)
    outputs = [
        {
            "name": "ticket_id",
            "type": "text",
            "label": "Created Ticket ID"
        },
        {
            "name": "ticket_url",
            "type": "text",
            "label": "Ticket URL"
        }
    ]

    update(inputs=inputs, outputs=outputs)

def execute(step, complete, fail):
    """Called when the step runs in a workflow."""
    inputs = step["inputs"]

    try:
        # Get input values
        ticket_type = inputs["ticket_type"]["value"]
        title = inputs["title"]["value"]
        assignee = inputs["assignee"]["value"]

        # Create ticket in your system
        ticket = create_ticket(
            type=ticket_type,
            title=title,
            assignee=assignee
        )

        # Complete with outputs
        complete(outputs={
            "ticket_id": ticket["id"],
            "ticket_url": ticket["url"]
        })

    except Exception as e:
        fail(error={"message": str(e)})

# Register the workflow step
create_ticket_step = WorkflowStep(
    callback_id="create_ticket_step",
    edit=edit,
    save=save,
    execute=execute
)

app.step(create_ticket_step)

### Anti_patterns

- Not calling complete() or fail() in execute
- Long-running operations without progress updates
- Not validating inputs in execute
- Exposing sensitive data in outputs

## Sharp Edges

### Missing 3-Second Acknowledgment (Timeout)

Severity: CRITICAL

Situation: Handling slash commands, shortcuts, or interactive components

Symptoms:
User sees "This command timed out" or "Something went wrong."
The action never completes even though your code runs.
Works in development but fails in production.

Why this breaks:
Slack requires acknowledgment within 3 seconds for ALL interactive requests:
- Slash commands
- Button/select menu clicks
- Modal submissions
- Shortcuts

If you do ANY slow operation (database, API call, LLM) before responding,
you'll miss the window. Slack shows an error even if your bot eventually
processes the request correctly.

Recommended fix:

## Acknowledge immediately, process later

```python
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import threading

app = App(token=os.environ["SLACK_BOT_TOKEN"])

@app.command("/slow-task")
def handle_slow_task(ack, command, client, respond):
    # ACK IMMEDIATELY - before any processing
    ack("Processing your request...")

    # Do slow work in background
    def do_work():
        result = call_slow_api(command["text"])  # Takes 10 seconds
        respond(f"Done! Result: {result}")

    threading.Thread(target=do_work).start()

@app.view("modal_submission")
def handle_modal(ack, body, client, view):
    # ACK with response_action for modals
    ack(response_action="clear")  # Or "update" with new view

    # Process in background
    user_id = body["user"]["id"]
    values = view["state"]["values"]
    # ... slow processing
```

## For Bolt framework - use lazy listeners

```python
# Bolt handles ack() automatically with lazy listeners
@app.command("/slow-task")
def handle_slow_task(ack, command, respond):
    ack()  # Still call ack() first!

@handle_slow_task.lazy
def process_slow_task(command, respond):
    # This runs after ack, can take as long as needed
    result = slow_operation(command["text"])
    respond(result)
```

### Not Validating OAuth State Parameter (CSRF)

Severity: CRITICAL

Situation: Implementing OAuth installation flow

Symptoms:
Bot appears to work, but you're vulnerable to CSRF attacks.
Attackers could trick users into installing malicious configurations.

Why this breaks:
The OAuth state parameter prevents CSRF attacks. Flow:
1. You generate random state, store it, send to Slack
2. User authorizes in Slack
3. Slack redirects back with code + state
4. You MUST verify state matches what you stored

Without this, an attacker can craft a malicious OAuth URL and trick
admins into completing the flow with attacker's authorization code.

Recommended fix:

## Proper state validation

```python
import secrets
from flask import Flask, request, session, redirect
from slack_sdk.oauth import AuthorizeUrlGenerator
from slack_sdk.oauth.state_store import FileOAuthStateStore

app = Flask(__name__)
app.secret_key = os.environ["SESSION_SECRET"]

# Use Slack SDK's state store (Redis recommended for production)
state_store = FileOAuthStateStore(
    expiration_seconds=300,  # 5 minutes
    base_dir="./oauth_states"
)

@app.route("/slack/install")
def install():
    # Generate cryptographically secure state
    state = state_store.issue()

    # Store in session for verification
    session["oauth_state"] = state

    authorize_url = AuthorizeUrlGenerator(
        client_id=os.environ["SLACK_CLIENT_ID"],
        scopes=["channels:history", "chat:write"],
        user_scopes=[]
    ).generate(state)

    return redirect(authorize_url)

@app.route("/slack/oauth/callback")
def oauth_callback():
    # CRITICAL: Verify state
    received_state = request.args.get("state")
    stored_state = session.get("oauth_state")

    if not received_state or received_state != stored_state:
        return "Invalid state parameter - possible CSRF attack", 403

    # Also use state_store.consume() for one-time use
    if not state_store.consume(received_state):
        return "State already used or expired", 403

    # Now safe to exchange code for token
    code = request.args.get("code")
    # ... complete OAuth flow
```

### Exposing Bot/User Tokens

Severity: CRITICAL

Situation: Storing or logging Slack tokens

Symptoms:
Unauthorized messages sent from your bot. Attackers reading private
channels. Token found in logs, git history, or client-side code.

Why this breaks:
Slack tokens provide FULL access to whatever scopes they have:
- Bot tokens (xoxb-*): Access workspaces where installed
- User tokens (xoxp-*): Access as that specific user
- App-level tokens (xapp-*): Socket Mode connections

Common exposure points:
- Hardcoded in source code
- Logged in error messages
- Sent to frontend/client
- Stored in database without encryption

Recommended fix:

## Never hardcode or log tokens

```python
# BAD - never do this
client = WebClient(token="xoxb-12345-...")

# GOOD - environment variables
client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])

# BAD - logging tokens
logger.error(f"API call failed with token {token}")

# GOOD - never log tokens
logger.error(f"API call failed for team {team_id}")

# BAD - sending token to frontend
return {"token": bot_token}

# GOOD - only send what frontend needs
return {"channels": channel_list}
```

## Encrypt tokens in database

```python
from cryptography.fernet import Fernet

class TokenStore:
    def __init__(self, encryption_key: str):
        self.cipher = Fernet(encryption_key)

    def save_token(self, team_id: str, token: str):
        encrypted = self.cipher.encrypt(token.encode())
        db.execute(
            "INSERT INTO installations (team_id, encrypted_token) VALUES (?, ?)",
            (team_id, encrypted)
        )

    def get_token(self, team_id: str) -> str:
        row = db.execute(
            "SELECT encrypted_token FROM installations WHERE team_id = ?",
            (team_id,)
        ).fetchone()
        return self.cipher.decrypt(row[0]).decode()
```

## Rotate tokens if exposed

```
1. Slack API > Your App > OAuth & Permissions
2. Click "Rotate" for the exposed token
3. Update all deployments immediately
4. Review Slack audit logs for unauthorized access
```

### Requesting Unnecessary OAuth Scopes

Severity: HIGH

Situation: Configuring OAuth scopes for your app

Symptoms:
Users hesitate to install due to scary permission warnings.
Lower install rates. Security team blocks deployment.
App rejected from Slack App Directory.

Why this breaks:
Each OAuth scope grants specific permissions. Requesting more than
you need:
- Makes install consent screen scary
- Increases attack surface if token leaked
- May violate enterprise security policies
- Can get your app rejected from App Directory

Common over-requests:
- `admin` when you just need `chat:write`
- `channels:read` when you only message one channel
- `users:read.email` when you don't need emails

Recommended fix:

## Request minimum required scopes

```python
# For a simple notification bot
MINIMAL_SCOPES = [
    "chat:write",        # Post messages
    "channels:join",     # Join public channels (if needed)
]

# NOT NEEDED for basic notification:
# - channels:read (unless you list channels)
# - users:read (unless you look up users)
# - channels:history (unless you read messages)

# For a slash command bot
SLASH_COMMAND_SCOPES = [
    "commands",          # Register slash commands
    "chat:write",        # Respond to commands
]

# For a bot that responds to mentions
MENTION_BOT_SCOPES = [
    "app_mentions:read", # Receive @mentions
    "chat:write",        # Reply to mentions
]
```

## Scope reference by use case

| Use Case | Required Scopes |
|----------|-----------------|
| Post messages | `chat:write` |
| Slash commands | `commands` |
| Respond to @mentions | `app_mentions:read`, `chat:write` |
| Read channel messages | `channels:history` (public), `groups:history` (private) |
| Read user info | `users:read` |
| Open modals | `commands` or trigger from event |
| Add reactions | `reactions:write` |
| Upload files | `files:write` |

## Progressive scope requests

```python
# Start with minimal scopes
INITIAL_SCOPES = ["chat:write", "commands"]

# Request additional scopes only when needed
@app.command("/enable-reactions")
def enable_reactions(ack, client, command):
    ack()

    # Check if we have the scope
    auth_result = client.auth_test()
    # If missing reactions:write, prompt re-auth
    if needs_additional_scope:
        # Send user to re-auth with additional scope
        pass
```

### Exceeding Block Kit Limits

Severity: MEDIUM

Situation: Building complex message UIs with Block Kit

Symptoms:
Message fails to send with "invalid_blocks" error.
Modal won't open. Message truncated unexpectedly.

Why this breaks:
Block Kit has strict limits that aren't always obvious:
- 50 blocks per message/modal
- 3000 characters per text block
- 10 elements per actions block
- 100 options per select menu
- Modal: 50 blocks, 24KB total
- Home tab: 100 blocks

Exceeding these causes silent failures or cryptic errors.

Recommended fix:

## Know and respect the limits

```python
# Constants for Block Kit limits
BLOCK_KIT_LIMITS = {
    "blocks_per_message": 50,
    "blocks_per_modal": 50,
    "blocks_per_home": 100,
    "text_block_chars": 3000,
    "elements_per_actions": 10,
    "options_per_select": 100,
    "modal_total_bytes": 24 * 1024,  # 24KB
}

def validate_blocks(blocks: list) -> tuple[bool, str]:
    """Validate blocks before sending."""
    if len(blocks) > BLOCK_KIT_LIMITS["blocks_per_message"]:
        return False, f"Too many blocks: {len(blocks)} > 50"

    for block in blocks:
        if block.get("type") == "section":
            text = block.get("text", {}).get("text", "")
            if len(text) > BLOCK_KIT_LIMITS["text_block_chars"]:
                return False, f"Text too long: {len(text)} > 3000"

        if block.get("type") == "actions":
            elements = block.get("elements", [])
            if len(elements) > BLOCK_KIT_LIMITS["elements_per_actions"]:
                return False, f"Too many actions: {len(elements)} > 10"

    return True, "OK"

# Paginate long content
def paginate_blocks(blocks: list, page: int = 0, per_page: int = 45):
    """Paginate blocks with navigation."""
    start = page * per_page
    end = start + per_page
    page_blocks = blocks[start:end]

    # Add pagination controls
    if len(blocks) > per_page:
        page_blocks.append({
            "type": "actions",
            "elements": [
                {"type": "button", "text": {"type": "plain_text", "text": "Previous"},
                 "action_id": f"page_{page-1}", "disabled": page == 0},
                {"type": "button", "text": {"type": "plain_text", "text": "Next"},
                 "action_id": f"page_{page+1}",
                 "disabled": end >= len(blocks)}
            ]
        })

    return page_blocks
```

### Using Socket Mode in Production

Severity: HIGH

Situation: Deploying Slack bot to production

Symptoms:
Bot works in development but is unreliable in production.
Missed events. Connection drops. Can't scale horizontally.

Why this breaks:
Socket Mode is designed for development:
- Single WebSocket connection per app
- Can't scale to multiple instances
- Connection can drop (needs reconnect logic)
- No built-in load balancing

For production with multiple instances or high traffic,
HTTP webhooks are more reliable.

Recommended fix:

## Socket Mode: Only for development

```python
# Development with Socket Mode
if os.environ.get("ENVIRONMENT") == "development":
    from slack_bolt.adapter.socket_mode import SocketModeHandler
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

## Production: Use HTTP endpoints

```python
# Production with HTTP (Flask example)
from slack_bolt.adapter.flask import SlackRequestHandler
from flask import Flask, request

flask_app = Flask(__name__)
handler = SlackRequestHandler(app)

@flask_app.route("/slack/events", methods=["POST"])
def slack_events():
    return handler.handle(request)

@flask_app.route("/slack/commands", methods=["POST"])
def slack_commands():
    return handler.handle(request)

@flask_app.route("/slack/interactions", methods=["POST"])
def slack_interactions():
    return handler.handle(request)
```

## If you must use Socket Mode in production

```python
from slack_bolt.adapter.socket_mode import SocketModeHandler
import time

class RobustSocketHandler:
    def __init__(self, app, app_token):
        self.app = app
        self.app_token = app_token
        self.handler = None

    def start(self):
        while True:
            try:
                self.handler = SocketModeHandler(self.app, self.app_token)
                self.handler.start()
            except Exception as e:
                logger.error(f"Socket Mode disconnected: {e}")
                time.sleep(5)  # Backoff before reconnect
```

### Not Verifying Request Signatures

Severity: CRITICAL

Situation: Receiving webhooks from Slack

Symptoms:
Attackers can send fake requests to your webhook endpoints.
Spoofed slash commands. Fake event notifications processed.

Why this breaks:
Slack signs all requests with X-Slack-Signature header using your
signing secret. Without verification, anyone who knows your webhook
URL can send fake requests.

This is different from OAuth tokens - signing verifies the REQUEST
came from Slack, not that you have permission to call Slack.

Recommended fix:

## Bolt handles this automatically

```python
from slack_bolt import App

# Bolt verifies signatures automatically when you provide signing_secret
app = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"]
)
# All requests to your handlers are verified
```

## Manual verification (if not using Bolt)

```python
import hmac
import hashlib
import time
from flask import Flask, request, abort

SIGNING_SECRET = os.environ["SLACK_SIGNING_SECRET"]

def verify_slack_signature(request):
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")

    # Reject old timestamps (replay attack prevention)
    if abs(time.time() - int(timestamp)) > 60 * 5:
        return False

    # Compute expected signature
    sig_basestring = f"v0:{timestamp}:{request.get_data(as_text=True)}"
    expected_sig = "v0=" + hmac.new(
        SIGNING_SECRET.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    return hmac.compare_digest(expected_sig, signature)

@app.route("/slack/events", methods=["POST"])
def slack_events():
    if not verify_slack_signature(request):
        abort(403)
    # Safe to process
```

## Validation Checks

### Hardcoded Slack Token

Severity: ERROR

Slack tokens must never be hardcoded

Message: Hardcoded Slack token detected. Use environment variables.

### Signing Secret in Source Code

Severity: ERROR

Signing secrets should be in environment variables

Message: Hardcoded signing secret. Use os.environ['SLACK_SIGNING_SECRET'].

### Webhook Without Signature Verification

Severity: ERROR

Slack webhooks must verify X-Slack-Signature

Message: Webhook without signature verification. Use Bolt or verify manually.

### Slack Token in Client-Side Code

Severity: ERROR

Never expose Slack tokens to browsers

Message: Slack credentials exposed client-side. Only use server-side.

### Slow Operation Before Acknowledgment

Severity: WARNING

ack() must be called before slow operations

Message: Slow operation before ack(). Call ack() first, then process.

### Missing Acknowledgment Call

Severity: WARNING

Interactive handlers must call ack()

Message: Handler missing ack() call. Must acknowledge within 3 seconds.

### OAuth Without State Validation

Severity: ERROR

OAuth callback must validate state parameter

Message: OAuth without state validation. Vulnerable to CSRF attacks.

### Token Storage Without Encryption

Severity: WARNING

Tokens should be encrypted at rest

Message: Token stored without encryption. Encrypt tokens at rest.

### Requesting Admin Scopes

Severity: WARNING

Avoid admin scopes unless absolutely necessary

Message: Requesting admin scope. Use minimal required scopes.

### Potentially Unused Scope

Severity: INFO

Check if all requested scopes are used

Message: Requesting users:read.email but may not use email. Verify necessity.

## Collaboration

### Delegation Triggers

- user needs AI-powered Slack bot -> llm-architect (Integrate LLM for conversational Slack bot)
- user needs voice notifications -> twilio-communications (Escalate Slack alerts to SMS or voice calls)
- user needs workflow automation -> workflow-automation (Slack as trigger/action in n8n/Temporal workflows)
- user needs bot for Discord too -> discord-bot-architect (Cross-platform bot architecture)
- user needs full auth system -> auth-specialist (OAuth, workspace management, enterprise SSO)
- user needs database for bot data -> postgres-wizard (Store installations, user preferences, message history)
- user needs high availability -> devops (Scale webhooks, monitoring, alerting)

## When to Use
- User mentions or implies: slack bot
- User mentions or implies: slack app
- User mentions or implies: bolt framework
- User mentions or implies: block kit
- User mentions or implies: slash command
- User mentions or implies: slack webhook
- User mentions or implies: slack workflow
- User mentions or implies: slack interactive
- User mentions or implies: slack oauth

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
