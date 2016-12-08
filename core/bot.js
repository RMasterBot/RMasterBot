var Request = require(__dirname + '/request.js');

/**
 * Abstract Bot
 * @class Bot
 * @augments Request
 * @param {string} name
 * @param {string} folder
 * @param {Object} allConfigurations
 * @constructor
 */
function Bot(name, folder, allConfigurations){
  /**
   * Name of the bot
   * @property {string}
   */
  this.name = name || '';
  /**
   * Folder of the bot
   * @property {string}
   */
  this.folder = folder || '';

  this.allConfigurations = allConfigurations || [];
  this.currentConfiguration = {};
  this.accessToken = {};

  this.accessTokensFolder = __dirname + '/../access_tokens/' + this.folder + '/';
  this.rateLimitsFolder = __dirname + '/../rate_limits/' + this.folder + '/';
  this.modelsFolder = __dirname + '/../models/' + this.folder + '/';
  this.privateJobsFolder = __dirname + '/../private_jobs/' + this.folder + '/';
  this.jobsFolder = __dirname + '/../jobs/' + this.folder + '/';
  this.processIdsFolder = __dirname + '/../process_ids/' + this.folder + '/';
  this.docsFolder = __dirname + '/../docs/' + this.folder + '/';

  this.models = {};
  this.useModels = true;
  if(this.folder.length > 0) {
    this.loadModels();
  }

  this.maxAttemptsForDownload = 3;
  this.delayBeforeNewAttemptDownload = 1000;

  this.defaultRemainingRequest = 100;
  this.defaultRemainingTime = 60*60;
  this.verifyRemainingRequestsBeforeCall = true;
  this.verifyAccessTokenScopesBeforeCall = true;
  this.scopeSeparator = ',';

  this.convertLastAccessInMilliseconds = true;
  this.standalone = this.isStandalone();
}

Bot.prototype = new Request();
Bot.prototype.constructor = Bot;

Bot.prototype.isStandalone = function() {
  return module.id.indexOf('node_modules') === -1;
};

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

