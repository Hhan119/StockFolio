# StockFolio Distribution Architecture

## Current Issue

The previous portfolio dividend flow treated a holding-level dividend frequency and a single per-share amount as if it represented the future. Real stocks and ETFs can have changing distributions, special distributions, corrected events, cancelled events, and variable covered-call ETF payments.

## Implemented Direction

- `Stock` remains the user holding model: ticker, quantity, average price, current price, currency, memo.
- `DistributionProfile` stores instrument-level distribution pattern metadata.
- `DistributionEvent` stores each distribution payment event with status, type, amount, provider, source timestamp, and data status.
- Legacy `Dividend` rows are not deleted. They are migrated at runtime into estimated/manual `DistributionEvent` rows and remain available for compatibility.
- Amounts use `BigDecimal`; dates use `LocalDate`; source timestamps use `Instant`.

## New Tables

- `distribution_profiles`
- `distribution_events`

Migration draft:

- `back/StockFolio/src/main/resources/db/migration/V2__distribution_profile_events.sql`

The project currently uses `spring.jpa.hibernate.ddl-auto=update`, not Flyway. Treat the SQL file as the PostgreSQL migration plan for future Flyway adoption or manual DB migration.

## Calculation Rules

- Recent 12-month per-share amount uses `PAID`, `CONFIRMED`, and `DECLARED` regular events first.
- Special distributions are excluded by default and can be included with `includeSpecial=true`.
- If real event history is insufficient, user-entered or mock values are marked as `ESTIMATED`, `MANUAL`, `USER_ENTERED`, or `MOCK`.
- Missing distribution data is returned as `null`, not `0`.
- Annual projected gross amount is based on current holding quantity and is not historical received income.
- Net/tax calculation is reserved for user-configured tax assumptions; the current response intentionally avoids hard-coded tax rates.

## APIs

- `GET /api/public/instruments/{instrumentId}/distributions`
- `GET /api/public/instruments/{instrumentId}/distributions/latest`
- `GET /api/public/instruments/{instrumentId}/distribution-profile`
- `GET /api/portfolios/{portfolioId}/distribution-summary`
- `GET /api/portfolios/{portfolioId}/distribution-calendar`
- `GET /api/holdings/{holdingId}/distribution-summary`
- `GET /api/holdings/{holdingId}/distribution-projection`
- `POST /api/holdings/{holdingId}/manual-distribution`
- `POST /api/admin/instruments/{instrumentId}/distributions`
- `PUT /api/admin/distributions/{distributionEventId}`
- `POST /api/admin/instruments/{instrumentId}/distribution-profile`

## Provider Extension Point

`DistributionDataProvider` and `MockDistributionDataProvider` are the replacement points for future FMP, KRX Open API, OpenDART, or brokerage integrations. Provider DTOs should be mapped into internal profile/event models and should not overwrite user-entered data blindly.

## Remaining Follow-up

- Add a real `Instrument` or `stock_master` table and replace temporary `ticker:currency` instrument keys.
- Add user-level portfolio tax settings for estimated net distributions.
- Add transaction history before calculating historical received dividends.
- Add full provider sync jobs and correction history.
