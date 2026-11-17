#!/usr/bin/env bash
# deliverability_check.sh: SPF / DKIM / DMARC / MX preflight for a sending domain.
#
# Usage:
#   deliverability_check.sh <domain> [dkim_selector ...]
#
# Checks the DNS records the 2026 bulk-sender rules (Gmail/Yahoo, Outlook May 2025)
# actually enforce. Exit 0 = no hard failures, 1 = at least one FAIL, 2 = no DNS
# tooling available (prints manual instructions instead).
#
# Selectors: pass your ESP's DKIM selector(s) as extra args if you know them.
# Otherwise a common-selector sweep runs; absence from the sweep does NOT prove
# DKIM is missing (selectors are arbitrary); presence proves it exists.

set -u

if [ $# -lt 1 ]; then
  echo "Usage: $0 <domain> [dkim_selector ...]" >&2
  exit 2
fi

DOMAIN="$1"
shift
USER_SELECTORS=("$@")
COMMON_SELECTORS=(google selector1 selector2 k1 k2 k3 s1 s2 em smtp mandrill m1 mail default dkim hs1 hs2 resend kit ctct1 zendesk1 pm)

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
RESULTS=""

note() { # status, label, message
  RESULTS="${RESULTS}[$1] $2: $3\n"
  case "$1" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)) ;;
    WARN) WARN_COUNT=$((WARN_COUNT + 1)) ;;
    FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
  esac
}

# --- Pick a DNS tool: dig preferred, nslookup/host as fallbacks -------------
DNS_TOOL=""
if command -v dig >/dev/null 2>&1; then
  DNS_TOOL="dig"
elif command -v nslookup >/dev/null 2>&1; then
  DNS_TOOL="nslookup"
elif command -v host >/dev/null 2>&1; then
  DNS_TOOL="host"
fi

if [ -z "$DNS_TOOL" ]; then
  cat <<'EOF'
NO DNS TOOL FOUND (need one of: dig, nslookup, host).

Run these checks manually with any online DNS lookup (e.g. a "dig TXT" web tool):
  1. TXT <domain>            -> expect exactly ONE record starting "v=spf1", ending ~all or -all
  2. TXT _dmarc.<domain>     -> expect "v=DMARC1; p=none" (minimum) or quarantine/reject
  3. TXT <selector>._domainkey.<domain>  -> expect "v=DKIM1" (selector comes from your ESP's settings page)
  4. MX  <domain>            -> expect at least one mail exchanger

Then verify in your ESP: RFC 8058 one-click unsubscribe enabled, and complaint
rate < 0.10% in Google Postmaster Tools.
EOF
  exit 2
fi

txt_lookup() { # domain -> TXT record strings, one per line, quotes stripped
  case "$DNS_TOOL" in
    dig)      dig +short TXT "$1" 2>/dev/null | sed 's/" "//g; s/^"//; s/"$//' ;;
    nslookup) nslookup -type=TXT "$1" 2>/dev/null | sed -n 's/.*text = "\(.*\)"/\1/p; s/.*text = \(.*\)/\1/p' ;;
    host)     host -t TXT "$1" 2>/dev/null | sed -n 's/.*descriptive text "\(.*\)"/\1/p' ;;
  esac
}

mx_lookup() {
  case "$DNS_TOOL" in
    dig)      dig +short MX "$1" 2>/dev/null ;;
    nslookup) nslookup -type=MX "$1" 2>/dev/null | grep -i 'mail exchanger' ;;
    host)     host -t MX "$1" 2>/dev/null | grep -i 'mail is handled' ;;
  esac
}

echo "Deliverability preflight: $DOMAIN (via $DNS_TOOL)"
echo "------------------------------------------------------------"

# --- 1. SPF -----------------------------------------------------------------
SPF_RECORDS=$(txt_lookup "$DOMAIN" | grep -i '^v=spf1' || true)
SPF_LINES=0
[ -n "$SPF_RECORDS" ] && SPF_LINES=$(printf '%s\n' "$SPF_RECORDS" | wc -l | tr -d ' ')

if [ "$SPF_LINES" -eq 0 ]; then
  note FAIL "SPF" "no v=spf1 TXT record on $DOMAIN. Bulk mail to Gmail/Yahoo/Outlook will be throttled or rejected. Add the include your ESP specifies, e.g. \"v=spf1 include:<esp-include> ~all\"."
elif [ "$SPF_LINES" -gt 1 ]; then
  note FAIL "SPF" "$SPF_LINES v=spf1 records found. Multiple SPF records is a permerror (treated as no SPF). Merge into ONE record."
