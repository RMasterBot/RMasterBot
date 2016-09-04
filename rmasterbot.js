function RMasterBot(bot, configuration) {
  this.fs = require('fs');
  this.corePath = __dirname + '/core';

  this.bot = null;
  this.bots = [];
  this.botFile = __dirname + '/bots.json';
  this.botSelectedIndex = null;

  this.loadCore();

  this.getBotsInstalled();

  if(bot !== undefined) {
    this.getBot(bot, configuration);
  }
}

RMasterBot.prototype.loadCore = function(){
  require(this.corePath + '/bot.js');
};

RMasterBot.prototype.getBotsInstalled = function(){
  if(this.lstatSync(this.botFile) === false) {
    throw 'No Bots installed!';
  }

  this.bots = JSON.parse(this.fs.readFileSync(this.botFile, 'utf-8'));
};

RMasterBot.prototype.getBot = function(bot, configuration){
  if(this.isBotExist(bot) === false) {
    throw 'No bot ' + bot + ' found';
  }

  var app = require(__dirname + '/applications/' + this.bots[this.botSelectedIndex].bot_folder + '/test.js');
  this.bot = new app.Toto();
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

module.exports.getBotsInstalled = function getBotsInstalled() {
  return new RMasterBot().bots;
};

module.exports.getAllBots = function getAllBots() {
  var botsInstalled = new RMasterBot().bots;
  var bots = [];
  var i = 0;
  var maxBotsInstalled = botsInstalled.length;

  for(; i < maxBotsInstalled; i++) {
    bots.push(new RMasterBot(botsInstalled[i].bot_name).bot);
  }

  return bots;
};

module.exports.getBot = function getBot(bot, configuration) {
  return new RMasterBot(bot, configuration).bot;
};