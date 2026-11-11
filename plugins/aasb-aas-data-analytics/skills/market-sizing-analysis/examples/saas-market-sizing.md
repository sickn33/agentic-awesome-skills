# Illustrative SaaS market sizing

All customer counts, prices, filters and capture rates below are hypothetical inputs. They are not Gartner statistics, verified company revenue, market shares or investment evidence. Replace each assumption with a dated primary source or documented customer research before using the model for a real decision.

## Bottom-up calculation

| Segment | Customers | Annual contract value | Annual revenue pool |
| --- | ---: | ---: | ---: |
| Small | 85,000 | $3,600 | $306,000,000 |
| Mid-market | 18,000 | $9,600 | $172,800,000 |
| Enterprise | 2,500 | $24,000 | $60,000,000 |
| Total | 105,500 | — | $538,800,000 |

The hypothetical North American TAM is $538.8 million. Applying a 45% product-fit filter and then a conditional 70% switching-addressability filter gives:

```text
SAM = 538800000 * 0.45 * 0.70 = 169722000
Year-3 SOM scenario = SAM * 0.025 = 4243050
Year-5 SOM scenario = SAM * 0.05 = 8486100
```

The 70% filter applies only within the already filtered population; multiplying correlated independent-looking percentages without evidence can double count exclusions. A capture percentage is an assumption, not an execution plan or a validated forecast.

If capture is proportional across all three segments, the Year-5 scenario implies approximately 1,662 customers: `105500 * 0.45 * 0.70 * 0.05`. This count is a scenario expectation and must be rounded only for presentation. Revenue-weighted capture can imply a different customer mix, so do not infer a unique customer count from total ARR alone.

## Independent validation

Compare the result with a separately sourced top-down estimate using the same geography, product scope, time period and annual revenue unit. Record disagreements rather than adjusting inputs to force alignment. Total revenue of a multi-product vendor does not establish its share of this narrowly defined SAM.

## Evidence register

For every input record its source URL, publication date, definition, uncertainty and adjustments. Keep a conservative/base/upside sensitivity table with explicit assumptions. These scenarios are not statistical percentiles unless a probability model was actually fitted. No report purchase, data export or publication is authorized by this example.
