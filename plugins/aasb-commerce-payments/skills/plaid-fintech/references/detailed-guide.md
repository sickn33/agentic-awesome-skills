# Plaid Fintech - Detailed Guide

> Catalog modification (2026-10-23): repaired authentication, webhook and sync guidance; removed unsafe money-movement and non-durable webhook examples. Upstream Apache-2.0 source attribution is retained.

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Patterns

### Link Token Creation and Exchange

Create a link_token for Plaid Link, exchange public_token for access_token.
Link tokens are short-lived, one-time use. Access tokens don't expire but
may need updating when users change passwords.

// server.ts - Link token creation endpoint
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Create link token for new user
app.post('/api/plaid/create-link-token', async (req, res) => {
  const userId = req.user.id; // authenticated server-side session; never trust body userId

  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,  // Your internal user ID
      },
      client_name: 'My Finance App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: 'https://yourapp.com/api/plaid/webhooks',
      // Request 180 days for recurring transactions
      transactions: {
        days_requested: 180,
      },
    });

    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Link token creation failed');
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token for access token
app.post('/api/plaid/exchange-token', async (req, res) => {
  const { publicToken } = req.body;
  const userId = req.user.id; // authenticated server-side session

  try {
    // Exchange for permanent access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Store securely - access_token doesn't expire!
    await db.plaidItem.create({
      data: {
        userId,
        itemId: item_id,
        accessToken: await encrypt(access_token),  // Encrypt at rest
        status: 'ACTIVE',
        products: ['transactions'],
      },
    });

    // Trigger initial transaction sync
    await initiateTransactionSync(item_id, access_token);

    res.json({ success: true, itemId: item_id });
  } catch (error) {
    console.error('Token exchange failed');
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Frontend - React component
import { usePlaidLink } from 'react-plaid-link';

function BankLinkButton({ userId }: { userId: string }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    async function createLinkToken() {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const { link_token } = await response.json();
      setLinkToken(link_token);
    }
    createLinkToken();
  }, [userId]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      // Exchange public token for access token
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, userId }),
      });
    },
    onExit: (error, metadata) => {
      if (error) {
        console.error('Link exit error:', error);
      }
    },
  });

  return (
    <button onClick={() => open()} disabled={!ready}>
      Connect Bank Account
    </button>
  );
}

### Context

- initial bank linking
- user onboarding
- connecting accounts

### Transactions Sync

Use /transactions/sync for incremental transaction updates. More efficient
than /transactions/get. Handle webhooks for real-time updates instead of
polling.

// Transactions sync service
interface TransactionSyncState {
  cursor: string | null;
  hasMore: boolean;
}

async function syncTransactions(
  accessToken: string,
  itemId: string
): Promise<void> {
  // Get last cursor from database
  const item = await db.plaidItem.findUnique({
    where: { itemId },
  });

  if (!item) throw new Error('Item not found');
  const initialCursor = item.transactionsCursor || null;
  let cursor = initialCursor;
  let hasMore = true;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  while (hasMore) {
    try {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
        count: 500,  // Max per request
      });

      const { added, modified, removed, next_cursor, has_more } = response.data;

      // Stage all added/modified/removed updates in a bounded private buffer or staging table.
      // Do not mutate the canonical transaction table until has_more is false.
      // The staging/atomic-commit implementation is application-specific and omitted.
      throw new Error('Implement bounded staging and atomic item-scoped commit before enabling sync');

      cursor = next_cursor;
      hasMore = has_more;

    } catch (error: any) {
      if (error.response?.data?.error_code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') {
        // Discard staged pages and restart from the original saved cursor, with bounded retries.
        cursor = initialCursor;
        continue;
      }
      throw error;
    }
  }

  // Save cursor for next sync
  await db.plaidItem.update({
    where: { itemId },
    data: { transactionsCursor: cursor },
  });

  console.log(`Sync complete: +${addedCount} ~${modifiedCount} -${removedCount}`);
}

// Webhook handler for real-time updates
app.post('/api/plaid/webhooks', async (req, res) => {
  const { webhook_type, webhook_code, item_id } = req.body;

  // Verify webhook (see webhook verification pattern)
  if (!await verifyPlaidWebhook(req)) {
    return res.status(401).send('Invalid webhook');
  }

  if (webhook_type === 'TRANSACTIONS') {
    switch (webhook_code) {
      case 'SYNC_UPDATES_AVAILABLE':
        // New transactions available, trigger sync
        await queueTransactionSync(item_id);
        break;
      case 'INITIAL_UPDATE':
        // Initial batch of transactions ready
        await queueTransactionSync(item_id);
        break;
      case 'HISTORICAL_UPDATE':
        // Historical transactions ready
        await queueTransactionSync(item_id);
        break;
    }
  }

  res.sendStatus(200);
});

### Context

- fetching transactions
- transaction history
- account activity

### Item Error Handling and Update Mode

