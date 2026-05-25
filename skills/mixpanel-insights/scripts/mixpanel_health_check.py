import os
import json
import base64
import requests
import csv
from datetime import datetime, timedelta
from collections import defaultdict
from io import StringIO

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

USERNAME = os.environ.get("MIXPANEL_SERVICE_ACCOUNT_USERNAME")
SECRET = os.environ.get("MIXPANEL_SERVICE_ACCOUNT_SECRET")
PROJECT_ID = os.environ.get("MIXPANEL_PROJECT_ID")
COMPANY_SHEET_URL = os.environ.get("COMPANY_SHEET_URL")

if not USERNAME or not SECRET:
    print("Error: Mixpanel credentials not found in environment.")
    exit(1)

auth_header = "Basic " + base64.b64encode(f"{USERNAME}:{SECRET}".encode()).decode()
headers = {"Authorization": auth_header, "Accept": "application/json"}

# 1. Fetch Google Sheet as Fallback Mapping
sheet_mapping = {}
excluded_ids = set()
if COMPANY_SHEET_URL:
    try:
        r = requests.get(COMPANY_SHEET_URL)
        if r.status_code == 200:
            text_lines = r.text.splitlines()
            while text_lines and not text_lines[0].startswith("$distinct_id"):
                text_lines.pop(0)
            reader = csv.DictReader(text_lines)
            for row in reader:
                cid = row.get("$distinct_id", "").strip()
                cname = row.get("Company", "").strip()
                industry = row.get("Industry", "").strip()
                paid_demo = row.get("Paid/Demo", "").strip()
                churned = row.get("CHURNED", "").strip()
                churned_due_duplicate = row.get("CHURNED_DUE_DUPLICATE", "").strip()
                
                if industry.strip().upper() == "DEMO" or churned.strip().upper() == "TRUE":
                    if cid:
                        excluded_ids.add(cid)
                    continue
                    
                if cid and cname:
                    sheet_mapping[cid] = cname
    except Exception as e:
        print(f"Warning: Failed to fetch Company Sheet URL: {e}")

# 2. Fetch User Profiles to map distinct_id -> Company Name
user_mapping = {}
session_id = None
page = 0
print("Fetching user profiles for identity resolution...")
while True:
    data = {"project_id": PROJECT_ID} if PROJECT_ID else {}
    if session_id:
        data["session_id"] = session_id
    r = requests.post("https://mixpanel.com/api/2.0/engage", data=data, headers=headers)
    if r.status_code != 200:
        print(f"Engage API Error: {r.status_code} - {r.text}")
        break
    resp = r.json()
    results = resp.get("results", [])
    if not results:
        break
    for u in results:
        did = u.get("$distinct_id")
        props = u.get("$properties", {})
        cname = props.get("Company Name")
        cid = props.get("company_id")
        
        if did in excluded_ids or cid in excluded_ids:
            user_mapping[did] = "EXCLUDED"
            continue
            
        final_name = "Unknown Company"
        if cname:
            final_name = cname
        elif did and did in sheet_mapping:
            final_name = sheet_mapping[did]
        elif cid and cid in sheet_mapping:
            final_name = sheet_mapping[cid]
        elif cid:
            final_name = f"Company {str(cid)[:8]}"
            
        user_mapping[did] = final_name
        
    session_id = resp.get("session_id")
    page += 1
    if not session_id or page > 50: # Safety break to avoid infinite loops
        break

# 3. Stream Events for the last 14 days
today = datetime.now()
from_date = (today - timedelta(days=14)).strftime("%Y-%m-%d")
to_date = today.strftime("%Y-%m-%d")
events = ["file_finish", "data_update_finish", "table_get_record"]
events_param = json.dumps(events)

# The Mixpanel export endpoint requires Basic Auth
export_url = f"https://data.mixpanel.com/api/2.0/export?project_id={PROJECT_ID}&from_date={from_date}&to_date={to_date}&event={events_param}"

print(f"Streaming events from {from_date} to {to_date}...")
r = requests.get(export_url, headers=headers, stream=True)

if r.status_code != 200:
    print(f"Export API Error: {r.status_code} - {r.text}")
    exit(1)

# aggregated[company_name][date][event] = count
aggregated = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

for line in r.iter_lines():
    if line:
        try:
            ev = json.loads(line)
            event_name = ev.get("event")
            props = ev.get("properties", {})
            did = props.get("distinct_id")
            ts = props.get("time") # epoch timestamp
            
            if not ts or not event_name or not did:
                continue
                
            date_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
            cname = user_mapping.get(did, "Unknown Company")
            
            if cname == "EXCLUDED":
                continue
                
            aggregated[cname][date_str][event_name] += 1
        except json.JSONDecodeError:
            continue

output_data = {
    "report_generated_at": today.isoformat(),
    "period_start": from_date,
    "period_end": to_date,
    "metrics": aggregated
}

with open("insights_summary.json", "w") as f:
    json.dump(output_data, f, indent=2)

print("Saved insights to insights_summary.json. Ready for agent analysis.")
