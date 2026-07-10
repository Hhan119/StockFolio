-- StockFolio distribution migration draft for PostgreSQL.
-- The project currently uses spring.jpa.hibernate.ddl-auto=update, so this file is
-- documentation-ready for a future Flyway adoption and should be run only after
-- checking the current production schema.

create table if not exists distribution_profiles (
    id bigserial primary key,
    instrument_key varchar(80) not null unique,
    ticker varchar(20) not null,
    instrument_name varchar(150),
    market varchar(20),
    currency varchar(10),
    declared_frequency varchar(20) not null default 'UNKNOWN',
    observed_frequency varchar(20) not null default 'UNKNOWN',
    payments_last_12_months integer default 0,
    frequency_confidence varchar(20) not null default 'UNAVAILABLE',
    last_distribution_date date,
    next_estimated_ex_dividend_date date,
    next_estimated_payment_date date,
    source varchar(80),
    data_status varchar(20) not null default 'UNAVAILABLE',
    source_updated_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists distribution_events (
    id bigserial primary key,
    instrument_key varchar(80) not null,
    ticker varchar(20) not null,
    instrument_name varchar(150),
    market varchar(20),
    currency varchar(10) not null,
    declaration_date date,
    ex_dividend_date date,
    record_date date,
    payment_date date,
    amount_per_share numeric(19, 6) not null,
    distribution_type varchar(30) not null default 'REGULAR',
    event_status varchar(20) not null default 'ESTIMATED',
    estimate_method varchar(40) not null default 'UNAVAILABLE',
    estimate_confidence varchar(20) not null default 'UNAVAILABLE',
    data_status varchar(20) not null default 'UNAVAILABLE',
    income_amount numeric(19, 6),
    capital_gain_amount numeric(19, 6),
    return_of_capital_amount numeric(19, 6),
    raw_amount_per_share numeric(19, 6),
    split_adjusted_amount_per_share numeric(19, 6),
    provider varchar(80),
    source_updated_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint uk_distribution_event_identity unique (
        instrument_key,
        ex_dividend_date,
        payment_date,
        amount_per_share,
        distribution_type
    )
);

create index if not exists idx_distribution_events_instrument_key on distribution_events (instrument_key);
create index if not exists idx_distribution_events_payment_date on distribution_events (payment_date);
create index if not exists idx_distribution_events_status_type on distribution_events (event_status, distribution_type);

insert into distribution_profiles (
    instrument_key,
    ticker,
    instrument_name,
    market,
    currency,
    declared_frequency,
    observed_frequency,
    payments_last_12_months,
    frequency_confidence,
    source,
    data_status,
    source_updated_at
)
select distinct
    upper(s.ticker) || ':' || coalesce(nullif(upper(s.currency), ''), 'KRW') as instrument_key,
    upper(s.ticker),
    s.name,
    case when coalesce(upper(s.currency), 'KRW') = 'KRW' or s.ticker ~ '^[0-9]{5}[0-9A-Z]?$' then 'KR' else 'US' end,
    coalesce(nullif(upper(s.currency), ''), 'KRW'),
    case d.frequency
        when 'SEMI_ANNUAL' then 'SEMIANNUAL'
        when 'SPECIAL' then 'IRREGULAR'
        else d.frequency
    end,
    case d.frequency
        when 'SEMI_ANNUAL' then 'SEMIANNUAL'
        when 'SPECIAL' then 'IRREGULAR'
        else d.frequency
    end,
    0,
    'LOW',
    'legacy-dividend',
    'USER_ENTERED',
    now()
from dividends d
join stocks s on s.id = d.stock_id
where d.dividend_per_share is not null
on conflict (instrument_key) do nothing;

insert into distribution_events (
    instrument_key,
    ticker,
    instrument_name,
    market,
    currency,
    ex_dividend_date,
    payment_date,
    amount_per_share,
    distribution_type,
    event_status,
    estimate_method,
    estimate_confidence,
    data_status,
    raw_amount_per_share,
    provider,
    source_updated_at
)
select
    upper(s.ticker) || ':' || coalesce(nullif(upper(s.currency), ''), 'KRW') as instrument_key,
    upper(s.ticker),
    s.name,
    case when coalesce(upper(s.currency), 'KRW') = 'KRW' or s.ticker ~ '^[0-9]{5}[0-9A-Z]?$' then 'KR' else 'US' end,
    coalesce(nullif(upper(s.currency), ''), 'KRW'),
    d.ex_dividend_date,
    coalesce(d.payment_date, make_date(extract(year from current_date)::int, coalesce(d.payment_month, 12), 15)),
    d.dividend_per_share,
    case when d.frequency = 'SPECIAL' then 'SPECIAL' else 'REGULAR' end,
    'ESTIMATED',
    'MANUAL',
    'LOW',
    'USER_ENTERED',
    d.dividend_per_share,
    'legacy-dividend',
    now()
from dividends d
join stocks s on s.id = d.stock_id
where d.dividend_per_share is not null
on conflict on constraint uk_distribution_event_identity do nothing;

-- Keep old dividends columns/table for compatibility. Remove them only after the
-- application has operated safely on distribution_events in a later migration.