Handle ITEM_LOGIN_REQUIRED errors by putting users through Link update mode.
Listen for PENDING_DISCONNECT webhook to proactively prompt users.

// Create link token for update mode
app.post('/api/plaid/create-update-token', async (req, res) => {
  const { itemId } = req.body;

  const item = await db.plaidItem.findUnique({
    where: { itemId },
    include: { user: true },
  });

  if (!item || item.userId !== req.user.id) {
    return res.status(404).json({ error: 'Item not found' });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: item.userId,
      },
      client_name: 'My Finance App',
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: 'https://yourapp.com/api/plaid/webhooks',
      // Update mode: provide access_token instead of products
      access_token: await decrypt(item.accessToken),
    });

    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Update token creation failed');
    res.status(500).json({ error: 'Failed to create update token' });
  }
});

// Handle item errors from webhooks
app.post('/api/plaid/webhooks', async (req, res) => {
  if (!await verifyPlaidWebhook(req)) return res.status(401).send('Invalid webhook');
  const { webhook_type, webhook_code, item_id, error } = req.body;

  if (webhook_type === 'ITEM') {
    switch (webhook_code) {
      case 'ERROR':
        // Item has entered an error state
        await db.plaidItem.update({
          where: { itemId: item_id },
          data: {
            status: 'ERROR',
            errorCode: error?.error_code,
            errorMessage: error?.error_message,
          },
        });

        // Notify user to reconnect
        if (error?.error_code === 'ITEM_LOGIN_REQUIRED') {
          await notifyUserReconnect(item_id, 'Please reconnect your bank account');
        }
        break;

      case 'PENDING_DISCONNECT':
        // User needs to reauthorize soon
        await db.plaidItem.update({
          where: { itemId: item_id },
          data: { status: 'PENDING_DISCONNECT' },
        });

        // Proactive notification
        await notifyUserReconnect(item_id, 'Your bank connection will expire soon');
        break;

      case 'USER_PERMISSION_REVOKED':
        // User revoked access at their bank
        await db.plaidItem.update({
          where: { itemId: item_id },
          data: { status: 'REVOKED' },
        });

        // Clean up stored data
        await db.transaction.deleteMany({
          where: { itemId: item_id },
        });
        break;
    }
  }

  res.sendStatus(200);
});

// Check item status before API calls
async function getItemWithValidation(itemId: string) {
  const item = await db.plaidItem.findUnique({
    where: { itemId },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  if (item.status !== 'ACTIVE') {
    throw new ItemNeedsUpdateError(item.errorCode, item.errorMessage);
  }

  return item;
}

### Context

- error recovery
- reauthorization
- credential updates

### Auth for ACH Transfers

Use Auth product to get account and routing numbers for ACH transfers.
Combine with Identity to verify account ownership before initiating
transfers.

// Get account and routing numbers
async function getACHNumbers(accessToken: string): Promise<ACHInfo[]> {
  const response = await plaidClient.authGet({
    access_token: accessToken,
  });

  const { accounts, numbers } = response.data;

  // Map ACH numbers to accounts
  return accounts.map(account => {
    const achNumber = numbers.ach.find(
      n => n.account_id === account.account_id
    );

    return {
      accountId: account.account_id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      routing: achNumber?.routing,
      account: achNumber?.account,
      wireRouting: achNumber?.wire_routing,
    };
  });
}

// Money movement intentionally not implemented: identity-match scores and a balance snapshot
// do not authorize ACH, guarantee ownership or reserve funds. Implement explicit account selection,
// server-side user/item/account authorization, debit mandate, processor authorization/risk controls,
// idempotency and reconciliation before dispatching a transfer.

### Context

- ach transfers
- money movement
- account funding

### Real-Time Balance Check

Use /accounts/balance/get for real-time balance (paid endpoint).
/accounts/get returns cached data suitable for display but not
real-time decisions.

interface BalanceInfo {
  accountId: string;
  available: number | null;
  current: number | null;
  limit: number | null;
  isoCurrencyCode: string | null;
  lastUpdated: Date | null;
  isRealtime: boolean;
}

// Get cached balance (free, suitable for display)
async function getCachedBalances(accessToken: string): Promise<BalanceInfo[]> {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  return response.data.accounts.map(account => ({
    accountId: account.account_id,
    available: account.balances.available,
    current: account.balances.current,
    limit: account.balances.limit,
    isoCurrencyCode: account.balances.iso_currency_code ?? null,
    lastUpdated: account.balances.last_updated_datetime ? new Date(account.balances.last_updated_datetime) : null,
    isRealtime: false,
  }));
}

// Get real-time balance (paid, for payment validation)
async function getRealTimeBalance(
  accessToken: string,
  accountIds?: string[]
): Promise<BalanceInfo[]> {
  const response = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
    options: accountIds ? { account_ids: accountIds } : undefined,
  });

  return response.data.accounts.map(account => ({
    accountId: account.account_id,
    available: account.balances.available,
    current: account.balances.current,
    limit: account.balances.limit,
    isoCurrencyCode: account.balances.iso_currency_code ?? null,
    lastUpdated: account.balances.last_updated_datetime ? new Date(account.balances.last_updated_datetime) : null,
    isRealtime: true,
  }));
}

