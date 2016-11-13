function Doc() {
  require('colors');
  this.bot = null;
  this.arguments = [];
  this.botConfigured = null;
  this.api = {};

  this.methods = ["checkout", "connect", "copy", "delete", "get", "head", "link", "lock", "m-search", "merge",
    "mkactivity", "mkcalendar", "mkcol", "move", "notify", "options", "patch", "post", "propfind", "proppatch", "purge",
    "put", "report", "search", "subscribe", "trace", "unlink", "unlock", "unsubscribe","view"];

  this.extractArguments();
  this.loadBot();
  this.loadDoc();
  this.showDoc();
}

Doc.prototype.extractArguments = function(){
  if(process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
    this.showHelp();
  }

  this.bot = process.argv[2] || null;

  var countArguments = process.argv.length;
  for(var i = 3; i < countArguments; i++) {
    this.arguments.push(process.argv[i].toLowerCase());
  }
};

Doc.prototype.showHelp = function() {
  console.log("\n" + 'API Endpoints Description');

  console.log("\n" + 'Usage:');
  console.log("    " + 'node doc <application>                                 list all endpoints');
  console.log("    " + 'node doc <application> <http_method>                   list all endpoints using given method');
  console.log("    " + 'node doc <application> <endpoint_url>                  endpoint detail');
  console.log("    " + 'node doc <application> <http_method> <endpoint_url>    endpoint detail using given method');
  console.log("    " + 'node doc <application> parameters                      list all parameters');

  console.log("\n" + 'Options:');
  console.log("    " + 'application    use specific application network');
  console.log("    " + 'http_method    get, post, patch, delete');
  console.log("    " + 'endpoint_url   /v1/me/');

  process.exit(1);
};

Doc.prototype.loadBot = function() {
  if(this.bot === null) {
    this.stopProcess('Bot required');
  }
  this.botConfigured = require('./rmasterbot').getBot(this.bot);
};

Doc.prototype.loadDoc = function() {
  this.api = require(this.botConfigured.docsFolder + 'api.js');
};

Doc.prototype.showDoc = function() {
  var i;

  if(this.arguments.length < 1) {
    for (i = 0; i < api.endpoints.length; i++) {
      this.displayEndpoint(api.endpoints[i]);
    }
    return;
  }

  var methodIndex = this.methods.indexOf(this.arguments[0]);
  if(methodIndex !== -1) {
    if(this.arguments.length < 2) {
      for (i = 0; i < api.endpoints.length; i++) {
        if(api.endpoints[i].method === this.methods[methodIndex]) {
          this.displayEndpoint(api.endpoints[i]);
        }
      }
    }
    else {
      for (i = 0; i < api.endpoints.length; i++) {
        if(api.endpoints[i].method === this.methods[methodIndex] && api.endpoints[i].url === this.arguments[1]) {
          this.displayDetailsEndpoint(api.endpoints[i]);
          return;
        }
      }
    }
  }
  else if(this.arguments[0] === 'parameters') {
    for (i = 0; i < api.parameters.length; i++) {
      this.displayParameters(api.parameters[i]);
    }
  }
  else {
    for (i = 0; i < api.endpoints.length; i++) {
      if(api.endpoints[i].url === this.arguments[0]) {
        this.displayDetailsEndpoint(api.endpoints[i]);
        return;
      }
    }

    console.log('endpoint not found');
  }
};

Doc.prototype.displayEndpoint = function(endpoint) {
  console.log(endpoint.method.toUpperCase().green + ' ' + endpoint.url.magenta + ' ' + endpoint.description);
};

Doc.prototype.displayDetailsEndpoint = function(endpoint) {
  console.log(endpoint.method.toUpperCase().green + ' ' + endpoint.url.magenta + "\nScope: ".cyan + endpoint.scope + "\nDescription: ".cyan + endpoint.description);

  this.displayParametersRequired(endpoint.parameters.required);
  this.displayParametersOptional(endpoint.parameters.optional);
};

Doc.prototype.displayParametersRequired = function(parameters) {
  if(parameters.length === 0) {
    return;
  }

  console.log("\n"+'Parameters required:');
  for (var i = 0; i < parameters.length; i++) {
    if(typeof parameters[i] === 'string') {
      for (var j = 0; j < api.parameters.length; j++) {
        if(parameters[i] === api.parameters[j].name) {
          this.displayParameters(api.parameters[j]);
        }
      }
    }
    else {
      this.displayParameters(parameters[i]);
    }
  }
};

Doc.prototype.displayParametersOptional = function(parameters) {
  if(parameters.length === 0) {
    return;
  }

  console.log("\n"+'Parameters optional:');
  for (var i = 0; i < parameters.length; i++) {
    if(typeof parameters[i] === 'string') {
      for (var j = 0; j < api.parameters.length; j++) {
        if(parameters[i] === api.parameters[j].name) {
          this.displayParameters(api.parameters[j]);
        }
      }
    }
    else {
      this.displayParameters(parameters[i]);
    }
  }
};

Doc.prototype.displayParameters = function(params) {
  console.log(params.name.yellow + ' (' + params.type + ') -> ' + params.description);
};

Doc.prototype.stopProcess = function(exception) {
  require('npmlog').error('DOC', exception);
  process.exit(-1);
};

new Doc();