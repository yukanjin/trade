const axios = require('axios')
// const dbConnection = require('./mysql/index')
// const utils = require('./mysql/utils')

// var data = []
// // 历史数据 TODO: 从数据库读取
// const init = async () => {
//     // data = await utils.fetchAndStoreStockData('sh000001', '240', '10000')
//     data = await axios.get(`http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=sh000001&scale=240&ma=15&datalen=1000`);
//     //   const response = await axios.get(`https://api.biyingapi.com/hszbl/fsjy/${stockCode}/1d/biyinglicence`);

//     // const response = await get_price(stockCode)
//     const stockData = response.data;
// } 

// 上穿均线
const crossUp = () => {
    return tradeInfo.previous.ma_price30 >= tradeInfo.previous.close && tradeInfo.current.ma_price30 < tradeInfo.current.close
}
// 下破均线
const crossDown = () => {
    return tradeInfo.previous.ma_price30 <= tradeInfo.previous.close && tradeInfo.current.ma_price30 > tradeInfo.current.close
}



let tradeInfo = {}

let wallet = {
    deposit: 10000, // 入金总额
    balance: 10000, // 账户余额
    firstBalence: 10000, //期初账户余额
    holdBalence: 0, // 持有余额
    avilableBalence: 10000, // 可用余额
    holdAmount: 0, // 头寸
    buyCount: 0,
    sellCount1:0,
    sellCount2:0,
    sellCount21:0,
    sellCount22:0,
    sellCount3:0,
    sellCount4:0,

}

// 市场特征值
let marketState = {
    direction: 0, // 0:rise, 1: fall
    MaDirection: 0,  // 0:rise, 1: fall
    location: 0, // 0: higher, 1: lower
}

// 买入，修改账户信息
const triggerBuy = () => {
    if (wallet.holdAmount !== 0) {
        // console.log('已有持仓，不处理')
        return
    }
    wallet.buyCount++
    // 持有期间最高值：买入时将买入价格设置成最高值，运行期间跟最新日k最高值做对比
    tradeInfo.max = tradeInfo.current.close
    tradeInfo.buyWorth = tradeInfo.current.close

    // 按市价计算钱包数据
    wallet.holdAmount = Math.floor(wallet.balance / tradeInfo.buyWorth)
    wallet.holdBalence = wallet.holdAmount * tradeInfo.buyWorth
    wallet.avilableBalence = wallet.balance - wallet.holdBalence
    wallet.firstBalence = wallet.balance
    // console.log(`${tradeInfo.current.day}, ${tradeInfo.buyWorth}买入,当前账户余额${wallet.balance}, 买入${wallet.holdAmount}份, 当前可用${wallet.avilableBalence}`)
}

// 卖出，修改账户信息，计算收益率
const triggerSell = (num = 0) => {
    if (wallet.holdAmount === 0) {
        // console.log('当前空仓，不处理')
        return
    }
    tradeInfo.sellWorth = tradeInfo.current.close
    
    wallet.avilableBalence = wallet.avilableBalence + wallet.holdAmount * tradeInfo.sellWorth
    wallet.balance = wallet.avilableBalence
    wallet.holdBalence = 0
    wallet.holdAmount = 0

    if (num === 2) {
        // console.log(tradeInfo.sellWorth -  tradeInfo.buyWorth)
        tradeInfo.sellWorth > tradeInfo.buyWorth ? wallet.sellCount21++ : wallet.sellCount22++
    }
    // console.log(`${tradeInfo.current.day},${tradeInfo.sellWorth}卖出,当前账户余额${wallet.balance},当前可用${wallet.avilableBalence}`)
}


const summary = {
    winCount: 0,
    lossCount: 0,
    win: 0
}

axios.get('http://api.biyingapi.com/hslt/list/biyinglicence').then(res => {
    for(let i = 0;i<=60;i++) {
       setTimeout(() => {
        main(res.data[i].jys, res.data[i].dm)
       }, i * 1000 * (Math.random() + 1)) 
    }
})

