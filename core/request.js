function Request(){
  this.validHTTPMethods = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS","COPY",
    "CONNECT","TRACE","LINK","UNLINK","PURGE","LOCK","UNLOCK","PROPFIND","VIEW"];

  this.defaultValues = {
    port: 80,
    path: "/",
    pathPrefix: "",
    httpModule: "http"
  };
}

Request.prototype.checkParameterMethodForRequestApi = function (parameters) {
  var idx;

  if(typeof parameters.method !== "string") {
    throw this.RError("REQ-001", "method not a string", __filename, 17);
  }

  parameters.method = parameters.method.trim().toUpperCase();

  if(parameters.method.length < 1) {
    throw this.RError("REQ-002", "method empty", __filename, 23);
  }

  idx = this.validHTTPMethods.indexOf(parameters.method);
  if(idx === -1) {
    throw this.RError("REQ-003", "method invalid", __filename, 28);
  }

  return this.validHTTPMethods[idx];
};

Request.prototype.checkParameterPathForRequestApi = function (parameters) {
  var path = this.defaultValues.path;
  var prefix = this.defaultValues.pathPrefix;

  if(parameters.path !== undefined) {
    if(typeof parameters.path !== "string") {
      throw this.RError("REQ-004", "path not a string", __filename, 40);
    }
    path = parameters.path.trim();
  }

  if(parameters.pathPrefix !== undefined) {
    if(typeof parameters.pathPrefix !== "string") {
      throw this.RError("REQ-005", "pathPrefix not a string", __filename, 47);
    }
    prefix = parameters.pathPrefix.trim();
  }

  return prefix + path;
};

Request.prototype.checkParameterHostnameForRequestApi = function (parameters) {
  if(typeof parameters.hostname !== "string") {
    throw this.RError("REQ-006", "hostname not a string", __filename, 57);
  }

  parameters.hostname = parameters.hostname.trim();

  if(parameters.hostname.length < 1) {
    throw this.RError("REQ-007", "hostname empty", __filename, 63);
  }

  return parameters.hostname;
};

Request.prototype.checkParameterPortForRequestApi = function (parameters) {
  if(parameters.port === undefined) {
    return this.defaultValues.port;
  }

  if(typeof parameters.port !== "number") {
    throw this.RError("REQ-008", "port not a number", __filename, 75);
  }

  if(parameters.port < 0 || parameters.port > 65535) {
    throw this.RError("REQ-009", "port invalid", __filename, 79);
  }

  return parameters.port;
};

Request.prototype.checkParameterHeadersForRequestApi = function (parameters) {
  if(parameters.headers === undefined) {
    return {};
  }

  if (!parameters.headers instanceof Array) {
    throw this.RError("REQ-010", "headers invalid", __filename, 91);
  }

  return parameters.headers;
};

Request.prototype.checkParameterGetForRequestApi = function (parameters) {
  if(parameters.get === undefined) {
    return {};
  }

  if (!parameters.get instanceof Object) {
    throw this.RError("REQ-011", "get invalid", __filename, 103);
  }

  return parameters.get;
};

Request.prototype.checkParameterPostForRequestApi = function (parameters) {
  if(parameters.post === undefined) {
    return {};
  }

  if (!parameters.post instanceof Object) {
    throw this.RError("REQ-012", "post invalid", __filename, 115);
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
    throw this.RError("REQ-013", "files invalid", __filename, 131);
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
    throw this.RError("REQ-014", "file not found", __filename, 148);
  }

  return files;
};

Request.prototype.checkParameterAuthForRequestApi = function (parameters) {
  if(parameters.auth === undefined) {
    return "";
  }

  if (typeof parameters.auth !== "string") {
    throw this.RError("REQ-015", "auth (basic) invalid", __filename, 160);
  }

  return parameters.auth;
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
    auth: this.checkParameterAuthForRequestApi(parameters)
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
  var postData = '';

  var endl = "\r\n";
  var length = 0;
  var boundary = '-----np' + Math.random();
  var toWrite = [];
  var stream;

  var keyData;
  var idxFile = 0;
  var idxToWrite = 0;
  var lengthToWrite;

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
        toWrite.push('--' + boundary + endl);
        toWrite.push('Content-Disposition: form-data; name="' + keyData + '"' + endl);
        toWrite.push(endl);
        toWrite.push(parameters.post[keyData] + endl);
      }
    }

    for (; idxFile < parameters.files.length; idxFile++) {
      toWrite.push('--' + boundary + endl);
      toWrite.push('Content-Disposition: form-data; name="' + parameters.files[idxFile].parameter + '"; filename="' + parameters.files[idxFile].name + '"' + endl);
      toWrite.push(endl);
      toWrite.push(parameters.files[idxFile]);
    }

    toWrite.push('--' + boundary + '--' + endl);

    lengthToWrite = toWrite.length;
    for(; idxToWrite < lengthToWrite; idxToWrite++) {
      length += toWrite[idxToWrite].length;
    }

    options.headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
    options.headers['Content-Length'] = length;
  }
  else if(Object.keys(parameters.post).length > 0) {
    postData = require('querystring').stringify(parameters.post);
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }

  var req = require(this.defaultValues.httpModule).request(options, function(res) {
    var data = '';

    res.on('data', function(chunkData) {
      data+= chunkData;
    });

    res.on('end', function() {
      var result = {
        "statusCode": res.statusCode,
        "headers": res.headers,
        "data": data
      };
      callback(false, result);
      /*if(res.statusCode === 200 || res.statusCode === 201) {
        that.updateRateLimit(res.headers['x-ratelimit-remaining']);
        callback(false, data);
      }
      else {
        that.updateRateLimit(res.headers['x-ratelimit-remaining']);
        callback(JSON.parse(data), false);
      }*/
      console.log("----");
      console.log(res.statusCode);
      console.log("----");
      console.log(data);
    });
  });

  if (parameters.files.length > 0) {
    idxToWrite = 0;
    lengthToWrite = toWrite.length;

    function writeAsyncBody(req, toWrite, idxToWrite) {
      if(lengthToWrite == idxToWrite) {
        req.end();
        return;
      }

      if (typeof(toWrite[idxToWrite]) == 'string') {
        req.write(toWrite[idxToWrite]);
        idxToWrite++;
        writeAsyncBody(req, toWrite, idxToWrite);
      }
      else {
        stream = require('fs').createReadStream(toWrite[idxToWrite].path);

        stream.on('error', function(error) {
          throw new Error(error.message);
        });

        stream.on('data', function(data) {
          req.write(data);
        });

        stream.on('end', function() {
          req.write(endl);
          idxToWrite++;
          writeAsyncBody(req, toWrite, idxToWrite);
        });
      }
    }

    writeAsyncBody(req, toWrite, idxToWrite);
  }
  else if(postData.length > 0) {
    req.write(postData);
    req.end();
  }
  else {
    req.end();
  }

  req.on('error', function(e) {
    console.log('error call api');
    callback(e, false);
  });
};

Request.prototype.RError = function(code, message, file, lineNumber) {
  var _RError = require(__dirname + '/rerror.js');
  return new _RError(code, message, file, lineNumber);
};

module.exports = Request;