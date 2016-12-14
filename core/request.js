/**
 * Make a HTTP Request
 * @class Request
 */
function Request(){
  /**
   * List of Valid Http Methods
   * @property {string[]}
   */
  this.validHttpMethods = ['CHECKOUT', 'CONNECT', 'COPY', 'DELETE', 'GET', 'HEAD', 'LINK', 'LOCK', 'M-SEARCH', 'MERGE',
    'MKACTIVITY', 'MKCALENDAR', 'MKCOL', 'MOVE', 'NOTIFY', 'OPTIONS', 'PATCH', 'POST', 'PROPFIND', 'PROPPATCH', 'PURGE',
    'PUT', 'REPORT', 'SEARCH', 'SUBSCRIBE', 'TRACE', 'UNLINK', 'UNLOCK', 'UNSUBSCRIBE','VIEW'];

  /**
   * List of Valid Http Module
   * @property {string[]}
   */
  this.validHttpModules = ['http', 'https'];
  
  /**
   * Default values
   * @property {Request~DefaultValues}
   */
  this.defaultValues = {
    hostname: '',
    httpModule: 'http',
    method: 'GET',
    path: '/',
    pathPrefix: '',
    port: 80,
    headers: {},
    get: {},
    post: {},
    files: {},
    auth: ''
  };

  /**
   * Activate directory parsing for files
   * @property {boolean}
   */
  this.enableDirectoryForFiles = false;
}

/**
 * Validate if parameters is setted
 * @private
 * @param {Object} parameters
 * @throws {RError} REQ-001 parameters empty
 */
function validateParameters(parameters) {
  if(parameters === undefined || parameters === null) {
    throw MyError('REQ-001', 'parameters undefined');
  }
}

/**
 * Validate if key is in parameters object and verify type
 * @private
 * @param {string} key
 * @param {Object} parameters
 * @param {string} type
 * @param {*} defaultValue default value if key not in parameters
 * @throws {RError} REQ-002 not an Object
 * @throws {RError} REQ-003 not same type
 */
function getKeyFromParametersAndType(key, parameters, type, defaultValue) {
  if(parameters[key] !== undefined) {
    if(type === 'Object') {
      if (!(parameters[key] instanceof Object)) {
        throw MyError("REQ-002", key + ' not an Object');
      }
    }
    else if(typeof parameters[key] !== type) {
      throw MyError('REQ-003', key + ' not a ' + type);
    }

    return parameters[key];
  }
  else {
    return defaultValue;
  }
}

/**
 * Check string is not empty
 * @private
 * @param string
 * @throws {RError} REQ-004 string empty
 */
function checkNotEmpty(string) {
  if(string.length < 1) {
    throw MyError('REQ-004', 'string empty');
  }
}

/**
 * Get value from array
 * @private
 * @param key
 * @param array
 * @throws {RError} REQ-005 not found
 * @return {*}
 */
function getKeyFromArray(key, array) {
  var idx = array.indexOf(key);

  if(idx === -1) {
    throw MyError('REQ-005', '%s not found', key);
  }

  return array[idx];
}

/**
 * Do the Request
 * @param {Request~RawParameters} parameters
 * @throws {RError} REQ-006 readStreamFile error
 * @param {Request~requestCallback} callback
 */
