function Job(){
  this.log = require('npmlog');

  this.bot = null;
  this.job = null;
  this.arguments = [];

  this.global = {
    app : null,
    user : null,
    file : null
  };

  this.getArguments();
}

Job.prototype.getArguments = function(){
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

Job.prototype.showHelp = function(){
  require(__dirname + '/helps/job.js');
  process.exit(1);
};

Job.prototype.logInfo = function(string) {
  this.log.info('RMasterBot', string);
};

Job.prototype.stopProcess = function(exception){
  this.log.error('RMasterBot', exception);
  process.exit(-1);
};

new Job();