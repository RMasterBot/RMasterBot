function Install() {
  this.sep = require('path').sep;
  this.path = require('path');
  this.isInteractifMode = false;
  this.botToInstall = null;
  this.botType = null;
  this.log = require('npmlog');
  this.fs = require('fs');
  this.countFollowRedirect = 3;
  this.rootFolder = __dirname;
  this.zipFilepath = this.path.join(this.rootFolder, '_bot.zip');
  this.tempBotFolder = this.path.join(this.rootFolder, '_bot');
  this.botsInstalledFile = this.path.join(this.rootFolder, 'bots.json');
  this.installFileFromNewBot = this.path.join(this.tempBotFolder, 'install.json');
  this.nodeModulesFolder = this.getNodeModulesFolder();
  this.foldersSupported = ['applications', 'docs', 'jobs', 'models', 'test'];
  this.foldersToCreate = ['access_tokens', 'applications', 'docs', 'downloads', 'jobs', 'models', 'private_jobs', 'process_ids', 'rate_limits', this.path.join('test', 'bots')];
  this.maxDepthCopyFolder = 3;
  this.botToInstallJson = {};
  this.hasToAddBot = true;
  this.choiceConflictBot = null;
  this.choiceConflictConfiguration = null;
  this.silentMode = false;

  this.getArguments();
}

Install.prototype.getNodeModulesFolder = function() {
  if(this.isStandalone()) {
    return this.rootFolder;
  }

  var _tmp = [];
  var parts = __dirname.split(this.sep);
  for(var idx = 0 ; idx < parts.length-2; idx++) {
    _tmp.push(parts[idx]);
  }
  return _tmp.join(this.sep);
};

Install.prototype.isStandalone = function() {
  return __filename.indexOf('node_modules') === -1;
};

Install.prototype.getArguments = function(){
  var countArguments = process.argv.length;
  var idxArgs = 2;

  for(; idxArgs < countArguments; idxArgs++) {
    if(process.argv[idxArgs] === '-h' || process.argv[idxArgs] === '--help') {
      this.showHelp();
    }
    else if(process.argv[idxArgs] === '-s' || process.argv[idxArgs] === '--silent') {
      this.silentMode = true;
    }
    else {
      this.botToInstall = process.argv[idxArgs];
    }
  }

  if(this.botToInstall === null) {
    this.isInteractifMode = true;
    this.askBotToInstall();
  }
  else {
    this.detectBotType();
    this.logInfo('Bot to install: ' + this.botToInstall);
  }
};

Install.prototype.showHelp = function(){
  console.log("\n" + 'Install bot for RMasterBot.');

  console.log("\n" + 'Usage:');
  console.log("    " + 'install <bot_name>    install a bot from RMasterBot list');
  console.log("    " + 'install <bot_name>    install a bot from RMasterBot list');
  console.log("    " + 'install <url>         install a bot with an url to a zip file');
  //console.log("    " + 'install <filepath>    install a bot with a filepath to a zip');
  console.log("    " + 'install <path>        install a bot with a path to an extracted directory');

  console.log("\n" + 'Arguments:');
  console.log("    " + 'bot_name    bot name from RMasterBot list');
  console.log("    " + 'url         url to a zip file built for RMasterBot OR just github_account_name/repository_name');

  process.exit(1);
};

Install.prototype.askBotToInstall = function() {
  var that = this;
  var question = "To install a bot you can enter:\n";
  question += "  -> the name from RMasterBot list (see the list in README)\n";
  question += "  -> from github like that: github_account_name/repository_name\n";
  question += "  -> an url (http or https)\n";
  question += "  -> a directory containing bot files\n";
  question += "or quit (q)\n";
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdout, 0);

  function releaseReadline() {
    rl.clearLine(process.stdout, 0);
    rl.close();
  }

  function ask(){
    rl.question(question, function(answer){
      if(answer === 'q') {
        releaseReadline();
        that.cleanup();
        that.logInfo('Stopped by user');
        return;
      }

      answer = answer.trim();
      if(answer.length < 1) {
        ask();
      }
      else {
        that.botToInstall = answer;
        if (that.detectBotType() === false) {
          that.logInfo("Type Bot not detected");
          ask();
        }
        else {
          releaseReadline();
          that.downloadBot();
        }
      }
    });
  }

  ask();
};

