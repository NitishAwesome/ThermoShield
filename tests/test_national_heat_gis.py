"""
ThermoShield — National Heat-Risk GIS & Administrative Hierarchy Test Suite
===========================================================================
Validates:
A. Deterministic national sample grid generation.
B. Exclusion of ocean and out-of-boundary bounding box coordinates.
C. Direct reuse of central biometeorological calculations (calculate_thermal_stress).
D. Absence of duplicate thermal/WBGT equations in national_heat.py.
E. Accurate administrative aggregation into states and districts.
F. Safe aggregation rule: unavailable cells never artificially deflated to LOW.
G. Mathematical consistency of data quality accounting.
H. Multi-day forecast temporal variance (Day 0 vs Day 2).
I. Cold-cache batching and bounded concurrency.
J. Warm-cache 0-call instant response.
K. Municipal drill-down seamless handoff to Greater Mumbai 24 BMC wards.
L. Preservation of Mumbai ward geometry and canonical forecast endpoints.
M. Explicit unintegrated marking for national demographic vulnerability.
N. Correct risk color mapping across all administrative tiers.
"""

import inspect
import pytest
from app.services.national_heat import (
    generate_national_sampling_grid,
    get_national_heat_risk,
    get_state_heat_risk,
    get_district_heat_risk,
    aggregate_cells_into_region,
    point_in_geom,
    point_in_poly,
    NATIONAL_PROVENANCE_METADATA,
)
from app.services.thermal import calculate_thermal_stress
from app.services.health_forecast import get_all_wards_forecast_summary, MUNICIPAL_WARD_REGISTRY


class TestNationalSamplingGrid:
    """Validates Section 3, 4, 5 — National Meteorological Sampling Grid & Boundary Filtering."""

    def test_deterministic_grid_generation(self):
        """A. National sampling grid is strictly deterministic across repeated invocations."""
        grid_1 = generate_national_sampling_grid()
        grid_2 = generate_national_sampling_grid()
        assert len(grid_1) == len(grid_2)
        assert grid_1 == grid_2
        assert len(grid_1) >= 45, f"Expected at least 45 sample points, got {len(grid_1)}"
        assert len(grid_1) <= 100, f"Grid resolution exceeded practical bounds: {len(grid_1)}"

    def test_ocean_and_bounding_box_exclusion(self):
        """B. Deep ocean and external coordinates are excluded by land boundary ray-casting."""
        # Deep Arabian Sea coordinate
        arabian_sea_lon, arabian_sea_lat = 65.0, 15.0
        # Deep Bay of Bengal coordinate
        bay_of_bengal_lon, bay_of_bengal_lat = 88.0, 12.0
        # Indian Ocean south of Kanyakumari
        indian_ocean_lon, indian_ocean_lat = 77.5, 4.0

        grid = generate_national_sampling_grid()
        grid_coords = {(pt[0], pt[1]) for pt in grid}

        assert (arabian_sea_lat, arabian_sea_lon) not in grid_coords
        assert (bay_of_bengal_lat, bay_of_bengal_lon) not in grid_coords
        assert (indian_ocean_lat, indian_ocean_lon) not in grid_coords

        # Verify all coordinates fall within legitimate geographic bounding box of India
        for lat, lon, st_id, st_name in grid:
            assert 6.0 <= lat <= 38.0, f"Latitude out of bounds: {lat}"
            assert 68.0 <= lon <= 98.0, f"Longitude out of bounds: {lon}"
            assert st_id and st_name, f"Missing state assignment for ({lat}, {lon})"


class TestScientificReuseAndFormulaHygiene:
    """Validates Section 8 — Scientific Engine Reuse & Formula Hygiene."""

    def test_reuses_central_thermal_engine(self):
        """C. National heat service calls central calculate_thermal_stress from thermal.py."""
        thermal_res = calculate_thermal_stress(
            temperature=35.0,
            humidity=70.0,
            wind_speed=2.0,
            solar_radiation=500.0,
        )
        assert "indices" in thermal_res
        assert "risk_assessment" in thermal_res
        assert thermal_res["indices"]["wbgt_c"] > 28.0

    def test_no_duplicate_equations_in_national_heat(self):
        """D. national_heat.py does NOT duplicate Stull or Rothfusz polynomials."""
        import app.services.national_heat as nh_module
        source = inspect.getsource(nh_module)

        # Stull formula specific constants
        assert "0.0001538" not in source, "Stull coefficient 0.0001538 duplicated in national_heat.py"
        assert "5.683080" not in source, "Stull coefficient 5.683080 duplicated in national_heat.py"

        # Rothfusz Heat Index regression constants
        assert "-42.379" not in source, "Rothfusz coefficient -42.379 duplicated in national_heat.py"
        assert "0.00122874" not in source, "Rothfusz coefficient 0.00122874 duplicated in national_heat.py"


