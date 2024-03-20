const ccxt = require ('ccxt').pro;
const { createClient } = require('redis');

(async () => {

  const client = createClient({
    host: 'localhost',
    port: 6379,
    password: 'password'
  })
  await client.connect()
  const redisBaseKey = 'price:'


  const exchange = new ccxt.bybit({ enableRateLimit: true })
  while (true) {
    const tickers = await exchange.watchTickers([ 'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOGE/USDT', 'MATIC/USDT','LTC/USDT', 'LINK/USDT','TRX/USDT','RUNE/USDT','AAVE/USDT'])
    // const tickers = await exchange.watchTickers(['USDT/EUR', 'PAXG/USDT'])
    const stableCoins = {}
    const timestamp = new Date().getTime()
    const expiryTimestamp = timestamp + 15 // 15 seconds
    const tickersData = { ...tickers, ...stableCoins }
    // console.log('tickersData', tickersData)
    for (let symbol in tickersData) {
      let price = tickersData[symbol].info.lastPrice
      let priceChangePercent24h = tickersData[symbol].info.price24hPcnt * 100
      
      if (symbol === 'USDT/EUR') {
        price = (1 / price).toFixed (4)
        symbol = 'EUR/USDT'
      }

      symbol =  symbol.replace ('/', ':')
      const key = redisBaseKey + symbol
      client.hSet(key,{
        Price: price,
        CreatedAt: timestamp,
        ExpireAt: expiryTimestamp,
        PriceChangePercent24h: priceChangePercent24h
      })

      // publish to redis on price change topic
      
      
      // console.log (timestamp, expiryTimestamp, symbol, price)
      client.publish('price-change', 'price changed')
    }


  }

}) ()