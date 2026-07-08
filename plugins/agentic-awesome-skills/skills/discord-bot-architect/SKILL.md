---
name: discord-bot-architect
description: Specialized skill for building production-ready Discord bots.
  Covers Discord.js (JavaScript) and Pycord (Python), gateway intents, slash
  commands, interactive components, rate limiting, and sharding.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Discord Bot Architect

Specialized skill for building production-ready Discord bots.
Covers Discord.js (JavaScript) and Pycord (Python), gateway intents,
slash commands, interactive components, rate limiting, and sharding.

## Principles

- Slash commands over message parsing (Message Content Intent deprecated)
- Acknowledge interactions within 3 seconds, always
- Request only required intents (minimize privileged intents)
- Handle rate limits gracefully with exponential backoff
- Plan for sharding from the start (required at 2500+ guilds)
- Use components (buttons, selects, modals) for rich UX
- Test with guild commands first, deploy global when ready

## Patterns

### Discord.js v14 Foundation

Modern Discord bot setup with Discord.js v14 and slash commands

**When to use**: Building Discord bots with JavaScript/TypeScript,Need full gateway connection with events,Building bots with complex interactions

```javascript
// src/index.js
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// Create client with minimal required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // Add only what you need:
    // GatewayIntentBits.GuildMessages,
    // GatewayIntentBits.MessageContent,  // PRIVILEGED - avoid if possible
  ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(process.env.DISCORD_TOKEN);
```

```javascript
// src/commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! Latency: ${latency}ms`);
  }
};
```

```javascript
// src/events/interactionCreate.js
const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const reply = {
        content: 'There was an error executing this command!',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }
};
```

```javascript
// src/deploy-commands.js
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} commands...`);

    // Guild commands (instant, for testing)
    // const data = await rest.put(
    //   Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    //   { body: commands }
    // );

    // Global commands (can take up to 1 hour to propagate)
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(`Successfully registered ${data.length} commands`);
  } catch (error) {
    console.error(error);
  }
})();
```

### Structure

discord-bot/
├── src/
│   ├── index.js           # Main entry point
│   ├── deploy-commands.js # Command registration script
│   ├── commands/          # Slash command handlers
│   │   └── ping.js
│   └── events/            # Event handlers
│       ├── ready.js
│       └── interactionCreate.js
├── .env
└── package.json

### Pycord Bot Foundation

Discord bot with Pycord (Python) and application commands

**When to use**: Building Discord bots with Python,Prefer async/await patterns,Need good slash command support

```python
# main.py
import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()

# Configure intents - only enable what you need
intents = discord.Intents.default()
# intents.message_content = True  # PRIVILEGED - avoid if possible
# intents.members = True          # PRIVILEGED

bot = commands.Bot(
    command_prefix="!",  # Legacy, prefer slash commands
    intents=intents
)

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")
    # Sync commands (do this carefully - see sharp edges)
    # await bot.sync_commands()

# Slash command
@bot.slash_command(name="ping", description="Check bot latency")
async def ping(ctx: discord.ApplicationContext):
    latency = round(bot.latency * 1000)
    await ctx.respond(f"Pong! Latency: {latency}ms")

# Slash command with options
@bot.slash_command(name="greet", description="Greet a user")
async def greet(
    ctx: discord.ApplicationContext,
    user: discord.Option(discord.Member, "User to greet"),
    message: discord.Option(str, "Custom message", required=False)
):
    msg = message or "Hello!"
    await ctx.respond(f"{user.mention}, {msg}")

# Load cogs
for filename in os.listdir("./cogs"):
    if filename.endswith(".py"):
        bot.load_extension(f"cogs.{filename[:-3]}")

bot.run(os.environ["DISCORD_TOKEN"])
```

```python
# cogs/general.py
import discord
from discord.ext import commands

class General(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.slash_command(name="info", description="Bot information")
    async def info(self, ctx: discord.ApplicationContext):
        embed = discord.Embed(
            title="Bot Info",
            description="A helpful Discord bot",
            color=discord.Color.blue()
        )
        embed.add_field(name="Servers", value=len(self.bot.guilds))
        embed.add_field(name="Latency", value=f"{round(self.bot.latency * 1000)}ms")
        await ctx.respond(embed=embed)

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        # Requires Members intent (PRIVILEGED)
        channel = member.guild.system_channel
        if channel:
            await channel.send(f"Welcome {member.mention}!")

def setup(bot):
    bot.add_cog(General(bot))
```

