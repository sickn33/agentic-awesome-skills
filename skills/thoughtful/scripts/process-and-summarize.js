#!/usr/bin/env node
/**
 * Thoughtful - Summary Processor
 * 
 * Analyzes messages, tracks tasks/relationships, generates human summary
 */

const fs = require('fs');
const path = require('path');

// Get data directory from command line argument
const DATA_DIR = process.argv[2] || path.join(process.env.HOME, 'clawd', 'thoughtful-data');

// Load tracking data
function loadJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`Missing file: ${filepath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function saveJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

async function main() {
  console.log('📊 Loading tracking data...');
  
  const config = loadJSON('config.json');
  const state = loadJSON('state.json');
  const tasks = loadJSON('tasks.json');
  const people = loadJSON('people.json');
  
  console.log('📥 Loading messages...');
  const messagesData = loadJSON('context/recent-messages.json');
  const chatsData = loadJSON('context/recent-chats.json');
  
  if (!messagesData || !chatsData) {
    console.error('Failed to load message data');
    process.exit(1);
  }
  
  // Extract messages and chats from wacli-readonly JSON structure
  const messages = messagesData.data?.messages || [];
  const chats = chatsData.data || [];
  
  console.log(`Loaded ${messages.length} messages from ${chats.length} chats`);
  
  // Filter messages based on config
  const filteredMessages = filterMessages(messages, chats, config);
  console.log(`Filtered to ${filteredMessages.length} relevant messages`);
  
  // Build structured data for LLM
  const summaryInput = buildSummaryInput(filteredMessages, chats, tasks, people, config);
  
  // Generate summary prompt
  const prompt = buildCommunicationCoachPrompt(summaryInput);
  
  // Save prompt for manual testing
  fs.writeFileSync(path.join(DATA_DIR, 'context/last-prompt.txt'), prompt);
  console.log(`💾 Saved prompt to ${DATA_DIR}/context/last-prompt.txt`);
  
  console.log('\n📝 Summary input ready!');
  console.log('Next step: Use OpenClaw LLM to generate summary from prompt');
  console.log('\nTo test manually:');
  console.log(`  cat ${DATA_DIR}/context/last-prompt.txt`);
  
  // TODO: Call OpenClaw LLM API here
  // For now, we just prepare the data
  
  // Update state
  state.lastProcessed = new Date().toISOString();
  state.totalMessagesProcessed += filteredMessages.length;
  state.chatsTracked = chats.length;
  state.firstRun = false;
  saveJSON('state.json', state);
}

function filterMessages(messages, chats, config) {
  // Filter based on config: all DMs + whitelisted groups
  const whitelistJIDs = new Set(config.chats.whitelistGroups.map(g => g.jid));
  
  return messages.filter(msg => {
    const chat = chats.find(c => c.JID === msg.ChatJID);
    if (!chat) return false;
    
    // Include all DMs
    if (chat.Kind === 'dm') return true;
    
    // Include whitelisted groups
    if (chat.Kind === 'group' && whitelistJIDs.has(chat.JID)) return true;
    
    return false;
  });
}

function buildSummaryInput(messages, chats, tasks, people, config) {
  // Group messages by chat
  const messagesByChat = {};
  messages.forEach(msg => {
    if (!messagesByChat[msg.ChatJID]) {
      messagesByChat[msg.ChatJID] = [];
    }
    messagesByChat[msg.ChatJID].push(msg);
  });
  
  // Build structured input
  const dms = [];
  const groups = [];
  
  Object.entries(messagesByChat).forEach(([chatJID, chatMessages]) => {
    const chat = chats.find(c => c.JID === chatJID);
    if (!chat) return;
    
    const chatSummary = {
      jid: chatJID,
      name: chat.Name || chatJID,
      kind: chat.Kind,
      messageCount: chatMessages.length,
      messages: chatMessages.map(m => ({
        from: m.ChatName || 'Unknown',
        text: m.Text || m.DisplayText || '[media]',
        timestamp: m.Timestamp,
        fromMe: m.FromMe
      })),
      lastMessage: chat.LastMessageTS
    };
    
    if (chat.Kind === 'dm') {
      dms.push(chatSummary);
    } else {
      groups.push(chatSummary);
    }
  });
  
  return {
    timeRange: '24 hours',
    dms,
    groups,
    pendingTasks: tasks.tasks.filter(t => t.status === 'pending'),
    waitingOn: tasks.waitingOn || [],
    scheduled: tasks.scheduled || [],
    commitments: tasks.commitments || [],
    totalMessages: messages.length,
    config: {
      includeRelationshipInsights: config.summary.includeRelationshipInsights,
      communicationCoachMode: config.summary.communicationCoachMode,
      tone: config.summary.tone
    }
  };
}

function buildCommunicationCoachPrompt(input) {
  return `You are a thoughtful communication coach with a practical, emotionally intelligent lens.

Your role is to help Neil improve how he communicates in his relationships with peers, colleagues, and friends.

## Context

You have access to Neil's WhatsApp messages from the last ${input.timeRange}. Here's the data:

### Direct Messages (${input.dms.length} conversations):
${JSON.stringify(input.dms, null, 2)}

### Groups (${input.groups.length} conversations):
${JSON.stringify(input.groups, null, 2)}

### Pending Tasks (${input.pendingTasks.length} items):
${JSON.stringify(input.pendingTasks, null, 2)}

### Waiting On (${input.waitingOn.length} items):
${JSON.stringify(input.waitingOn, null, 2)}

## Your Task

Create a warm, conversational summary that helps Neil:

1. **Catch what's slipping** - Has he left anything hanging that needs a reply or closure?
2. **Notice tone shifts** - Has the tone or sentiment in any relationship shifted that he hasn't acknowledged?
3. **Find good moments** - Are there good opportunities to check in or express appreciation?
4. **Get conversation starters** - Provide specific prompts he can send to start/restart conversations
5. **Re-engage without awkwardness** - Guide him on which quiet conversations to revive and how

## Format

Use this structure:

**Morning, Neil! ☀️**

Here's your WhatsApp catch-up:

**🆕 WHAT'S NEW (last ${input.timeRange}):**

[For each DM with activity, write 2-3 sentences about what happened and if action is needed. Be specific, warm, and point out urgency/tone.]

[For groups, briefly summarize. Only detail if something needs attention.]

**⏰ STILL PENDING:**

[List pending tasks from earlier. Note how long they've been pending. Flag if someone has followed up multiple times.]

**💡 COMMUNICATION INSIGHTS:**

[Analyze relationship dynamics. Has anyone's tone shifted? Are conversations going quiet? Who might need attention?]

**Quiet conversations worth reviving:**
[List people who went silent after Neil asked them something or after they asked him something.]

**📝 SUGGESTED ACTIONS:**

[For 2-3 most important items, provide specific message drafts Neil can send. Make them sound like him - warm but direct.]

**For re-engaging quiet conversations:**
[Provide natural, non-apologetic ways to restart conversations that went quiet.]

---

Did you complete: "[most urgent pending task]"?
[Note: The user will respond with buttons in Telegram]

## Tone

${input.config.tone}

- No fluff, but not robotic
- Like a work buddy catching you up after lunch
- Point out patterns ("Alice has asked 3 times...")
- Gentle nudges on pending stuff
- Natural, conversational language

Generate the summary now:`;
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