const main = async (jys, dm) => {
    // 历史数据 TODO: 从数据库读取
    // var data = await utils.fetchAndStoreStockData('sh000001', '240', '10000')
    wallet = {
        deposit: 10000, // 入金总额
        balance: 10000, // 账户余额
        firstBalence: 10000, //期初账户余额
        holdBalence: 0, // 持有余额
        avilableBalence: 10000, // 可用余额
        holdAmount: 0, // 头寸
        buyCount: 0,
        sellCount1:0,
        sellCount2:0,
        sellCount21:0,
        sellCount22:0,
        sellCount3:0,
        sellCount4:0,
    
    }
    var response = await axios.get(`http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${jys}${dm}&scale=240&ma=30&datalen=2000`);
    var data = response.data
    if (data) {
        for (let i = 0; i < data.length; i++) {
            if (i > 55) {
                // 初始化新一日数据
                tradeInfo.current = data[i]
                tradeInfo.previous = data[i - 1]
                // 持有期间最高值：买入时将买入价格设置成最高值，运行期间跟最新日k最高值做对比
                tradeInfo.max = Math.max(tradeInfo.max, tradeInfo.current.high)
                marketState.direction = tradeInfo.current.close - tradeInfo.previous.close > 0 ? 0 : 1
                marketState.MaDirection = tradeInfo.current.ma_price30 - tradeInfo.previous.ma_price30 > 0 ? 0 : 1
    
    
                // if (tradeInfo.current.day === '2023-03-30') {
                //     console.log('xx')
                // }
    
                // 更新账户信息: 根据现价和持有头寸调整持有金额和账户余额
                wallet.holdBalence = wallet.holdAmount * tradeInfo.current.close
                wallet.balance = wallet.holdBalence + wallet.avilableBalence
    
                crossUp() && (marketState.location = 0)
                crossDown() && (marketState.location = 1)
    
                // 唯一独立信号买点
                if (crossUp() && marketState.MaDirection === 0) {
                    triggerBuy()
    
                } else {
    
                    // 卖点信号
                    // 1:最低止损： 总仓位亏损1%，止损
                    if (wallet.balance / wallet.firstBalence < 0.99) {
                        // wallet.holdAmount && console.log('最低止损') 
                        wallet.holdAmount &&wallet.sellCount1++ 
                        triggerSell()
                    }
                    // 2:次低止损: 跌破均线止损
                    if (marketState.location === 1) {
                        // wallet.holdAmount && console.log('次低止损')
                        wallet.holdAmount &&wallet.sellCount2++ 
                        triggerSell(2)
                    }
        
                    // 3:移动止损：最高点回撤30%
                    // 根据账户最高涨幅设置回撤比例
                    const tempMaxRate = (tradeInfo.max - tradeInfo.buyWorth) / tradeInfo.buyWorth * 100
                    const tempBackRate = tradeInfo.max > tradeInfo.buyWorth ? (tradeInfo.max - tradeInfo.current.close) / (tradeInfo.max - tradeInfo.buyWorth) * 100 : 0
                    const tempWinRate = (tradeInfo.current.close - tradeInfo.buyWorth) / tradeInfo.buyWorth * 100
                    // console.log(`当天回撤${tradeInfo.max} ${tradeInfo.current.close} ${tradeInfo.buyWorth}`)
                    if (tempMaxRate < 2) {
                        // console.log('不调整止损')
                    } else if (tempMaxRate < 5) {
                        // 最大浮盈5%以内, 按定值回撤止损
                        if (tempWinRate + 2 < tempMaxRate) {
                            // wallet.holdAmount &&  console.log('浮盈超过5%，回撤超2%卖出')
                            wallet.holdAmount && wallet.sellCount3++ 
                            triggerSell()
                        }
                    } else {
                        if (tempBackRate > 50) {
                            // wallet.holdAmount && console.log("固定30%回撤止损")
                            wallet.holdAmount && wallet.sellCount4++ 
                            triggerSell()
                        }
                    }
                }
    
    
            }
    
        }
        if (wallet.balance > 10000) {
            summary.winCount++
        } else {
            summary.lossCount++
        }
        summary.singleWin = wallet.balance - 10000
        summary.win = summary.win + wallet.balance - 10000
        console.log(summary)
        
    }
}

// main()