### Structure

discord-bot/
├── main.py           # Main bot file
├── cogs/             # Command groups
│   └── general.py
├── .env
└── requirements.txt

### Interactive Components Pattern

Using buttons, select menus, and modals for rich UX

**When to use**: Need interactive user interfaces,Collecting user input beyond slash command options,Building menus, confirmations, or forms

```javascript
// Discord.js - Buttons and Select Menus
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Shows an interactive menu'),

  async execute(interaction) {
    // Button row
    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setLabel('Documentation')
          .setURL('https://discord.js.org')
          .setStyle(ButtonStyle.Link)  // Link buttons don't emit events
      );

    // Select menu row (one per row, takes all 5 slots)
    const selectRow = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select-role')
          .setPlaceholder('Select a role')
          .setMinValues(1)
          .setMaxValues(3)
          .addOptions([
            { label: 'Developer', value: 'dev', emoji: '💻' },
            { label: 'Designer', value: 'design', emoji: '🎨' },
            { label: 'Community', value: 'community', emoji: '🎉' }
          ])
      );

    await interaction.reply({
      content: 'Choose an option:',
      components: [buttonRow, selectRow]
    });

    // Collect responses
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60_000  // 60 seconds timeout
    });

    collector.on('collect', async i => {
      if (i.customId === 'confirm') {
        await i.update({ content: 'Confirmed!', components: [] });
        collector.stop();
      } else if (i.customId === 'cancel') {
        await i.update({ content: 'Cancelled', components: [] });
        collector.stop();
      } else if (i.customId === 'select-role') {
        await i.update({ content: `You selected: ${i.values.join(', ')}` });
      }
    });
  }
};
```

```javascript
// Modals (forms)
module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Submit feedback'),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('feedback-modal')
      .setTitle('Submit Feedback');

    const titleInput = new TextInputBuilder()
      .setCustomId('feedback-title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const bodyInput = new TextInputBuilder()
      .setCustomId('feedback-body')
      .setLabel('Your feedback')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000)
      .setPlaceholder('Describe your feedback...');

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(bodyInput)
    );

    // Show modal - MUST be first response
    await interaction.showModal(modal);
  }
};

// Handle modal submission in interactionCreate
if (interaction.isModalSubmit()) {
  if (interaction.customId === 'feedback-modal') {
    const title = interaction.fields.getTextInputValue('feedback-title');
    const body = interaction.fields.getTextInputValue('feedback-body');

    await interaction.reply({
      content: `Thanks for your feedback!\n**${title}**\n${body}`,
      ephemeral: true
    });
  }
}
```

```python
# Pycord - Buttons and Views
import discord

class ConfirmView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=60)
        self.value = None

    @discord.ui.button(label="Confirm", style=discord.ButtonStyle.green)
    async def confirm(self, button, interaction):
        self.value = True
        await interaction.response.edit_message(content="Confirmed!", view=None)
        self.stop()

    @discord.ui.button(label="Cancel", style=discord.ButtonStyle.red)
    async def cancel(self, button, interaction):
        self.value = False
        await interaction.response.edit_message(content="Cancelled", view=None)
        self.stop()

@bot.slash_command(name="confirm")
async def confirm_cmd(ctx: discord.ApplicationContext):
    view = ConfirmView()
    await ctx.respond("Are you sure?", view=view)

    await view.wait()  # Wait for user interaction
    if view.value is None:
        await ctx.followup.send("Timed out")

# Select Menu
class RoleSelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="Developer", value="dev", emoji="💻"),
            discord.SelectOption(label="Designer", value="design", emoji="🎨"),
        ]
        super().__init__(
            placeholder="Select roles...",
            min_values=1,
            max_values=2,
            options=options
        )

    async def callback(self, interaction):
        await interaction.response.send_message(
            f"You selected: {', '.join(self.values)}",
            ephemeral=True
        )

class RoleView(discord.ui.View):
    def __init__(self):
        super().__init__()
        self.add_item(RoleSelect())

# Modal
class FeedbackModal(discord.ui.Modal):
    def __init__(self):
        super().__init__(title="Submit Feedback")

        self.add_item(discord.ui.InputText(
            label="Title",
            style=discord.InputTextStyle.short,
            required=True,
            max_length=100
        ))
        self.add_item(discord.ui.InputText(
            label="Feedback",
            style=discord.InputTextStyle.long,
            required=True,
            max_length=1000
        ))

    async def callback(self, interaction):
        title = self.children[0].value
        body = self.children[1].value
        await interaction.response.send_message(
            f"Thanks!\n**{title}**\n{body}",
            ephemeral=True
        )

@bot.slash_command(name="feedback")
async def feedback(ctx: discord.ApplicationContext):
    await ctx.send_modal(FeedbackModal())
```

