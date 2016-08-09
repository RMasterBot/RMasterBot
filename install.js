function Install() {
  this.botToInstall = null;
  this.botType = null;
  this.log = require('npmlog');
  this.countFollowRedirect = 3;
  this.rootFolder = __dirname;
  this.zipFilepath = this.rootFolder + '/_bot.zip';
  this.tempBotFolder = this.rootFolder + '/_bot';
  this.filesCopied = [];
  this.foldersCopied = [];
  this.foldersSupported = ['applications', 'configurations', 'docs', 'jobs', 'models'];

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

    var output = require('fs').createWriteStream(that.zipFilepath);
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
  var fs = require('fs');

  if(fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function(file){
      var currentPath = path + "/" + file;
      if(fs.lstatSync(currentPath).isDirectory()) {
        that.deleteFolderRecursive(currentPath);
      }
      else {
        fs.unlinkSync(currentPath);
      }
    });
    fs.rmdirSync(path);
  }
};

Install.prototype.unzipBot = function(){
  var that = this;
  var fs = require('fs');
  
  require('yauzl').open(this.zipFilepath, {lazyEntries: true}, function(error, zipfile) {
    if (error){
      that.cleanFailedInstall();
      that.stopProcess('Failed open zip: ' + error.toString());
    }

    var foldersCreated = [];
    
    that.log.info('RMasterBot', 'Create temp folder at: ' + that.rootFolder);
    fs.mkdirSync(that.tempBotFolder);
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
            fs.mkdirSync(folderToCreate);
            foldersCreated.push(folderToCreate);
          }

          var filepath = that.tempBotFolder + file.path + '/' + file.file;
          if(file.path === '/') {
            filepath = that.tempBotFolder + file.path + file.file;
          }
          readStream.pipe(fs.createWriteStream(entry.fileName));
          readStream.on("end", function() {
            zipfile.readEntry();
          });
        });
      }
    });
  });
};

Install.prototype.stopProcess = function(exception){
  this.log.error('RMasterBot', exception);
  process.exit(-1);
};

Install.prototype.cleanFailedInstall = function () {
  var fs = require('fs');

  //fs.unlinkSync(this.zipFilepath);
  this.log.error('RMasterBot', 'Delete bot file: ' + this.filesCopied[i]);

  //this.log.error('RMasterBot', 'Delete temp bot folder: ' + this.filesCopied[i]);

  var countFiles = this.filesCopied.length;
  for(var i = 0; i < countFiles; i++) {
    //fs.unlinkSync(this.filesCopied[i]);
    this.log.error('RMasterBot', 'Delete file copied from zip: ' + this.filesCopied[i]);
  }

  var countFolders = this.foldersCopied.length;
  for(var j = 0; j < countFiles; j++) {
    //fs.rmdirSync(this.foldersCopied[j]);
    this.log.error('RMasterBot', 'Delete folder copied from zip: ' + this.foldersCopied[j]);
  }
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

new Install();