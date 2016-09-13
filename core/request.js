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

Request.prototype.checkParameterMethodForRequestApi = function (parameters) {
  var idx;

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

Request.prototype.checkParameterPathForRequestApi = function (parameters) {
  var path = this.defaultValues.path;
  var prefix = this.defaultValues.pathPrefix;

  if(parameters.path !== undefined) {
    if(typeof parameters.path !== "string") {
      throw this.RError("REQ-004", "path not a string");
    }
    path = parameters.path.trim();
  }

  if(parameters.pathPrefix !== undefined) {
    if(typeof parameters.pathPrefix !== "string") {
      throw this.RError("REQ-005", "pathPrefix not a string");
    }
    prefix = parameters.pathPrefix.trim();
  }

  return prefix + path;
};

Request.prototype.checkParameterHostnameForRequestApi = function (parameters) {
  if(parameters.hostname === undefined) {
    return this.defaultValues.hostname;
  }

  if(typeof parameters.hostname !== "string") {
    throw this.RError("REQ-006", "hostname not a string");
  }

  parameters.hostname = parameters.hostname.trim();

  if(parameters.hostname.length < 1) {
    throw this.RError("REQ-007", "hostname empty");
  }

  return parameters.hostname;
};

Request.prototype.checkParameterPortForRequestApi = function (parameters) {
  if(parameters.port === undefined) {
    return this.defaultValues.port;
  }

  if(typeof parameters.port !== "number") {
    throw this.RError("REQ-008", "port not a number");
  }

  if(parameters.port < 0 || parameters.port > 65535) {
    throw this.RError("REQ-009", "port %s invalid, out of range 0 to 65535", parameters.port);
  }

  return parameters.port;
};

Request.prototype.checkParameterHeadersForRequestApi = function (parameters) {
  if(parameters.headers === undefined) {
    return {};
  }

  if (!parameters.headers instanceof Array) {
    throw this.RError("REQ-010", "headers invalid");
  }

  return parameters.headers;
};

Request.prototype.checkParameterGetForRequestApi = function (parameters) {
  if(parameters.get === undefined) {
    return {};
  }

  if (!parameters.get instanceof Object) {
    throw this.RError("REQ-011", "get invalid");
  }

  return parameters.get;
};

Request.prototype.checkParameterPostForRequestApi = function (parameters) {
  if(parameters.post === undefined) {
    return {};
  }

  if (!parameters.post instanceof Object) {
    throw this.RError("REQ-012", "post invalid");
  }

  return parameters.post;
};

Request.prototype.checkParameterFilesForRequestApi = function (parameters) {
  var files = [];
  var key;
  var stats;

  if(parameters.files === undefined) {
    return files;
  }

  if (!parameters.files instanceof Object) {
    throw this.RError("REQ-013", "files invalid");
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
    throw this.RError("REQ-014", "file not found: %s", parameters.files[key]);
  }

  return files;
};

Request.prototype.checkParameterAuthForRequestApi = function (parameters) {
  if(parameters.auth === undefined) {
    return "";
  }

  if (typeof parameters.auth !== "string") {
    throw this.RError("REQ-015", "auth (basic) invalid");
  }

  return parameters.auth;
};

Request.prototype.checkParameterHttpModuleForRequestApi = function (parameters) {
  if(parameters.httpModule === undefined) {
    return this.defaultValues.httpModule;
  }

  if (parameters.httpModule !== "http" && parameters.httpModule !== "https") {
    throw this.RError("REQ-016", "httpModule invalid: %s", parameters.httpModule);
  }

  return parameters.httpModule;
};

Request.prototype.formatParametersForRequestApi = function (parameters) {
  return {
    method: this.checkParameterMethodForRequestApi(parameters),
    path: this.checkParameterPathForRequestApi(parameters),
    hostname: this.checkParameterHostnameForRequestApi(parameters),
    port: this.checkParameterPortForRequestApi(parameters),
    headers: this.checkParameterHeadersForRequestApi(parameters),
    get: this.checkParameterGetForRequestApi(parameters),
    post: this.checkParameterPostForRequestApi(parameters),
    files: this.checkParameterFilesForRequestApi(parameters),
    auth: this.checkParameterAuthForRequestApi(parameters),
    httpModule: this.checkParameterHttpModuleForRequestApi(parameters)
  }
};

Request.prototype.transformParameterGet = function(values) {
  var queries = [];
  var key;

  for (key in values) {
    if (values.hasOwnProperty(key)) {
      queries.push(key + '=' + encodeURIComponent(values[key]));
    }
  }

  return "?" + queries.join('&');
};

Request.prototype.transformParameterHeader = function(values) {
  var headers = {};
  var key;

  for (key in values) {
    if (values.hasOwnProperty(key)) {
      headers[key] = values[key];
    }
  }

  return headers;
};

Request.prototype.requestApi = function(parameters, callback) {
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

  parameters = this.formatParametersForRequestApi(parameters);

  options = {
    hostname: parameters.hostname,
    port: parameters.port,
    path: parameters.path + this.transformParameterGet(parameters.get),
    method: parameters.method,
    headers: this.transformParameterHeader(parameters.headers)
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
          throw that.RError("REQ-017", error.message);
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

Request.prototype.RError = function() {
  var _RError = require(__dirname + '/rerror.js');
  var args = Array.prototype.slice.call(arguments);
  args.unshift(null);
  return new (Function.prototype.bind.apply(_RError, args));
};

module.exports = Request;