### Limits

- 5 ActionRows per message/modal
- 5 buttons per ActionRow
- 1 select menu per ActionRow (takes all 5 slots)
- 5 select menus max per message
- 25 options per select menu
- Modal must be first response (cannot defer first)

### Deferred Response Pattern

Handle slow operations without timing out

**When to use**: Operation takes more than 3 seconds,Database queries, API calls, LLM responses,File processing or generation

```javascript
// Discord.js - Deferred response
module.exports = {
  data: new SlashCommandBuilder()
    .setName('slow-task')
    .setDescription('Performs a slow operation'),

  async execute(interaction) {
    // Defer immediately - you have 3 seconds!
    await interaction.deferReply();
    // For ephemeral: await interaction.deferReply({ ephemeral: true });

    try {
      // Now you have 15 minutes to complete
      const result = await slowDatabaseQuery();
      const aiResponse = await callOpenAI(result);

      // Edit the deferred reply
      await interaction.editReply({
        content: `Result: ${aiResponse}`,
        embeds: [resultEmbed]
      });
    } catch (error) {
      await interaction.editReply({
        content: 'An error occurred while processing your request.'
      });
    }
  }
};

// For components (buttons, select menus)
collector.on('collect', async i => {
  await i.deferUpdate();  // Acknowledge without visual change
  // Or: await i.deferReply({ ephemeral: true });

  const result = await slowOperation();
  await i.editReply({ content: result });
});
```

```python
# Pycord - Deferred response
@bot.slash_command(name="slow-task")
async def slow_task(ctx: discord.ApplicationContext):
    # Defer immediately
    await ctx.defer()
    # For ephemeral: await ctx.defer(ephemeral=True)

    try:
        result = await slow_database_query()
        ai_response = await call_openai(result)

        await ctx.followup.send(f"Result: {ai_response}")
    except Exception as e:
        await ctx.followup.send("An error occurred")
```

### Timing

- Initial_response: 3 seconds
- Deferred_followup: 15 minutes
- Ephemeral_note: Can only be set on initial response, not changed later

### Embed Builder Pattern

Rich embedded messages for professional-looking content

**When to use**: Displaying formatted information,Status updates, help menus, logs,Data with structure (fields, images)

```javascript
const { EmbedBuilder, Colors } = require('discord.js');

// Basic embed
const embed = new EmbedBuilder()
  .setColor(Colors.Blue)
  .setTitle('Bot Status')
  .setURL('https://example.com')
  .setAuthor({
    name: 'Bot Name',
    iconURL: client.user.displayAvatarURL()
  })
  .setDescription('Current status and statistics')
  .addFields(
    { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
    { name: 'Users', value: `${client.users.cache.size}`, inline: true },
    { name: 'Uptime', value: formatUptime(), inline: true }
  )
  .setThumbnail(client.user.displayAvatarURL())
  .setImage('https://example.com/banner.png')
  .setTimestamp()
  .setFooter({
    text: 'Requested by User',
    iconURL: interaction.user.displayAvatarURL()
  });

await interaction.reply({ embeds: [embed] });

// Multiple embeds (max 10)
await interaction.reply({ embeds: [embed1, embed2, embed3] });
```

```python
# Pycord
embed = discord.Embed(
    title="Bot Status",
    description="Current status and statistics",
    color=discord.Color.blue(),
    url="https://example.com"
)
embed.set_author(
    name="Bot Name",
    icon_url=bot.user.display_avatar.url
)
embed.add_field(name="Servers", value=len(bot.guilds), inline=True)
embed.add_field(name="Users", value=len(bot.users), inline=True)
embed.set_thumbnail(url=bot.user.display_avatar.url)
embed.set_image(url="https://example.com/banner.png")
embed.set_footer(text="Requested by User", icon_url=ctx.author.display_avatar.url)
embed.timestamp = discord.utils.utcnow()

await ctx.respond(embed=embed)
```

