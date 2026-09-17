// Test suite for ThermoShield Navigation Partition Logic and Strict Invariants
import assert from 'node:assert';

// Simulated pure partition function mirroring navigationConfig.ts
function partitionNavItems(items, tier, isGov) {
  let isDirect;

  if (isGov) {
    if (tier === 'WIDE') {
      isDirect = (item) => item.priority <= 2;
    } else {
      isDirect = (item) => item.priority === 1;
    }
  } else {
    if (tier === 'COMPACT') {
      isDirect = (item) => item.priority === 1;
    } else {
      isDirect = (item) => item.priority <= 2;
    }
  }

  const directItems = items.filter(isDirect);
  const moreItems = items.filter((item) => !isDirect(item));

  return { directItems, moreItems };
}

const mockT = (k, fb) => fb;

const CITIZEN_NAV = [
  { id: 'home', to: '/', label: 'Home', compactLabel: 'Home', priority: 1, isIndex: true },
  { id: 'heat-map', to: '/heat-map', label: 'Local Heat Map', compactLabel: 'Heat Map', priority: 1 },
  { id: 'personal-risk', to: '/personal-risk', label: 'My Heat Risk', compactLabel: 'My Risk', priority: 1 },
  { id: 'alerts', to: '/alerts', label: 'Alerts & Safety', compactLabel: 'Alerts', priority: 2 },
  { id: 'forecast', to: '/forecast', label: 'Forecast & Planning', compactLabel: 'Forecast', priority: 2 },
  { id: 'interventions', to: '/interventions', label: 'Safety Actions', compactLabel: 'Actions', priority: 3 },
  { id: 'risk-details', to: '/risk-details', label: 'Detailed Metrics', compactLabel: 'Metrics', priority: 3 },
];

const AUTHORITY_NAV = [
  { id: 'gov-dashboard', to: '/gov/dashboard', label: 'Command Dashboard', compactLabel: 'Dashboard', priority: 1 },
  { id: 'gov-map', to: '/gov/map', label: 'Heat Risk Map', compactLabel: 'Risk Map', priority: 1 },
  { id: 'gov-health', to: '/gov/health-impact', label: 'Health Impact', compactLabel: 'Health', priority: 1 },
  { id: 'gov-action-plan', to: '/gov/action-plan', label: 'Heat Action Plan', compactLabel: 'Action Plan', priority: 1 },
  { id: 'gov-dispatch', to: '/gov/dispatch', label: 'Alerts & Dispatch', compactLabel: 'Dispatch', priority: 2 },
  { id: 'gov-interventions', to: '/gov/interventions', label: 'Intervention Simulator', compactLabel: 'Simulator', priority: 3 },
  { id: 'gov-matrix', to: '/gov/matrix', label: 'Municipal Matrix', compactLabel: 'Matrix', priority: 3 },
  { id: 'gov-reports', to: '/gov/reports', label: 'Reports & Data', compactLabel: 'Reports', priority: 3 },
];

const TIERS = ['COMPACT', 'STANDARD', 'WIDE'];

console.log('=== RUNNING THERMOSHIELD NAVIGATION INVARIANT TESTS ===');

// Test 1: Invariant Check for Citizen across all tiers
TIERS.forEach((tier) => {
  const { directItems, moreItems } = partitionNavItems(CITIZEN_NAV, tier, false);

  console.log(`\n[Citizen Tier: ${tier}]`);
  console.log(`  Direct (${directItems.length}):`, directItems.map(i => i.id).join(', '));
  console.log(`  More (${moreItems.length}):`, moreItems.map(i => i.id).join(', '));

  // Invariant 1: Union equals full set
  const allIds = new Set([...directItems.map(i => i.id), ...moreItems.map(i => i.id)]);
  assert.strictEqual(allIds.size, CITIZEN_NAV.length, `Union size must be ${CITIZEN_NAV.length} at tier ${tier}`);
  CITIZEN_NAV.forEach((item) => {
    assert.ok(allIds.has(item.id), `Route ${item.id} missing from union at tier ${tier}`);
  });

  // Invariant 2: Intersection is empty
  const directIdSet = new Set(directItems.map(i => i.id));
  moreItems.forEach((item) => {
    assert.ok(!directIdSet.has(item.id), `Route ${item.id} exists in BOTH direct and More at tier ${tier}`);
  });

  // Invariant 3: Forecast must exist in either direct or More
  const forecastInDirect = directItems.some(i => i.id === 'forecast');
  const forecastInMore = moreItems.some(i => i.id === 'forecast');
  assert.ok(forecastInDirect || forecastInMore, `Forecast missing at tier ${tier}`);
  assert.ok(!(forecastInDirect && forecastInMore), `Forecast in both at tier ${tier}`);

  // Invariant 4: Alerts must exist in either direct or More
  const alertsInDirect = directItems.some(i => i.id === 'alerts');
  const alertsInMore = moreItems.some(i => i.id === 'alerts');
  assert.ok(alertsInDirect || alertsInMore, `Alerts missing at tier ${tier}`);
  assert.ok(!(alertsInDirect && alertsInMore), `Alerts in both at tier ${tier}`);

  // Invariant 5: More menu contents are never empty when rendered
  if (moreItems.length > 0) {
    assert.ok(moreItems.length >= 2, `More dropdown should have meaningful contents, found ${moreItems.length}`);
  }
});

// Test 2: Invariant Check for Authority across all tiers
TIERS.forEach((tier) => {
  const { directItems, moreItems } = partitionNavItems(AUTHORITY_NAV, tier, true);

  console.log(`\n[Authority Tier: ${tier}]`);
  console.log(`  Direct (${directItems.length}):`, directItems.map(i => i.id).join(', '));
  console.log(`  More (${moreItems.length}):`, moreItems.map(i => i.id).join(', '));

  // Invariant 1: Union equals full set
  const allIds = new Set([...directItems.map(i => i.id), ...moreItems.map(i => i.id)]);
  assert.strictEqual(allIds.size, AUTHORITY_NAV.length, `Union size must be ${AUTHORITY_NAV.length} at tier ${tier}`);
  AUTHORITY_NAV.forEach((item) => {
    assert.ok(allIds.has(item.id), `Route ${item.id} missing from union at tier ${tier}`);
  });

  // Invariant 2: Intersection is empty
  const directIdSet = new Set(directItems.map(i => i.id));
  moreItems.forEach((item) => {
    assert.ok(!directIdSet.has(item.id), `Route ${item.id} exists in BOTH direct and More at tier ${tier}`);
  });

  // Invariant 3: All 8 operational routes present
  assert.strictEqual(directItems.length + moreItems.length, 8);
  assert.ok(moreItems.length > 0, `Authority More must have items in tier ${tier}`);
});

// Test 3: Zero-overflow item behavior (More button suppression)
const ZERO_OVERFLOW_LIST = [
  { id: 'a', priority: 1 },
  { id: 'b', priority: 1 },
];
const zeroResult = partitionNavItems(ZERO_OVERFLOW_LIST, 'WIDE', false);
assert.strictEqual(zeroResult.moreItems.length, 0, 'Zero overflow list must yield empty moreItems');
console.log('\n[Zero Overflow Check]: moreItems.length === 0 confirmed -> More button suppresses cleanly.');

console.log('\n✅ ALL NAVIGATION INVARIANT TESTS PASSED WITH 100% SUCCESS!');
