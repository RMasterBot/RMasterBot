function Pid() {
  this.log = require('npmlog');
  this.fs = require('fs');

  this.rootFolder = __dirname;
  this.processFolder = this.rootFolder + '/process_ids/';
  this.kill = null;
  this.bot = null;
  this.bots = null;

  this.getBots();
  this.getArguments();
  this.getAllPids();

  if(this.kill === null && this.bot === null) {
    this.listAllProcess();
  }
  else if(this.kill === null && this.bot !== null) {
    this.listSpecificBotProcess();
  }
  else if(this.kill === 'all') {
    if(this.bot !== null) {
      this.killAllProcessSpecificBot();
    }
    else {
      this.killAllProcess();
    }
  }
  else if(this.kill !== null) {
    var pid = this.kill >> 0;
    if(pid != this.kill) {
      this.stopProcess('Pid is invalid');
    }

    if(this.isRunning(this.kill)) {
      if(this.killProcess(this.kill)) {
        this.logInfo('Process ' + this.kill + ' killed');
      }
      else {
        this.logInfo('Process ' + this.kill + ' already killed');
      }
    }
    else {
      this.logInfo('Process ' + this.kill + ' already killed');
    }
  }
  else {
    this.stopProcess('Arguments incorrect');
  }
}

Pid.prototype.getBots = function() {
  if(this.lstatSync(this.rootFolder + '/bots.json') === false) {
    this.stopProcess('No bots installed');
  }
  
  this.bots = JSON.parse(this.fs.readFileSync(this.rootFolder + '/bots.json', 'utf-8'));
};

Pid.prototype.getArguments = function() {
  var countArguments = process.argv.length;
  for(var i = 2; i < countArguments; i++) {
    if(process.argv[i] === '-h' || process.argv[i] === '--help') {
      this.showHelp();
    }
    else if(process.argv[i] === 'kill') {
      i++;
      if(i < countArguments) {
        if(process.argv[i] === '-h' || process.argv[i] === '--help') {
          this.showHelp();
        }
        else {
          this.kill = process.argv[i];
        }
      }
      else {
        this.stopProcess('Missing kill argument');
      }

      i++;
      if(i < countArguments) {
        if(process.argv[i] === '-h' || process.argv[i] === '--help') {
          this.showHelp();
        }
        else {
          this.bot = process.argv[i];
        }
      }
    }
    else {
      this.bot = process.argv[i];
    }
  }
};

Pid.prototype.showHelp = function() {
  require(this.rootFolder + '/helps/pid.js');
  process.exit(1);
};

Pid.prototype.getAllPids = function() {
  var lengthBots = this.bots.length;
  var lengthPids;
  var pidFiles = [];
  var i;
  var j;

  for(i = 0; i < lengthBots; i++) {
    this.bots[i].pids = [];
    pidFiles = this.fs.readdirSync(this.processFolder + this.bots[i].bot_folder + '/');
    lengthPids = pidFiles.length;

    for(j = 0; j < lengthPids; j++) {
      if(this.endsWith(pidFiles[j], '.pid')) {
        var pidId = pidFiles[j].replace('.pid', '');
        if(this.isRunning(pidId)) {
          this.bots[i].pids.push({
            pid: pidId,
            file: this.processFolder + this.bots[i].bot_folder + '/' + pidFiles[j],
            content: this.fs.readFileSync(this.processFolder + this.bots[i].bot_folder + '/' + pidFiles[j], 'utf8')
          });
        }
        else {
          this.fs.unlinkSync(this.processFolder + this.bots[i].bot_folder + '/' + pidFiles[j]);
        }
      }
    }
  }
};

Pid.prototype.listAllProcess = function() {
  var lengthBots = this.bots.length;
  var lengthPids;
  var i;
  var j;

  for(i = 0; i < lengthBots; i++) {
    lengthPids = this.bots[i].pids.length;
    if(lengthPids > 0) {
      if(i > 0) {
        console.log('');
      }
      this.logInfo('Bot: ' + this.bots[i].bot_name);
      this.logInfo("PID\tCONTENT");
      for (j = 0; j < lengthPids; j++) {
        this.logInfo(this.bots[i].pids[j].pid + "\t" + this.bots[i].pids[j].content);
      }
    }
    else {
      if(i > 0) {
        console.log('');
      }
      this.logInfo('Bot: ' + this.bots[i].bot_name);
      this.logInfo('No process');
    }
  }
};