### Limits

- 10 embeds per message
- 6000 characters total across all embeds
- 256 characters for title
- 4096 characters for description
- 25 fields per embed
- 256 characters per field name
- 1024 characters per field value

### Rate Limit Handling Pattern

Gracefully handle Discord API rate limits

**When to use**: High-volume operations,Bulk messaging or role assignments,Any repeated API calls

```javascript
// Discord.js handles rate limits automatically, but for custom handling:
const { REST } = require('discord.js');

const rest = new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN);

rest.on('rateLimited', (info) => {
  console.log(`Rate limited! Retry after ${info.retryAfter}ms`);
  console.log(`Route: ${info.route}`);
  console.log(`Global: ${info.global}`);
});

// Queue pattern for bulk operations
class RateLimitQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestsPerSecond = 40; // Safe margin below 50
  }

  async add(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { operation, resolve, reject } = this.queue.shift();

      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Throttle: ~40 requests per second
      await new Promise(r => setTimeout(r, 1000 / this.requestsPerSecond));
    }

    this.processing = false;
  }
}

const queue = new RateLimitQueue();

// Usage: Send 200 messages without hitting rate limits
for (const user of users) {
  await queue.add(() => user.send('Welcome!'));
}
```

```python
# Pycord/discord.py handles rate limits automatically
# For custom handling:
import asyncio
from collections import deque

class RateLimitQueue:
    def __init__(self, requests_per_second=40):
        self.queue = deque()
        self.processing = False
        self.delay = 1 / requests_per_second

    async def add(self, coro):
        future = asyncio.Future()
        self.queue.append((coro, future))
        if not self.processing:
            asyncio.create_task(self._process())
        return await future

    async def _process(self):
        self.processing = True
        while self.queue:
            coro, future = self.queue.popleft()
            try:
                result = await coro
                future.set_result(result)
            except Exception as e:
                future.set_exception(e)
            await asyncio.sleep(self.delay)
        self.processing = False

queue = RateLimitQueue()

# Usage
for member in guild.members:
    await queue.add(member.send("Welcome!"))
```

### Rate_limits

- Global: 50 requests per second
- Gateway: 120 requests per 60 seconds
- Specific: Messages to same channel: 5/5s, Bulk delete: 1/1s, Guild member requests: varies by guild size

### Sharding Pattern

Scale bots to 2500+ servers with sharding

**When to use**: Bot approaching 2500 guilds (required),Want horizontal scaling,Memory optimization for large bots

```javascript
// Discord.js Sharding Manager
// shard.js (main entry)
const { ShardingManager } = require('discord.js');

const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto',  // Discord determines optimal count
  // Or specify: totalShards: 4
});

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);

  shard.on('ready', () => {
    console.log(`Shard ${shard.id} ready`);
  });

  shard.on('disconnect', () => {
    console.log(`Shard ${shard.id} disconnected`);
  });
});

manager.spawn();

// bot.js - Modified for sharding
const { Client } = require('discord.js');

const client = new Client({ intents: [...] });

// Get shard info
client.on('ready', () => {
  console.log(`Shard ${client.shard.ids[0]} ready with ${client.guilds.cache.size} guilds`);
});

// Cross-shard data
async function getTotalGuilds() {
  const results = await client.shard.fetchClientValues('guilds.cache.size');
  return results.reduce((acc, count) => acc + count, 0);
}

// Broadcast to all shards
async function broadcastMessage(channelId, message) {
  await client.shard.broadcastEval(
    (c, { channelId, message }) => {
      const channel = c.channels.cache.get(channelId);
      if (channel) channel.send(message);
    },
    { context: { channelId, message } }
  );
}
```

```python
# Pycord - AutoShardedBot
import discord
from discord.ext import commands

# Automatically handles sharding
bot = commands.AutoShardedBot(
    command_prefix="!",
    intents=discord.Intents.default(),
    shard_count=None  # Auto-determine
)

@bot.event
async def on_ready():
    print(f"Logged in on {len(bot.shards)} shards")
    for shard_id, shard in bot.shards.items():
        print(f"Shard {shard_id}: {shard.latency * 1000:.2f}ms")

@bot.event
async def on_shard_ready(shard_id):
    print(f"Shard {shard_id} is ready")

# Get guilds per shard
for shard_id, guilds in bot.guilds_by_shard().items():
    print(f"Shard {shard_id}: {len(guilds)} guilds")
```

