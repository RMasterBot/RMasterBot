function Ats() {
  this.bot = null;
  this.configurationName = null;
  this.port = 9000;
  this.scopes = '';

  this.extractArguments();

  this.configureBot();

  this.launchServer();
}

Ats.prototype.showHelp = function() {
  console.log("\n" + 'Launch server for retreiving user\'s access_token for app.');

  console.log("\n" + 'Usage:');
  console.log("    " + 'node ats <application> <app_name>');
  console.log("    " + 'node ats <application> <app_name> [port] [scopes]');

  console.log("\n" + 'Options:');
  console.log("    " + 'application    use specific application network');
  console.log("    " + 'app_name       use specific app by using name defined in conf');
  console.log("    " + 'port           use specific port for server');
  console.log("    " + 'scopes         list of scopes used for user and app');
  process.exit(1);
};

Ats.prototype.extractArguments = function(){
  if(process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
    this.showHelp();
  }

  if(process.argv[2]) {
    this.bot = process.argv[2];
  }

  if(process.argv[3]) {
    this.configurationName = process.argv[3];
  }

  if(process.argv[4]) {
    this.port = process.argv[4];
  }

  if(process.argv[5]) {
    this.scopes = process.argv[5];
  }

  if(this.bot === null) {
    this.stopProcess('No bot provided');
  }

  if(this.configurationName === null) {
    this.stopProcess('No configurationName provided');
  }
};

Ats.prototype.stopProcess = function(exception) {
  require('npmlog').error('ATS', exception);
  process.exit(-1);
};

Ats.prototype.configureBot = function() {
  var rmasterbot = require('./rmasterbot.js');
  this.bot = rmasterbot.getBot(this.bot, this.configurationName);
};

Ats.prototype.launchServer = function() {
  var that = this;
  var http = require('http');
  var server = http.createServer(function (req, res) {
    that.treatRequestUrl(req, res);
  });

  server.listen(this.port, '127.0.0.1', function(){
    require('npmlog').info('ATS', 'Server listening on port %d', that.port);
  });
};

Ats.prototype.treatRequestUrl = function(req, res) {
  if(req.url === '/') {
    this.showHome(req, res);
  }
  else {
    this.treatResponse(req, res);
  }
};

Ats.prototype.showHome = function(req, res) {
  var accessTokenUrl = this.bot.getAccessTokenUrl(this.scopes);
  require('npmlog').info('ATS', 'Generate authentification url %s', accessTokenUrl);
  res.writeHead(302, {'Location': accessTokenUrl});
  res.end();
};

Ats.prototype.treatResponse = function(req, res) {
  var that = this;

  var responseData = this.bot.extractResponseDataForAccessToken(req);
  if(responseData === null) {
    res.end();
    return;
  }

  this.bot.requestAccessToken(responseData, function(err, accessTokenData){
    if(err) {
      require('npmlog').error('ATS', 'Request Access Token error: %s', err);
      res.end();
      return;
    }

    that.bot.formatNewAccessToken(accessTokenData, that.scopes, function(err, accessTokenData){
      if(err) {
        require('npmlog').error('ATS', 'Save New Access Token error: %s', err.toString());
        res.end();
        return;
      }

      that.bot.saveNewAccessToken(accessTokenData);
      require('npmlog').info('ATS', 'New Access Token %s saved', accessTokenData.user);
      res.end();
    });
  });
};

new Ats();