Request.prototype.request = function(parameters, callback) {
  var that = this;
  var options;
  var readStreamFile;
  var keyData;
  var lengthBodyToWrite;
  var httpRequest;
  var endl = "\r\n";
  var contentLength = 0;
  var idxFile = 0;
  var idxBodyToWrite = 0;
  var boundary = '-----np' + Math.random();
  var postData = '';
  var bodyToWrite = [];

  validateParameters(parameters);
  if(parameters.body) {
    postData = getKeyFromParametersAndType('body', parameters, 'string', '');
  }

  parameters = this.formatParametersForRequest(parameters);

  options = {
    hostname: parameters.hostname,
    port: parameters.port,
    path: parameters.path + this.transformParameterGet(parameters.get),
    method: parameters.method,
    headers: parameters.headers
  };

  if(parameters.auth.length > 0) {
    options.auth = parameters.auth;
  }

  if (parameters.files.length > 0) {
    for(keyData in parameters.post) {
      if(parameters.post.hasOwnProperty(keyData)) {
        bodyToWrite.push('--' + boundary + endl);
        bodyToWrite.push('Content-Disposition: form-data; name="' + keyData + '"' + endl);
        bodyToWrite.push(endl);
        bodyToWrite.push(parameters.post[keyData] + endl);
      }
    }

    for (; idxFile < parameters.files.length; idxFile++) {
      bodyToWrite.push('--' + boundary + endl);
      bodyToWrite.push('Content-Disposition: form-data; name="' + parameters.files[idxFile].parameter + '"; filename="' + parameters.files[idxFile].name + '"' + endl);
      bodyToWrite.push(endl);
      bodyToWrite.push(parameters.files[idxFile]);
    }

    bodyToWrite.push('--' + boundary + '--' + endl);

    lengthBodyToWrite = bodyToWrite.length;
    for(; idxBodyToWrite < lengthBodyToWrite; idxBodyToWrite++) {
      contentLength += bodyToWrite[idxBodyToWrite].length;
    }

    options.headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
    options.headers['Content-Length'] = contentLength;
  }
  else if(Object.keys(parameters.post).length > 0) {
    postData = require('querystring').stringify(parameters.post);
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  httpRequest = require(parameters.httpModule).request(options, function(res) {
    var data = '';

    //noinspection JSUnresolvedFunction
    res.on('data', function(chunkData) {
      data+= chunkData;
    });

    //noinspection JSUnresolvedFunction
    res.on('end', function() {
      //noinspection JSUnresolvedVariable
      callback(null, {
        'statusCode': res.statusCode,
        'headers': res.headers,
        'data': data
      });
    });
  });

  if (parameters.files.length > 0) {
    function writeAsyncBody(httpRequest, toWrite, idxToWrite) {
      if(toWrite.length == idxToWrite) {
        httpRequest.end();
        return;
      }

      if (typeof(toWrite[idxToWrite]) == 'string') {
        httpRequest.write(toWrite[idxToWrite]);
        idxToWrite++;
        writeAsyncBody(httpRequest, toWrite, idxToWrite);
      }
      else {
        readStreamFile = require('fs').createReadStream(toWrite[idxToWrite].path);

        readStreamFile.on('error', function(error) {
          throw that.RError("REQ-006", error.message);
        });

        readStreamFile.on('data', function(data) {
          httpRequest.write(data);
        });

        readStreamFile.on('end', function() {
          httpRequest.write(endl);
          idxToWrite++;
          writeAsyncBody(httpRequest, toWrite, idxToWrite);
        });
      }
    }

    writeAsyncBody(httpRequest, bodyToWrite, 0);
  }
  else if(postData.length > 0) {
    httpRequest.write(postData);
    httpRequest.end();
  }
  else {
    httpRequest.end();
  }

  httpRequest.on('error', function(e) {
    callback(e, null);
  });
};

/**
 * Format parameters for Request
 * @param {Request~RawParameters} parameters
 * @return {Request~CleanParameters} Parameters
 */
Request.prototype.formatParametersForRequest = function (parameters) {
  return {
    method: this.extractParameterMethodForRequest(parameters),
    path: this.extractParameterPathForRequest(parameters),
    hostname: this.extractParameterHostnameForRequest(parameters),
    port: this.extractParameterPortForRequest(parameters),
    headers: this.extractParameterHeadersForRequest(parameters),
    get: this.extractParameterGetForRequest(parameters),
    post: this.extractParameterPostForRequest(parameters),
    files: this.extractParameterFilesForRequest(parameters),
    auth: this.extractParameterAuthForRequest(parameters),
    httpModule: this.extractParameterHttpModuleForRequest(parameters)
  }
};

/**
 * Extract "method" from parameters
 * @param {Request~RawParameters} parameters
 * @return {string} A validate Methods belong to validHttpMethods
 */
Request.prototype.extractParameterMethodForRequest = function (parameters) {
  var method;

  validateParameters(parameters);

  method = getKeyFromParametersAndType('method', parameters, 'string', this.defaultValues.method);

  method = method.trim().toUpperCase();

  checkNotEmpty(method);

  return getKeyFromArray(method, this.validHttpMethods);
};

/**
 * Extract "prefix" and "path" from parameters
 * @param {Request~RawParameters} parameters
 * @return {string} Concat prefix and path
 */
Request.prototype.extractParameterPathForRequest = function (parameters) {
  var path;
  var prefix;

  validateParameters(parameters);

  path = getKeyFromParametersAndType('path', parameters, 'string', this.defaultValues.path);

  path = path.trim();

  prefix = getKeyFromParametersAndType('pathPrefix', parameters, 'string', this.defaultValues.pathPrefix);

  prefix = prefix.trim();

  return prefix + path;
};

/**
 * Extract "hostname" from parameters
 * @param {Request~RawParameters} parameters
 * @return {string} Hostname
 */
Request.prototype.extractParameterHostnameForRequest = function (parameters) {
  var hostname;

  validateParameters(parameters);

  hostname = getKeyFromParametersAndType('hostname', parameters, 'string', this.defaultValues.hostname);

  hostname = hostname.trim();

  checkNotEmpty(hostname);

  return hostname;
};

/**
 * Extract "port" from parameters
 * @param {Request~RawParameters} parameters
 * @throws {RError} REQ-012 port invalid
 * @return {int} Port
 */
Request.prototype.extractParameterPortForRequest = function (parameters) {
  var port;

  validateParameters(parameters);

  port = getKeyFromParametersAndType('port', parameters, 'number', this.defaultValues.port);

  if(port < 0 || port > 65535) {
    throw MyError("REQ-007", "port %s invalid, out of range 0 to 65535", port);
  }

  return port;
};

/**
 * Extract "headers" from parameters
 * @param {Request~RawParameters} parameters
 * @return {object} Literal object Headers
 */
Request.prototype.extractParameterHeadersForRequest = function (parameters) {
  validateParameters(parameters);

  return getKeyFromParametersAndType('headers', parameters, 'Object', this.defaultValues.headers);
};

/**
 * Extract "get" from parameters
 * @param {Request~RawParameters} parameters
 * @return {object} Literal object Get
 */
Request.prototype.extractParameterGetForRequest = function (parameters) {
  validateParameters(parameters);

  return getKeyFromParametersAndType('get', parameters, 'Object', this.defaultValues.get);
};

/**
 * Extract "post" from parameters
 * @param {Request~RawParameters} parameters
 * @return {object} Literal object Post
 */
Request.prototype.extractParameterPostForRequest = function (parameters) {
  validateParameters(parameters);

  return getKeyFromParametersAndType('post', parameters, 'Object', this.defaultValues.post);
};

/**
 * Extract "files" from parameters
 * @param {Request~RawParameters} parameters
 * @throws {RError} REQ-008 file not found
 * @throws {RError} REQ-009 file error
 * @return {object} Literal object Files
 */
Request.prototype.extractParameterFilesForRequest = function (parameters) {
  var tmpFiles;
  var files = [];
  var key;
  var stats;
  var statsFileInDirectory;
  var filesInDirectory = [];
  var idxFilesInDirectory = 0;
  var maxFilesInDirectory;
  var _tmpPath;

  validateParameters(parameters);

  tmpFiles = getKeyFromParametersAndType('files', parameters, 'Object', this.defaultValues.files);

  try {
    for (key in tmpFiles) {
      if(tmpFiles.hasOwnProperty(key)) {
        stats = require('fs').lstatSync(tmpFiles[key]);

        if(stats.isFile()) {
          files.push({
            "path": tmpFiles[key],
            "parameter": key,
            "length": stats.size,
            "name": tmpFiles[key].replace(/\\/g,'/').replace( /.*\//, '' )
          });
        }
        else if(stats.isDirectory()) {
          if(this.enableDirectoryForFiles === true) {
            filesInDirectory = require('fs').readdirSync(tmpFiles[key]);
            maxFilesInDirectory = filesInDirectory.length;
            for(; idxFilesInDirectory < maxFilesInDirectory; idxFilesInDirectory++) {
              _tmpPath = tmpFiles[key] + '/' + filesInDirectory[idxFilesInDirectory];
              statsFileInDirectory = require('fs').lstatSync(_tmpPath);
  
              files.push({
                "path": _tmpPath,
                "parameter": this.handleParameterNameForFilesFromDirectory(key, filesInDirectory[idxFilesInDirectory], idxFilesInDirectory),
                "length": statsFileInDirectory.size,
                "name": filesInDirectory[idxFilesInDirectory].replace(/\\/g,'/').replace( /.*\//, '' )
              });
            }
          }
          else {
            throw MyError("REQ-008", "directory given but not enable: %s", tmpFiles[key]);
          }
        }
        else {
          throw MyError("REQ-009", "not a file and not a directory: %s", tmpFiles[key]);
        }
      }
    }
  }
  catch(e){
    if(e.code === 'ENOENT') {
      throw MyError("REQ-010", "file not found: %s", tmpFiles[key]);
    }
    else if(e.code === 'REQ-008' || e.code === 'REQ-009') {
      throw e;
    }
    else {
      throw MyError("REQ-011", "file error: " + e.toString());
    }
  }

  return files;
};

/**
 * Handle the parameter name when using files from directory
 * @param name parameter name
 * @param files files in directory
 * @param idx index in files
 * @return {string} final parameter name
 */
Request.prototype.handleParameterNameForFilesFromDirectory = function (name, files, idx) {
  return name + '_' + idx;
};

/**
 * Extract "auth" from parameters
 * @param {Request~RawParameters} parameters
 * @return {string} Auth
 */
Request.prototype.extractParameterAuthForRequest = function (parameters) {
  validateParameters(parameters);

  return getKeyFromParametersAndType('auth', parameters, 'string', this.defaultValues.auth);
};

/**
 * Extract "HttpModule" from parameters
 * @param {Request~RawParameters} parameters
 * @return {string} HttpModule
 */
Request.prototype.extractParameterHttpModuleForRequest = function (parameters) {
  var httpModule;

  validateParameters(parameters);

  httpModule = getKeyFromParametersAndType('httpModule', parameters, 'string', this.defaultValues.httpModule);

  return getKeyFromArray(httpModule, this.validHttpModules);
};

/**
 * Transform get object to query string
 * @param {object} values
 * @return {string}
 */
Request.prototype.transformParameterGet = function(values) {
  var queries = [];
  var key;
  var queryString;

  for (key in values) {
    if (values.hasOwnProperty(key)) {
      queries.push(key + '=' + encodeURIComponent(values[key]));
    }
  }

  queryString = queries.join('&');
  if(queryString.length > 0) {
    queryString = "?" + queryString;
  }

  return queryString;
};

/**
 * A simple function for throwing Exception
 * @return {RError}
 * @constructor
 */
function MyError(){
  var _RError = require(__dirname + '/rerror.js');
  var args = Array.prototype.slice.call(arguments);
  args.unshift(null);
  return new (Function.prototype.bind.apply(_RError, args));
}

module.exports = Request;

/**
 * Default values
 * @typedef {Object} Request~DefaultValues
 * @property {string} [hostname=''] - Hostname
 * @property {string} [httpModule=http] - Http module from nodejs
 * @property {string} [method=GET] - Method
 * @property {string} [path=/] - Path
 * @property {string} [pathPrefix=''] - Prefix to path
 * @property {int} [port=80] - Port
 * @property {Object} [headers={}] - Headers
 * @property {Object} [get={}] - Get
 * @property {Object} [post={}] - Post
 * @property {Object} [files={}] - Files
 * @property {string} [auth=''] - Authentification
 */
/**
 * Raw Parameters
 * @typedef {Object} Request~RawParameters
 * @property {string} method - Method
 * @property {string} path - Path
 * @property {string|undefined} [pathPrefix] - Path Prefix
 * @property {string|undefined} [hostname] - Hostname
 * @property {int|undefined} [port] - Port
 * @property {Object|undefined} [headers] - Headers
 * @property {Object|undefined} [get] - Get
 * @property {Object|undefined} [post] - Post
 * @property {Object|undefined} [files] - Files
 * @property {string|undefined} [auth] - Auth
 * @property {string|undefined} [httpModule] - Http module from nodejs
 * @property {string|undefined} [body] - Body
 */
/**
 * Clean Parameters
 * @typedef {Object} Request~CleanParameters
 * @property {string} method - Method
 * @property {string} path - Path
 * @property {string} hostname - Hostname
 * @property {int} port - Port
 * @property {Object} headers - Headers
 * @property {Object} get - Get
 * @property {Object} post - Post
 * @property {Object} files - Files
 * @property {string} auth - Auth
 * @property {string} httpModule - Http module from nodejs
 */
/**
 * Response from request send to callback
 * @typedef {Object} Request~Response
 * @property {Number} statusCode - Status Code from request
 * @property {Object} headers - Headers from request
 * @property {string} data - Data from request
 */
/**
 * This callback is displayed as part of the Request class.
 * @callback Request~requestCallback
 * @param {Error|null} error - Error
 * @param {Request~Response|null} response - Response
 */
