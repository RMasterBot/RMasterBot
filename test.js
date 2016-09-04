var rmasterbot = require('./rmasterbot');
// 0/ liste des bots installés
bots = rmasterbot.getBotsInstalled();
  //console.log(bots);
// 0/ tous les bots sans conf
bots = rmasterbot.getAllBots();
  //console.log(bots);
// 1/ le bot sans conf
pinterestBotNoConf = rmasterbot.getBot('pinterest');
//pinterestBotNoConf.setAccessToken('xxx');
pinterestBotNoConf.loadModelUser();
return;
//
pinterestBotNoConf.setConfiguration({
  "key": "xxx",
  "secret": "xxx",
  "access_token": "xxx",
  "scope": "xxx",
  "url": "xxx"
});
pinterestBotWithConf.me(error, data, callback);

// 2/ le bot avec conf
pinterestBotWithConf = rmasterbot.getBot('pinterest', {
  "key": "xxx",
  "secret": "xxx",
  "access_token": "xxx",
  "scope": "xxx",
  "url": "xxx"
});
pinterestBotWithConf.me(error, data, callback);

// 3/ lancer des jobs
rmasterbot.doBotJob('twitter', 'me', extraArguments);
rmasterbot.doBotJob(pinterestBotWithConf, 'me', extraArguments);