### Scaling_guide

- 1-2500 guilds: No sharding required
- 2500+ guilds: Sharding required by Discord
- Recommended: ~1000 guilds per shard
- Memory: Each shard runs in separate process

## Sharp Edges

### Interaction Timeout (3 Second Rule)

Severity: CRITICAL

Situation: Handling slash commands, buttons, select menus, or modals

Symptoms:
User sees "This interaction failed" or "The application did not respond."
Command works locally but fails in production.
Slow operations never complete.

Why this breaks:
Discord requires ALL interactions to be acknowledged within 3 seconds:
- Slash commands
- Button clicks
- Select menu selections
- Context menu commands

If you do ANY slow operation (database, API, file I/O) before responding,
you'll miss the window. Discord shows an error even if your bot processes
the request correctly afterward.

After acknowledgment, you have 15 minutes for follow-up responses.

Recommended fix:

## Acknowledge immediately, process later

```javascript
// Discord.js - Defer for slow operations
module.exports = {
  async execute(interaction) {
    // DEFER IMMEDIATELY - before any slow operation
    await interaction.deferReply();
    // For ephemeral: await interaction.deferReply({ ephemeral: true });

    // Now you have 15 minutes
    const result = await slowDatabaseQuery();
    const aiResponse = await callLLM(result);

    // Edit the deferred reply
    await interaction.editReply(`Result: ${aiResponse}`);
  }
};
```

```python
# Pycord
@bot.slash_command()
async def slow_command(ctx):
    await ctx.defer()  # Acknowledge immediately
    # await ctx.defer(ephemeral=True)  # For private response

    result = await slow_operation()
    await ctx.followup.send(f"Result: {result}")
```

## For components (buttons, menus)

```javascript
// If you're updating the message
await interaction.deferUpdate();

// If you're sending a new response
await interaction.deferReply({ ephemeral: true });
```

### Missing Privileged Intent Configuration

Severity: CRITICAL

Situation: Bot needs member data, presences, or message content

Symptoms:
Members intent: member lists empty, on_member_join doesn't fire
Presences intent: statuses always unknown/offline
Message content intent: message.content is empty string

Why this breaks:
Discord has 3 privileged intents that require manual enablement:
1. **GUILD_MEMBERS** - Member join/leave, member lists
2. **GUILD_PRESENCES** - Online status, activities
3. **MESSAGE_CONTENT** - Read message text (deprecated for commands)

These must be:
1. Enabled in Discord Developer Portal > Bot > Privileged Gateway Intents
2. Requested in your bot code

At 100+ servers, you need Discord verification to keep using them.

Recommended fix:

## Step 1: Enable in Developer Portal

```
1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to Bot section
4. Scroll to Privileged Gateway Intents
5. Toggle ON the intents you need
```

## Step 2: Request in code

```javascript
// Discord.js
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,       // PRIVILEGED
    // GatewayIntentBits.GuildPresences,  // PRIVILEGED
    // GatewayIntentBits.MessageContent,  // PRIVILEGED - avoid!
  ]
});
```

```python
# Pycord
intents = discord.Intents.default()
intents.members = True       # PRIVILEGED
# intents.presences = True   # PRIVILEGED
# intents.message_content = True  # PRIVILEGED - avoid!

bot = commands.Bot(intents=intents)
```

## Avoid Message Content Intent if possible

Use slash commands, buttons, and modals instead of message parsing.
These don't require the Message Content intent.

### Command Registration Rate Limited

Severity: HIGH

Situation: Registering slash commands

Symptoms:
Commands not appearing. 429 errors when deploying.
"You are being rate limited" messages.
Commands appear for some guilds but not others.

Why this breaks:
Command registration is rate limited:
- Global commands: 200 creates/day, updates take up to 1 hour to propagate
- Guild commands: 200 creates/day per guild, instant update

Common mistakes:
- Registering commands on every bot startup
- Registering in every guild separately
- Making changes in a loop without delays

Recommended fix:

## Use a separate deploy script (not on startup)

```javascript
// deploy-commands.js - Run manually, not on bot start
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  // For development: Guild commands (instant)
  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log('Guild commands deployed instantly');
  }

  // For production: Global commands (up to 1 hour)
  else {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Global commands deployed (may take up to 1 hour)');
  }
}

deploy();
```