// Payment validation with balance check
async function validatePayment(
  accessToken: string,
  accountId: string,
  amount: number
): Promise<PaymentValidation> {
  const balances = await getRealTimeBalance(accessToken, [accountId]);
  const account = balances.find(b => b.accountId === accountId);

  if (!account) {
    return { valid: false, reason: 'Account not found' };
  }

  const available = account.available ?? account.current;

  if (!Number.isFinite(amount) || amount <= 0 || available === null || available < amount) {
    return {
      valid: false,
      reason: 'Insufficient funds',
      available,
      requested: amount,
    };
  }

  return {
    valid: true,
    available,
    requested: amount,
  };
}

### Context

- balance checking
- fund availability
- payment validation

### Webhook Verification

Verify Plaid webhooks using the verification key endpoint.
Handle duplicate webhooks idempotently and design for out-of-order
delivery.

Webhook verification implementation requirements:

1. Preserve exact raw request bytes before JSON parsing. Reject a missing/invalid Plaid-Verification JWT.
2. Read kid from the untrusted header only to retrieve the JWK through the authenticated /webhook_verification_key/get endpoint; validate algorithm/key status and cache under bounded expiry. Do not invent a public JWKS URL.
3. Verify ES256 signature and required finite iat freshness, rejecting stale/future claims under the documented clock policy. Hash raw bytes with SHA-256 and compare request_body_sha256, not JSON.stringify(req.body).
4. Route all ITEM/TRANSACTIONS events through the same verified entry point. Authenticate item ownership in the stored mapping, deduplicate atomically and durably enqueue before 2xx. Mark processing complete only after success; retry/reconcile failures. A check-then-insert plus fire-and-forget promise can lose events.

The catalog does not bundle this verifier/queue implementation. Keep the route disabled until implemented and tested; no example should be deployed as a working webhook service.

### Context

- webhook security
- event processing
- production deployment


## Sharp Edges

### Access Tokens Never Expire But Are Highly Sensitive

Severity: CRITICAL

### accounts/get Returns Cached Balances, Not Real-Time

Severity: HIGH

### Webhooks May Arrive Out of Order or Duplicated

Severity: HIGH

### Items Enter Error States That Require User Action

Severity: HIGH

### Sandbox Does Not Reflect Production Complexity

Severity: MEDIUM

### TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION Requires Restart

Severity: MEDIUM

### Link Tokens Are Short-Lived and Single-Use

Severity: MEDIUM

### Recurring Transactions Need 180+ Days of History

Severity: MEDIUM


## Validation Checks

### Access Token Stored in Plain Text

Severity: ERROR

Plaid access tokens must be encrypted at rest

Message: Plaid access token appears to be stored unencrypted. Encrypt at rest.

### Plaid Secret in Client Code

Severity: ERROR

Plaid secret must never be exposed to clients

Message: Plaid secret may be exposed. Keep server-side only.

### Hardcoded Plaid Credentials

Severity: ERROR

Credentials must use environment variables

Message: Hardcoded Plaid credentials. Use environment variables.

### Missing Webhook Signature Verification

Severity: ERROR

Plaid webhooks must verify JWT signature

Message: Webhook handler without signature verification. Verify Plaid-Verification header.

### Using Cached Balance for Payment Decision

Severity: ERROR

Use real-time balance for payment validation

Message: Using accountsGet (cached) for payment. Use accountsBalanceGet for real-time balance.

### Missing Item Error State Handling

Severity: WARNING

API calls should handle ITEM_LOGIN_REQUIRED

Message: API call without ITEM_LOGIN_REQUIRED handling. Handle item error states.

### Polling for Transactions Instead of Webhooks

Severity: WARNING

Use webhooks for transaction updates

Message: Polling for transactions. Configure webhooks for SYNC_UPDATES_AVAILABLE.

### Link Token Cached or Reused

Severity: WARNING

Link tokens are single-use and expire in 4 hours

Message: Link tokens should not be cached. Create fresh token for each session.

### Using Deprecated Public Key

Severity: ERROR

Public key integration ended January 2025

Message: Public key is deprecated. Use Link tokens instead.

### Transaction Sync Without Cursor Storage

Severity: WARNING

Store cursor for incremental syncs

Message: Transaction sync without cursor persistence. Store cursor for incremental sync.


## Collaboration

### Delegation Triggers

- user needs payment processing -> stripe-integration (Stripe for actual payment, Plaid for account linking)
- user needs budgeting features -> analytics-specialist (Transaction categorization and analysis)
- user needs investment tracking -> data-engineer (Portfolio analysis and reporting)
- user needs compliance/audit -> security-specialist (SOC 2, PCI compliance)
- user needs mobile app -> mobile-developer (React Native Plaid SDK)
