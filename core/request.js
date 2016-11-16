/**
 * Make a HTTP Request
 * @constructor
 */
function Request(){
  this.validHttpMethods = ["CHECKOUT", "CONNECT", "COPY", "DELETE", "GET", "HEAD", "LINK", "LOCK", "M-SEARCH", "MERGE",
    "MKACTIVITY", "MKCALENDAR", "MKCOL", "MOVE", "NOTIFY", "OPTIONS", "PATCH", "POST", "PROPFIND", "PROPPATCH", "PURGE",
    "PUT", "REPORT", "SEARCH", "SUBSCRIBE", "TRACE", "UNLINK", "UNLOCK", "UNSUBSCRIBE","VIEW"];

  this.defaultValues = {
    hostname: "",
    httpModule: "http",
    path: "/",
    pathPrefix: "",
    port: 80
  };
}

/**
 * Extract "method" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-000 parameters empty
 * @throws {RError} REQ-001 method not a string
 * @throws {RError} REQ-002 method empty
 * @throws {RError} REQ-003 method invalid
 * @returns {string} A validate Methods belong to validHttpMethods
 */
Request.prototype.extractParameterMethodForRequest = function (parameters) {
  var idx;

  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-000", "parameters empty");
  }

  if(typeof parameters.method !== "string") {
    throw this.RError("REQ-001", "method not a string");
  }

  parameters.method = parameters.method.trim().toUpperCase();

  if(parameters.method.length < 1) {
    throw this.RError("REQ-002", "method empty");
  }

  idx = this.validHttpMethods.indexOf(parameters.method);
  if(idx === -1) {
    throw this.RError("REQ-003", "method %s invalid", parameters.method);
  }

  return this.validHttpMethods[idx];
};

/**
 * Extract "prefix" and "path" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-004 parameters empty
 * @throws {RError} REQ-005 path not a string
 * @throws {RError} REQ-006 pathPrefix not a string
 * @returns {string} Concat prefix and path
 */
Request.prototype.extractParameterPathForRequest = function (parameters) {
  var path = this.defaultValues.path;
  var prefix = this.defaultValues.pathPrefix;

  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-004", "parameters empty");
  }

  if(parameters.path !== undefined) {
    if(typeof parameters.path !== "string") {
      throw this.RError("REQ-005", "path not a string");
    }
    path = parameters.path.trim();
  }

  if(parameters.pathPrefix !== undefined) {
    if(typeof parameters.pathPrefix !== "string") {
      throw this.RError("REQ-006", "pathPrefix not a string");
    }
    prefix = parameters.pathPrefix.trim();
  }

  return prefix + path;
};

/**
 * Extract "hostname" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-007 parameters empty
 * @throws {RError} REQ-008 hostname not a string
 * @throws {RError} REQ-009 hostname empty
 * @returns {string} Hostname
 */
Request.prototype.extractParameterHostnameForRequest = function (parameters) {
  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-007", "parameters empty");
  }

  if(parameters.hostname === undefined) {
    return this.defaultValues.hostname;
  }

  if(typeof parameters.hostname !== "string") {
    throw this.RError("REQ-008", "hostname not a string");
  }

  parameters.hostname = parameters.hostname.trim();

  if(parameters.hostname.length < 1) {
    throw this.RError("REQ-009", "hostname empty");
  }

  return parameters.hostname;
};

/**
 * Extract "port" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-010 parameters empty
 * @throws {RError} REQ-011 port not a number
 * @throws {RError} REQ-012 port invalid
 * @returns {int} Port
 */
Request.prototype.extractParameterPortForRequest = function (parameters) {
  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-010", "parameters empty");
  }

  if(parameters.port === undefined) {
    return this.defaultValues.port;
  }

  if(typeof parameters.port !== "number") {
    throw this.RError("REQ-011", "port not a number");
  }

  if(parameters.port < 0 || parameters.port > 65535) {
    throw this.RError("REQ-012", "port %s invalid, out of range 0 to 65535", parameters.port);
  }

  return parameters.port;
};

/**
 * Extract "headers" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-013 parameters empty
 * @throws {RError} REQ-014 headers invalid
 * @returns {object} Literal object Headers
 */
Request.prototype.extractParameterHeadersForRequest = function (parameters) {
  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-013", "parameters empty");
  }

  if(parameters.headers === undefined) {
    return {};
  }

  if (!parameters.headers instanceof Array) {
    throw this.RError("REQ-014", "headers invalid");
  }

  return parameters.headers;
};

/**
 * Extract "get" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-015 parameters empty
 * @throws {RError} REQ-014 get invalid
 * @returns {object} Literal object Get
 */
Request.prototype.extractParameterGetForRequest = function (parameters) {
  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-015", "parameters empty");
  }

  if(parameters.get === undefined) {
    return {};
  }

  if (!parameters.get instanceof Object) {
    throw this.RError("REQ-016", "get invalid");
  }

  return parameters.get;
};

/**
 * Extract "post" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-017 parameters empty
 * @throws {RError} REQ-018 post invalid
 * @returns {object} Literal object Post
 */
Request.prototype.checkParameterPostForRequest = function (parameters) {
  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-017", "parameters empty");
  }

  if(parameters.post === undefined) {
    return {};
  }

  if (!parameters.post instanceof Object) {
    throw this.RError("REQ-018", "post invalid");
  }

  return parameters.post;
};

