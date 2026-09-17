"""
ThermoShield Proactive Background Monitoring Daemon
Autonomous background worker running within FastAPI event loop.
Periodically fetches real-time weather for monitored civic locations,
evaluates thermal stress & ML risk scores, and dispatches automated
early-warning alerts upon detecting critical state transitions or threshold breaches.
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.database.connection import SessionLocal
from app.services.weather import get_weather
from app.services.thermal import calculate_thermal_stress
from app.services.risk import predict_risk
from app.services.alert_engine import dispatch_automatic_early_warning, get_engine_status_summary

logger = logging.getLogger(__name__)

# Key monitored urban and regional municipal zones for SIH26083 demonstration
MONITORED_MUNICIPAL_AREAS = [
    {"name": "Mumbai, Maharashtra", "lat": 19.0760, "lon": 72.8777, "vulnerability": 45.0},
    {"name": "Nagpur, Maharashtra", "lat": 21.1458, "lon": 79.0882, "vulnerability": 65.0},
    {"name": "Jaipur, Rajasthan", "lat": 26.9124, "lon": 75.7873, "vulnerability": 70.0},
    {"name": "Ahmedabad, Gujarat", "lat": 23.0225, "lon": 72.5714, "vulnerability": 60.0},
    {"name": "New Delhi, NCR", "lat": 28.6139, "lon": 77.2090, "vulnerability": 55.0},
]

# Evaluation interval: 15 minutes (900 seconds) in production
# Configurable via environment variable
DEFAULT_MONITOR_INTERVAL_SECONDS = 900

class BackgroundMonitorDaemon:
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.last_run_time: Optional[datetime] = None
        self.total_cycles: int = 0
        self.last_results: List[Dict[str, Any]] = []

    def get_telemetry(self) -> Dict[str, Any]:
        engine_summary = get_engine_status_summary()
        return {
            "daemon_running": self.is_running,
            "last_cycle_timestamp": self.last_run_time.isoformat() if self.last_run_time else None,
            "total_cycles_completed": self.total_cycles,
            "monitored_areas_count": len(MONITORED_MUNICIPAL_AREAS),
            "monitored_areas": [a["name"] for a in MONITORED_MUNICIPAL_AREAS],
            "last_cycle_results": self.last_results,
            "engine": engine_summary,
            "email_dispatch_configured": engine_summary.get("email_dispatch_configured", False)
        }

    async def evaluate_single_location(self, area: Dict[str, Any], db) -> Dict[str, Any]:
        name = area["name"]
        lat = area["lat"]
        lon = area["lon"]
        vuln = area.get("vulnerability", 40.0)

        try:
            weather_data = await get_weather(lat, lon)
            weather = weather_data.get("weather", {})
            temp = weather.get("temperature", 35.0)
            humidity = weather.get("humidity", 50.0)
            wind = weather.get("wind_speed", 1.0)
            solar = weather.get("solar_radiation")

            # Calculate biometeorological human thermal stress
            thermal = calculate_thermal_stress(
                temperature=temp,
                humidity=humidity,
                wind_speed=wind,
                solar_radiation=solar
            )

            thermal_score = round(thermal["risk_assessment"]["score"] * 100, 2)
            wbgt_c = thermal["indices"].get("wbgt_c")
            heat_index_c = thermal["indices"].get("heat_index_c")

            # ML prediction model
            risk_pred = predict_risk(
                temperature_c=temp,
                thermal_stress=thermal_score,
                vulnerability_index=vuln,
                historical_health_events=15,
                lag_health_events=12
            )

            risk_level = risk_pred.get("risk_level", "MODERATE")
            risk_score = risk_pred.get("risk_score", 50.0)

            # Proactive dispatch evaluation
            dispatch_res = dispatch_automatic_early_warning(
                db=db,
                location_name=name,
                location_id=None,
                risk_level=risk_level,
                risk_score=risk_score,
                temperature_c=temp,
                wbgt_c=wbgt_c,
                heat_index_c=heat_index_c
            )

            return {
                "location": name,
                "temperature": temp,
                "wbgt": wbgt_c,
                "heat_index": heat_index_c,
                "risk_level": risk_level,
                "risk_score": risk_score,
                "dispatch": dispatch_res
            }
        except Exception as e:
            logger.warning(f"Error evaluating monitored area {name}: {e}")
            return {
                "location": name,
                "error": str(e)
            }

    async def run_evaluation_cycle(self) -> List[Dict[str, Any]]:
        """Executes one complete evaluation cycle across all monitored civic areas."""
        cycle_results = []
        db = SessionLocal()
        try:
            for area in MONITORED_MUNICIPAL_AREAS:
                try:
                    res = await self.evaluate_single_location(area, db)
                    cycle_results.append(res)
                except Exception as eval_err:
                    logger.error(f"Error evaluating area {area.get('name')}: {eval_err}")
                    cycle_results.append({"location": area.get("name"), "error": str(eval_err)})
                # Small pause between Open-Meteo queries to respect rate limits
                await asyncio.sleep(0.5)
        finally:
            db.close()

        self.last_run_time = datetime.utcnow()
        self.total_cycles += 1
        self.last_results = cycle_results
        logger.info(f"Completed proactive thermal evaluation cycle #{self.total_cycles} for {len(cycle_results)} areas.")
        return cycle_results

    async def _daemon_loop(self, interval_seconds: int):
        logger.info(f"Starting ThermoShield Proactive Monitoring Daemon (interval: {interval_seconds}s)")
        self.is_running = True

        # Initial run after a short 10s warmup
        await asyncio.sleep(10)

        while self.is_running:
            try:
                await self.run_evaluation_cycle()
            except Exception as e:
                logger.error(f"Error in background monitor cycle: {e}")

            # Sleep until next scheduled cycle
            try:
                await asyncio.sleep(interval_seconds)
            except asyncio.CancelledError:
                break

        logger.info("ThermoShield Proactive Monitoring Daemon stopped.")
        self.is_running = False

    def start(self, interval_seconds: int = DEFAULT_MONITOR_INTERVAL_SECONDS, force: bool = False):
        if not force:
            env = (os.getenv("ENVIRONMENT") or "").strip().lower()
            is_test = (
                env in ("test", "testing")
                or os.getenv("DISABLE_BACKGROUND_MONITOR", "").strip().lower() in ("true", "1", "yes")
                or "PYTEST_CURRENT_TEST" in os.environ
                or "pytest" in sys.modules
            )
            if is_test:
                logger.info("ThermoShield background monitoring daemon startup suppressed in TEST environment.")
                return

        if self._task and not self._task.done():
            logger.info("Monitoring daemon already running.")
            return
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._daemon_loop(interval_seconds))
        except RuntimeError:
            logger.warning("No running asyncio event loop found to attach background daemon.")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()


# Global daemon singleton
monitor_daemon = BackgroundMonitorDaemon()
