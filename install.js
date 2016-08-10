function Install() {
  this.botToInstall = null;
  this.botType = null;
  this.log = require('npmlog');
  this.fs = require('fs');
  this.countFollowRedirect = 3;
  this.rootFolder = __dirname;
  this.zipFilepath = this.rootFolder + '/_bot.zip';
  this.tempBotFolder = this.rootFolder + '/_bot';
  this.botsInstalledFile = this.rootFolder + '/bots.json';
  this.installFileFromNewBot = this.tempBotFolder + '/install.json';
  this.foldersSupported = ['applications', 'configurations', 'docs', 'jobs', 'models'];
  this.foldersToCreate = ['access_tokens', 'applications', 'configurations', 'docs', 'downloads', 'jobs', 'models', 'private_jobs', 'process_ids', 'rate_limits'];
  this.maxDepthCopyFolder = 3;

  this.getArguments();
  this.detectBotType();
  this.downloadBot();
}

Install.prototype.getArguments = function(){
  var countArguments = process.argv.length;
  for(var i = 2; i < countArguments; i++) {
    if(process.argv[i] === '-h' || process.argv[i] === '--help') {
      this.showHelp();
    }
    else {
      this.botToInstall = process.argv[i];
    }
  }
  
  if(this.botToInstall === null) {
    this.stopProcess('No argument provided');
  }
  
  this.log.info('RMasterBot', 'Bot to install: ' + this.botToInstall);
};

Install.prototype.showHelp = function(){
  require(__dirname + '/helps/install.js');
  process.exit(1);
};

Install.prototype.detectBotType = function() {
  var parts = this.botToInstall.split('/');

  if(this.botToInstall.substring(0, 8) == 'https://') {
    this.botType = 'https';
  }
  else if(this.botToInstall.substring(0, 7) == 'http://') {
    this.botType = 'http';
  }
  else if(parts.length === 2 && parts[1].length > 0) {
    this.botType = 'github';
  }
  else if(parts.length === 1) {
    this.botType = 'RMasterBot'
  }
  else {
    this.stopProcess('Type Bot not detected');
  }

  this.log.info('RMasterBot', 'Type Bot: ' + this.botType);
};

Install.prototype.downloadBot = function(options){
  var that = this;
  if(options === undefined) {
    options = this.getOptions();
  }
  var request = this.getRequest().get(options);

  if(this.countFollowRedirect < 0) {
    this.stopProcess('Too much redirect');
  }

  this.log.info('RMasterBot', 'Retreive from ' + options.host + options.path);

  request.on('response', function(response) {
    if(response.statusCode >= 300 && response.statusCode < 400) {
      that.countFollowRedirect--;
      options = that.updateOptionsWithRedirectUrl(options, response.headers['location']);
      that.log.info('RMasterBot', 'Redirect location to ' + response.headers['location']);
      that.downloadBot(options);
      return;
    }
    else if(response.statusCode >= 400) {
      that.stopProcess('Bot not found or available: ' + response.statusCode);
    }

    if(response.headers['content-type'] !== 'application/zip') {
      that.stopProcess('Content type is incorrect: application/zip needed, server provide ' + response.headers['content-type']);
    }

    that.log.info('RMasterBot', 'Prepare to download');

    var output = that.fs.createWriteStream(that.zipFilepath);
    response.pipe(output);

    response.on('end', function(){
      that.log.info('RMasterBot', 'Download success');
      that.deleteFolderRecursive(that.tempBotFolder);

      that.log.info('RMasterBot', 'Clean temp bot folder: ' + that.tempBotFolder);
      that.unzipBot();
    });
  });
  
  request.on('error', function(error){
    that.stopProcess('Download error: ' + error.toString());
  });

  request.end();
};

Install.prototype.getOptions = function(){
  var host = null;
  var path = null;
  var port = (this.botType == 'http') ? 80 : 443;

  if(this.botType === 'http' || this.botType === 'https') {
    var url = require('url').parse(this.botToInstall);
    host = url.hostname;
    path = url.path;
    if(url.port !== null) {
      port = url.port;
    }
  }
  else if(this.botType === 'github') {
    host = 'github.com';
    path = '/' + this.botToInstall + '/zipball/master';
  }
  else if(this.botType === 'RMasterBot') {
    host = 'github.com';
    path = '/rancoud/R' + this.botToInstall + 'Bot/zipball/master';
  }
  
  return {
    host: host,
    path: path,
    port: port
  };
};

Install.prototype.getRequest = function(){
  if(this.botType == 'http') {
    return require('http');
  }

  return require('https');
};

Install.prototype.updateOptionsWithRedirectUrl = function(options, url){
  var redirectUrl = require('url').parse(url);

  options.host = redirectUrl.hostname;
  options.path = redirectUrl.path;

  if(redirectUrl.port !== null) {
    options.port = null;
  }
  else if(redirectUrl.protocol === 'http:'){
    options.port = 80;
  }
  else if(redirectUrl.protocol === 'https:'){
    options.port = 443;
  }

  return options;
};