else
  case "$SPF_RECORDS" in
    *"+all"*) note FAIL "SPF" "record ends +all (allows the entire internet to spoof you). Change to ~all or -all." ;;
    *"?all"*) note WARN "SPF" "record ends ?all (neutral, weak). Prefer ~all or -all. Record: $SPF_RECORDS" ;;
    *"-all"*|*"~all"*) note PASS "SPF" "single record with strict/softfail qualifier: $SPF_RECORDS" ;;
    *) note WARN "SPF" "record found but no 'all' mechanism, likely incomplete: $SPF_RECORDS" ;;
  esac
  INCLUDES=$(printf '%s' "$SPF_RECORDS" | grep -o 'include:' | wc -l | tr -d ' ')
  if [ "$INCLUDES" -gt 6 ]; then
    note WARN "SPF" "$INCLUDES includes. SPF has a 10-DNS-lookup limit and nested includes count. Verify with an SPF flattening checker."
  fi
fi

# --- 2. DMARC ---------------------------------------------------------------
DMARC_RECORD=$(txt_lookup "_dmarc.$DOMAIN" | grep -i '^v=DMARC1' | head -1 || true)

if [ -z "$DMARC_RECORD" ]; then
  note FAIL "DMARC" "no record at _dmarc.$DOMAIN. Required for bulk senders since 2024. Start with: \"v=DMARC1; p=none; rua=mailto:dmarc@$DOMAIN\""
else
  POLICY=$(printf '%s' "$DMARC_RECORD" | tr -d ' ' | grep -o 'p=[a-z]*' | head -1 | cut -d= -f2)
  case "$POLICY" in
    none)              note PASS "DMARC" "published with p=none, which meets the minimum bulk-sender bar. Ratchet to p=quarantine once reports look clean. Record: $DMARC_RECORD" ;;
    quarantine|reject) note PASS "DMARC" "enforced policy p=$POLICY: $DMARC_RECORD" ;;
    *)                 note WARN "DMARC" "record present but policy unreadable: $DMARC_RECORD" ;;
  esac
  case "$DMARC_RECORD" in
    *rua=*) : ;;
    *) note WARN "DMARC" "no rua= reporting address, so you're flying blind on alignment failures. Add rua=mailto:<inbox>." ;;
  esac
fi

# --- 3. DKIM ----------------------------------------------------------------
FOUND_SELECTORS=""
ALL_SELECTORS=("${USER_SELECTORS[@]:-}" "${COMMON_SELECTORS[@]}")
for SEL in "${ALL_SELECTORS[@]}"; do
  [ -z "$SEL" ] && continue
  case " $FOUND_SELECTORS " in *" $SEL "*) continue ;; esac
  REC=$(txt_lookup "${SEL}._domainkey.$DOMAIN" | grep -i 'v=DKIM1\|k=rsa\|p=' | head -1 || true)
  # A revoked key publishes an empty p= tag. That is not a working key, so it must not pass.
  if [ -n "$REC" ] && printf '%s' "$REC" | tr -d ' ' | grep -Eiq '(^|;)p=[^;]+'; then
    FOUND_SELECTORS="$FOUND_SELECTORS $SEL"
  fi
done

if [ -n "$FOUND_SELECTORS" ]; then
  note PASS "DKIM" "key(s) published at selector(s):$FOUND_SELECTORS"
else
  if [ ${#USER_SELECTORS[@]} -gt 0 ]; then
    note FAIL "DKIM" "no working key at the selector(s) you specified (${USER_SELECTORS[*]}); a missing record or an empty p= (revoked key) both fail. Copy the exact DKIM records from your ESP's domain-settings page."
  else
    note WARN "DKIM" "no key found in the common-selector sweep. NOT conclusive. Find your real selector in your ESP's sending-domain settings (or a received email's DKIM-Signature s= tag) and re-run: $0 $DOMAIN <selector>"
  fi
fi

# --- 4. MX ------------------------------------------------------------------
MX_RECORDS=$(mx_lookup "$DOMAIN" || true)
if [ -n "$MX_RECORDS" ]; then
  note PASS "MX" "mail exchanger present (replies and FBL mail can be received)."
else
  note WARN "MX" "no MX record, so replies to this From: domain bounce, which itself harms reputation. Use a domain that can receive mail."
fi

# --- Report -----------------------------------------------------------------
printf '%b' "$RESULTS"
echo "------------------------------------------------------------"
echo "Result: $PASS_COUNT pass / $WARN_COUNT warn / $FAIL_COUNT fail"
echo ""
echo "DNS covers only part of compliance. Also verify (no DNS record can show these):"
echo "  - RFC 8058 one-click unsubscribe headers enabled in your ESP, honored within 2 days"
echo "  - Spam complaint rate < 0.10% in Google Postmaster Tools (0.30% = blocking)"
echo "  - From: address is on this domain (never @gmail.com for bulk)"

[ "$FAIL_COUNT" -gt 0 ] && exit 1
exit 0
