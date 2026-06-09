# Site Validation Template

Use this template for internal validation runs. Store completed runs under the relevant MDE history phase or a future `docs/validation/runs/` directory.

## Run Metadata

- Site:
- URL:
- Industry:
- Phase:
- BDD generation:
- Date:
- Operator:
- Our assessment version or commit:
- Tools used:
- PageSpeed API configured: yes/no
- Screaming Frog export available: yes/no
- Robots.txt reviewed: yes/no

## Our Assessment

- Status: successful / partial / insufficient evidence / failed
- Pages crawled:
- Evidence confidence:
- Overall score:
- Grade:
- Top problems:
- Top recommended fixes:
- Category scores:
- Not measured categories:
- Crawl notes:
- Report quality notes:

## Lighthouse

- URL tested:
- Strategy/device:
- Performance:
- Accessibility:
- Best Practices:
- SEO:
- Key findings:
- Findings relevant to our categories:
- Findings outside our scope:

## PageSpeed

- URL tested:
- Strategy/device:
- API key configured: yes/no
- Performance score:
- Runtime or API errors:
- Key findings:
- Differences from our Performance result:

## Screaming Frog

- Crawl configuration:
- Crawl limit:
- Robots respected: yes/no
- Pages crawled:
- Broken links:
- Redirects:
- Metadata issues:
- Export location:
- Differences from our crawl:

## Manual Expert Review

- What is working:
- What is not working:
- What matters most:
- What should be fixed first:
- Why those fixes matter:
- Local visibility observations:
- Lead conversion observations:
- Trust signal observations:
- Message clarity observations:
- AI discoverability observations:
- Report quality observations:

## Comparison Summary

### Crawl Coverage Differences

- Matches:
- Our tool missed:
- External tools missed:
- Notes:

### Broken Link Differences

- Matches:
- Our false positives:
- Our false negatives:
- Notes:

### Redirect Differences

- Matches:
- Our false positives:
- Our false negatives:
- Notes:

### Metadata Differences

- Matches:
- Our false positives:
- Our false negatives:
- Notes:

### Score Disagreements

- Category:
- Our score:
- Reference score or observation:
- Explanation:
- Action needed:

### Findings Our Tool Explains Better

- Finding:
- Why our explanation is better:

### Findings Validation Tools Explain Better

- Finding:
- What the reference tool explained better:
- Action needed:

## False Positives

- Finding:
- Source category:
- Why it appears false:
- Evidence:
- Severity: Critical / High / Low
- Regression test needed: yes/no

## False Negatives

- Finding:
- Source category:
- Why we missed it:
- Evidence:
- Severity: Critical / High / Low
- Regression test needed: yes/no

## Confidence

- Overall confidence: high / medium / low
- Confidence rationale:
- Remaining uncertainty:

## Outcome

- Passed validation: yes/no
- Critical issues:
- High issues:
- Low issues:
- Follow-up work:
- MDE status updated: yes/no