Install.prototype.deleteFolderRecursive = function(path) {
  var that = this;
  var files = [];

  if(that.lstatSync(path)) {
    files = that.fs.readdirSync(path);
    files.forEach(function(file){
      var currentPath = path + "/" + file;
      if(that.lstatSync(currentPath).isDirectory()) {
        that.deleteFolderRecursive(currentPath);
      }
      else {
        that.fs.unlinkSync(currentPath);
      }
    });
    that.fs.rmdirSync(path);
  }
};

Install.prototype.unzipBot = function(){
  var that = this;

  require('yauzl').open(this.zipFilepath, {lazyEntries: true}, function(error, zipfile) {
    if (error){
      that.stopProcess('Failed open zip: ' + error.toString());
    }

    var foldersCreated = [];
    var countFilesCopied = 0;
    
    that.log.info('RMasterBot', 'Create temp folder at: ' + that.rootFolder);
    that.fs.mkdirSync(that.tempBotFolder);
    foldersCreated.push(that.tempBotFolder + '/');
    
    zipfile.readEntry();
    zipfile.on('entry', function(entry) {
      if(entry.fileName.charAt(entry.fileName.length-1) === '/') {
        zipfile.readEntry();
      }
      else {
        zipfile.openReadStream(entry, function(err, readStream) {
          if (error){
            that.cleanFailedInstall();
            that.stopProcess('Failed open file in zip: ' + entry.fileName);
          }

          var file = that.extractPathAndFileFromZip(entry.fileName);
          var folderToCreate = that.tempBotFolder + file.path;
          if(foldersCreated.indexOf(folderToCreate) === -1) {
            that.fs.mkdirSync(folderToCreate);
            foldersCreated.push(folderToCreate);
          }

          var filepath = that.tempBotFolder + file.path + '/' + file.file;
          if(file.path === '/') {
            filepath = that.tempBotFolder + file.path + file.file;
          }
          readStream.pipe(that.fs.createWriteStream(filepath));
          readStream.on("end", function() {
            countFilesCopied++;
            zipfile.readEntry();
          });
        });
      }
    });
    zipfile.on('close', function(){
      that.log.info('RMasterBot', countFilesCopied + ' files copied in temp bot folder');
      that.checkInstallJson();
    });
  });
};

Install.prototype.stopProcess = function(exception){
  this.log.error('RMasterBot', exception);
  process.exit(-1);
};

Install.prototype.extractPathAndFileFromZip = function(path) {
  var parts = path.split('/');

  var file = null;
  var finalParts = [];
  var saveParts = false;
  var len = parts.length;
  var countFoldersSupported = this.foldersSupported.length;
  for(var i = 0; i < len; i++) {
    if(saveParts === false) {
      for (var j = 0; j < countFoldersSupported; j++) {
        if (parts[i] === this.foldersSupported[j]) {
          if(i < len - 1) {
            finalParts.push(parts[i]);
          }
          else {
            file = parts[i];
          }
          saveParts = true;
        }
      }
    }
    else {
      if(i < len - 1) {
        finalParts.push(parts[i]);
      }
      else {
        file = parts[i];
      }
    }
  }

  if(file === null) {
    file = parts[len-1];
  }
  
  return {
    path: '/' + finalParts.join('/'),
    file: file
  };
};

Install.prototype.checkInstallJson = function(){
  var botsInstalledJson = null;
  var botToInstallJson = null;

  if(this.lstatSync(this.botsInstalledFile)) {
    botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  }
  else {
    botsInstalledJson = [];
    this.fs.writeFileSync(this.botsInstalledFile, JSON.stringify(botsInstalledJson), 'utf8');
  }

  if(this.lstatSync(this.installFileFromNewBot)) {
    botToInstallJson = JSON.parse(this.fs.readFileSync(this.installFileFromNewBot, 'utf8'));
  }
  else {
    this.stopProcess('file install.json is missing in bot temp folder');
  }

  var hasFolderProblem = false;
  var hasNameProblem = false;
  var i;
  var len = botsInstalledJson.length;
  for(i = 0; i < len; i++) {
    if(botsInstalledJson[i].bot_folder == botToInstallJson.bot_folder) {
      hasFolderProblem = true;
    }

    if(botsInstalledJson[i].bot_name == botToInstallJson.bot_name) {
      hasNameProblem = true;
    }
  }

  if(hasFolderProblem || hasNameProblem) {
    this.resolveConflict(botToInstallJson, hasFolderProblem, hasNameProblem);
  }
  else {
    this.addNewBotToSavedBotsFile(botToInstallJson);
  }
};

