package com.example.StockFolio.util;

import com.example.StockFolio.entity.Stock;

public final class DistributionInstrumentKeys {

    private DistributionInstrumentKeys() {
    }

    public static String from(Stock stock) {
        return from(stock.getTicker(), stock.getCurrency());
    }

    public static String from(String ticker, String currency) {
        String normalizedTicker = ticker == null ? "UNKNOWN" : ticker.trim().toUpperCase();
        String normalizedCurrency = currency == null || currency.isBlank() ? "KRW" : currency.trim().toUpperCase();
        return normalizedTicker + ":" + normalizedCurrency;
    }

    public static String tickerFromKey(String instrumentKey) {
        if (instrumentKey == null || instrumentKey.isBlank()) return "";
        int separator = instrumentKey.indexOf(':');
        return separator >= 0 ? instrumentKey.substring(0, separator) : instrumentKey;
    }
}
