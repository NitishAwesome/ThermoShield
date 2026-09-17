# SIH26083 implementation and validation guide

Work is isolated on `codex/sih-completion`. This change does not deploy the app or send live messages.

## Implemented workflow

The government Health page now imports aggregate ward/day surveillance CSVs with population, elderly/outdoor-worker fractions, weather, deaths and admissions. Each immutable snapshot records its source, declared origin, outcome definition, checksum and importing account. Approved accounts with `ANALYZE_RISK` can work only within their operational jurisdiction.

The model uses population-exposure Poisson regression. Counts divided by population exposure are fitted with exposure weights. Heat features include estimated WBGT, minimum temperature and humidity; calendar and demographic features form a comparison baseline. The last 20% of dates (at least 14 days) are held out chronologically. Scaling and regression use only the earlier training period. MAE, RMSE, baseline error and a retrospective absolute-error band are reported. The evaluated model is frozen, not refitted on the holdout.

Forecasts cover **tomorrow through day +5**, using real hourly meteorological forecasts. Missing or modelled weather, incomplete daily inputs, stale surveillance (>90 days), insufficient events and missing models produce explicit unavailable states. All-zero mortality history is not silently treated as zero future risk. Demo datasets must be explicitly selected; they are never selected automatically as observed evidence.

The mortality index is an experimental comparison: clamp the percentage increase over a calendar/demographic baseline to 0–100, with a denominator floor of one event. It is not an individual death probability. All-cause records produce all-cause estimates; they do not establish heat-attributable mortality. Observed source claims are provided by the importing authority and are not independently authenticated by the application.

The government map links each selected ward to its health-data workspace. Heat action recommendations now cover severe conditions up to 120 hours ahead.

Citizens can opt into SMS/WhatsApp for supported wards under Profile → Alert Preferences. Only their registered phone is used. Consent and preferences persist in the database. The government Dispatch page evaluates a ward and displays delivery attempts. The background worker can evaluate subscribed wards periodically. Alerts use physical thermal-strain thresholds and suppress fallback weather. Unique delivery claims survive restarts and concurrent evaluations; cooldowns limit repeated warnings. Gateway acceptance is distinct from delivery, which requires a signed Twilio receipt. Ambiguous timeouts remain UNKNOWN and are not blindly resent.

## Run locally

Use Python 3.11+ and Node.js:

For the local demo with the frontend on port 3000, run `powershell -ExecutionPolicy Bypass -File scripts/run_demo_backend.ps1` from the repository root. Keep that terminal open. This uses the isolated `.venv/preview.db` and simulates all delivery channels.

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements-dev.txt
$env:DATABASE_URL='sqlite:///D:/ThermoShield/.venv/demo.db'
$env:DISABLE_BACKGROUND_MONITOR='true'
$env:REGIONAL_DELIVERY_MODE='demo'
$env:EMAIL_DELIVERY_MODE='test'
$env:GOOGLE_APPLICATION_CREDENTIALS=''
.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --port 8000
```

In a second terminal: `cd frontend` then `npm run dev`. Use an existing evaluation persona in the authority login. Production must use persistent PostgreSQL, a strong JWT secret, approved authority accounts and disabled demo accounts. Apply Alembic migrations before deployment: from `backend`, run `../.venv/Scripts/python -m alembic upgrade head`.

## Exercise the health-data UI without pretending it is clinical evidence

```powershell
.venv\Scripts\python scripts/generate_demo_health_csv.py --output data/synthetic_demo_ward.csv
```

The generator refuses to overwrite existing files. In Government → Health, choose a ward, open Import, choose **Synthetic demonstration**, and upload that CSV with source name `ThermoShield synthetic demonstration` and the repository URL as the reference. Train & validate, inspect the holdout metrics, then generate the outlook. If weather is unavailable the app correctly withholds counts. Automated tests use mocked full hourly forecasts to verify that path offline. A generated demo file is never official public-health evidence.

For real records, use the downloadable CSV header. Supply one complete row per ward/day, at least 90 consecutive completed days, fractions between 0 and 1, wind in m/s and radiation in W/m². Meteorological fields must come from the same peak-WBGT hour, and minimum temperature from that day. Do not add patient names, IDs or addresses. Blank outcomes are missing data, not zeros; duplicates and extra columns are rejected. A single upload supports up to 5,000 daily records and 2 MB of CSV text.

## Activate messaging when credentials are available

Configure the variables in `.env.example`. `REGIONAL_DELIVERY_MODE=demo` performs zero provider calls. For live dispatch, set `REGIONAL_DELIVERY_MODE=live`, Twilio account credentials, SMS sender, WhatsApp sender, and approved WhatsApp Content SID. The template variables are `{{1}}` ward name, `{{2}}` risk level, `{{3}}` forecast date and `{{4}}` action advice.

Set `TWILIO_STATUS_CALLBACK_URL` to the exact public HTTPS URL ending in `/api/regional-alerts/twilio/status`, with no query string. The application adds the delivery ID. Twilio signatures are validated using its SDK and the exact configured external URL, so reverse-proxy host headers cannot alter verification. `ENABLE_REGIONAL_DISPATCH=true` enables scheduled ward evaluations when the monitor is running. Keep demo delivery enabled during judging unless sending to explicitly consenting real recipients is intended.

SMS/WhatsApp delivery must still be tested with the actual provider account, approved template and recipient permissions. Operator-triggered evaluations require `SEND_PUBLIC_ADVISORY`; a municipal officer cannot dispatch outside their jurisdiction. No live messages were sent during implementation.

The legacy test-SMS control also requires explicit live mode; real test messages are restricted to the signed-in approved account's own profile number. The manual all-region telemetry refresh never dispatches notifications.

## Verification

```powershell
.venv\Scripts\python -m pytest -q
cd frontend
npm run build
```

Tests use a fresh temporary database, migrations, disabled background monitoring, simulated email and simulated phone delivery. New tests cover data validation, chronological leakage, population scaling, sparse events, import→train→forecast, demo provenance, jurisdiction permissions, opt-in, duplicate suppression, provider payloads and signed/out-of-order receipts.

## Remaining real-world dependencies

- Official daily ward-level mortality/admission records and verified demographic denominators. Annual state totals cannot validate ward/day counts.
- Independent epidemiological review and multi-season/city validation. Current holdout tests use historical weather, so they do not establish operational 3–5-day forecast accuracy. Archived issued forecasts are needed for that evaluation; lagged health effects and reporting delays also need study.
- Local thermal measurement validation. Estimated WBGT and interpolated ward weather are not calibrated ward sensor readings; UTCI is not implemented. The PS permits WBGT or HI.
- Messaging credentials/template approval, real delivery testing, sustained hosting and a municipal pilot. Heat-action recommendations do not open physical cooling centres or control electricity grids.

References: [scikit-learn exposure-weighted Poisson modelling](https://scikit-learn.org/stable/auto_examples/linear_model/plot_poisson_regression_non_normal_loss.html), [Twilio WhatsApp notification templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates), [Twilio message states and signed callbacks](https://www.twilio.com/docs/messaging/api/message-resource).
