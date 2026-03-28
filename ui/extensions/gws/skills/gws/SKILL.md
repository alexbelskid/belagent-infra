# Google Workspace Skill (gws CLI)

Use this skill for any Google Workspace operations: Gmail, Drive, Calendar, Sheets, Docs, Contacts.

## Setup

### Interactive (local machine with browser)
```bash
gws auth setup  # one-time: creates Cloud project, enables APIs, OAuth login
gws auth login  # subsequent logins
```

### Headless (VPS / server without browser)

**Option A — Export from local machine:**
```bash
# On local machine (has browser):
gws auth setup                         # one-time setup
gws auth export --unmasked > creds.json

# Copy to VPS:
scp creds.json root@VPS_IP:/root/.config/gws/credentials.json
ssh root@VPS_IP 'chmod 600 /root/.config/gws/credentials.json'
```

**Option B — Credentials file env var:**
```bash
export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=/root/.config/gws/credentials.json
```

**Option C — Service account (domain-wide delegation):**
```bash
export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=/path/to/service-account.json
export GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER=admin@example.com
```

### Verify
```bash
gws gmail users messages list --params '{"userId":"me","maxResults":1}'
```

## Usage

### Gmail
```bash
gws gmail users messages list --params '{"userId":"me","maxResults":10}'
gws gmail users messages send --params '{"userId":"me"}' --json '{"raw":"..."}'
```

### Drive
```bash
gws drive files list --params '{"pageSize":10}'
gws drive files get --params '{"fileId":"FILE_ID"}'
```

### Calendar
```bash
gws calendar events list --params '{"calendarId":"primary","maxResults":10}'
gws calendar events insert --params '{"calendarId":"primary"}' --json '{...}'
```

### Sheets
```bash
gws sheets spreadsheets values get --params '{"spreadsheetId":"ID","range":"Sheet1!A1:Z100"}'
```

## Agent Instructions

Always use `gws` CLI for Google Workspace operations instead of direct API calls.
Output is structured JSON — parse with python3 or jq.
