#!/usr/bin/env python3
import os, sys, json, urllib.request, urllib.parse

def refresh():
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
    refresh_token = os.getenv('GOOGLE_REFRESH_TOKEN')
    if not all([client_id, client_secret, refresh_token]):
        sys.stderr.write('Missing one of GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN\n')
        sys.exit(1)
    data = urllib.parse.urlencode({
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token',
    }).encode()
    req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = json.load(resp)
    except urllib.error.HTTPError as e:
        sys.stderr.write(f'HTTP error {e.code}: {e.read().decode()}\n')
        sys.exit(1)
    access_token = resp_data.get('access_token')
    if not access_token:
        sys.stderr.write('No access_token in response\n')
        sys.exit(1)
    # Update the secrets.env file
    env_path = os.path.expanduser('~/.config/google-calendar/secrets.env')
    # Read existing lines, replace or add GOOGLE_ACCESS_TOKEN
    lines = []
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            lines = f.readlines()
    new_lines = []
    token_set = False
    for line in lines:
        if line.startswith('export GOOGLE_ACCESS_TOKEN='):
            new_lines.append(f'export GOOGLE_ACCESS_TOKEN={access_token}\n')
            token_set = True
        else:
            new_lines.append(line)
    if not token_set:
        new_lines.append(f'export GOOGLE_ACCESS_TOKEN={access_token}\n')
    with open(env_path, 'w') as f:
        f.writelines(new_lines)
    print(json.dumps(resp_data, indent=2))

if __name__ == '__main__':
    refresh()
