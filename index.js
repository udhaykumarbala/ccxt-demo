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
  let allAssets = [ 'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOGE/USDT', 'LTC/USDT', 'LINK/USDT','TRX/USDT','RUNE/USDT','AAVE/USDT'];
  let secondaryCheckAssets = [];
  while (true) {
    let tickers = {}
    // tickers = await exchange.watchTickers(['USDT/EUR', 'PAXG/USDT']).catch((e) => {
    tickers = await exchange.watchTickers(allAssets).catch((e) => {
      // add error causing asset to secondaryCheckAssets
      asset = e.message.split(' ').pop()
      allAssets = allAssets.filter(a => a !== asset)
      secondaryCheckAssets.push(asset)
      let timeNowIndia = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
      console.log(timeNowIndia,'Error in watchTickers', e)
    })
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
        priceChangePercent24h = priceChangePercent24h * -1
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
      
      timeNowIndia = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
      // console.log (timeNowIndia, expiryTimestamp, symbol, price)
    }

    // check if secondaryCheckAssets has any assets 
    if (secondaryCheckAssets.length > 0) {
      // get price from binance
      const binance = new ccxt.binance({ enableRateLimit: true })
      const secondaryCheckAssetsPrice = await binance.fetchTicker(secondaryCheckAssets).catch((e) => {
      
      let timeNowIndia = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
      console.log(timeNowIndia,'Error in fetchTicker', e)
    })

    // set price in redis
    for (let symbol in secondaryCheckAssetsPrice) {
      let price = secondaryCheckAssetsPrice[symbol].last
      let priceChangePercent24h = secondaryCheckAssetsPrice[symbol].percentage
      symbol = symbol.replace ('/', ':')
      const key = redisBaseKey + symbol
      client.hSet(key,{
        Price: price,
        CreatedAt: timestamp,
        ExpireAt: expiryTimestamp,
        PriceChangePercent24h: priceChangePercent24h
      })
    }


   

    timeNowIndia = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});

    // console.log ("binance", timeNowIndia, expiryTimestamp, 'MATIC:USDT', price)
    
  }

  client.hSet('price:MATIC/USDT',{
    Price: 0.4042,
    CreatedAt: timestamp,
    ExpireAt: expiryTimestamp,
    PriceChangePercent24h: 0
  })

  client.publish('price-change', 'price changed')
  }
})()