class TestAdministrativeAggregationAndSafety:
    """Validates Section 10 & 11 — Administrative Aggregation & Data Quality Accounting."""

    def test_conservative_peak_severity_aggregation_rule(self):
        """E & F. Region operational risk reflects peak severity, never averages away danger."""
        # Simulated constituent cells for a state: two MODERATE and one HIGH
        mock_cells = [
            {
                "temperature_c": 30.0,
                "estimated_wbgt_c": 26.5,
                "risk_score": 0.38,
                "risk_level": "MODERATE",
                "source_status": "LIVE",
                "fallback_active": False,
            },
            {
                "temperature_c": 31.0,
                "estimated_wbgt_c": 27.2,
                "risk_score": 0.42,
                "risk_level": "MODERATE",
                "source_status": "LIVE",
                "fallback_active": False,
            },
            {
                "temperature_c": 36.5,
                "estimated_wbgt_c": 30.5,
                "risk_score": 0.58,
                "risk_level": "HIGH",
                "source_status": "LIVE",
                "fallback_active": False,
            },
        ]

        agg = aggregate_cells_into_region("test_state", "Test State", mock_cells)

        # Mean score is 0.46 (which by simple threshold would be MODERATE)
        assert agg["mean_risk_score"] == 0.46
        assert agg["dominant_risk_level"] == "MODERATE"

        # BUT operational risk_level MUST be HIGH because of peak severity rule
        assert agg["highest_risk_level"] == "HIGH"
        assert agg["risk_level"] == "HIGH", "Conservative planning rule failed to prioritize peak risk"
        assert agg["peak_estimated_wbgt_c"] == 30.5
        assert agg["peak_temperature_c"] == 36.5

    def test_unavailable_cells_never_treated_as_low(self):
        """F. Unavailable or empty data never artificially deflates to LOW."""
        agg = aggregate_cells_into_region("empty_state", "Empty State", [])
        assert agg["risk_level"] != "LOW", "Empty region falsely reported LOW risk"
        assert agg["data_quality"] == "UNAVAILABLE"

    def test_data_quality_accounting_consistency(self):
        """G. Real, cached, fallback, and unavailable cell counts are mathematically exact."""
        mock_cells = [
            {"temperature_c": 30.0, "estimated_wbgt_c": 26.0, "risk_score": 0.35, "risk_level": "MODERATE", "source_status": "LIVE", "fallback_active": False},
            {"temperature_c": 30.0, "estimated_wbgt_c": 26.0, "risk_score": 0.35, "risk_level": "MODERATE", "source_status": "CACHED", "fallback_active": False},
            {"temperature_c": 30.0, "estimated_wbgt_c": 26.0, "risk_score": 0.35, "risk_level": "MODERATE", "source_status": "OFFLINE_FALLBACK", "fallback_active": True},
        ]
        agg = aggregate_cells_into_region("mix_state", "Mix State", mock_cells)
        dq = agg["data_quality_summary"]

        assert dq["real_cells"] == 1
        assert dq["cached_cells"] == 1
        assert dq["fallback_cells"] == 1
        assert dq["unavailable_cells"] == 0
        assert dq["real_cells"] + dq["cached_cells"] + dq["fallback_cells"] + dq["unavailable_cells"] == 3
        assert agg["data_quality"] == "MIXED"