Bot.prototype.getAllConfigurations = function() {
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

Bot.prototype.getUserAccessTokenFileByUser = function(user) {
  if(this.currentConfiguration.name === undefined) {
    throw this.RError('BOT-xxx', "Configuration is empty");
  }

  var filepath = this.accessTokensFolder + this.currentConfiguration.name + '.json';
  var fileContent;
  var idxAccessToken = 0;
  var countAccessToken;

  if(this.isFileExist(filepath)) {
    fileContent = JSON.parse(require('fs').readFileSync(filepath));
    countAccessToken = fileContent.length;

    for (; idxAccessToken < countAccessToken; idxAccessToken++) {
      if(user == fileContent[idxAccessToken].user) {
        return fileContent[idxAccessToken];
      }
    }

    throw this.RError('BOT-002', "Access Token File not found for user %s", user);
  }
  else {
    throw this.RError('BOT-002', "Access Token File not found for user %s", user);
  }
};

Bot.prototype.loadUserAccessTokenByUser = function(user) {
  this.accessToken = this.getUserAccessTokenFileByUser(user);
};

Bot.prototype.getCurrentAccessToken = function() {
  return this.accessToken.access_token;
};

Bot.prototype.setCurrentAccessToken = function(accessToken) {
  this.accessToken.access_token = accessToken;
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

/**
 * Get url for Access Token when you have to authorize an application
 * @param {string} scopes
 * @return {string} url
 */
Bot.prototype.getAccessTokenUrl = function(scopes) {
  throw this.RError('BOT-006', "Implement getAccessTokenUrl");
};

Bot.prototype.extractResponseDataForAccessToken = function(req) {
  throw this.RError('BOT-007', "Implement extractResponseDataForAccessToken");
};

/**
 * Request Access Token after getting code
 * @param {string} responseData
 * @param {Bot~requestAccessTokenCallback} callback
 */
Bot.prototype.requestAccessToken = function(responseData, callback) {
  throw this.RError('BOT-008', "Implement requestAccessToken");
};

Bot.prototype.isUserAccessTokenCompatibleWithCurrentConfiguration = function (user) {
  var accessTokens = this.getUserAccessTokenFileByUser(user);
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

Bot.prototype.getDefaultRemainingRequest = function(url){
  return this.defaultRemainingRequest;
};

Bot.prototype.getDefaultRemainingTime = function(url){
  if(this.convertLastAccessInMilliseconds) {
    return this.defaultRemainingTime * 1000;
  }

  return this.defaultRemainingTime;
};

/**
 * Get remaining requests from result
 * @param {Request~Response} resultFromRequest
 * @return {Number}
 */
Bot.prototype.getRemainingRequestsFromResult = function(resultFromRequest) {
  throw this.RError('BOT-009', "Implement getRemainingRequestsFromResult");
};

Bot.prototype.updateRemainingRequests = function(resultFromRequest, urls) {
  var remaining = this.getRemainingRequestsFromResult(resultFromRequest);
  var rateLimits = this.getCurrentRateLimit();
  if(rateLimits === null) {
    return;
  }

  var found;

  var idxRateLimits = 0;
  var countRateLimits = rateLimits.length;

  if(urls === undefined) {
    urls = ['global'];
  }
  else if(typeof urls === 'string') {
    urls = [urls];
  }

  var idxUrls = 0;
  var countUrls = urls.length;

  var tmp = [];
  for(; idxUrls < countUrls; idxUrls++) {
    found = false;
    for(; idxRateLimits < countRateLimits; idxRateLimits++) {
      if(rateLimits[idxRateLimits]['url'] === urls[idxUrls]) {
        rateLimits[idxRateLimits]['last_access'] = new Date().getTime();
        rateLimits[idxRateLimits]['remaining'] = remaining;
        found = true;
      }
    }

    if(!found) {
      tmp.push({
        'url':urls[idxUrls],
        'last_access': new Date().getTime(),
        'remaining': remaining
      });
    }
  }

  if(tmp.length > 0) {
    rateLimits = rateLimits.concat(tmp);
  }

  this.saveCurrentRateLimit(rateLimits);
};

Bot.prototype.getCurrentRateLimitFile = function() {
  if(this.currentConfiguration.name === undefined) {
    return null;
  }

  if(this.isFileExist(this.rateLimitsFolder + this.currentConfiguration.name + '.json') === false) {
    require('fs').writeFileSync(this.rateLimitsFolder + this.currentConfiguration.name + '.json', '[]');
    return JSON.parse('[]');
  }

  return JSON.parse(require('fs').readFileSync(this.rateLimitsFolder + this.currentConfiguration.name + '.json'));
};

Bot.prototype.getCurrentRateLimit = function() {
  var jsonFile = this.getCurrentRateLimitFile();
  if(jsonFile === null) {
    return null;
  }

  var idx = 0;
  var max = jsonFile.length;

  for(; idx < max; idx++) {
    if(jsonFile[idx]['access_token'] === this.getCurrentAccessToken()) {
      return jsonFile[idx]['rate_limits'];
    }
  }

  return [];
};

Bot.prototype.saveCurrentRateLimit = function(rateLimits) {
  var jsonFile = this.getCurrentRateLimitFile();
  var idx = 0;
  var max = jsonFile.length;
  var found = false;

  for(; idx < max; idx++) {
    if(jsonFile[idx]['access_token'] === this.getCurrentAccessToken()) {
      jsonFile[idx]['rate_limits'] = rateLimits;
      found = true;
    }
  }

  if(!found) {
    jsonFile.push({
      "access_token": this.getCurrentAccessToken(),
      "rate_limits": rateLimits
    })
  }

  require('fs').writeFileSync(this.rateLimitsFolder + this.currentConfiguration.name + '.json', JSON.stringify(jsonFile));
};

Bot.prototype.hasRemainingRequests = function() {
  return this.hasRemainingRequestsFor();
};

Bot.prototype.hasRemainingRequestsFor = function(urls) {
  return this.arrayMin(this.countRemainingRequestsFor(urls)) > 0;
};

Bot.prototype.countRemainingRequestsFor = function(urls) {
  var remainingRequestsValues = [];
  if(urls === undefined) {
    urls = ['global'];
  }
  else if(typeof urls === 'string') {
    urls = [urls];
  }

  var idxUrls;
  var countUrls = urls.length;

  var rateLimits = this.getCurrentRateLimit();
  if(rateLimits === null) {
    for(idxUrls = 0; idxUrls < countUrls; idxUrls++) {
      remainingRequestsValues.push(this.getDefaultRemainingRequest(urls[idxUrls]));
    }
    return remainingRequestsValues;
  }

  var idxRateLimits = 0;
  var countRateLimits = rateLimits.length;
  var found;
  var futurLastAccess;
  for(idxUrls = 0; idxUrls < countUrls; idxUrls++) {
    found = false;
    for(; idxRateLimits < countRateLimits; idxRateLimits++) {
      if(rateLimits[idxRateLimits]['url'] === urls[idxUrls]) {
        futurLastAccess = this.getDefaultRemainingTime(urls[idxUrls]) + rateLimits[idxRateLimits]['last_access'];
        if(futurLastAccess < new Date().getTime()) {
          rateLimits[idxRateLimits]['remaining'] = this.getDefaultRemainingRequest(urls[idxUrls]);
        }
        remainingRequestsValues.push(rateLimits[idxRateLimits]['remaining']);
        found = true;
      }
    }

    if(!found) {
      remainingRequestsValues.push(this.getDefaultRemainingRequest(urls[idxUrls]));
    }
  }

  return remainingRequestsValues;
};

Bot.prototype.loadModels = function() {
  var files = require('fs').readdirSync(this.modelsFolder);
  var idx = 0;
  var countFiles = files.length;
  var className;

  for(; idx < countFiles; idx++) {
    className = files[idx].substr(0,1).toUpperCase() + files[idx].substr(1).replace('.js', '');
    this.models[className] = require(this.modelsFolder + files[idx]);
  }
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

Bot.prototype.arrayMin = function(array) {
  var len = array.length;
  var min = Infinity;

  while (len--) {
    if (array[len] < min) {
      min = array[len];
    }
  }

  return min;
};

Bot.prototype.getPrivateJobFile = function(job) {
  var files = require('fs').readdirSync(this.privateJobsFolder);
  var countFiles = files.length;
  var idxFiles = 0;
  job = job.toLowerCase().replace('.js', '');

  for(; idxFiles < countFiles; idxFiles++) {
    if(files[idxFiles].toLowerCase().replace('.js', '') === job) {
      return this.privateJobsFolder + files[i];
    }
  }

  return null;
};

Bot.prototype.getJobFile = function(job) {
  var files = require('fs').readdirSync(this.jobsFolder);
  var countFiles = files.length;
  var idxFiles = 0;
  job = job.toLowerCase().replace('.js', '');

  for(; idxFiles < countFiles; idxFiles++) {
    if(files[idxFiles].toLowerCase().replace('.js', '') === job) {
      return this.jobsFolder + files[idxFiles];
    }
  }

  return null;
};

Bot.prototype.formatNewAccessToken = function(accessTokenData, scopes, callback) {
  var that = this;

  var formatAccessToken = {
    "access_token": that.getAccessTokenFromAccessTokenData(accessTokenData),
    "type": that.getTypeAccessTokenFromAccessTokenData(accessTokenData),
    "user": null,
    "scopes": scopes
  };

  that.getUserForNewAccessToken(formatAccessToken, function(err, user){
    if(err) {
      callback(err, null);
    }
    else {
      formatAccessToken.user = user;
      callback(null, formatAccessToken);
    }
  });
};

/**
 * getAccessTokenFromAccessTokenData
 * @param {*} accessTokenData
 * @return {*}
 */
Bot.prototype.getAccessTokenFromAccessTokenData = function(accessTokenData) {
  throw this.RError('BOT-010', "Implement getAccessTokenFromAccessTokenData");
};

/**
 * getTypeAccessTokenFromAccessTokenData
 * @param {*} accessTokenData
 * @return {*}
 */
Bot.prototype.getTypeAccessTokenFromAccessTokenData = function(accessTokenData) {
  throw this.RError('BOT-011', "Implement getTypeAccessTokenFromAccessTokenData");
};

/**
 * getUserForNewAccessToken
 * @param {*} formatAccessToken
 * @param {Bot~getUserForNewAccessTokenCallback} callback
 */
Bot.prototype.getUserForNewAccessToken = function(formatAccessToken, callback) {
  throw this.RError('BOT-012', "Implement getUserForNewAccessToken");
};

Bot.prototype.saveNewAccessToken = function(accessTokenData) {
  if(!this.isFileExist(this.accessTokensFolder + this.currentConfiguration.name + '.json')) {
    require('fs').writeFileSync(this.accessTokensFolder + this.currentConfiguration.name + '.json', '[]');
  }

  var file = JSON.parse(require('fs').readFileSync(this.accessTokensFolder + this.currentConfiguration.name + '.json'));
  var countAccessToken = file.length;
  var idx = 0;
  var toAppend = true;

  for(; idx < countAccessToken; idx++) {
    if(file[idx].user === accessTokenData.user) {
      file[idx] = accessTokenData;
      toAppend = false;
    }
  }

  if(toAppend) {
    file.push(accessTokenData);
  }

  require('fs').writeFileSync(this.accessTokensFolder + this.currentConfiguration.name + '.json', JSON.stringify(file));
};

Bot.prototype.isCurrentAccessTokenCompatibleWithScope = function(scope) {
  if(this.verifyAccessTokenScopesBeforeCall === false) {
    return true;
  }

  var userScopes = this.accessToken.scopes;

  if(typeof userScopes === 'string') {
    userScopes = this.accessToken.scopes.split(this.scopeSeparator);
  }

  return userScopes.indexOf(scope) !== -1;
};

/**
 * 
 * @param {Bot~doRequestParameters} parameters
 * @param {Bot~requestCallback} callback
 */
Bot.prototype.doRequest = function(parameters, callback) {
  var that = this;
  var key;
  var errorMessage = 'Something went wrong.';

  if(parameters.options === undefined) {
    parameters.options = {};
  }

  if(parameters.useAccessToken && parameters.useAccessToken === true) {
    if (!this.isAccessTokenSetted()) {
      callback('Access Token required', null);
      return;
    }

    if(this.isCurrentAccessTokenCompatibleWithScope(parameters.scope) === false) {
      callback(`Access Token Scope required is ${parameters.scope} , it is incompatible with your user scope ${this.accessToken.scopes}`, null);
      return;
    }
  }

  if(this.verifyRemainingRequestsBeforeCall && this.hasRemainingRequests() === false){
    callback('No remaining Requests', null);
    return;
  }

  var requestParameters = JSON.parse(JSON.stringify(parameters));
  this.request(requestParameters, function(error, result){
    if(error) {
      callback(error, false);
    }
    else {
      that.updateRemainingRequests(result);

      var data = JSON.parse(result.data);
      var responseData = that.extractDataFromRequest(data);

      if(result.statusCode >= 400) {
        callback(that.extractErrorMessageFromRequest(data), false);
        return;
      }

      if(that.useModels && responseData !== null && parameters.output !== undefined && parameters.output.model !== undefined) {
        if(parameters.output.isArray !== undefined && parameters.output.isArray === true) {
          var max = responseData.length;
          for(var i = 0; i < max; i++) {
            responseData[i] = new that.models[parameters.output.model](responseData[i]);
          }
        }
        else {
          responseData = new that.models[parameters.output.model](responseData);
        }
      }

      if(parameters.returnCursor !== undefined && parameters.returnCursor === true) {
        callback(null, responseData, that.extractPaginationFromRequest(data));
      }
      else {
        callback(null, responseData);
      }
    }
  });

};

Bot.prototype.extractDataFromRequest = function(data) {
  return data.data;
};

Bot.prototype.extractErrorMessageFromRequest = function(data) {
  if(data.message !== undefined) {
    return data.message;
  }
  
  return data;
};

Bot.prototype.extractPaginationFromRequest = function(data) {
  return data.page;
};

module.exports = Bot;

/**
 * requestAccessTokenCallback
 * @callback Bot~requestAccessTokenCallback
 * @param {Error|string|null} error - Error
 * @param {?*} data - Data
 */
/**
 * getUserForNewAccessTokenCallback
 * @callback Bot~getUserForNewAccessTokenCallback
 * @param {Error|string|null} error - Error
 * @param {?*} data - Data
 */
/**
 * Default values for request parameters
 * @typedef {Request~RawParameters} Bot~doRequestParameters
 * @property {boolean|undefined} [useAccessToken] - Use Access Token
 * @property {string|undefined} [scope] - Scope
 * @property {boolean|undefined} [returnCursor] - Return cursor for pagination
 * @property {Object|undefined} [output] - Output for models
 * @property {Object|undefined} [options] - Options
 */
/**
 * Request callback
 * @callback Bot~requestCallback
 * @param {Error|string|null} error - Error
 * @param {*} data - Data
 * @param {*|undefined} [cursor] - Cursor or pagination
 */