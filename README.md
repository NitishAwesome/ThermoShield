# ThermoShield

> **Impact-Based Extreme Heat Early Warning & Human Thermal Stress Intelligence Platform**
>
> ThermoShield converts live biometeorological conditions into physical human heat strain, machine-learning-driven civic health-risk insights, regional geospatial risk mapping, actionable public safety guidance, and interactive municipal heat action intervention simulations.

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite-61DAFB.svg)](https://vitejs.dev/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20SQLite%20Fallback-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/Project-SIH26083%20%28SIH%202026%29-orange.svg)](#)

---

## Live Deployments & Repository Links

* **Live Frontend Web App:** [https://thermo-shield-tau.vercel.app/](https://thermo-shield-tau.vercel.app/)
* **Live Backend API:** [https://thermoshield.onrender.com/](https://thermoshield.onrender.com/)
* **Interactive API Documentation (Swagger UI):** [https://thermoshield.onrender.com/docs](https://thermoshield.onrender.com/docs)
* **GitHub Source Code Repository:** [https://github.com/NitishAwesome/ThermoShield](https://github.com/NitishAwesome/ThermoShield)

---

## 1. The Problem

Traditional heat warnings rely almost exclusively on ambient air temperature ($^\circ\text{C}$). However, ambient temperature alone does not fully reflect human physiological heat burden. 

Real-world heat strain depends heavily on four interacting biometeorological variables:
1. **Air Temperature ($T$):** Ambient thermal load.
2. **Relative Humidity ($RH$):** High humidity restricts the body's primary cooling mechanism—sweat evaporation.
3. **Wind Speed ($v$):** Regulates convective heat dissipation from human skin.
4. **Solar Radiation ($G$):** Direct shortwave and diffuse radiative heat load on the human body.

A temperature of $34^\circ\text{C}$ in a humid coastal environment (e.g., Mumbai at 80% humidity) creates significantly more dangerous physiological heat strain than $38^\circ\text{C}$ in an arid environment. **ThermoShield solves this problem by moving from temperature-only monitoring to multi-factor human thermal stress intelligence and civic health risk forecasting.**

---

## 2. What ThermoShield Does

ThermoShield processes environmental observations through a two-layer analytical pipeline:

```
Live Weather Observations (Open-Meteo High-Resolution)
                     ↓
Biometeorological Thermal Engine (ISO 7243, NOAA, Steadman, Stull)
                     ↓
      Layer 1: Environmental Heat Strain (0–100)
                     ↓
Civic Health Risk Model (Random Forest Regression)
                     ↓
      Layer 2: Civic Health Risk Score (0–100)
                     ↓
┌────────────────────┬────────────────────┬────────────────────┐
│ Regional GIS Map   │ Public Alerts &    │ Heat Action        │
│ & Visualizer       │ Safety Advisories  │ Simulator          │
└────────────────────┴────────────────────┴────────────────────┘
```

### Two Distinct Risk Layers
To prevent confusion between physical weather load and healthcare resource requirements, ThermoShield clearly separates:

1. **Environmental Heat Strain (WBGT-based, 0–100):**
   * *What it means:* How stressful current weather conditions are for the human body.
   * *Formula basis:* Estimated Wet-Bulb Globe Temperature (ISO 7243), NOAA Heat Index, Steadman Apparent Temperature, and Natural Wet-Bulb.
2. **Civic Health Risk Score (ML Model-based, 0–100):**
   * *What it means:* A decision-support model estimate of potential surge and pressure on local municipal clinics and health services.
   * *Model basis:* Random Forest Regression combining thermal strain with local demographic vulnerability factors.
   * *Important:* This score is a civic planning index, **not** an individual medical diagnosis or illness probability.

---

## 3. Key Features

* **Live Multi-Factor Weather Monitoring:** Ingests temperature, relative humidity, wind speed, and solar irradiance in real time.
* **India-Aware Location Search:** Autocomplete geocoder prioritized for Indian municipalities with sequence-guarded request cancellation (`AbortController`) to eliminate race conditions.
* **Location Persistence:** Selected municipal coordinates and names persist automatically across sessions and navigation.
* **Comprehensive Biometeorological Indices:**
  * **Estimated WBGT ($^\circ\text{C}$):** Outdoor thermal strain standard ($\text{ISO 7243}$).
  * **NOAA Heat Index ($^\circ\text{C}$):** Shaded apparent temperature ($\text{Rothfusz 1990}$).
  * **Steadman Apparent Temperature ($^\circ\text{C}$):** Convective and vapor-pressure balance.
  * **Natural Wet-Bulb Temperature ($^\circ\text{C}$):** Thermodynamic limit for human evaporative cooling ($\text{Stull 2011}$).
* **Decision-Support Civic Health Risk Engine:** Random Forest model predicting modeled clinic surge volume.
* **Interactive Regional GIS Heat Map:** Leaflet map with color-coded risk radius circles, click-to-coordinate inspection, and multi-point visualization.
* **5-Day Synoptic Weather Forecast:** Multi-day temperature progression and trends.
* **Evidence-Based Actionable Safety Guidance:**
  * *Hydration Guidance:* Recommended fluid intake intervals, volume quotas, and electrolyte requirements.
  * *Outdoor Activity & Rest:* Work-rest pacing ratios and peak heat avoidance hours.
  * *People Who Need Extra Care:* Targeted protection advisories for elderly individuals, outdoor laborers, children, and pregnant women.
* **Interactive Heat Action Policy Simulator:**
  * Test simulated policy interventions (Cooling Centers, Hydration Stations, Outdoor Labor Restrictions).
  * Real-time before/after risk score calculations and policy impact counters.
* **Production PostgreSQL Integration with SQLite Fallback:** Full SQLAlchemy ORM schemas and Alembic migrations with automatic local SQLite fallback when no database connection string is configured.
* **High-Resilience Backend:** Singleflight request deduplication, in-memory TTL caching, and exponential backoff retry to prevent external rate limiting.

---

## 4. Scientific & Machine Learning Methodology

### Biometeorological Formulations
* **Estimated Wet-Bulb Globe Temperature (WBGT):**
  $$\text{WBGT} \approx 0.7\,T_w + 0.2\,T_g + 0.1\,T_a$$
  *Where $T_w$ is natural wet-bulb temperature, $T_g$ is estimated solar globe temperature, and $T_a$ is ambient dry-bulb temperature.*
* **Natural Wet-Bulb ($T_w$) — Stull (2011) Empirical Formulation:**
  $$T_w = T \cdot \text{atan}\left(0.151977\sqrt{RH + 8.313659}\right) + \text{atan}(T + RH) - \text{atan}(RH - 1.676331) + 0.00391838\,RH^{3/2}\,\text{atan}(0.023101\,RH) - 4.686035$$
* **Apparent Temperature ($AT$) — Steadman (1984):**
  $$AT = T + \frac{3.3 \cdot e}{1000} - 0.70 \cdot v - 4.00$$
  *Where $e$ is water vapor pressure ($\text{hPa}$) and $v$ is wind speed ($\text{m/s}$).*

### Machine Learning Civic Risk Model
* **Algorithm:** Random Forest Regression (`scikit-learn`, serialized via `joblib`).
* **Input Features:** Ambient Temperature ($^\circ\text{C}$), Thermal Stress Feature ($0\text{--}100$), Demographic Vulnerability Index ($0\text{--}1$), Historical Health Events Baseline, Lagged Health Events.
* **Target Output:** Modeled Clinic Surge Proxy ($\sim\text{visits/ward/day}$) and normalized Civic Health Risk Score ($0\text{--}100$).
* **Scientific Note:** The prototype is trained on multi-ward synthetic epidemiological scenario datasets designed for hackathon demonstration. Real-world municipal mortality and hospitalization datasets would be integrated for formal civic deployment.

---

## 5. System Architecture

```
                       ┌─────────────────────────────────┐
                       │   Open-Meteo High-Res API       │
                       └────────────────┬────────────────┘
                                        │ Live Weather Payload
                                        ▼
                       ┌─────────────────────────────────┐
                       │   FastAPI Weather Service       │
                       │ (TTL Cache + In-Flight Dedup)   │
                       └────────────────┬────────────────┘
                                        │
                                        ▼
                       ┌─────────────────────────────────┐
                       │   Biometeorological Engine      │
                       │ (WBGT, Heat Index, Steadman, Tw)│
                       └────────────────┬────────────────┘
                                        │ Thermal Severity
                                        ▼
                       ┌─────────────────────────────────┐
                       │  Random Forest ML Risk Engine   │
                       │   (Civic Health Risk Scoring)   │
                       └────────────────┬────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  Regional GIS    │          │  Public Health   │          │  Intervention    │
│  Heat Risk Map   │          │  Safety Alerts   │          │  Policy Simulator│
└──────────────────┘          └──────────────────┘          └──────────────────┘
         ▲                              ▲                              ▲
         └──────────────────────────────┼──────────────────────────────┘
                                        │ JSON REST API (Port 8000)
                                        ▼
                       ┌─────────────────────────────────┐
                       │   React 18 / Vite Frontend      │
                       │ (TypeScript, Tailwind, Leaflet) │
                       └────────────────┬────────────────┘
                                        │
                                        ▼
                       ┌─────────────────────────────────┐
                       │ PostgreSQL Database / SQLite    │
                       │ (SQLAlchemy ORM + Alembic)      │
                       └─────────────────────────────────┘
```

---

## 6. Technology Stack

* **Frontend:** React 18, TypeScript, Vite 5, React Router v6, Tailwind CSS, Recharts, React-Leaflet, Leaflet, Lucide Icons.
* **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic v2, HTTPX, SQLAlchemy 2.0, Alembic.
* **Machine Learning:** scikit-learn, NumPy, Pandas, Joblib.
* **Database:** PostgreSQL (Production), SQLite (Automatic Local Fallback).
* **External APIs:** Open-Meteo High-Resolution Forecast & Weather API, OpenStreetMap Nominatim Geocoding API.
* **Deployment & CI:** Vercel (Frontend SPA), Render (Backend Python API).

---

## 7. Project Structure

```
ThermoShield/
├── backend/                        # FastAPI Backend Application
│   ├── alembic/                    # Alembic Database Migrations
│   │   ├── versions/               # Migration Version Scripts
│   │   └── env.py                  # Migration Environment Runner
│   ├── alembic.ini                 # Alembic Configuration
│   ├── app/
│   │   ├── database/               # Database Connection & Models
│   │   │   ├── connection.py       # Engine, Session, & SQLite Fallback
│   │   │   └── models.py           # SQLAlchemy Entities (User, Location, Risk, Alert, etc.)
│   │   ├── models/                 # Model Artifacts (risk_model.pkl)
│   │   ├── services/               # Core Application Services
│   │   │   ├── alert_db.py         # Alert Persistence
│   │   │   ├── alert_engine.py     # Alert Evaluation Logic
│   │   │   ├── intervention.py     # Recommendation Directives
│   │   │   ├── intervention_db.py  # Intervention Persistence
│   │   │   ├── location.py         # Dual Geocoder (Nominatim + Open-Meteo)
│   │   │   ├── location_db.py      # Location Persistence
│   │   │   ├── map_services.py     # Regional Grid Risk Calculator
│   │   │   ├── risk.py             # ML Health Risk Model Predictor
│   │   │   ├── risk_db.py          # Risk Record Persistence
│   │   │   ├── simulator.py        # Heat Action Policy Calculator
│   │   │   ├── thermal.py          # Biometeorological Calculations
│   │   │   ├── user.py             # User Management Service
│   │   │   └── weather.py          # Weather Fetcher & Caching Engine
│   │   ├── config.py               # Application Settings
│   │   ├── main.py                 # FastAPI Application Routes (39 Endpoints)
│   │   └── schemas.py              # Pydantic Schemas
│   ├── thermal_stress/             # Scientific Biometeorology Core Library
│   ├── test_db.py                  # Database Connection Diagnostics
│   └── test_models.py              # Database Models Diagnostics
├── frontend/                       # React / Vite SPA Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI Components (Navbar, Cards, Map, Search)
│   │   ├── context/                # Global State (LocationContext with Storage)
│   │   ├── pages/                  # Top-Level Views (Dashboard, Forecast, RiskDetails, Alerts, Intervention)
│   │   ├── services/               # API Client & Cache Layer
│   │   ├── types/                  # TypeScript Data Contracts
│   │   └── utils/                  # Color Badging & Precision Formatters
│   ├── index.html                  # Main SPA HTML Entry
│   ├── package.json                # Frontend Dependencies & Scripts
│   ├── tsconfig.json               # TypeScript Configuration
│   ├── vercel.json                 # Vercel SPA Routing Configuration
│   └── vite.config.ts              # Vite Bundler & Dev Server Settings
├── data/                           # Training & Verification Datasets
├── models/                         # Trained ML Models (heatwave_model.pkl, risk_model.pkl)
├── results/                        # ML Model Evaluation Metrics & Validation Logs
├── src/                            # ML Pipeline Training & Evaluation Scripts
├── tests/                          # Automated Python Test Suite (48 Unit & Integration Tests)
├── .python-version                 # Python 3.11.9 Version Pin
├── runtime.txt                     # Render Deployment Runtime Pin
├── requirements.txt                # Python Backend Dependencies
└── README.md                       # Project Documentation
```

---

## 8. Local Setup Guide (Windows PowerShell)

Follow these step-by-step instructions to run ThermoShield locally on your computer.

### Prerequisites
* **Python 3.11** installed ([Download Python 3.11](https://www.python.org/downloads/))
* **Node.js 18+** and **npm** installed ([Download Node.js](https://nodejs.org/))
* **Git** installed

---

### Step 1: Clone the Repository
Open **PowerShell** and run:
```powershell
git clone https://github.com/NitishAwesome/ThermoShield.git
cd ThermoShield
```

---

### Step 2: Backend Setup
From the `ThermoShield` root folder:

1. **Create and activate a Python virtual environment:**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. **Install Python dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Backend Environment Variables (Optional):**
   * By default, ThermoShield **automatically falls back to a local SQLite database** (`thermoshield.db`), so no configuration is required for local testing.
   * If you wish to connect to a PostgreSQL instance, create a `.env` file in the root directory:
     ```env
     DATABASE_URL=postgresql://postgres:password@localhost:5432/thermoshield
     ```

4. **Start the FastAPI Backend:**
   ```powershell
   python -m uvicorn backend.app.main:app --reload --port 8000
   ```
   * The backend will start at: **`http://127.0.0.1:8000`**
   * Interactive API Documentation (Swagger): **`http://127.0.0.1:8000/docs`**

---

### Step 3: Frontend Setup
Open a **SECOND PowerShell terminal window** and run:

1. **Navigate to the frontend directory:**
   ```powershell
   cd ThermoShield\frontend
   ```

2. **Install frontend packages:**
   ```powershell
   npm install
   ```

3. **Configure Frontend Environment:**
   * Verify or create `frontend/.env`:
     ```env
     VITE_API_BASE_URL=http://127.0.0.1:8000
     ```

4. **Start the Vite Frontend Development Server:**
   ```powershell
   npm run dev
   ```
   * The frontend application will be live at: **`http://127.0.0.1:3000`**

---

## 9. Database Architecture & Setup

ThermoShield supports **PostgreSQL in Production** with an **automatic SQLite fallback for local development**.

### Database Entities
The database schema contains 5 core relational entities:
1. **`users`:** Manages civic users and alert subscription numbers.
2. **`locations`:** Stores monitored municipalities, ward names, and geographic coordinates.
3. **`risks`:** Historical audit log of calculated thermal strain and predicted civic risk scores.
4. **`alerts`:** Log of triggered public health warnings and advisory dispatches.
5. **`interventions`:** Record of simulated municipal heat action policies and before/after modeled risk reductions.

### Automatic Initialization
* When the application starts, SQLAlchemy automatically executes `Base.metadata.create_all()` to create all missing tables in SQLite or PostgreSQL.
* For formal schema migrations with PostgreSQL, Alembic is pre-configured:
  ```powershell
  alembic upgrade head
  ```

---

## 10. Core API Endpoints

All endpoints are accessible via `http://127.0.0.1:8000` locally and `https://thermoshield.onrender.com` in production:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status and uptime check. |
| `GET` | `/location/search?q={query}` | India-prioritized autocomplete geocoder. |
| `GET` | `/weather?lat={lat}&lon={lon}` | Real-time weather observation payload. |
| `GET` | `/thermal?lat={lat}&lon={lon}` | Biometeorological thermal strain indices (WBGT, Heat Index, Apparent Temp, Wet-Bulb). |
| `GET` | `/risk?lat={lat}&lon={lon}` | Machine-learning civic health risk score and modeled clinic surge estimate. |
| `GET` | `/forecast?lat={lat}&lon={lon}` | 5-day synoptic meteorological temperature progression. |
| `GET` | `/map/risk?locations={lat},{lon}` | Multi-point geospatial thermal risk evaluations for GIS rendering. |
| `GET` | `/intervention?risk_score=...` | Contextual Heat Action Plan (HAP) intervention recommendations. |
| `POST`| `/intervention/simulate` | Interactive policy simulator (computes projected risk reduction). |
| `GET` | `/docs` | Interactive Swagger UI API explorer. |

*(Plus complete CRUD routes for `/users`, `/locations`, `/risks`, `/alerts`, and `/interventions`)*.

---

## 11. Frontend Application Pages

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Unified real-time overview of weather conditions, Environmental Heat Strain, Civic Health Risk, and quick actions. |
| `/forecast` | **5-Day Weather Forecast** | Multi-day predictive temperature charts and synoptic thermal trend analysis. |
| `/risk-details` | **Heat & Health Risk Analysis** | Deep comparative biometeorological matrix, index breakdowns (ISO/NOAA/Steadman/Stull), and technical methodology drawer. |
| `/alerts` | **Alerts & Guidance** | Actionable public health guidance across Hydration, Outdoor Activity/Work-Rest pacing, and Vulnerable Cohort protection. |
| `/interventions`| **Heat Action Simulator** | Interactive scenario simulator allowing civic operators to toggle cooling centers, water stations, and labor bans to model risk reduction. |

---

## 12. How to Demo (Judge & Evaluator Walkthrough)

1. **Open the Application:** Navigate to `http://127.0.0.1:3000` (or the [Live Frontend](https://thermo-shield-tau.vercel.app/)).
2. **Search a Location:** Type **"Mumbai"** into the search bar and select `Mumbai, Maharashtra, India`.
3. **Inspect the Two-Layer Risk Presentation:**
   * Observe **Environmental Heat Strain** (physical weather load on the body).
   * Observe **Civic Health Risk Score** (estimated pressure on local clinics).
4. **Explore the Regional GIS Map:** Scroll to the map to see color-coded risk circles; click any regional point to evaluate coordinates.
5. **Switch Cities to Test Sensitivity:** Type **"Delhi"** or **"Shimla"** to observe how temperature, humidity, WBGT, and civic risk dynamically change.
6. **Navigate to Risk Analysis (`/risk-details`):** Inspect the comparative 4-index grid and open the *Technical Details & Methodology* drawer to inspect model features and ISO standards.
7. **Navigate to Alerts & Guidance (`/alerts`):** Review evidence-based hydration intervals, work-rest cycles, and vulnerable cohort advisories.
8. **Navigate to the Heat Action Simulator (`/interventions`):**
   * Click **Sync Live** to ingest current civic risk.
   * Toggle **Cooling Center Network**, **Hydration Stations**, and **Outdoor Work Restrictions**.
   * Click **Apply & Run Policy Simulation** to observe the modeled risk reduction (e.g., `-33.0` points) and projected civic risk.

---

## 13. Automated Testing & Quality Verification

### Run Backend Test Suite
From the repository root:
```powershell
python -m unittest discover -s tests -p "test_*.py"
```
* **Result:** **48 / 48 tests passed (OK)** covering biometeorological equations, weather caching, ML inference, and FastAPI integration.

### Run Frontend Typecheck & Production Build
From the `frontend/` directory:
```powershell
cd frontend
npx tsc --noEmit
npm run build
```
* **Result:** **0 TypeScript errors**, production bundle compiled cleanly in `<15s`.

---

## 14. Scientific Limitations & Transparency

* **Prototype Epidemiological Data:** The ML model is trained on multi-ward synthetic baseline datasets calibrated for extreme weather demonstrations. Formal city deployments require integration with official municipal health registries.
* **Decision-Support Scenarios:** The Intervention Simulator computes simulated policy estimates for decision support; it does not claim guaranteed individual medical outcomes.
* **External Upstream APIs:** Real-time weather and geocoding rely on Open-Meteo and OpenStreetMap services. In-memory caching and fallback mechanisms are implemented to maintain resilience against third-party rate limits.

---

## 15. Future Scope

* Direct integration with municipal Integrated Command and Control Centers (ICCC).
* Ward-level microclimate satellite thermal mapping (Landsat / Sentinel surface temperature integration).
* Automated multi-lingual SMS and WhatsApp alert dissemination for outdoor labor unions and community leaders.
* Automated dynamic dispatch optimization for emergency heat relief vans.

---

## 16. Project & Team Information

Developed as a **Smart India Hackathon 2026 Prototype** for Problem Statement **SIH26083** (*Extreme Heatwave Early Warning & Human Thermal Stress Intelligence*).