Install.prototype.detectBotType = function() {
  var parts = this.botToInstall.split('/');
  var supposedPath = this.isFileExists(this.botToInstall);
console.log(this.botToInstall);
  if(this.botToInstall.substring(0, 8) === 'https://') {
    this.botType = 'https';
  }
  else if(this.botToInstall.substring(0, 7) === 'http://') {
    this.botType = 'http';
  }
  else if(parts.length === 2 && parts[1].length > 0) {
    this.botType = 'github';
  }
  else if(supposedPath && supposedPath.isDirectory()){
    this.botType = 'directory';
  }
  else if(parts.length === 1) {
    this.botType = 'RMasterBot'
  }
  else {
    if(!this.isInteractifMode) {
      this.stopProcess('Type Bot not detected');
      return;
    }
    else {
      return false;
    }
  }

  this.logInfo('Type Bot: ' + this.botType);
  if(!this.isInteractifMode) {
    if(this.botType !== 'directory'){
      this.downloadBot();
    }
    else{
      this.tempBotFolder = this.botToInstall;
      this.installFileFromNewBot = this.path.join(this.tempBotFolder, 'install.json');
      this.checkInstallJson();
    }
  }
  else {
    return true;
  }
};

Install.prototype.downloadBot = function(options){
  var that = this;
  var request;
  var output;

  if(options === undefined) {
    options = this.getOptions();
  }
  request = this.getRequest().get(options);

  if(this.countFollowRedirect < 0) {
    this.stopProcess('Too much redirect');
    return;
  }

  this.logInfo('Retreive from ' + options.host + options.path);

  request.on('response', function(response) {
    if(response.statusCode >= 300 && response.statusCode < 400) {
      that.countFollowRedirect--;
      options = that.updateOptionsWithRedirectUrl(options, response.headers['location']);
      that.logInfo('Redirect location to ' + response.headers['location']);
      that.downloadBot(options);
      return;
    }
    else if(response.statusCode >= 400) {
      that.stopProcess('Bot not found or available: ' + response.statusCode);
      return;
    }

    if(response.headers['content-type'] !== 'application/zip') {
      that.stopProcess('Content type is incorrect: application/zip needed, server provide ' + response.headers['content-type']);
      return;
    }

    that.logInfo('Prepare to download');

    output = that.fs.createWriteStream(that.zipFilepath);
    response.pipe(output);

    response.on('end', function(){
      that.logInfo('Download success');
      that.deleteFolderRecursive(that.tempBotFolder);

      that.logInfo('Clean temp bot folder: ' + that.tempBotFolder);
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
  var port = (this.botType === 'http') ? 80 : 443;
  var url;

  if(this.botType === 'http' || this.botType === 'https') {
    url = require('url').parse(this.botToInstall);
    host = url.hostname;
    path = url.path;
    if(url.port) {
      port = url.port;
    }
  }
  else if(this.botType === 'github') {
    host = 'github.com';
    path = '/' + this.botToInstall + '/zipball/master';
  }
  else if(this.botType === 'RMasterBot') {
    host = 'github.com';
    path = '/RMasterBot/RMB' + this.botToInstall + '/zipball/master';
  }

  return {
    host: host,
    path: path,
    port: port
  };
};

Install.prototype.getRequest = function(){
  if(this.botType === 'http') {
    return require('http');
  }

  return require('https');
};

Install.prototype.updateOptionsWithRedirectUrl = function(options, url){
  var redirectUrl = require('url').parse(url);

  options.host = redirectUrl.hostname;
  options.path = redirectUrl.path;

  if(redirectUrl.port) {
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
  var currentPath;

  if(that.isFileExists(path)) {
    files = that.fs.readdirSync(path);
    files.forEach(function(file){
      currentPath = path + "/" + file;
      if(that.isFileExists(currentPath).isDirectory()) {
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
  var foldersCreated = [];
  var countFilesCopied = 0;
  var file;
  var folderToCreate;
  var filepath;
  var basepath = that.tempBotFolder + that.sep;

  require('yauzl').open(this.zipFilepath, {lazyEntries: true}, function(error, zipfile) {
    if(error) {
      that.stopProcess('Failed open zip: ' + error.toString());
      return;
    }

    that.logInfo('Create temp folder at: ' + that.tempBotFolder);
    that.fs.mkdirSync(that.tempBotFolder);
    foldersCreated.push(basepath);

    zipfile.readEntry();

    zipfile.on('entry', function(entry) {
      if(entry.fileName.charAt(entry.fileName.length-1) === '/') {
        zipfile.readEntry();
      }
      else {
        zipfile.openReadStream(entry, function(error, readStream) {
          if(error) {
            that.stopProcess('Failed open file in zip: ' + entry.fileName);
            return;
          }

          file = that.extractPathAndFileFromZip(entry.fileName);
          folderToCreate = that.path.join(that.tempBotFolder, file.path);
          if(foldersCreated.indexOf(folderToCreate) === -1) {
            var parts = folderToCreate.replace(basepath, '').split(that.sep);
            for(var i = 0; i < parts.length; i++) {
              var parentFolderToCreate = that.path.join(basepath, parts.slice(0,i+1).join(that.sep));
              try {
                that.fs.mkdirSync(parentFolderToCreate);
              }
              catch(e) {
                //
              }
            }
            foldersCreated.push(folderToCreate);
          }

          filepath = that.path.join(that.tempBotFolder, file.path, file.file);
          if(file.path === '/') {
            filepath = that.path.join(that.tempBotFolder, file.path, file.file);
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
      that.logInfo(countFilesCopied + ' files copied in temp bot folder');
      that.checkInstallJson();
    });
  });
};

Install.prototype.extractPathAndFileFromZip = function(path) {
  var file = null;
  var finalParts = [];
  var saveParts = false;
  var parts = path.split('/');
  var countParts = parts.length;
  var idxParts = 0;
  var countFoldersSupported = this.foldersSupported.length;
  var idxFoldersSupported;

  for(; idxParts < countParts; idxParts++) {
    if(saveParts === false) {
      for (idxFoldersSupported = 0; idxFoldersSupported < countFoldersSupported; idxFoldersSupported++) {
        if (parts[idxParts] === this.foldersSupported[idxFoldersSupported]) {
          if(idxParts < countParts - 1) {
            finalParts.push(parts[idxParts]);
          }
          else {
            file = parts[idxParts];
          }
          saveParts = true;
        }
      }
    }
    else {
      if(idxParts < countParts - 1) {
        finalParts.push(parts[idxParts]);
      }
      else {
        file = parts[idxParts];
      }
    }
  }

  if(file === null) {
    file = parts[countParts-1];
  }

  return {
    path: '/' + finalParts.join('/'),
    file: file
  };
};

Install.prototype.checkInstallJson = function(){
  var botsInstalledJson = null;
  var hasFolderProblem = false;
  var hasNameProblem = false;
  var idxBotsInstalled = 0;
  var countBotsInstalled;

  if(this.isFileExists(this.botsInstalledFile)) {
    botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  }
  else {
    botsInstalledJson = [];
    this.fs.writeFileSync(this.botsInstalledFile, JSON.stringify(botsInstalledJson), 'utf8');
  }

  if(this.isFileExists(this.installFileFromNewBot)) {
    this.botToInstallJson = JSON.parse(this.fs.readFileSync(this.installFileFromNewBot, 'utf8'));
  }
  else {
    this.stopProcess('File install.json is missing in bot temp folder');
    return;
  }

  countBotsInstalled = botsInstalledJson.length;
  for(; idxBotsInstalled < countBotsInstalled; idxBotsInstalled++) {
    if(botsInstalledJson[idxBotsInstalled].bot_folder === this.botToInstallJson.bot_folder) {
      hasFolderProblem = true;
    }

    if(botsInstalledJson[idxBotsInstalled].bot_name === this.botToInstallJson.bot_name) {
      hasNameProblem = true;
    }
  }

  this.logInfo('Bot Folder: ' + this.botToInstallJson.bot_folder);
  this.logInfo('Bot Name: ' + this.botToInstallJson.bot_name);

  if(hasFolderProblem || hasNameProblem) {
    if(this.silentMode === false){
      this.resolveConflict(hasFolderProblem, hasNameProblem);
    }
    else{
      this.stopProcess('Conflict found in silent mode');
    }
  }
  else {
    this.copyTempBotToFinalDestination();
  }
};

Install.prototype.resolveConflict = function(hasFolderProblem, hasNameProblem){
  var that = this;
  var botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  var countBotsInstalled = botsInstalledJson.length;
  var idxBotsInstalled = 0;
  var foldersTaken = [];
  var namesTaken = [];
  var question;
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdout, 0);

  for(; idxBotsInstalled < countBotsInstalled; idxBotsInstalled++) {
    foldersTaken.push(botsInstalledJson[idxBotsInstalled].bot_folder);
    namesTaken.push(botsInstalledJson[idxBotsInstalled].bot_name);
  }

  function eraseBot() {
    that.hasToAddBot = false;
    releaseReadline();
    that.copyTempBotToFinalDestination();
  }

  function changeFolder() {
    console.log('List of folder already taken: ' + foldersTaken.join(' , '));
    rl.question('New folder ? ', function(answer) {
      if(answer.length < 1) {
        console.log('Error, incorrect folder [a-z 0-9 _ - ] (you give ' + answer + ')');
        changeFolder();
        return;
      }

      if(/^[a-z0-9_-]+$/g.test(answer) === false) {
        console.log('Error, incorrect folder [a-z 0-9 _ - ] (you give ' + answer + ')');
        changeFolder();
        return;
      }

      if(foldersTaken.indexOf(answer) !== -1) {
        console.log('Error, folder ' + answer + ' already taken');
        changeFolder();
        return;
      }

      if (that.isFileExists(that.rootFolder + '/applications/' + answer) && that.isFileExists(that.rootFolder + '/applications/' + answer).isDirectory()) {
        console.log('Error, folder ' + answer + ' already exists');
        changeFolder();
        return;
      }

      console.log('New folder is ' + answer);
      that.botToInstallJson.bot_folder = answer;

      if(hasNameProblem) {
        changeName();
      }
      else {
        releaseReadline();
        that.copyTempBotToFinalDestination();
      }
    });
  }
  
  function changeName() {
    console.log('List of name already taken: ' + namesTaken.join(' , '));
    rl.question('New name ? ', function(answer) {
      if(answer.length < 1) {
        console.log('Error, incorrect name [a-z A-Z 0-9 _ - ] (you give ' + answer + ')');
        changeName();
        return;
      }

      if(/^[a-z0-9_-]+$/gi.test(answer) === false) {
        console.log('Error, incorrect name [a-z A-Z 0-9 _ - ] (you give ' + answer + ')');
        changeName();
        return;
      }

      if(namesTaken.indexOf(answer) !== -1) {
        console.log('Error, name ' + answer + ' already taken');
        changeName();
        return;
      }

      console.log('New name is ' + answer);
      that.botToInstallJson.bot_name = answer;

      releaseReadline();
      that.copyTempBotToFinalDestination();
    });
  }
  
  function resolveBot() {
    question = "There is conflict with bot folder and bot name, what do you want to do:\n";
    question+= "  -> erase old bot with new bot (e)\n";
    question+= "  -> change name and/or folder of new bot (c)\n";
    question+= "  -> quit (q)\n";
    rl.question(question, function(answer){
      if(answer === 'c') {
        that.choiceConflictBot = 'change';
        changeFolder();
      }
      else if(answer === 'e') {
        that.choiceConflictBot = 'erase';
        eraseBot();
      }
      else if(answer === 'q') {
        that.cleanup();
        that.logInfo('Stopped by user');
        releaseReadline();
      }
      else {
        resolveBot();
      }
    });
  }

  function releaseReadline() {
    rl.clearLine(process.stdout, 0);
    rl.close();
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
  else {
    releaseReadline();
    that.copyTempBotToFinalDestination();
  }
};

Install.prototype.addBotToSavedBotsFile = function() {
  if(this.hasToAddBot) {
    this.addNewBotToSavedBotsFile();
  }
  else {
    if(this.choiceConflictConfiguration === 'add') {
      this.addNewConfigurationToSavedBotsFile();
    }
    else {
      this.eraseWithNewConfigurationToSavedBotsFile();
    }
  }
};

Install.prototype.addNewBotToSavedBotsFile = function() {
  var botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));

  this.botToInstallJson.configurations = [];
  this.botToInstallJson.configurations.push(this.botToInstallJson.configuration);
  delete this.botToInstallJson.configuration;

  botsInstalledJson.push(this.botToInstallJson);
  this.fs.writeFileSync(this.botsInstalledFile, JSON.stringify(botsInstalledJson), 'utf8');
};

Install.prototype.addNewConfigurationToSavedBotsFile = function() {
  var idxBots = 0;
  var botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  var countBots = botsInstalledJson.length;

  for(; idxBots < countBots; idxBots++) {
    if(botsInstalledJson[idxBots].bot_name === this.botToInstallJson.bot_name) {
      botsInstalledJson[idxBots].configurations.push(this.botToInstallJson.configuration);
    }
  }

  this.fs.writeFileSync(this.botsInstalledFile, JSON.stringify(botsInstalledJson), 'utf8');
};

Install.prototype.eraseWithNewConfigurationToSavedBotsFile = function() {
  var idxBots = 0;
  var botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  var countBots = botsInstalledJson.length;

  for(; idxBots < countBots; idxBots++) {
    if(botsInstalledJson[idxBots].bot_name === this.botToInstallJson.bot_name) {
      botsInstalledJson[idxBots].configurations = [];
      botsInstalledJson[idxBots].configurations.push(this.botToInstallJson.configuration);
    }
  }

  this.fs.writeFileSync(this.botsInstalledFile, JSON.stringify(botsInstalledJson), 'utf8');
};

Install.prototype.copyTempBotToFinalDestination = function() {
  var countFoldersToCreate = this.foldersToCreate.length;
  var idxFoldersToCreate = 0;
  var folder;
  var unitTestFolder = this.path.join('test','bots');

  for(; idxFoldersToCreate < countFoldersToCreate; idxFoldersToCreate++) {
    folder = this.path.join(this.rootFolder, this.foldersToCreate[idxFoldersToCreate], this.botToInstallJson.bot_name);
    if (this.isFileExists(folder) === false || this.isFileExists(folder).isDirectory() === false) {
      try {
        this.fs.mkdirSync(folder);
      }
      catch(e) {
        this.stopProcess(e.toString());
        return;
      }
    }

    if(this.foldersToCreate[idxFoldersToCreate] === unitTestFolder) {
      this.copyFilesRecursive(this.path.join(this.tempBotFolder, 'test'), folder, 0);
    }
    else {
      this.copyFilesRecursive(this.path.join(this.tempBotFolder, this.foldersToCreate[idxFoldersToCreate]), folder, 0);
    }
  }

  this.logInfo('New bot "' + this.botToInstallJson.bot_name + '" is installed in folder "' + this.botToInstallJson.bot_folder + '"');

  if(this.botToInstallJson.configuration === undefined) {
    this.logInfo('No configuration to setup');
    this.addBotToSavedBotsFile();
  }
  else {
    this.copyInstallJson();
    if(this.choiceConflictBot === 'erase') {
      this.resolveConflictConfiguration();
    }
    else {
      if(this.silentMode === false){
        this.launchSetupConfiguration('add');
      }
      else{
        this.addNewBotToSavedBotsFile();
        this.endInstall();
      }
    }
  }
};

Install.prototype.copyFilesRecursive = function(srcPath, destPath, depth) {
  var that = this;
  var files = [];
  var newSrcPath;
  var newDestPath;
  var fileContent;

  if(depth > this.maxDepthCopyFolder) {
    this.stopProcess('Depth copy folder exceded');
    return;
  }

  if(that.isFileExists(srcPath)) {
    files = that.fs.readdirSync(srcPath);
    files.forEach(function(file){
      newSrcPath = srcPath + "/" + file;
      newDestPath = destPath + "/" + file;

      if(that.isFileExists(newSrcPath).isDirectory()) {
        depth++;

        if (that.isFileExists(newDestPath) === false || that.isFileExists(newDestPath).isDirectory() === false) {
          try {
            that.fs.mkdirSync(newDestPath);
          }
          catch(e) {
            that.stopProcess(e.toString());
            return;
          }
        }

        that.copyFilesRecursive(newSrcPath, newDestPath, depth);
      }
      else {
        fileContent = that.fs.readFileSync(newSrcPath, 'utf8');
        that.fs.writeFileSync(newDestPath, fileContent);
      }
    });
  }
};

Install.prototype.copyInstallJson = function() {
  var fileContent = this.fs.readFileSync(this.installFileFromNewBot, 'utf8');
  this.fs.writeFileSync(this.path.join(this.rootFolder, 'installs', this.botToInstallJson.bot_name + '.json'), fileContent);
};

Install.prototype.launchPackageJson = function() {
  var spawn = require('cross-spawn');
  var packages;

  if(this.botToInstallJson.packages !== undefined && this.botToInstallJson.packages.length > 0) {
    var args = ['install'];
    args = args.concat(this.botToInstallJson.packages);

    this.logInfo('Install packages "' + this.botToInstallJson.packages.join(' ') + '"');
    spawn.sync('npm', args, { cwd : this.nodeModulesFolder, stdio: 'inherit' });
  }
};

Install.prototype.launchSetupConfiguration = function(modificationType) {
  var that = this;
  var idxGlobal = 0;
  var len = 0;
  var propsKeys = [];
  var propsValues = [];
  var botsInstalledFileJson = [];
  var countBotsInstalled;
  var configurationNameTaken = [];
  var idxConfigurationNames;
  var configuration;
  var question;
  var key;
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdout, 0);

  if(this.botToInstallJson.configuration.name === undefined) {
    this.stopProcess('Name missing in configuration file');
    return;
  }

  if(modificationType === 'add') {
    botsInstalledFileJson = JSON.parse(that.fs.readFileSync(this.botsInstalledFile, 'utf8'));
    countBotsInstalled = botsInstalledFileJson.length;
    for(idxGlobal = 0; idxGlobal < countBotsInstalled; idxGlobal++) {
      if(this.botToInstallJson.bot_name === botsInstalledFileJson[idxGlobal].bot_name) {
        for(idxConfigurationNames = 0; idxConfigurationNames < botsInstalledFileJson[idxGlobal].configurations.length; idxConfigurationNames++) {
          configurationNameTaken.push(botsInstalledFileJson[idxGlobal].configurations[idxConfigurationNames].name);
        }
      }
    }
  }
  idxGlobal = 0;

  function setConfigurationValue() {
    if(idxGlobal >= len) {
      end();
      return;
    }

    question = 'Value for ' + propsKeys[idxGlobal] + ' ? ';
    if(propsValues[idxGlobal] === 'array') {
      question = 'Value for ' + propsKeys[idxGlobal] + ' (separate words with space) ? ';
    }
    
    if(propsKeys[idxGlobal] === 'name' && modificationType === 'add' && configurationNameTaken.length > 0) {
      console.log('List of name already taken: ' + configurationNameTaken.join(' , '));
    }
    
    rl.question(question, function(answer){
      if(propsKeys[idxGlobal] === 'name') {
        answer = answer.trim();
        if(answer.length < 1) {
          console.log('Name is required and must be unique');
          setConfigurationValue();
          return;
        }
        else if(configurationNameTaken.indexOf(answer) !== -1) {
          console.log('Name must be unique');
          setConfigurationValue();
          return;
        }
      }

      if(answer === "string" || answer === "array") {
        setConfigurationValue();
        return;
      }

      if(propsValues[idxGlobal] === 'string') {
        configuration[propsKeys[idxGlobal]] = answer.trim();
      }
      else if(propsValues[idxGlobal] === 'array') {
        configuration[propsKeys[idxGlobal]] = answer.trim().split(' ');
      }
      idxGlobal++;
      setConfigurationValue();
    });
  }

  configuration = this.botToInstallJson.configuration;
  for(key in this.botToInstallJson.configuration) {
    if(this.botToInstallJson.configuration.hasOwnProperty(key)) {
      propsKeys.push(key);
      propsValues.push(this.botToInstallJson.configuration[key]);
      len++;
    }
  }

  function releaseReadline() {
    rl.clearLine(process.stdout, 0);
    rl.close();
  }

  function end() {
    if(configuration.name === "string") {
      idxGlobal = 0;
      setConfigurationValue();
      return;
    }

    releaseReadline();

    that.addBotToSavedBotsFile();

    that.endInstall();
  }

  console.log('Setup Configuration');
  setConfigurationValue();
};

Install.prototype.resolveConflictConfiguration = function() {
  var that = this;
  var question;
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdout, 0);

  function releaseReadline() {
    rl.clearLine(process.stdout, 0);
    rl.close();
  }

  function ask() {
    question = "A configuration is already setted, what do you want to do:\n";
    question+= "  -> erase (e)\n";
    question+= "  -> add (a)\n";
    question+= "  -> quit (q)\n";
    rl.question(question, function (answer) {
      if(answer === 'a') {
        releaseReadline();
        that.choiceConflictConfiguration = 'add';
        that.launchSetupConfiguration('add');
      }
      else if(answer === 'e') {
        releaseReadline();
        that.choiceConflictConfiguration = 'erase';
        that.launchSetupConfiguration('erase');
      }
      else if(answer === 'q') {
        releaseReadline();
        that.endInstall();
      }
      else {
        ask();
      }
    });
  }

  ask();
};

Install.prototype.endInstall = function() {
  this.launchPackageJson();
  this.cleanup();
  this.logInfo('Done');
};

Install.prototype.isFileExists = function(path) {
  try {
    return this.fs.lstatSync(path);
  }
  catch(e){
    return false;
  }
};

Install.prototype.logInfo = function(string) {
  this.log.info('RMasterBot', string);
};

Install.prototype.stopProcess = function(exitMessage){
  this.cleanup();
  this.log.error('RMasterBot', exitMessage);
};

Install.prototype.cleanup = function() {
  if(this.botType === 'directory'){
    return true;
  }

  this.deleteFolderRecursive(this.tempBotFolder);
  if (this.isFileExists(this.zipFilepath)) {
    this.fs.unlinkSync(this.zipFilepath);
  }
};

new Install();