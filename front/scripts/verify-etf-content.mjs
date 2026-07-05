import assert from "node:assert/strict";
import { etfMockApi, MOCK_ETFS } from "../src/services/etfMockApi.js";
import { calculateAnnualCost, calculateCagr, clampCompareItems } from "../src/utils/etfCalculations.js";

const searchDomestic = await etfMockApi.searchEtfs({ filters: { region: "domestic" }, size: 50 });
assert.ok(searchDomestic.data.length > 0, "domestic search should return items");
assert.ok(searchDomestic.data.every((etf) => etf.listingRegion === "domestic"), "domestic filter should only include domestic ETFs");

const emptySearch = await etfMockApi.searchEtfs({ keyword: "NO_SUCH_ETF_12345" });
assert.equal(emptySearch.data.length, 0, "empty keyword should return empty data");

const clamped = clampCompareItems(MOCK_ETFS, 4);
assert.equal(clamped.length, 4, "compare tray should clamp to max items");

const highDividend = await etfMockApi.getRanking("high-dividend");
const rates = highDividend.data.items.map((etf) => etf.distribution.ttmDistributionRate);
assert.deepEqual([...rates].sort((a, b) => b - a), rates, "high dividend ranking should be sorted descending");

assert.equal(Number(calculateCagr(100, 121, 2).toFixed(2)), 10, "CAGR calculation should work");
assert.equal(calculateAnnualCost(1000000, 0.1), 1000, "annual cost conversion should work");

const schd = await etfMockApi.getEtf("SCHD");
assert.equal(schd.meta.mock, true, "ETF response must expose mock metadata");
assert.equal(typeof schd.data.distribution.nextExDate.confirmed, "boolean", "next ex-date must distinguish expected and confirmed");
assert.ok(schd.data.distribution.history.some((item) => item.confirmed), "history should include confirmed distribution records");

let failed = false;
try {
  await etfMockApi.getEtf("UNKNOWN");
} catch {
  failed = true;
}
assert.equal(failed, true, "unknown ETF should throw API error");

console.log("ETF content verification passed");