/**
 * Extract "files" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-019 parameters empty
 * @throws {RError} REQ-020 files invalid
 * @throws {RError} REQ-021 file not found
 * @throws {RError} REQ-022 file error
 * @returns {object} Literal object Files
 */
Request.prototype.extractParameterFilesForRequest = function (parameters) {
  var files = [];
  var key;
  var stats;

  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-019", "parameters empty");
  }
  
  if(parameters.files === undefined) {
    return files;
  }

  if (!parameters.files instanceof Object) {
    throw this.RError("REQ-020", "files invalid");
  }

  try {
    for (key in parameters.files) {
      if(parameters.files.hasOwnProperty(key)) {
        stats = require('fs').lstatSync(parameters.files[key]);
        files.push({
          "path": parameters.files[key],
          "parameter": key,
          "length": stats.size,
          "name": parameters.files[key].replace(/\\/g,'/').replace( /.*\//, '' )
        });
      }
    }
  }
  catch(e){
    if(key !== undefined) {
      throw this.RError("REQ-021", "file not found: %s", parameters.files[key]);
    }
    else {
      throw this.RError("REQ-022", "file error");
    }
  }

  return files;
};

/**
 * Extract "auth" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-023 parameters empty
 * @throws {RError} REQ-024 auth (basic) invalid
 * @returns {string} Auth
 */
Request.prototype.extractParameterAuthForRequest = function (parameters) {
  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-023", "parameters empty");
  }

  if(parameters.auth === undefined) {
    return "";
  }

  if (typeof parameters.auth !== "string") {
    throw this.RError("REQ-024", "auth (basic) invalid");
  }

  return parameters.auth;
};

/**
 * Extract "HttpModule" from parameters
 * @param {object} parameters
 * @throws {RError} REQ-025 parameters empty
 * @throws {RError} REQ-026 httpModule invalid
 * @returns {string} HttpModule
 */
Request.prototype.extractParameterHttpModuleForRequest = function (parameters) {
  if(parameters === undefined || parameters === null) {
    throw this.RError("REQ-025", "parameters empty");
  }

  if(parameters.httpModule === undefined) {
    return this.defaultValues.httpModule;
  }

  if (parameters.httpModule !== "http" && parameters.httpModule !== "https") {
    throw this.RError("REQ-026", "httpModule invalid: %s", parameters.httpModule);
  }

  return parameters.httpModule;
};

/**
 * Format parameters for Request
 * @param {object} parameters
 * @returns {{method: string, path: string, hostname: string, port: int, headers: {}, get: {}, post: {}, files: {}, auth: string, httpModule: string}} Parameters
 */
Request.prototype.formatParametersForRequest = function (parameters) {
  return {
    method: this.extractParameterMethodForRequest(parameters),
    path: this.extractParameterPathForRequest(parameters),
    hostname: this.extractParameterHostnameForRequest(parameters),
    port: this.extractParameterPortForRequest(parameters),
    headers: this.extractParameterHeadersForRequest(parameters),
    get: this.extractParameterGetForRequest(parameters),
    post: this.checkParameterPostForRequest(parameters),
    files: this.extractParameterFilesForRequest(parameters),
    auth: this.extractParameterAuthForRequest(parameters),
    httpModule: this.extractParameterHttpModuleForRequest(parameters)
  }
};

/**
 * Transform get object to query string
 * @param {object} values
 * @returns {string}
 */
Request.prototype.transformParameterGet = function(values) {
  var queries = [];
  var key;

  for (key in values) {
    if (values.hasOwnProperty(key)) {
      queries.push(key + '=' + encodeURIComponent(values[key]));
    }
  }

  var queryString = queries.join('&');
  if(queryString.length > 0) {
    queryString = "?" + queryString;
  }

  return queryString;
};

/**
 * Do the Request
 * @param {object} parameters
 * @throws {RError} REQ-027 readStreamFile error
 * @param {function} callback
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

    res.on('data', function(chunkData) {
      data+= chunkData;
    });

    res.on('end', function() {
      callback(false, {
        "statusCode": res.statusCode,
        "headers": res.headers,
        "data": data
      });
    });
  });

  if (parameters.files.length > 0) {
    function writeAsyncBody(req, toWrite, idxToWrite) {
      if(toWrite.length == idxToWrite) {
        req.end();
        return;
      }

      if (typeof(toWrite[idxToWrite]) == 'string') {
        req.write(toWrite[idxToWrite]);
        idxToWrite++;
        writeAsyncBody(req, toWrite, idxToWrite);
      }
      else {
        readStreamFile = require('fs').createReadStream(toWrite[idxToWrite].path);

        readStreamFile.on('error', function(error) {
          throw that.RError("REQ-027", error.message);
        });

        readStreamFile.on('data', function(data) {
          req.write(data);
        });

        readStreamFile.on('end', function() {
          req.write(endl);
          idxToWrite++;
          writeAsyncBody(req, toWrite, idxToWrite);
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
 * Create a RError object for Exception
 * @returns {RError}
 */
Request.prototype.RError = function() {
  var _RError = require(__dirname + '/rerror.js');
  var args = Array.prototype.slice.call(arguments).unshift(null);
  return new (Function.prototype.bind.apply(_RError, args));
};

module.exports = Request;