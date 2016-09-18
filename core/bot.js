var Request = require(__dirname + '/request.js');

function Bot(name, folder, allConfigurations){
  this.name = name || '';
  this.folder = folder || '';

  this.allConfigurations = allConfigurations || [];
  this.currentConfiguration = {};
  this.accessToken = {};

  this.accessTokensFolder = __dirname + '/../access_tokens/' + this.folder + '/';
  this.rateLimitsFolder = __dirname + '/../rate_limits/' + this.folder + '/';
  this.modelsFolder =  __dirname + '/../models/' + this.folder + '/';

  this.useModels = true;

  this.maxAttemptsForDownload = 3;
  this.delayBeforeNewAttemptDownload = 1000;

  this.remainingRequest = 100;
  this.remainingTime = 60*60;
}

Bot.prototype = new Request();
Bot.prototype.constructor = Bot;

Bot.prototype.getName = function() {
  return this.name;
};

Bot.prototype.setName = function(name) {
  this.name = name;
};

Bot.prototype.getFolder = function() {
  return this.folder;
};

Bot.prototype.setFolder = function(folder) {
  this.folder = folder;
};

Bot.prototype.getCurrentConfigurationName = function() {
  return this.currentConfiguration.name || "";
};

Bot.prototype.setCurrentConfiguration = function(configuration) {
  this.currentConfiguration = configuration;
};

Bot.prototype.getCurrentConfiguration = function() {
  return this.currentConfiguration;
};

Bot.prototype.setAllConfigurations = function(configurations) {
  this.allConfigurations = configurations;
};

Bot.prototype.getAllConfigurations = function(configurations) {
  return this.allConfigurations;
};

Bot.prototype.useConfigurationByName = function(configurationName) {
  var i = 0;
  var countConfigurations = this.allConfigurations.length;

  for(; i < countConfigurations; i++) {
    if(this.allConfigurations[i].name == configurationName) {
      this.currentConfiguration = this.allConfigurations[i];
      return;
    }
  }

  throw this.RError('BOT-001', "Configuration named %s is not found", configurationName);
};

Bot.prototype.getUserAccessTokenFile = function(user) {
  var filepath = this.accessTokensFolder + user + '.tok';
  var fileContent;

  if(this.isFileExist(filepath)) {
    return JSON.parse(require('fs').readFileSync(filepath));
  }
  else {
    throw this.RError('BOT-002', "Access Token File not found for user %s", user);
  }
};

Bot.prototype.loadUserAccessToken = function(user) {
  var accessTokens = this.getUserAccessTokenFile(user);
  if(accessTokens.length > 0) {
    this.accessToken = accessTokens[0];
  }
  else {
    throw this.RError('BOT-003', "Access Token empty for user %s", user);
  }
};

Bot.prototype.loadUserAccessTokenCompatible = function(user) {
  var accessTokens = this.getUserAccessTokenFile(user);
  var idx = 0;
  var countAccessToken = accessTokens.length;
  if(countAccessToken < 1) {
    throw this.RError('BOT-003', "Access Token empty for user %s", user);
  }

  if(this.currentConfiguration.name === undefined) {
    throw this.RError('BOT-004', "Configuration name is undefined");
  }

  for(; idx < countAccessToken; idx++) {
    if(accessTokens[idx].configuration_name === this.currentConfiguration.name) {
      this.accessToken = accessTokens[idx];
      return;
    }
  }

  throw this.RError('BOT-005', "Access Token incompatible for user %s and configuration %s", user, this.currentConfiguration.name);
};

Bot.prototype.enableModels = function() {
  this.useModels = true;
};

Bot.prototype.disableModels = function() {
  this.useModels = false;
};

Bot.prototype.setAccessToken = function(accessToken) {
  this.accessToken = accessToken;
};

Bot.prototype.getAuthorizeCodeUrl = function() {
  throw this.RError('BOT-006', "Implement getAuthorizeCodeUrl");
};

Bot.prototype.getAccessTokenByUrl = function(code, callback) {
  throw this.RError('BOT-007', "Implement getAccessTokenByUrl");
};