```python
# Pycord - Don't sync on every startup
@bot.event
async def on_ready():
    # DON'T DO THIS:
    # await bot.sync_commands()

    print(f"Ready! Commands should already be registered.")

# Instead, sync manually or use a flag
if __name__ == "__main__":
    if "--sync" in sys.argv:
        # Only sync when explicitly requested
        bot.sync_commands_on_start = True
    bot.run(token)
```

## Testing workflow

1. Use guild commands during development (instant updates)
2. Only deploy global commands when ready for production
3. Run deploy script manually, not on every restart

### Bot Token Exposed

Severity: CRITICAL

Situation: Storing or sharing bot token

Symptoms:
Unauthorized actions from your bot.
Bot joins random servers.
Bot sends spam or malicious content.
"Invalid token" after Discord invalidates it.

Why this breaks:
Your bot token provides FULL control over your bot. Attackers can:
- Send messages as your bot
- Join servers, create invites
- Access all data your bot can access
- Potentially take over servers where bot has admin

Discord actively scans GitHub for exposed tokens and invalidates them.
Common exposure points:
- Committed to Git
- Shared in Discord itself
- In client-side code
- In public screenshots

Recommended fix:

## Never hardcode tokens

```javascript
// BAD - never do this
const token = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.ABCDEF.xyz...';

// GOOD - environment variables
require('dotenv').config();
client.login(process.env.DISCORD_TOKEN);
```

## Use .gitignore

```
# .gitignore
.env
.env.local
config.json
```

## If token is exposed

1. Go to Developer Portal immediately
2. Regenerate the token
3. Update all deployments
4. Review bot activity for unauthorized actions
5. Check git history and force push to remove if needed

## Use environment variables properly

```bash
# .env (never commit)
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id
```

```javascript
// Load with dotenv
require('dotenv').config();
const token = process.env.DISCORD_TOKEN;
```

### Bot Missing applications.commands Scope

Severity: HIGH

Situation: Slash commands not appearing for users

Symptoms:
Bot is in server but slash commands don't show up.
Typing / shows no commands from your bot.
Commands worked in development server but not others.

Why this breaks:
Discord has two important OAuth scopes:
- `bot` - Traditional bot permissions (messages, reactions, etc.)
- `applications.commands` - Slash command permissions

Many bots were invited with only the `bot` scope before slash commands
existed. They need to be re-invited with both scopes.

Recommended fix:

## Generate correct invite URL

```
https://discord.com/api/oauth2/authorize
  ?client_id=YOUR_CLIENT_ID
  &permissions=0
  &scope=bot%20applications.commands
```

## In Discord Developer Portal

1. Go to OAuth2 > URL Generator
2. Select BOTH:
   - `bot`
   - `applications.commands`
3. Select required bot permissions
4. Use generated URL

## Re-invite without kicking

Users can use the new invite URL even if bot is already in server.
This adds the new scope without removing the bot.

```javascript
// Generate invite URL in code
const inviteUrl = client.generateInvite({
  scopes: ['bot', 'applications.commands'],
  permissions: [
    'SendMessages',
    'EmbedLinks',
    // Add other needed permissions
  ]
});
```

### Global Commands Not Appearing Immediately

Severity: MEDIUM

Situation: Deploying global slash commands

Symptoms:
Commands don't appear after deployment.
Guild commands work but global commands don't.
Commands appear after an hour.

Why this breaks:
Global commands can take up to 1 hour to propagate to all Discord servers.
This is by design for Discord's caching and CDN.

Guild commands are instant but only work in that specific guild.

Recommended fix:

## Development: Use guild commands

```javascript
// Instant updates for testing
await rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: commands }
);
```

## Production: Deploy global commands during off-peak

```javascript
// Takes up to 1 hour to propagate
await rest.put(
  Routes.applicationCommands(CLIENT_ID),
  { body: commands }
);
```

## Workflow

1. Develop and test with guild commands (instant)
2. When ready, deploy global commands
3. Wait up to 1 hour for propagation
4. Don't deploy global commands frequently

### Frequent Gateway Disconnections

Severity: MEDIUM

Situation: Bot randomly goes offline or misses events

Symptoms:
Bot shows as offline intermittently.
Events are missed (member joins, messages).
Reconnection messages in logs.

