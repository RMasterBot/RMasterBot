var Request = require(__dirname + '/request.js');

function Bot(){
  this.name = null;
  this.folder = null;
  this.domainApi = null;
  this.configuration = {};

  this.validHTTPMethods = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS","COPY",
    "CONNECT","TRACE","LINK","UNLINK","PURGE","LOCK","UNLOCK","PROPFIND","VIEW"];
  this.defaultValues = {
    port: 80,
    path: "/",
    pathPrefix: ""
  };
}

Bot.prototype = new Request();
Bot.prototype.constructor = Bot;

Bot.prototype.getName = function() {
  return this.name;
};

Bot.prototype.getFolder = function() {
  return this.folder;
};

Bot.prototype.getAppName = function() {
  return this.configuration.name;
};

Bot.prototype.setAccessToken = function(accessToken) {
  this.configuration.access_token = accessToken;
};

Bot.prototype.setScope = function(scope) {
  this.configuration.scope = scope;
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
Bot.prototype.getAuthorizeCodeUrl = function() {
  /*return 'https://api.pinterest.com/oauth/?'
    + 'response_type=code&'
    + 'redirect_uri=' + this.conf.callback_url + '&'
    + 'client_id=' + this.conf.consumer_key + '&'
    + 'scope=' + this.conf.scope.join(',');*/
};

// todo / implement
Bot.prototype.getAccessToken = function(code, callback) {
  /*var uri = 'grant_type=authorization_code&'
    + 'client_id=' + this.conf.consumer_key + '&'
    + 'client_secret=' + this.conf.consumer_secret + '&'
    + 'code=' + code;

  var that = this;

  var options = {
    hostname: this.apiDomain,
    port: 443,
    path: '/v1/oauth/token?' + uri,
    method: 'POST'
  };

  var req = that.https.request(options, function(res) {
    var data = '';
    res.on('data', function(chunkData) {
      data+= chunkData;
    });

    res.on('end', function() {
      if(res.statusCode === 200) {
        callback(false, JSON.parse(data));
      }
      else {
        callback(JSON.parse(data), false);
      }
    });
  });
  req.end();

  req.on('error', function(e) {
    callback(e, false);
  });*/
};

// todo / implement
Bot.prototype.isAccessTokenUserCompatibleWithCurrentApp = function (user) {
  try {
    var tokenJson = JSON.parse(fs.readFileSync(__dirname + '/../oauth_access_cache/' + user + '.tok'));
    for (var i = 0; i < tokenJson.length; i++) {
      if(tokenJson[i].app_name === this.getAppName()) {
        return true;
      }
    }
  } catch (e) {
    log.error('BotBot', 'Access token not found for user %s', user);
    process.exit(1);
  }

  return false;
};

// todo / implement
Bot.prototype.setAccessTokenByUser = function (user) {
  try {
    var tokenJson = JSON.parse(fs.readFileSync(__dirname + '/../oauth_access_cache/' + user + '.tok'));
    for (var i = 0; i < tokenJson.length; i++) {
      if(tokenJson[i].app_name === this.getAppName()) {
        this.setAccessToken(tokenJson[i].access_token);
        return;
      }
    }
  } catch (e) {
    log.error('BotBot', 'Access token not found for user %s', user);
    process.exit(1);
  }

  log.error('BotBot', 'Access token user %s not usable with app %s', user, this.getAppName());
  process.exit(1);
};

// todo / implement
Bot.prototype.isAccessTokenSetted = function () {
  if(this.conf.access_token.length === 0) {
    log.error('BotBot', 'Invalid Access Token, user is required');
    process.exit(1);
  }
};

// todo / implement
Bot.prototype.download = function(url, dest, callback, retry) {
  var wrapper;
  retry = retry || 0;

  if(url.substr(0,5) === "https") {
    wrapper = this.https;
  }
  else if(url.substr(0,4) === "http") {
    wrapper = this.http;
  }
  else {
    callback(false);
    return;
  }

  var fs = this.fs;
  var file = fs.createWriteStream(dest);
  var request = wrapper.get(url, function(response) {
    if(response.statusCode >= 400) {
      retry++;

      if(retry > 3) {
        //log.error('RMasterBot', 'Url not found for download: %s', url);
        callback(false);
        return;
      }

      //log.info('RMasterBot', '%d retry to download: %s', retry, url);

      setTimeout(function(){
        download(url, dest, callback, retry);
      }, 1000);

      return;
    }

    response.pipe(file);
    file.on('finish', function() {
      file.close(callback);
    });

  }).on('error', function(err) {
    fs.unlink(dest);
    if (callback) {
      callback(err.message);
    }
  });
};

// todo / implement
Bot.prototype.getClientRateLimit = function(client, callback) {
  var appRateLimit = {};
  var lastAccess = new Date().getTime();
  var remaining = 200;

  fs.readdirSync(__dirname + '/../oauth_access_cache/').forEach(function(file) {
    if(file.match(/\.tok$/) !== null) {
      var user = file.replace('.tok', '');
      var tokenJson = JSON.parse(fs.readFileSync(__dirname + '/../oauth_access_cache/' + user + '.tok'));
      for (var i = 0; i < tokenJson.length; i++) {
        if(tokenJson[i].app_name === client.getAppName()) {
          appRateLimit[user] = {"last_access": lastAccess, "remaining": remaining};
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
  var expirationFileTime = 60 * 60; // 60 minutes in seconds

  if(forceRefresh !== undefined && forceRefresh === true) {
    return rateLimitJson;
  }

  try {
    var rateLimitFileStats = fs.statSync(__dirname + '/../rate_limit_cache/' + name + '.json');
    var _date = new Date();
    _date.setSeconds(_date.getSeconds() - expirationFileTime);
    // if file is still fresh, we can read and return it
    if(rateLimitFileStats.mtime.getTime() > _date.getTime()) {
      rateLimitJson = fs.readFileSync(__dirname + '/../rate_limit_cache/' + name + '.json', 'utf8');
      rateLimitJson = JSON.parse(rateLimitJson);
    }
  } catch (e) {
    //
  }

  return rateLimitJson;
};

// todo / implement
Bot.prototype.saveRateLimitByName = function(name, json) {
  fs.writeFileSync(__dirname + '/../rate_limit_cache/' + name + '.json', json, 'utf8');
};

// todo / implement
Bot.prototype.getApp = function getApp(name) {
  if(globalApp !== null) {
    name = globalApp;
  }

  if(name !== undefined) {
    for (var i = 0; i < confPinterestApp.length; i++) {
      if(confPinterestApp[i].name === name) {
        //log.info('RPinterestBot', 'Use Pinterest app: %s', name);
        client = new RPinterest(confPinterestApp[i]);
        if(globalUser !== null) {
          //log.info('RPinterestBot', 'Use Token user: %s', globalUser);
          client.setAccessTokenByUser(globalUser);
        }
        else {
          // if we have a user token but not specified we used it
          var tokenFiles = [];
          var catchTokenFile = true;
          fs.readdirSync(__dirname + '/../oauth_access_cache/').forEach(function(file) {
            if(catchTokenFile) {
              if(file.match(/\.tok$/) !== null) {
                tokenFiles.push(file);
                if(tokenFiles.length > 2) {
                  catchTokenFile = false;
                }
              }
            }
          });
          if(tokenFiles.length === 1) {
            var possibleUser = tokenFiles[0].replace('.tok', '');
            if(client.isAccessTokenUserCompatibleWithCurrentApp(possibleUser)) {
              globalUser = possibleUser;
              //log.info('RPinterestBot', 'Use Token user: %s', globalUser);
              client.setAccessTokenByUser(globalUser);
            }
          }
        }

        var rateLimitApp = getRateLimitByName(client.getAppName());
        if(globalUser !== undefined && rateLimitApp[globalUser] !== undefined) {
          if(rateLimitApp[globalUser]['remaining'] === 0 && (rateLimitApp[globalUser]['last_access'] + (60*60*1000) ) > new Date().getTime() ) {
            //log.error('RPinterestBot', 'No api call remaining');
            process.exit(1);
          }
        }

        return client;
      }
    }
    //log.error('RPinterestBot', 'Pinterest app %s not found', name);
    process.exit(1);
  }
  else {
    // just give the first pinterest app
    //log.info('RPinterestBot', 'Use Pinterest app: %s', confPinterestApp[0].name);
    client = new RPinterest(confPinterestApp[0]);
    if(globalUser !== null) {
      //log.info('RPinterestBot', 'Use Token user: %s', globalUser);
      client.setAccessTokenByUser(globalUser);
    }
    else {
      // if we have a user token but not specified we used it
      var tokenFiles = [];
      var catchTokenFile = true;
      fs.readdirSync(__dirname + '/../oauth_access_cache/').forEach(function(file) {
        if(catchTokenFile) {
          if(file.match(/\.tok$/) !== null) {
            tokenFiles.push(file);
            if(tokenFiles.length > 2) {
              catchTokenFile = false;
            }
          }
        }
      });
      if(tokenFiles.length === 1) {
        var possibleUser = tokenFiles[0].replace('.tok', '');
        if(client.isAccessTokenUserCompatibleWithCurrentApp(possibleUser)) {
          globalUser = possibleUser;
          //log.info('RPinterestBot', 'Use Token user: %s', globalUser);
          client.setAccessTokenByUser(globalUser);
        }
      }
    }

    var rateLimitApp = getRateLimitByName(client.getAppName());
    if(globalUser !== undefined && rateLimitApp[globalUser] !== undefined) {
      if(rateLimitApp[globalUser]['remaining'] === 0 && (rateLimitApp[globalUser]['last_access'] + (60*60*1000) ) > new Date().getTime() ) {
        //log.error('RPinterestBot', 'No api call remaining');
        process.exit(1);
      }
    }

    return client;
  }
};

// todo / implement
Bot.prototype.logPinterestError = function logPinterestError(error) {
  log.error('RPinterestBot', 'code: %d | message: "%s"', error.code, error.message);
};

module.exports = Bot;