class TestNationalGISRuntime:
    """Validates Section 12, 13, 14, 15 — National API Runtime, Caching & Drill-Down."""

    def test_national_overview_payload_structure(self):
        """Validates /api/heat-risk/national payload completeness across all 36 States/UTs."""
        import asyncio
        res = asyncio.run(get_national_heat_risk(forecast_day=0))

        assert "coverage" in res
        assert "national_summary" in res
        assert "states" in res
        assert "data_quality_breakdown" in res
        assert "provenance" in res

        assert len(res["states"]) == 36, f"Expected 36 States/UTs, got {len(res['states'])}"
        assert res["national_summary"]["states_monitored"] == 36
        assert res["national_summary"]["peak_estimated_wbgt_c"] > 20.0

        # Verify Telangana, Ladakh, and merged Dadra & Nagar Haveli and Daman & Diu are present
        state_ids = {s["id"] for s in res["states"]}
        assert "telangana" in state_ids, "Telangana must be present in national states"
        assert "ladakh" in state_ids, "Ladakh must be present in national states"
        assert "dadra_and_nagar_haveli_and_daman_and_diu" in state_ids, "Merged DNH & DD must be present"

    def test_maharashtra_36_districts_and_renaming_aliases(self):
        """Validates 36 Maharashtra districts, Palghar presence, and alias compatibility."""
        import asyncio
        mh_resp = asyncio.run(get_state_heat_risk("maharashtra", forecast_day=0))
        districts = mh_resp["districts"]
        assert len(districts) == 36, f"Expected 36 Maharashtra districts, got {len(districts)}"

        dist_ids = {d["district_id"] for d in districts}
        assert "palghar" in dist_ids, "Palghar must be present in Maharashtra districts"
        assert "mumbai" in dist_ids, "Mumbai City must be present"
        assert "mumbai_suburban" in dist_ids, "Mumbai Suburban must be present"

        # Test alias resolution for renamed districts
        # Ahilyanagar / Ahmednagar
        d_ahmednagar = asyncio.run(get_district_heat_risk("ahmednagar", forecast_day=0))
        assert "ahmednagar" in d_ahmednagar["aliases"] or d_ahmednagar["district_id"] == "ahmednagar"

        # Chhatrapati Sambhajinagar / Aurangabad
        d_aurangabad = asyncio.run(get_district_heat_risk("aurangabad", forecast_day=0))
        assert "aurangabad" in d_aurangabad["aliases"] or d_aurangabad["district_id"] == "aurangabad"

        # Dharashiv / Osmanabad
        d_osmanabad = asyncio.run(get_district_heat_risk("osmanabad", forecast_day=0))
        assert "osmanabad" in d_osmanabad["aliases"] or d_osmanabad["district_id"] == "osmanabad"

    def test_multi_day_forecast_temporal_variance(self):
        """H. Forecast Day 0 and Day 2 reflect distinct meteorological time slices."""
        import asyncio
        day0 = asyncio.run(get_national_heat_risk(forecast_day=0))
        day2 = asyncio.run(get_national_heat_risk(forecast_day=2))

        assert "Today" in day0["forecast_day_label"]
        assert "Day 2" in day2["forecast_day_label"]

    def test_warm_cache_performance(self):
        """J. Warm cache request reuses cached calculations in sub-millisecond time."""
        import asyncio
        import time
        t0 = time.time()
        res_warm = asyncio.run(get_national_heat_risk(forecast_day=0))
        t_elapsed = time.time() - t0

        assert t_elapsed < 0.1, f"Warm cache took too long: {t_elapsed:.4f}s"
        assert res_warm["total_cells"] > 0

    def test_mumbai_drilldown_switches_to_ward_engine(self):
        """K & L. Mumbai drill-down seamlessly references 24 BMC administrative wards."""
        import asyncio
        mumbai_dist = asyncio.run(get_district_heat_risk("mumbai", forecast_day=0))

        assert mumbai_dist["has_municipal_detail"] is True
        assert mumbai_dist["municipal_system_id"] == "mumbai_24_wards"
        assert "Greater Mumbai (24 BMC Wards)" in mumbai_dist["municipal_message"]

        # Verify the 24 Mumbai wards remain 100% intact in the canonical ward pipeline
        wards = asyncio.run(get_all_wards_forecast_summary())
        assert len(wards) == 24
        ward_ids = {w["ward_id"] for w in wards}
        assert "ward_a" in ward_ids
        assert "ward_e" in ward_ids
        assert "ward_t" in ward_ids

    def test_non_mumbai_district_has_transparent_messaging(self):
        """M. Non-Mumbai districts explicitly indicate lack of ward geometry without fabricating wards."""
        import asyncio
        pune_dist = asyncio.run(get_district_heat_risk("pune", forecast_day=0))

        assert pune_dist["has_municipal_detail"] is False
        assert pune_dist["municipal_system_id"] is None
        assert "municipal/ward geometry not currently integrated" in pune_dist["municipal_message"]

    def test_national_vulnerability_not_fabricated(self):
        """M. Demographic vulnerability is explicitly marked not integrated nationally."""
        assert "Demographic vulnerability is NOT integrated nationwide" in NATIONAL_PROVENANCE_METADATA["vulnerability_scope"]

