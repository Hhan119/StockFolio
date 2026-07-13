import json
import sys
from datetime import datetime, timedelta


def as_float(value):
    try:
        if value is None:
            return 0
        return round(float(value), 2)
    except Exception:
        return 0


def search_kr(keyword):
    from pykrx import stock

    today = datetime.now().strftime("%Y%m%d")
    results = []
    keyword_lower = keyword.lower()

    tickers = stock.get_market_ticker_list(today, market="ALL")
    for ticker in tickers:
        name = stock.get_market_ticker_name(ticker)
        if keyword_lower in ticker.lower() or keyword_lower in name.lower():
            quote = quote_kr(ticker)
            results.append({
                "market": "KR",
                "ticker": ticker,
                "name": name,
                "currency": "KRW",
                "exchange": "KRX",
                "currentPrice": quote.get("currentPrice", 0),
                "dividendAvailable": False,
            })
        if len(results) >= 30:
            break

    if len(results) < 30:
        for ticker in get_etf_tickers(today):
            name = get_etf_name(ticker)
            if keyword_lower in ticker.lower() or keyword_lower in name.lower():
                quote = quote_kr(ticker)
                results.append({
                    "market": "KR",
                    "ticker": ticker,
                    "name": name,
                    "currency": "KRW",
                    "exchange": "KRX ETF",
                    "currentPrice": quote.get("currentPrice", 0),
                    "dividendAvailable": False,
                })
            if len(results) >= 30:
                break
    return results


def get_etf_tickers(today):
    from pykrx import stock

    try:
        return stock.get_etf_ticker_list(today)
    except Exception:
        return []


def get_etf_name(ticker):
    from pykrx import stock

    try:
        return stock.get_etf_ticker_name(ticker)
    except Exception:
        return ticker


def find_close_column(frame):
    for column in ["\uc885\uac00", "Close", "close"]:
        if column in frame.columns:
            return column
    return frame.columns[3] if len(frame.columns) > 3 else frame.columns[-1]


def quote_kr(ticker):
    from pykrx import stock

    end = datetime.now()
    start = end - timedelta(days=14)
    try:
        name = stock.get_market_ticker_name(ticker)
    except Exception:
        name = get_etf_name(ticker)
    source = "pykrx"
    try:
        frame = stock.get_market_ohlcv_by_date(start.strftime("%Y%m%d"), end.strftime("%Y%m%d"), ticker)
    except Exception:
        frame = None

    if frame is None or frame.empty:
        try:
            frame = stock.get_etf_ohlcv_by_date(start.strftime("%Y%m%d"), end.strftime("%Y%m%d"), ticker)
            name = get_etf_name(ticker)
            source = "pykrx-etf"
        except Exception:
            frame = None

    if frame is None or frame.empty:
        return {
            "market": "KR",
            "ticker": ticker,
            "name": name or get_etf_name(ticker),
            "currency": "KRW",
            "currentPrice": 0,
            "previousClose": 0,
            "changeRate": 0,
            "source": source,
        }

    close = frame[find_close_column(frame)].dropna()
    current = as_float(close.iloc[-1]) if len(close) else 0
    previous = as_float(close.iloc[-2]) if len(close) > 1 else current
    change_rate = round(((current - previous) / previous) * 100, 2) if previous else 0
    return {
        "market": "KR",
        "ticker": ticker,
        "name": name,
        "currency": "KRW",
        "currentPrice": current,
        "previousClose": previous,
        "changeRate": change_rate,
        "source": source,
    }


def etf_holdings_kr(ticker):
    from pykrx import stock

    frame = None
    for days_ago in range(0, 10):
        date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y%m%d")
        try:
            candidate = stock.get_etf_portfolio_deposit_file(ticker, date)
            if candidate is not None and not candidate.empty:
                frame = candidate
                break
        except Exception:
            continue

    if frame is None or frame.empty:
        return []

    def row_number(row, names):
        for name in names:
            if name in row.index:
                return as_float(row[name])
        return 0

    holdings = []
    for holding_ticker, row in frame.iterrows():
        code = str(holding_ticker)
        try:
            name = stock.get_market_ticker_name(code) if code.isdigit() else code
        except Exception:
            name = code
        holdings.append({
            "ticker": code,
            "name": name or code,
            "weight": row_number(row, ["비중", "weight", "Weight"]),
            "shares": row_number(row, ["계약수", "수량", "shares", "Shares"]),
            "marketValue": row_number(row, ["금액", "평가금액", "marketValue", "MarketValue"]),
            "source": "pykrx-etf-holdings",
        })
    holdings.sort(key=lambda item: item.get("weight", 0), reverse=True)
    return holdings[:100]


def search_us(keyword):
    import yfinance as yf

    try:
        search = yf.Search(keyword, max_results=30)
        quotes = search.quotes or []
    except Exception:
        quotes = []
    results = []
    for item in quotes[:30]:
        symbol = item.get("symbol")
        if not symbol or "." in symbol:
            continue
        name = item.get("shortname") or item.get("longname") or symbol
        quote = quote_us(symbol)
        results.append({
            "market": "US",
            "ticker": symbol,
            "name": name,
            "currency": quote.get("currency", "USD"),
            "exchange": item.get("exchange") or item.get("exchDisp") or "US",
            "currentPrice": quote.get("currentPrice", 0),
            "dividendAvailable": False,
        })
    return results


def quote_us(ticker):
    import yfinance as yf

    fast_info = yf.Ticker(ticker).fast_info
    current = as_float(getattr(fast_info, "last_price", None) or fast_info.get("last_price"))
    previous = as_float(getattr(fast_info, "previous_close", None) or fast_info.get("previous_close"))
    currency = getattr(fast_info, "currency", None) or fast_info.get("currency") or "USD"
    change_rate = round(((current - previous) / previous) * 100, 2) if previous else 0
    return {
        "market": "US",
        "ticker": ticker.upper(),
        "name": ticker.upper(),
        "currency": currency,
        "currentPrice": current,
        "previousClose": previous,
        "changeRate": change_rate,
        "source": "yfinance",
    }


def main():
    action, market, value = sys.argv[1], sys.argv[2].upper(), sys.argv[3]
    if action == "search":
        result = search_kr(value) if market == "KR" else search_us(value)
    elif action == "quote":
        result = quote_kr(value) if market == "KR" else quote_us(value)
    elif action == "etf_holdings":
        result = etf_holdings_kr(value) if market == "KR" else []
    else:
        raise ValueError("Unknown action")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
