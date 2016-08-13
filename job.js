function Job() {
  this.log = require('npmlog');
  this.fs = require('fs');

  this.bot = null;
  this.job = null;
  this.rootFolder = __dirname;
  this.arguments = [];

  this.global = {
    app : null,
    user : null,
    file : null
  };

  this.jobFile = null;

  this.getArguments();
  this.getBot();
  
  this.logInfo('Search job: ' + this.job);
  
  this.foundPrivateJob();
  this.foundJob();
  this.launchJob();
}

Job.prototype.getArguments = function() {
  var countArguments = process.argv.length;
  for(var i = 2; i < countArguments; i++) {
    if(process.argv[i] === '-h' || process.argv[i] === '--help') {
      this.showHelp();
    }
    else if(process.argv[i] === '-a' || process.argv[i] === '--app') {
      i++;
      if(i < countArguments) {
        this.global.app = process.argv[i];
      }
      else {
        this.stopProcess('Missing argument app');
      }
    }
    else if(process.argv[i] === '-u' || process.argv[i] === '--user') {
      i++;
      if(i < countArguments) {
        this.global.user = process.argv[i];
      }
      else {
        this.stopProcess('Missing argument user');
      }
    }
    else if(process.argv[i] === '-f' || process.argv[i] === '--file') {
      i++;
      if(i < countArguments) {
        this.global.file = process.argv[i];
      }
      else {
        this.stopProcess('Missing argument file');
      }
    }
    else if(this.bot === null) {
      this.bot = process.argv[i];
    }
    else if(this.job === null) {
      this.job = process.argv[i];
    }
    else {
      this.arguments.push(process.argv[i]);
    }
  }

  if(this.bot === null) {
    this.stopProcess('No bot provided');
  }

  if(this.job === null) {
    this.stopProcess('No job provided');
  }

  this.logInfo('Bot to use: ' + this.bot);
  this.logInfo('Job to use: ' + this.job);
};

Job.prototype.showHelp = function() {
  require(__dirname + '/helps/job.js');
  process.exit(1);
};

Job.prototype.getBot = function() {
  if(this.lstatSync(this.rootFolder + '/bots.json') === false) {
    this.stopProcess('No bots installed');
  }

  var bots = JSON.parse(this.fs.readFileSync(this.rootFolder + '/bots.json', 'utf-8'));
  var len = bots.length;
  var i;
  for(i = 0; i < len; i++) {
    if(this.bot.toLowerCase() === bots[i].bot_name.toLowerCase()) {
      this.botFolder = bots[i].bot_folder;
      return;
    }
  }

  this.stopProcess('Bot not found');
};

Job.prototype.foundPrivateJob = function() {
  var privateJobsFolder = this.rootFolder + '/private_jobs/' + this.botFolder + '/';
  var files = this.fs.readdirSync(privateJobsFolder);
  var len = files.length;
  var i;

  for(i = 0; i < len; i++) {
    if(files[i].toLowerCase().replace('.js', '') === this.job.toLowerCase().replace('.js', '')) {
      this.jobFile = privateJobsFolder + files[i];
      break;
    }
  }
};

Job.prototype.foundJob = function() {
  if(this.jobFile !== null) {
    return;
  }

  var jobsFolder = this.rootFolder + '/jobs/' + this.botFolder + '/';
  var files = this.fs.readdirSync(jobsFolder);
  var len = files.length;
  var i;

  for(i = 0; i < len; i++) {
    if(files[i].toLowerCase().replace('.js', '') === this.job.toLowerCase().replace('.js', '')) {
      this.jobFile = jobsFolder + files[i];
      break;
    }
  }
};

Job.prototype.launchJob = function() {
  if(this.jobFile === null) {
    this.stopProcess('Job not found');
  }

  require(this.jobFile);
};

Job.prototype.lstatSync = function(path) {
  try {
    return this.fs.lstatSync(path);
  }
  catch(e){
    return false;
  }
};

Job.prototype.logInfo = function(string) {
  this.log.info('RMasterBot', string);
};

Job.prototype.stopProcess = function(exception) {
  this.log.error('RMasterBot', exception);
  process.exit(-1);
};

new Job();