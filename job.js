function Job() {
  this.rmasterbot = require('./rmasterbot');
  this.bot = null;
  this.job = null;
  this.listJobsDemanded = false;
  this.arguments = [];

  this.global = {
    app : null,
    user : null,
    output : null
  };

  this.botConfigured = null;

  this.getArguments();
  this.loadBot();
  this.setupPid();
  this.launchJob();
}

Job.prototype.getArguments = function() {
  var countArguments = process.argv.length;
  for(var i = 2; i < countArguments; i++) {
    if(process.argv[i] === '-h' || process.argv[i] === '--help') {
      this.showHelp();
    }
    else if(process.argv[i] === '-o' || process.argv[i] === '--output') {
      this.listJobsDemanded = true;
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
    else if(process.argv[i] === '-o' || process.argv[i] === '--output') {
      i++;
      if(i < countArguments) {
        this.global.output = process.argv[i];
      }
      else {
        this.stopProcess('Missing argument output file');
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

  if(this.listJobsDemanded) {
    this.showListJobs();
  }

  if(this.job === null) {
    this.stopProcess('No job provided');
  }

  this.logInfo('Bot to use: ' + this.bot);
  this.logInfo('Job to use: ' + this.job);
};

Job.prototype.showListJobs = function() {
  process.exit(1);
};

Job.prototype.showHelp = function() {
  if(this.job === null) {
    console.log("\n" + 'Launch Job (dedicated task). It will create a pid file.');

    console.log("\n" + 'Usage:');
    console.log("    " + 'node job <application> <job_name> [options]   launch job given');

    console.log("\n" + 'Options:');
    console.log("    " + 'application             use specific application network');
    console.log("    " + 'job_name                job file to load (see informations below)');
    console.log("    " + 'options                 different depending on job');
    console.log("    " + '-a --app <app_name>     use specific app by using name defined in conf');
    console.log("    " + '-u --user <user_name>   use specific user access_token');
    console.log("    " + '-o --output <filepath>  save the output in a file');
    console.log("    " + '-l --list               list all jobs available');

    console.log("\n" + 'Informations:');
    console.log("    " + 'Job name is filename without .js');
    console.log("    " + 'Folder scan priority is private_jobs then jobs');
  }
  else {
    this.loadBot();
    var content = null;

    var privateJobsFile = this.botConfigured.getPrivateJobFile(this.job);
    var jobsFile = this.botConfigured.getJobFile(this.job);

    if(privateJobsFile !== null) {
      content = require('fs').readFileSync(privateJobsFile, 'utf-8');
    }
    else if(jobsFile !== null) {
      content = require('fs').readFileSync(jobsFile, 'utf-8');
    }
    else {
      console.log('Job not found');
      process.exit(1);
    }

    if(content.substr(0,2) !== '/*') {
      console.log('No doc found for this job');
      process.exit(1);
    }

    var startPos = 2;
    var stopPos = content.indexOf('*/');
    if(stopPos === -1) {
      stopPos = content.length;
    }
    else {
      stopPos = stopPos - startPos;
    }

    console.log(content.substr(startPos, stopPos));
  }

  process.exit(1);
};

Job.prototype.loadBot = function() {
  if(this.global.app !== null) {
    this.logInfo('Application to use: ' + this.global.app);
    this.botConfigured = this.rmasterbot.getBot(this.bot, this.global.app);
  }
  else {
    this.botConfigured = this.rmasterbot.getBot(this.bot);
  }

  if(this.global.user !== null) {
    this.logInfo('User to use: ' + this.global.user);
    this.botConfigured.loadUserAccessTokenByUser(this.global.user);
  }
};

Job.prototype.setupPid = function() {
  var processIdFile = require('path').join(this.botConfigured.processIdsFolder, process.pid + '.pid');

  require('fs').writeFileSync(processIdFile, process.argv.join(' '), 'utf-8');

  process.on('exit', function() {
    require('npmlog').info('RMasterBot', "End");

    try {
      require('fs').unlinkSync(processIdFile);
    } catch (e) {
      //
    }
  });
};

Job.prototype.launchJob = function() {
  var that = this;
  this.rmasterbot.doBotJob(this.botConfigured, this.job, this.arguments, function(error,data){
    if(error) {
      require('npmlog').error('RMasterBot', "ERROR");
      that.treatResult(error);
    }
    else {
      require('npmlog').info('RMasterBot', "SUCCESS");
      that.treatResult(data);
    }
  });
};

Job.prototype.treatResult = function(result) {
  if(this.global.output === null) {
    this.showResult(result);
  }
  else {
    this.saveResult(result);
  }
};

Job.prototype.showResult = function(result) {
  console.log(require('util').inspect(result, false, null, true));
};

Job.prototype.saveResult = function(result) {
  require('fs').writeFileSync(this.global.output, JSON.stringify(result));
};

Job.prototype.isFileExists = function(path) {
  try {
    return require('fs').lstatSync(path);
  }
  catch(e){
    return false;
  }
};

Job.prototype.logInfo = function(string) {
  require('npmlog').info('RMasterBot', string);
};

Job.prototype.stopProcess = function(exception) {
  require('npmlog').error('RMasterBot', exception);
  process.exit(-1);
};

new Job();

/**
 * Job Callback
 * @callback Job~Callback
 * @param {Error|string|null} error - Error
 * @param {*} data - Data
 */