Pid.prototype.listSpecificBotProcess = function() {
  var lengthBots = this.bots.length;
  var lengthPids;
  var i;
  var j;
  var isBotFound = false;

  for(i = 0; i < lengthBots; i++) {
    if(this.bots[i].bot_name.toLowerCase() === this.bot.toLowerCase()) {
      isBotFound = true;
      lengthPids = this.bots[i].pids.length;
      if (lengthPids > 0) {
        this.logInfo("PID\tCONTENT");
        for (j = 0; j < lengthPids; j++) {
          this.logInfo(this.bots[i].pids[j].pid + "\t" + this.bots[i].pids[j].content);
        }
      }
      else {
        this.logInfo('No process');
      }
    }
  }

  if(!isBotFound) {
    this.stopProcess('Bot ' + this.bot + ' not found');
  }
};

Pid.prototype.killAllProcess = function() {
  var lengthBots = this.bots.length;
  var lengthPids;
  var i;
  var j;

  for(i = 0; i < lengthBots; i++) {
    lengthPids = this.bots[i].pids.length;
    if(lengthPids > 0) {
      if(i > 0) {
        console.log('');
      }
      this.logInfo('Bot: ' + this.bots[i].bot_name);
      for (j = 0; j < lengthPids; j++) {
        if(this.isRunning(this.bots[i].pids[j].pid)) {
          if(this.killProcess(this.bots[i].pids[j].pid)) {
            this.logInfo('Process ' + this.bots[i].pids[j].pid + ' killed!');
          }
          else {
            this.logInfo('Process ' + this.bots[i].pids[j].pid + ' not kill');
          }
        }
        else {
          this.logInfo('Process ' + this.bots[i].pids[j].pid + ' already killed');
        }
      }
    }
  }

  this.logInfo('All process for all bots are killed!');
};

Pid.prototype.killAllProcessSpecificBot = function() {
  var lengthBots = this.bots.length;
  var lengthPids;
  var i;
  var j;
  var isBotFound = false;

  for(i = 0; i < lengthBots; i++) {
    lengthPids = this.bots[i].pids.length;
    if(lengthPids > 0) {
      if(this.bots[i].bot_name.toLowerCase() === this.bot.toLowerCase()) {
        isBotFound = true;
        for (j = 0; j < lengthPids; j++) {
          if (this.isRunning(this.bots[i].pids[j].pid)) {
            if (this.killProcess(this.bots[i].pids[j].pid)) {
              this.logInfo('Process ' + this.bots[i].pids[j].pid + ' killed!');
            }
            else {
              this.logInfo('Process ' + this.bots[i].pids[j].pid + ' not kill');
            }
          }
          else {
            this.logInfo('Process ' + this.bots[i].pids[j].pid + ' already killed');
          }
        }
      }
    }
  }

  if(isBotFound) {
    this.logInfo('All process for ' + this.bot + ' are killed!');
  }
  else {
    this.stopProcess('Bot ' + this.bot + ' not found');
  }
};

Pid.prototype.endsWith = function(subject, search) {
  var subString = subject.substr(-search.length);
  return subString === search;
};

Pid.prototype.isRunning = function(pid) {
  try {
    return process.kill(pid, 0);
  }
  catch (e) {
    return e.code === 'EPERM';
  }
};

Pid.prototype.killProcess = function(pid) {
  try {
    return process.kill(pid, 'SIGINT');
  }
  catch (e) {
    return false;
  }
};

Pid.prototype.lstatSync = function(path) {
  try {
    return this.fs.lstatSync(path);
  }
  catch(e){
    return false;
  }
};

Pid.prototype.logInfo = function(string) {
  this.log.info('RMasterBot', string);
};

Pid.prototype.stopProcess = function(exception) {
  this.log.error('RMasterBot', exception);
  process.exit(-1);
};

new Pid();