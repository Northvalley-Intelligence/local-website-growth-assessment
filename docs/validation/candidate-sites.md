# Candidate Validation Sites

These public websites are proposed for recurring internal validation. They are not customer-facing benchmarks and should not be used in sales material without separate permission and review.

Founder confirmed on 2026-06-06 that the candidate sites below are not current clients or active prospects. Before each validation run, confirm the site is still public and allowed by robots.txt for the intended crawl.

## Candidate Set

### 1. Orkin

- URL: `https://www.orkin.com/`
- Industry: pest control and termite services.
- Reason selected: public service-business site with location pages, pest/service detail pages, quote/contact CTAs, trust/authority content, educational content, and likely complex crawl paths.
- Expected validation value: local visibility, service-area/location detection, lead conversion CTAs, trust signals, message clarity, AI discoverability through educational content, metadata, PageSpeed comparison, and no-form-submission boundaries.
- Robots.txt considerations: check robots.txt before each run; quote, scheduling, account, chat, and location-search flows may be restricted or out of scope.
- Notes: replacement after founder rejected All Square Homes and pointed out that Baird & Warner duplicated real estate coverage with Keller Williams. Founder confirmed this replacement is not a current client or active prospect.

### 2. Ace Hardware

- URL: `https://www.acehardware.com/`
- Industry: retail and home services.
- Reason selected: large public site with location-oriented retail behavior, metadata, redirects, and likely complex crawl paths.
- Expected validation value: crawl boundary behavior, redirects, metadata, local/store visibility patterns, and performance comparison.
- Robots.txt considerations: check robots.txt before each run; crawl should remain within Phase 1 max pages/depth and same-domain limits.
- Notes: not a local SMB, so use for technical coverage rather than local-owner report quality.

### 3. Anytime Fitness

- URL: `https://www.anytimefitness.com/`
- Industry: fitness and local franchise services.
- Reason selected: location-driven service business with conversion paths, local pages, and brand/trust signals.
- Expected validation value: local visibility, lead conversion, service-area/location-page detection, metadata, and report prioritization.
- Robots.txt considerations: check robots.txt before each run; location search or account areas may be restricted or out of scope.
- Notes: useful for multi-location/franchise patterns that differ from single-location businesses.

### 4. Jimmy John's

- URL: `https://www.jimmyjohns.com/`
- Industry: restaurant and food service.
- Reason selected: consumer local intent, ordering CTAs, location paths, performance, and structured content patterns.
- Expected validation value: lead/conversion CTA detection, local visibility, mobile experience, metadata, and PageSpeed comparison.
- Robots.txt considerations: check robots.txt before each run; ordering, account, and app flows must not be submitted or authenticated.
- Notes: use to test that order/CTA-heavy sites do not confuse the no-form-submission rule.

### 5. Keller Williams

- URL: `https://www.kw.com/`
- Industry: real estate brokerage.
- Reason selected: real estate content, agent/location discovery, lead paths, trust content, and complex internal links.
- Expected validation value: crawl coverage, lead conversion paths, local visibility, redirects, broken links, and report explainability.
- Robots.txt considerations: check robots.txt before each run; search, account, and dynamic property paths may be restricted or noisy.
- Notes: useful real estate contrast because it is larger and more platform-like than a single-agent or small brokerage site.

## Rotation Guidance

- Run all five sites when validating a major scoring or crawler change.
- Run Orkin plus one additional site for smaller report-quality or scoring-explanation changes.
- Keep crawl limits unchanged during validation unless the phase goal explicitly changes.
- Record differences as telemetry; do not tune the product to match any one external tool blindly.