Why this breaks:
Discord gateway requires regular heartbeats. Issues:
- Blocking operations prevent heartbeat
- Network instability
- Memory pressure causing GC pauses
- Too many guilds without sharding (2500+ requires sharding)

Recommended fix:

## Never block the event loop

```javascript
// BAD - blocks event loop
const data = fs.readFileSync('file.json');

// GOOD - async
const data = await fs.promises.readFile('file.json');
```

## Handle reconnections gracefully

```javascript
client.on('shardResume', (id, replayedEvents) => {
  console.log(`Shard ${id} resumed, replayed ${replayedEvents} events`);
});

client.on('shardDisconnect', (event, id) => {
  console.log(`Shard ${id} disconnected`);
});

client.on('shardReconnecting', (id) => {
  console.log(`Shard ${id} reconnecting...`);
});
```

## Implement sharding at scale

```javascript
// Required at 2500+ guilds
const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto'
});
manager.spawn();
```

### Modal Must Be First Response

Severity: MEDIUM

Situation: Showing a modal from a slash command or button

Symptoms:
"Interaction has already been acknowledged" error.
Modal doesn't appear.
Works sometimes but not others.

Why this breaks:
Modals have a special requirement: showing a modal MUST be the first
response to an interaction. You cannot:
- defer() then showModal()
- reply() then showModal()
- Think for more than 3 seconds then showModal()

Recommended fix:

## Show modal immediately

```javascript
// CORRECT - modal is first response
async execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('my-modal')
    .setTitle('Input Form');

  // Show immediately - no defer, no reply first
  await interaction.showModal(modal);
}
```

```javascript
// WRONG - deferred first
async execute(interaction) {
  await interaction.deferReply();  // CAN'T DO THIS
  await interaction.showModal(modal);  // Will fail
}
```

## If you need to check something first

```javascript
async execute(interaction) {
  // Quick sync check is OK (under 3 seconds)
  if (!hasPermission(interaction.user.id)) {
    return interaction.reply({
      content: 'No permission',
      ephemeral: true
    });
  }

  // Show modal (still first interaction response for this path)
  await interaction.showModal(modal);
}
```

## Validation Checks

### Hardcoded Discord Token

Severity: ERROR

Discord tokens must never be hardcoded

Message: Hardcoded Discord token detected. Use environment variables.

### Token Variable Assignment

Severity: ERROR

Tokens should come from environment, not strings

Message: Token assigned from string literal. Use environment variable.

### Token in Client-Side Code

Severity: ERROR

Never expose Discord tokens to browsers

Message: Discord credentials exposed client-side. Only use server-side.

### Slow Operation Without Defer

Severity: WARNING

Slow operations should be deferred to avoid timeout

Message: Slow operation without defer. Interaction may timeout.

### Interaction Without Error Handling

Severity: WARNING

Interactions should have try/catch for graceful errors

Message: Interaction without error handling. Add try/catch.

### Using Message Content Intent

Severity: WARNING

Message Content is privileged, prefer slash commands

Message: Using Message Content intent. Consider slash commands instead.

### Requesting All Intents

Severity: WARNING

Only request intents you actually need

Message: Requesting all intents. Only enable what you need.

### Syncing Commands on Ready Event

Severity: WARNING

Don't sync commands on every bot startup

Message: Syncing commands on startup. Use separate deploy script.

### Registering Commands in Loop

Severity: WARNING

Use bulk registration, not individual calls

Message: Registering commands in loop. Use bulk registration.

### No Rate Limit Handling

Severity: INFO

Consider handling rate limits for bulk operations

Message: Bulk operation without rate limit handling.

## Collaboration

### Delegation Triggers

- user needs AI-powered Discord bot -> llm-architect (Integrate LLM for conversational Discord bot)
- user needs Slack integration too -> slack-bot-builder (Cross-platform bot architecture)
- user needs voice features -> voice-agents (Discord voice channel integration)
- user needs database for bot data -> postgres-wizard (Store user data, server configs, moderation logs)
- user needs workflow automation -> workflow-automation (Discord events trigger workflows)
- user needs high availability -> devops (Sharding, scaling, monitoring for large bots)
- user needs payment integration -> stripe-specialist (Premium bot features, subscription management)

## When to Use
Use this skill when the request clearly matches the capabilities and patterns described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
