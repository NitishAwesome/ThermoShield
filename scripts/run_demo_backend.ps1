# Start the local SIH demonstration API used by the frontend on port 3000.
# All delivery channels remain simulated; the isolated preview database is used.
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$python = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    throw "Create .venv and install backend requirements first (see docs/SIH_COMPLETION.md)."
}
$database = (Join-Path $projectRoot '.venv\preview.db') -replace '\\', '/'
$env:DATABASE_URL = "sqlite:///$database"
$env:ENVIRONMENT = 'test'
$env:EMAIL_DELIVERY_MODE = 'test'
$env:REGIONAL_DELIVERY_MODE = 'demo'
$env:DISABLE_BACKGROUND_MONITOR = 'true'
$env:ENABLE_REGIONAL_DISPATCH = 'false'
$env:ENABLE_DEMO_ACCOUNTS = 'true'
$env:GOOGLE_APPLICATION_CREDENTIALS = ''
$env:ALLOWED_ORIGINS = 'http://127.0.0.1:3000,http://localhost:3000'
& $python -m uvicorn app.main:app --app-dir (Join-Path $projectRoot 'backend') --host 127.0.0.1 --port 8000
