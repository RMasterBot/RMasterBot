function RMasterBot(botName, configuration) {
  this.bot = null;
  this.bots = [];
  this.botsFile = __dirname + '/bots.json';
  this.botSelectedIndex = null;

  this.getBotsInstalled();

  if(botName !== undefined) {
    this.createBot(botName, configuration);
  }
}

RMasterBot.prototype.getBot = function(){
  return this.bot;
};

RMasterBot.prototype.getBots = function(){
  return this.bots;
};

RMasterBot.prototype.getBotsInstalled = function(){
  if(this.lstatSync(this.botsFile) === false) {
    throw module.exports.RError('RMB-001', 'No Bots installed!');
  }

  this.bots = JSON.parse(require('fs').readFileSync(this.botsFile, 'utf-8'));
};

RMasterBot.prototype.createBot = function(botName, configuration){
  if(this.isBotExist(botName) === false) {
    throw module.exports.RError('RMB-002', 'Bot %s not found', botName);
  }

  var bot = require(__dirname + '/applications/' + this.bots[this.botSelectedIndex].bot_folder + '/main.js');
  this.bot = new bot(
    this.bots[this.botSelectedIndex].bot_name,
    this.bots[this.botSelectedIndex].bot_folder,
    this.bots[this.botSelectedIndex].configurations
  );

  if(typeof configuration === 'string') {
    this.bot.useConfigurationByName(configuration);
  }
  else if(configuration !== undefined){
    this.bot.setCurrentConfiguration(configuration);
  }
};

RMasterBot.prototype.isBotExist = function(botName) {
  var len = this.bots.length;
  var i;

  for(i = 0; i < len; i++) {
    if(this.bots[i].bot_name.toLowerCase() === botName.toLowerCase()) {
      this.botSelectedIndex = i;
      return true;
    }
  }

  return false;
};

RMasterBot.prototype.lstatSync = function(path) {
  try {
    return require('fs').lstatSync(path);
  }
  catch(e){
    return false;
  }
};

module.exports.getBotsInstalled = function getBotsInstalled() {
  return new RMasterBot().getBots();
};

module.exports.getAllBots = function getAllBots() {
  var botsInstalled = new RMasterBot().getBots();
  var bots = [];
  var i = 0;
  var maxBotsInstalled = botsInstalled.length;

  for(; i < maxBotsInstalled; i++) {
    var tmp = {};
    tmp[botsInstalled[i].bot_name] = new RMasterBot(botsInstalled[i].bot_name).getBot();
    bots.push(tmp);
  }

  return bots;
};

module.exports.getBot = function getBot(bot, configuration) {
  return new RMasterBot(bot, configuration).getBot();
};

module.exports.doBotJob = function doBotJob(bot, job, args, callback) {
  if(typeof bot === 'string') {
    bot = new RMasterBot(bot).getBot();
  }

  var jobFile = bot.getPrivateJobFile(job);
  if(jobFile === null) {
    jobFile = bot.getJobFile(job);
  }

  if(jobFile === null) {
    throw module.exports.RError('RMB-003', 'Job %s for Bot %s not found', job, bot.getName());
  }

  require(jobFile)(bot, args, callback);
};

module.exports.RError = function RError(code, message, file, lineNumber) {
  var _RError = require(__dirname + '/core/rerror.js');
  return new _RError(code, message, file, lineNumber);
};