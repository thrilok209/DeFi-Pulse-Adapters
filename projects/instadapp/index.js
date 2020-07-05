/*==================================================
  Modules
  ==================================================*/

  const _ = require('underscore');
  const sdk = require('../../sdk');
  const BigNumber = require("bignumber.js");


/*==================================================
  Settings
  ==================================================*/

  const addressV2 = '0x498b3BfaBE9F73db90D252bCD4Fa9548Cd0Fd981';
  const dsaIndexAddress = '0x2971AdFa57b20E5a416aE5a708A8655A9c74f723';

  const tokens = [
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x57ab1ec28d129707052df4df418d58a2d46d5f51', // sUSD
    '0x0d8775f648430679a709e98d2b0cb6250d2887ef', // BAT
    '0x1985365e9f78359a9B6AD760e32412f4a445E862', // REP
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', // MKR
    '0xdd974d5c2e2928dea5f71b9825b8b646686bd200', // KNC
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    '0xe41d2489571d322189246dafa5ebde1f4699f498', // ZRX
    '0x0000000000085d4780B73119b644AE5ecd22b376', // TUSD
    '0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6', // sBTC
    '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D', // renBTc
  ];
/*==================================================
  TVL
  ==================================================*/
  async function tokenBalance(dsaWallets, block) {
    let tokenBalances = {}
    let calls = [];

    let ethBalResult = await sdk.api.eth.getBalances({
      targets: dsaWallets,
      block: block
    });

    let ethToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
    tokenBalances[ethToken] = BigNumber(0);
    _.map(ethBalResult.output, (result) => {
      tokenBalances[ethToken] = BigNumber(
        tokenBalances[ethToken]
      ).plus(result.balance).toFixed();
    });

    _.each(dsaWallets , (wallet) => {
      _.each(tokens, (token) => {
        calls.push({
          target: token,
          params: wallet
        })
      })
    });
    let results = await sdk.api.abi.multiCall({
      calls: calls,
      abi: 'erc20:balanceOf',
      block: block 
    });

    sdk.util.sumMultiBalanceOf(tokenBalances, results);
    return tokenBalances;
  }

  async function tvl(timestamp, block) {
    let smartWallets = (await sdk.api.util.getLogs({
      target: addressV2,
      topic: 'Created(address,address,address)',
      decodeParameter: 'address',
      fromBlock: 7523220,
      toBlock: block
    })).output;

    let dsaEvents = (await sdk.api.util.getLogs({
      target: dsaIndexAddress,
      topic: 'LogAccountCreated(address,address,address,address)',
      keys: ['topics'],
      fromBlock: 9747240,
      toBlock: block
    }));

    let dsaWallets = _.map(dsaEvents.output, (event) => {
      return `0x${event[2].slice(26)}`
    });

    let allWallets = smartWallets.concat(dsaWallets);
    
    let balances = await tokenBalance(dsaWallets, block);
    return {
      tlv: (await sdk.api.cdp.getAssetsLocked({
        block,
        targets: allWallets
      })).output,
      balances: balances
    };
  }

/*==================================================
  Exports
  ==================================================*/

  module.exports = {
    name: 'InstaDApp',
    token: null,
    category: 'lending',
    contributesTo: ['Maker', 'Compound'],
    start: 1543622400,  // 12/01/2018 @ 12:00am (UTC)
    tvl,
  };
