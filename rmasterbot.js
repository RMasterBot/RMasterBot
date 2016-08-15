function RMasterBot(bot, configuration) {
  this.log = require('npmlog');
  this.fs = require('fs');

  this.bots = [];
  this.botFile = __dirname + '/bots.json';
  this.botSelectedIndex = null;

  this.getBotsInstalled();

  if(bot !== undefined) {
    this.getApplication(bot, configuration);
  }
}

RMasterBot.prototype.getBotsInstalled = function(){
  if(this.lstatSync(this.botFile) === false) {
    this.stopProcess('No Bots installed!');
  }

  this.bots = JSON.parse(this.fs.readFileSync(this.botFile, 'utf-8'));
};

RMasterBot.prototype.getApplication = function(bot, configuration){
  if(this.isBotExist(bot) === false) {
    this.stopProcess('No bot ' + bot + ' found');
  }
};

RMasterBot.prototype.isBotExist = function(bot) {
  var len = this.bots.length;
  var i;

  for(i = 0; i < len; i++) {
    if(this.bots[i].bot_name.toLowerCase() === bot.toLowerCase()) {
      this.botSelectedIndex = i;
      return true;
    }
  }

  return false;
};

RMasterBot.prototype.lstatSync = function(path) {
  try {
    return this.fs.lstatSync(path);
  }
  catch(e){
    return false;
  }
};

RMasterBot.prototype.logInfo = function(string) {
  this.log.info('RMasterBot', string);
};

RMasterBot.prototype.stopProcess = function(exception) {
  this.log.error('RMasterBot', exception);
  process.exit(-1);
};

exports.RMasterBot = RMasterBot;