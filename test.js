var rmasterbot = require('./rmasterbot');
// 0/ liste des bots installés
//bots = rmasterbot.getBotsInstalled();
  //console.log(bots);
// 0/ tous les bots sans conf
//bots = rmasterbot.getAllBots();
  //console.log(bots);
// 1/ le bot sans conf
pinterestBotNoConf = rmasterbot.getBot('pinterest');
//pinterestBotNoConf.setAccessToken('xxx');
pinterestBotNoConf.me(function (error, user) {
  if(error) {
    pinterestBotNoConf.logPinterestError(error);
    return;
  }

  console.log("getId: " + user.getId());
  console.log("getUsername: " + user.getUsername());
  console.log("getFirstName: " + user.getFirstName());
  console.log("getLastName: " + user.getLastName());
  console.log("getBio: " + user.getBio());
  console.log("getCreatedAt: " + user.getCreatedAt());
  console.log("getTimestamp: " + user.getTimestamp());
  console.log("getLocalTimestamp: " + user.getLocalTimestamp());
  console.log("getCounts: " + require('util').inspect(user.getCounts(), { depth: null }));
  console.log("getCountPins: " + user.getCountPins());
  console.log("getCountFollowing: " + user.getCountFollowing());
  console.log("getCountFollowers: " + user.getCountFollowers());
  console.log("getCountBoards: " + user.getCountBoards());
  console.log("getCountLikes: " + user.getCountLikes());
  console.log("getImage: " + user.getImage());
  console.log("getImages: " + require('util').inspect(user.getImages(), { depth: null }));
  console.log("getImageJson: " + require('util').inspect(user.getImageJson(), { depth: null }));
  console.log("getUrl: " + user.getUrl());
  console.log("getAccountType: " + user.getAccountType());
});
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