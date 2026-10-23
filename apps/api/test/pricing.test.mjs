import test from "node:test";
import assert from "node:assert/strict";
import { PricingService } from "../dist/services/PricingService.js";

const analysis = {
  evidence: {
    labelTypography: "Visible brand label",
    copyrightYear: 1995,
    collarStitching: "double",
    distressing: "Light fading",
    garmentCues: "Pullover hoodie",
  },
  category: "branded_streetwear",
  brandEvidence: "Supreme wordmark",
  brand: "Supreme",
  garmentType: "hoodie",
  estimatedEra: "1990s",
  confidenceScore: 0.9,
  searchQueryString: "Supreme 1990s box logo hoodie",
};

function makeComps(prices) {
  return prices.map((price, index) => ({
    platform: "EBAY",
    itemUrl: `https://example.com/listing/${index}-${price}`,
    title: `Supreme box logo hoodie listing ${index}`,
    price,
    currency: "USD",
    thumbnail: null,
  }));
}

test("estimates a price range from enough comparable listings", async () => {
  const provider = {
    async fetchSoldComps() {
      return makeComps([100, 110, 120, 130, 140]);
    },
  };

  const service = new PricingService(provider);
  const result = await service.estimate(analysis);

  assert.ok(result);
  assert.equal(result.lowPrice, 110);
  assert.equal(result.medianPrice, 120);
  assert.equal(result.highPrice, 130);
  assert.equal(result.currency, "USD");
  assert.equal(result.comparables.length, 5);
  assert.ok(result.confidenceScore > 0);
  assert.ok(result.confidenceScore <= 1);
});

test("returns no estimate when every query has too few comparable listings", async () => {
  let calls = 0;
  const provider = {
    async fetchSoldComps() {
      calls += 1;
      return makeComps([100, 120]);
    },
  };

  const service = new PricingService(provider);
  const result = await service.estimate(analysis);

  assert.equal(result, null);
  assert.equal(calls, 3);
});

test("removes duplicate and excluded listings before estimating", async () => {
  const comps = makeComps([100, 110, 120, 130, 140]);
  comps.push({ ...comps[0] });
  comps.push({
    ...comps[1],
    itemUrl: "https://example.com/replica",
    title: "Supreme replica hoodie",
    price: 1,
  });

  const provider = {
    async fetchSoldComps() {
      return comps;
    },
  };

  const service = new PricingService(provider);
  const result = await service.estimate(analysis);

  assert.ok(result);
  assert.equal(result.comparables.length, 5);
  assert.ok(result.comparables.every((item) => !/replica/i.test(item.title)));
});
