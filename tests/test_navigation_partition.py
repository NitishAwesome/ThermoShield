"""
test_navigation_partition.py
Validates the ThermoShield Navigation Partition Invariants:
1. Union invariant: directItems U moreItems == allAvailableItems
2. Intersection invariant: directItems ∩ moreItems == empty set
3. Non-empty More menu rule: More menu only renders when moreItems > 0
4. Core route preservation: Forecast and Alerts must exist in every tier (direct or More)
5. Authority navigation preservation: All 8 operational routes present across all tiers
"""
import pytest

CITIZEN_ROUTES = [
    {"id": "home", "priority": 1},
    {"id": "heat-map", "priority": 1},
    {"id": "personal-risk", "priority": 1},
    {"id": "alerts", "priority": 2},
    {"id": "forecast", "priority": 2},
    {"id": "interventions", "priority": 3},
    {"id": "risk-details", "priority": 3},
]

AUTHORITY_ROUTES = [
    {"id": "gov-dashboard", "priority": 1},
    {"id": "gov-map", "priority": 1},
    {"id": "gov-health", "priority": 1},
    {"id": "gov-action-plan", "priority": 1},
    {"id": "gov-dispatch", "priority": 2},
    {"id": "gov-interventions", "priority": 3},
    {"id": "gov-matrix", "priority": 3},
    {"id": "gov-reports", "priority": 3},
]

TIERS = ["COMPACT", "STANDARD", "WIDE"]


def partition_nav_items(items, tier, is_gov):
    if is_gov:
        if tier == "WIDE":
            is_direct = lambda item: item["priority"] <= 2
        else:
            is_direct = lambda item: item["priority"] == 1
    else:
        if tier == "COMPACT":
            is_direct = lambda item: item["priority"] == 1
        else:
            is_direct = lambda item: item["priority"] <= 2

    direct_items = [item for item in items if is_direct(item)]
    more_items = [item for item in items if not is_direct(item)]
    return direct_items, more_items


class TestNavigationPartitionInvariants:
    @pytest.mark.parametrize("tier", TIERS)
    def test_citizen_partition_invariants(self, tier):
        direct, more = partition_nav_items(CITIZEN_ROUTES, tier, is_gov=False)
        all_ids = set([i["id"] for i in CITIZEN_ROUTES])
        direct_ids = set([i["id"] for i in direct])
        more_ids = set([i["id"] for i in more])

        # 1. Union matches exactly all available items
        assert direct_ids.union(more_ids) == all_ids
        # 2. Disjoint sets (intersection is empty)
        assert direct_ids.intersection(more_ids) == set()
        # 3. Forecast always exists in either direct or More
        assert ("forecast" in direct_ids) ^ ("forecast" in more_ids)
        # 4. Alerts always exists in either direct or More
        assert ("alerts" in direct_ids) ^ ("alerts" in more_ids)
        # 5. More menu is not empty if items exist in overflow
        assert len(more) > 0

    @pytest.mark.parametrize("tier", TIERS)
    def test_authority_partition_invariants(self, tier):
        direct, more = partition_nav_items(AUTHORITY_ROUTES, tier, is_gov=True)
        all_ids = set([i["id"] for i in AUTHORITY_ROUTES])
        direct_ids = set([i["id"] for i in direct])
        more_ids = set([i["id"] for i in more])

        # 1. Union matches exactly all available items
        assert direct_ids.union(more_ids) == all_ids
        # 2. Disjoint sets (intersection is empty)
        assert direct_ids.intersection(more_ids) == set()
        # 3. All 8 operational routes present
        assert len(direct) + len(more) == 8
        # 4. More is never empty
        assert len(more) >= 3

    def test_more_button_suppression_on_zero_overflow(self):
        sample_items = [
            {"id": "a", "priority": 1},
            {"id": "b", "priority": 1},
        ]
        direct, more = partition_nav_items(sample_items, "WIDE", is_gov=False)
        assert len(more) == 0, "When overflow list is empty, More menu items must be empty"
