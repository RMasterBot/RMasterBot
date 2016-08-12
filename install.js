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

  this.logInfo('Bot to install: ' + this.botToInstall);
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

  this.logInfo('Type Bot: ' + this.botType);
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
    }

    if(response.headers['content-type'] !== 'application/zip') {
      that.stopProcess('Content type is incorrect: application/zip needed, server provide ' + response.headers['content-type']);
    }

    that.logInfo('Prepare to download');

    var output = that.fs.createWriteStream(that.zipFilepath);
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
    
    that.logInfo('Create temp folder at: ' + that.rootFolder);
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

          filepath = filepath.toLowerCase();

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
    this.stopProcess('File install.json is missing in bot temp folder');
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

  this.logInfo('Bot Folder: ' + botToInstallJson.bot_folder);
  this.logInfo('Bot Name: ' + botToInstallJson.bot_name);

  if(hasFolderProblem || hasNameProblem) {
    this.resolveConflict(botToInstallJson, hasFolderProblem, hasNameProblem);
  }
  else {
    this.addNewBotToSavedBotsFile(botToInstallJson);
  }
};

Install.prototype.resolveConflict = function(botToInstallJson, hasFolderProblem, hasNameProblem){
  var that = this;
  var botsInstalledJson = JSON.parse(this.fs.readFileSync(this.botsInstalledFile, 'utf8'));
  var len = botsInstalledJson.length;
  var i;
  var hasToAddBot = true;
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdin);

  var foldersTaken = [];
  var namesTaken = [];
  for(i = 0; i < len; i++) {
    foldersTaken.push(botsInstalledJson[i].bot_folder);
    namesTaken.push(botsInstalledJson[i].bot_name);
  }

  function eraseBot() {
    hasToAddBot = false;
    end();
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

      if (that.lstatSync(that.rootFolder + '/applications/' + answer) && that.lstatSync(that.rootFolder + '/applications/' + answer).isDirectory()) {
        console.log('Error, folder ' + answer + ' already exists');
        changeFolder();
        return;
      }

      console.log('New folder is ' + answer);
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
    rl.clearLine(process.stdin);
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

  this.logInfo('New bot "' + botToInstallJson.bot_name + '" is installed in folder "' + botToInstallJson.bot_folder + '"');

  if(botToInstallJson.configuration === undefined) {
    this.logInfo('No configuration to setup');
  }
  else {
    if(this.lstatSync(this.rootFolder + '/configurations/' + botToInstallJson.bot_folder + '/configuration.json') === false) {
      this.launchSetupConfiguration(botToInstallJson, 'create');
    }
    else {
      this.resolveConflictConfiguration(botToInstallJson);
    }
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

Install.prototype.launchSetupConfiguration = function(botToInstallJson, modificationType) {
  if(botToInstallJson.configuration.name === undefined) {
    this.stopProcess('Name missing in configuration file');
  }

  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdin);

  var that = this;
  var i = 0;
  var len = 0;
  var propsKeys = [];
  var propsValues = [];
  var configurationFileJson = [];
  var lenConfs = 0;
  var nameConfTaken = [];

  if(modificationType === 'add') {
    configurationFileJson = JSON.parse(that.fs.readFileSync(that.rootFolder + '/configurations/' + botToInstallJson.bot_folder + '/configuration.json'));
    lenConfs = configurationFileJson.length;
    for(i = 0; i < lenConfs; i++) {
      nameConfTaken.push(lenConfs.name);
    }
  }

  function setConfigurationValue() {
    if(i >= len) {
      end();
      return;
    }

    var question = 'Value for ' + propsKeys[i] + ' ? ';
    if(propsValues[i] === 'array') {
      question = 'Value for ' + propsKeys[i] + ' (separate words with space) ? ';
    }
    
    if(propsKeys[i] === 'name' && modificationType === 'add' && nameConfTaken.length > 0) {
      console.log('List of name already taken: ' + nameConfTaken.join(' , '));
    }
    
    rl.question(question, function(answer){
      if(propsKeys[i] === 'name') {
        answer = answer.trim();
        if(answer.length < 1) {
          console.log('Name is required and must be unique');
          i--;
          setConfigurationValue();
          return;
        }
        else if(nameConfTaken.indexOf(answer) !== -1) {
          console.log('Name must be unique');
          i--;
          setConfigurationValue();
          return;
        }
      }
      
      if(propsValues[i] === 'string') {
        configuration[propsKeys[i]] = answer.trim();
      }
      else if(propsValues[i] === 'array') {
        configuration[propsKeys[i]] = answer.trim().split(' ');
      }
      i++;
      setConfigurationValue();
    });
  }

  var configuration = botToInstallJson.configuration;
  for(var key in botToInstallJson.configuration) {
    if(botToInstallJson.configuration.hasOwnProperty(key)) {
      propsKeys.push(key);
      propsValues.push(botToInstallJson.configuration[key]);
      len++;
    }
  }

  function end() {
    rl.clearLine(process.stdin);
    rl.close();
    configurationFileJson.push(configuration);
    that.fs.writeFileSync(that.rootFolder + '/configurations/' + botToInstallJson.bot_folder + '/configuration.json', JSON.stringify(configurationFileJson), 'utf8');
    that.endInstall();
  }

  function blockReadline() {
    rl.question('You are going to Setup configuration file: are you ready ? (y/n)', function (answer) {
      if (answer === 'y') {
        setConfigurationValue();
      }
      else if (answer === 'n') {
        that.endInstall();
      }
      else {
        blockReadline();
      }
    });
  }
  
  console.log('Setup Configuration');
  blockReadline();
};

Install.prototype.resolveConflictConfiguration = function(botToInstallJson) {
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdin);

  var that = this;

  function ask() {
    rl.question('A configuration file is already present, do you want to erase (e) file or add (a) a configuration or quit (q) ? (e/a/q) ', function (answer) {
      if(answer === 'a') {
        rl.clearLine(process.stdin);
        rl.close();
        that.launchSetupConfiguration(botToInstallJson, 'add');
      }
      else if(answer === 'e') {
        rl.clearLine(process.stdin);
        rl.close();
        that.launchSetupConfiguration(botToInstallJson, 'erase');
      }
      else if(answer === 'q') {
        rl.close();
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
  this.logInfo('Done');
  process.exit(0);
};

Install.prototype.logInfo = function(string) {
  this.log.info('RMasterBot', string);
};

new Install();