Bot.prototype.isUserAccessTokenCompatibleWithCurrentConfiguration = function (user) {
  var accessTokens = this.getUserAccessTokenFile(user);
  var idx = 0;
  var countAccessToken = accessTokens.length;
  if(countAccessToken < 1) {
    return false;
  }

  if(this.currentConfiguration.name === undefined) {
    return false;
  }

  for(; idx < countAccessToken; idx++) {
    if(accessTokens[idx].configuration_name === this.currentConfiguration.name) {
      return true;
    }
  }

  return false;
};

Bot.prototype.isAccessTokenSetted = function () {
  return Object.keys(this.accessToken).length > 0;
};

Bot.prototype.download = function(url, destination, callback, countAttempt) {
  var that = this;
  var wrapper;
  var file;
  var request;

  if(url.substr(0,5) === "https") {
    wrapper = require('https');
  }
  else if(url.substr(0,4) === "http") {
    wrapper = require('http');
  }
  else {
    callback('Download only http or https ressource');
    return;
  }

  countAttempt = countAttempt || 0;

  file = require('fs').createWriteStream(destination);
  request = wrapper.get(url, function(response) {
    if(response.statusCode >= 400) {
      countAttempt++;

      if(countAttempt > that.maxAttemptsForDownload) {
        callback('Download failed for ' + url);
        return;
      }

      setTimeout(function(){
        that.download(url, destination, callback, countAttempt);
      }, that.delayBeforeNewAttemptDownload);

      return;
    }

    response.pipe(file);

    file.on('finish', function() {
      file.close(callback);
    });

  }).on('error', function(error) {
    require('fs').unlink(destination);

    if (callback) {
      callback(error.message);
    }
  });
};

// todo
Bot.prototype.updateRateLimit = function(remainingRateLimit) {
  var rateLimitApp = getRateLimitByName(this.getAppName());

  if(globalUser !== undefined && rateLimitApp[globalUser] !== undefined) {
    rateLimitApp[globalUser]['last_access'] = new Date().getTime();
    rateLimitApp[globalUser]['remaining'] = parseInt(remainingRateLimit);

    saveRateLimitByName(this.getAppName(), JSON.stringify(rateLimitApp));
  }
};

// todo / implement
Bot.prototype.getClientRateLimit = function(client, callback) {
  var appRateLimit = {};
  var lastAccess = new Date().getTime();

  fs.readdirSync(__dirname + '/../oauth_access_cache/').forEach(function(file) {
    if(file.match(/\.tok$/) !== null) {
      var user = file.replace('.tok', '');
      var tokenJson = JSON.parse(fs.readFileSync(this.rateLimitsFolder + user + '.tok'));
      for (var i = 0; i < tokenJson.length; i++) {
        if(tokenJson[i].app_name === client.getAppName()) {
          appRateLimit[user] = {"last_access": lastAccess, "remaining": this.remainingRequest};
        }
      }
    }
  });

  callback(appRateLimit);
};

// todo / implement
Bot.prototype.getRateLimitByName = function(name, forceRefresh) {
  // search in folder rate_limit_cache
  var rateLimitJson = null;

  if(forceRefresh !== undefined && forceRefresh === true) {
    return rateLimitJson;
  }

  try {
    var rateLimitFileStats = require('fs').statSync(this.rateLimitsFolder + name + '.json');
    var _date = new Date();
    _date.setSeconds(_date.getSeconds() - this.remainingTime);
    // if file is still fresh, we can read and return it
    if(rateLimitFileStats.mtime.getTime() > _date.getTime()) {
      rateLimitJson = require('fs').readFileSync(this.rateLimitsFolder + name + '.json', 'utf8');
      rateLimitJson = JSON.parse(rateLimitJson);
    }
  } catch (e) {
    //
  }

  return rateLimitJson;
};

// todo / implement
Bot.prototype.saveRateLimitByName = function(name, data) {
  require('fs').writeFileSync(this.rateLimitsFolder + name + '.json', JSON.stringify(data), 'utf8');
};

Bot.prototype.isFileExist = function(filepath) {
  try {
    return require('fs').lstatSync(filepath);
  }
  catch(e){
    return false;
  }
};

Bot.prototype.RError = function (code, message, file, lineNumber) {
  var _RError = require(__dirname + '/rerror.js');
  return new _RError(code, message, file, lineNumber);
};

module.exports = Bot;