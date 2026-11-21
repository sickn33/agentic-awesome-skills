#!/usr/bin/env bash
# Verify a reviewed two-column URL map without following redirects.
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" || ! -r "$1" ]]; then
  echo "Usage: bash verify-redirects.sh <readable redirect-map.csv>" >&2
  exit 2
fi

url_pattern='^https?://([a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(:[0-9]+)?([/?][^[:space:]#,"\\]*)?$'
sources=()
destinations=()
line_number=0
while IFS= read -r line || [[ -n "$line" ]]; do
  line_number=$((line_number + 1))
  line="${line%$'\r'}"
  if [[ $line_number -eq 1 && "$line" == 'old_url,new_url' ]]; then
    continue
  fi
  old="${line%%,*}"
  new="${line#*,}"
  if [[ "$line" != *,* || ! "$old" =~ $url_pattern || ! "$new" =~ $url_pattern || "$old" == "$new" ]]; then
    echo "Invalid redirect-map row $line_number" >&2
    exit 2
  fi
  sources+=("$old")
  destinations+=("$new")
done < "$1"

if [[ ${#sources[@]} -eq 0 ]]; then
  echo "Redirect map has no URL pairs" >&2
  exit 2
fi

probe() {
  curl --disable --silent --show-error --globoff --proto '=http,https' \
    --connect-timeout 5 --max-time 15 --output /dev/null --write-out "$1" -- "$2"
}

passed=0
failed=0
for i in "${!sources[@]}"; do
  if response=$(probe '%{http_code} %{redirect_url}' "${sources[i]}") &&
     [[ "$response" == "301 ${destinations[i]}" || "$response" == "308 ${destinations[i]}" ]] &&
     status=$(probe '%{http_code}' "${destinations[i]}") &&
     [[ "$status" == 200 ]]; then
    passed=$((passed + 1))
  else
    echo "FAIL URL pair $((i + 1))" >&2
    failed=$((failed + 1))
  fi
done

echo "$passed passed, $failed failed"
[[ $failed -eq 0 ]]
