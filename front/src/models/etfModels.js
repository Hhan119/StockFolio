/**
 * Current project is JavaScript-based. These JSDoc typedefs mirror the planned
 * TypeScript model boundary so the ETF area can migrate to TS without changing
 * page-level data contracts.
 *
 * @typedef {Object} DataSourceMetadata
 * @property {string} asOf
 * @property {string} source
 * @property {boolean} delayed
 * @property {boolean} mock
 * @property {string} currency
 *
 * @typedef {Object} EtfIdentity
 * @property {string} slug
 * @property {string} ticker
 * @property {string} name
 * @property {string} provider
 * @property {string} market
 * @property {string} listingRegion
 * @property {string} category
 * @property {string} indexName
 * @property {string} strategy
 *
 * @typedef {Object} EtfQuote
 * @property {number|null} currentPrice
 * @property {number|null} change
 * @property {number|null} changeRate
 * @property {string} currency
 * @property {DataSourceMetadata} metadata
 *
 * @typedef {Object} EtfSummary
 * @property {string} beginnerDescription
 * @property {string} investsIn
 * @property {string} returnSource
 * @property {string[]} advantages
 * @property {string[]} cautions
 * @property {string[]} suitableGoals
 * @property {string[]} needsReviewGoals
 *
 * @typedef {Object} EtfDistribution
 * @property {number|null} ttmDistributionRate
 * @property {number|null} latestDistribution
 * @property {number|null} ttmDistributionAmount
 * @property {string} frequency
 * @property {{date: string, confirmed: boolean}} nextExDate
 * @property {{date: string, confirmed: boolean}} nextPayDate
 * @property {Array<{date: string, amount: number, confirmed: boolean}>} history
 * @property {number|null} distributionCagr3y
 * @property {number|null} distributionCagr5y
 *
 * @typedef {Object} EtfPerformance
 * @property {{oneMonth: number|null, threeMonth: number|null, oneYear: number|null, threeYear: number|null, fiveYear: number|null}} totalReturn
 * @property {{oneMonth: number|null, threeMonth: number|null, oneYear: number|null, threeYear: number|null, fiveYear: number|null}} priceReturn
 * @property {{oneYear: number|null, threeYear: number|null, fiveYear: number|null}} distributionReturn
 * @property {Array<{period: string, etf: number, index: number, categoryAverage: number}>} series
 *
 * @typedef {Object} EtfRisk
 * @property {number|null} volatility
 * @property {number|null} maxDrawdown
 * @property {number|null} beta
 * @property {number|null} standardDeviation
 * @property {number|null} trackingError
 * @property {number|null} premiumDiscount
 * @property {number|null} averageVolume
 * @property {number|null} bidAskSpread
 * @property {string[]} badges
 *
 * @typedef {Object} EtfCost
 * @property {number|null} expenseRatio
 * @property {{oneMillion: number|null, tenMillion: number|null, hundredMillion: number|null}} annualCost
 *
 * @typedef {Object} EtfHolding
 * @property {string} name
 * @property {string} ticker
 * @property {number|null} weight
 *
 * @typedef {Object} EtfAllocation
 * @property {string} label
 * @property {number|null} weight
 *
 * @typedef {Object} EtfRankingItem
 * @property {string} ticker
 * @property {string} name
 * @property {number|null} ttmDistributionRate
 * @property {number|null} totalReturn1y
 * @property {number|null} expenseRatio
 * @property {number|null} aum
 */

export {};