Install.prototype.resolveConflict = function(botToInstallJson, hasFolderProblem, hasNameProblem){
  var that = this;
  var readline = require('readline');
  var botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  var len = botsInstalledJson.length;
  var i;
  var hasToAddBot = true;
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function eraseBot() {
    hasToAddBot = false;
    end();
  }

  function changeFolder() {
    rl.question('New folder name ?', function(answer) {
      if(answer.lenght < 1) {
        console.log('Error, incorrect name [a-z 0-9 _ - ] (you give ' + answer + ')');
        changeFolder();
        return;
      }

      if(/^[a-z0-9_-]+$/g.test(answer) === false) {
        console.log('Error, incorrect name [a-z 0-9 _ - ] (you give ' + answer + ')');
        changeFolder();
        return;
      }

      for(var i = 0; i < len; i++) {
        if(botsInstalledJson[i].bot_folder == answer) {
          console.log('Error, folder ' + botsInstalledJson[i].bot_folder + ' already taken');
          changeFolder();
          return;
        }
      }

      if (that.lstatSync(that.rootFolder + '/applications/' + answer) && that.lstatSync(that.rootFolder + '/applications/' + answer).isDirectory()) {
        console.log('Error, folder ' + answer + ' already exists');
        changeFolder();
        return;
      }

      console.log('New folder name is ' + answer);
      botToInstallJson.bot_folder = answer;

      if(hasNameProblem) {
        changeName();
      }
      else {
        end();
      }
    });
  }
  
  function changeName() {
    rl.question('New name ?', function(answer) {
      if(answer.lenght < 1) {
        console.log('Error, incorrect name [a-z A-Z 0-9 _ - ] (you give ' + answer + ')');
        changeName();
        return;
      }

      if(/^[a-z0-9_-]+$/gi.test(answer) === false) {
        console.log('Error, incorrect name [a-z A-Z 0-9 _ - ] (you give ' + answer + ')');
        changeName();
        return;
      }

      for(var i = 0; i < len; i++) {
        if(botsInstalledJson[i].bot_name == answer) {
          console.log('Error, folder ' + botsInstalledJson[i].bot_name + ' already taken');
          changeName();
          return;
        }
      }

      console.log('New name is ' + answer);
      botToInstallJson.bot_name = answer;

      end();
    });
  }
  
  function resolveBot() {
    rl.question('There is conflict with bot folder and bot name, do you want to erase old bot for new bot (e) or change new bot configuration (c) or quit (q) ? (e/c/q) ', function(answer){
      if(answer == 'c') {
        changeFolder();
      }
      else if(answer == 'e') {
        eraseBot();
      }
      else if(answer == 'q') {
        that.stopProcess('Stopped by user');
      }
      else {
        resolveBot();
      }
    });
  }

  function end() {
    rl.close();
    if(hasToAddBot) {
      that.addNewBotToSavedBotsFile(botToInstallJson);
    }
    
    that.copyTempBotToFinalDestination(botToInstallJson);
  }
  
  if(hasFolderProblem && hasNameProblem) {
    resolveBot();
  }
  else if(hasFolderProblem) {
    console.log('There is a conflict with bot folder');
    changeFolder();
  }
  else if(hasNameProblem) {
    console.log('There is a conflict with bot name');
    changeName();
  }
};

Install.prototype.addNewBotToSavedBotsFile = function(botToInstallJson) {
  var botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  botsInstalledJson.push(botToInstallJson);
  this.fs.writeFileSync(this.botsInstalledFile, JSON.stringify(botsInstalledJson), 'utf8');
};

Install.prototype.copyTempBotToFinalDestination = function(botToInstallJson) {
  var len = this.foldersToCreate.length;
  var i;

  for(i = 0; i < len; i++) {
    var folder = this.rootFolder + '/' + this.foldersToCreate[i] + '/' + botToInstallJson.bot_name;
    if (this.lstatSync(folder) === false || this.lstatSync(folder).isDirectory() === false) {
      try {
        this.fs.mkdirSync(folder);
      }
      catch(e) {
        this.stopProcess(e.toString());
      }
    }

    this.copyFilesRecursive(this.tempBotFolder + '/' + this.foldersToCreate[i], folder, 0);
  }
};

Install.prototype.copyFilesRecursive = function(srcPath, destPath, depth) {
  if(depth > this.maxDepthCopyFolder) {
    this.stopProcess('Depth copy folder exceded');
  }
  var that = this;
  var files = [];

  if(that.lstatSync(srcPath)) {
    files = that.fs.readdirSync(srcPath);
    files.forEach(function(file){
      var newSrcPath = srcPath + "/" + file;
      var newDestPath = destPath + "/" + file;
      if(that.lstatSync(newSrcPath).isDirectory()) {
        depth++;

        if (that.lstatSync(newDestPath) === false || that.lstatSync(newDestPath).isDirectory() === false) {
          try {
            that.fs.mkdirSync(newDestPath);
          }
          catch(e) {
            that.stopProcess(e.toString());
          }
        }
        
        that.copyFilesRecursive(newSrcPath, newDestPath, depth);
      }
      else {
        var fileData = that.fs.readFileSync(newSrcPath);
        that.fs.writeFileSync(newDestPath, fileData);
      }
    });
  }
};

Install.prototype.lstatSync = function(path) {
  try {
    return this.fs.lstatSync(path);
  }
  catch(e){
    return false;
  }
};

new Install();