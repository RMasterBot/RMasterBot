require('colors');

function Doc() {
  this.bot = null;
  this.arguments = [];
  this.botConfigured = null;
  /** @type {Doc~ApiDocumentation} */
  this.api = {};

  this.methods = ['CHECKOUT', 'CONNECT', 'COPY', 'DELETE', 'GET', 'HEAD', 'LINK', 'LOCK', 'M-SEARCH', 'MERGE',
    'MKACTIVITY', 'MKCALENDAR', 'MKCOL', 'MOVE', 'NOTIFY', 'OPTIONS', 'PATCH', 'POST', 'PROPFIND', 'PROPPATCH', 'PURGE',
    'PUT', 'REPORT', 'SEARCH', 'SUBSCRIBE', 'TRACE', 'UNLINK', 'UNLOCK', 'UNSUBSCRIBE','VIEW'];

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
  this.api = require(require('path').join(this.botConfigured.docsFolder, 'api.js'));
};

Doc.prototype.showDoc = function() {
  var i;

  if(this.arguments.length < 1) {
    for (i = 0; i < this.api.endpoints.length; i++) {
      this.displayEndpoint(this.api.endpoints[i]);
    }
    return;
  }

  var methodIndex = this.methods.indexOf(this.arguments[0].toUpperCase());
  if(methodIndex !== -1) {
    if(this.arguments.length < 2) {
      for (i = 0; i < this.api.endpoints.length; i++) {
        if(this.api.endpoints[i].method.toUpperCase() === this.methods[methodIndex].toUpperCase()) {
          this.displayEndpoint(this.api.endpoints[i]);
        }
      }
    }
    else {
      for (i = 0; i < this.api.endpoints.length; i++) {
        if(this.api.endpoints[i].method.toUpperCase() === this.methods[methodIndex].toUpperCase() && this.api.endpoints[i].url.toUpperCase() === this.arguments[1].toUpperCase()) {
          this.displayDetailsEndpoint(this.api.endpoints[i]);
          return;
        }
      }
    }
  }
  else if(this.arguments[0] === 'parameters') {
    for (i = 0; i < this.api.parameters.length; i++) {
      this.displayParameters(this.api.parameters[i]);
    }
  }
  else {
    for (i = 0; i < this.api.endpoints.length; i++) {
      if(this.api.endpoints[i].url.toUpperCase() === this.arguments[0].toUpperCase()) {
        this.displayDetailsEndpoint(this.api.endpoints[i]);
        return;
      }
    }

    console.log('endpoint not found');
  }
};

/**
 * Display Endpoint
 * @param {Doc~Endpoints} endpoint
 */
Doc.prototype.displayEndpoint = function(endpoint) {
  console.log(endpoint.method.toUpperCase().green + ' ' + endpoint.url.magenta + ' ' + endpoint.description);
};

/**
 * Display Endpoint Details
 * @param {Doc~Endpoints} endpoint
 */
Doc.prototype.displayDetailsEndpoint = function(endpoint) {
  console.log(endpoint.method.toUpperCase().green + ' ' + endpoint.url.magenta + "\nScope: ".cyan + endpoint.scope + "\nDescription: ".cyan + endpoint.description);

  this.displayAdditionalInformations(endpoint);
  this.displayParametersRequired(endpoint.parameters.required);
  this.displayParametersOptional(endpoint.parameters.optional);
};

Doc.prototype.displayAdditionalInformations = function(endpoint) {
  if(endpoint.moreInfos === undefined) {
    return;
  }

  var idxMoreInfos = 0;
  var lenMoreInfos = endpoint.moreInfos.length;
  var textMoreInfos = [];
  for(; idxMoreInfos < lenMoreInfos; idxMoreInfos++){
    textMoreInfos.push(endpoint.moreInfos[idxMoreInfos].label + ': ' + endpoint.moreInfos[idxMoreInfos].value);
  }

  console.log(textMoreInfos.join("\n"));
};

/**
 * Display required Parameters
 * @param {string[]} parameters
 */
Doc.prototype.displayParametersRequired = function(parameters) {
  if(parameters.length === 0) {
    return;
  }

  console.log("\n"+'Parameters required:');
  for (var i = 0; i < parameters.length; i++) {
    for (var j = 0; j < this.api.parameters.length; j++) {
      if(parameters[i] === this.api.parameters[j].name) {
        this.displayParameters(this.api.parameters[j]);
      }
    }
  }
};

/**
 * Display optional Parameters
 * @param {string[]} parameters
 */
Doc.prototype.displayParametersOptional = function(parameters) {
  if(parameters.length === 0) {
    return;
  }

  console.log("\n"+'Parameters optional:');
  for (var i = 0; i < parameters.length; i++) {
    for (var j = 0; j < this.api.parameters.length; j++) {
      if(parameters[i] === this.api.parameters[j].name) {
        this.displayParameters(this.api.parameters[j]);
      }
    }
  }
};

/**
 * Display Parameters
 * @param {Doc~Parameters} params
 */
Doc.prototype.displayParameters = function(params) {
  console.log(params.name.yellow + ' (' + params.type + ') -> ' + params.description);
};

Doc.prototype.stopProcess = function(exception) {
  require('npmlog').error('DOC', exception);
  process.exit(-1);
};

new Doc();

/**
 * Api Documentation
 * @typedef {Object} Doc~ApiDocumentation
 * @property {Doc~Endpoints[]} endpoints - List of Endpoints
 * @property {Doc~Parameters[]} parameters - List of Parameters
 */
/**
 * Endpoints
 * @typedef {Object} Doc~Endpoints
 * @property {string} method
 * @property {string} url
 * @property {string} description
 * @property {string} scope
 * @property {Doc~EndpointParameters} parameters
 */
/**
 * Global Parameters
 * @typedef {Object} Doc~Parameters
 * @property {string} name
 * @property {string} type
 * @property {string} description
 */
/**
 * Endpoint Parameters
 * @typedef {Object} Doc~EndpointParameters
 * @property {string[]} Doc~EndpointParameters.required
 * @property {string[]} Doc~EndpointParameters.optional
 */