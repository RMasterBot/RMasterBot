function Request(){
  this.validHTTPMethods = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS","COPY",
    "CONNECT","TRACE","LINK","UNLINK","PURGE","LOCK","UNLOCK","PROPFIND","VIEW"];

  this.defaultValues = {
    port: 80,
    path: "/",
    pathPrefix: ""
  };
}

Request.prototype.checkParameterMethodForRequestApi = function (parameters) {
  var idx;

  if(typeof parameters.method !== "string") {
    throw this.RError("REQ-001", "method not a string", __filename, 16);
  }

  parameters.method = parameters.method.trim().toUpperCase();

  if(parameters.method.length < 1) {
    throw this.RError("REQ-002", "method empty", __filename, 22);
  }

  idx = this.validHTTPMethods.indexOf(parameters.method);
  if(idx === -1) {
    throw this.RError("REQ-003", "method invalid", __filename, 27);
  }

  return this.validHTTPMethods[idx];
};

Request.prototype.checkParameterPathForRequestApi = function (parameters) {
  var path = this.defaultValues.path;
  var prefix = this.defaultValues.pathPrefix;

  if(parameters.path !== undefined) {
    if(typeof parameters.path !== "string") {
      throw this.RError("REQ-004", "path not a string", __filename, 39);
    }
    path = parameters.path.trim();
  }

  if(parameters.pathPrefix !== undefined) {
    if(typeof parameters.pathPrefix !== "string") {
      throw this.RError("REQ-005", "pathPrefix not a string", __filename, 46);
    }
    prefix = parameters.pathPrefix.trim();
  }

  return prefix + path;
};

Request.prototype.checkParameterHostnameForRequestApi = function (parameters) {
  if(typeof parameters.hostname !== "string") {
    throw this.RError("REQ-006", "hostname not a string", __filename, 56);
  }

  parameters.hostname = parameters.hostname.trim();

  if(parameters.hostname.length < 1) {
    throw this.RError("REQ-007", "hostname empty", __filename, 62);
  }

  return parameters.hostname;
};

Request.prototype.checkParameterPortForRequestApi = function (parameters) {
  if(parameters.port === undefined) {
    return this.defaultValues.port;
  }

  if(typeof parameters.port !== "number") {
    throw this.RError("REQ-008", "port not a number", __filename, 74);
  }

  if(parameters.port < 0 || parameters.port > 65535) {
    throw this.RError("REQ-009", "port invalid", __filename, 78);
  }

  return parameters.port;
};

Request.prototype.checkParameterHeadersForRequestApi = function (parameters) {
  if(parameters.headers === undefined) {
    return [];
  }

  if (!parameters.headers instanceof Array) {
    throw this.RError("REQ-010", "headers invalid", __filename, 90);
  }

  return parameters.headers;
};

Request.prototype.checkParameterGetForRequestApi = function (parameters) {
  if(parameters.get === undefined) {
    return [];
  }

  if (!parameters.get instanceof Object) {
    throw this.RError("REQ-011", "get invalid", __filename, 102);
  }

  return parameters.get;
};

Request.prototype.checkParameterPostForRequestApi = function (parameters) {
  if(parameters.post === undefined) {
    return [];
  }

  if (!parameters.post instanceof Object) {
    throw this.RError("REQ-012", "post invalid", __filename, 114);
  }

  return parameters.post;
};

Request.prototype.checkParameterFilesForRequestApi = function (parameters) {
  if(parameters.files === undefined) {
    return [];
  }

  if (!parameters.files instanceof Object) {
    throw this.RError("REQ-013", "files invalid", __filename, 126);
  }

  return parameters.files;
};

Request.prototype.checkParameterAuthForRequestApi = function (parameters) {
  if(parameters.auth === undefined) {
    return "";
  }

  if (typeof parameters.auth !== "string") {
    throw this.RError("REQ-014", "auth (basic) invalid", __filename, 138);
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
  var postData;
  //console.log(parameters);
  parameters = this.formatParametersForRequestApi(parameters);
  //console.log(parameters);

  var options = {
    hostname: parameters.hostname,
    port: parameters.port,
    path: parameters.path + this.transformParameterGet(parameters.get),
    method: parameters.method,
    headers: this.transformParameterHeader(parameters.headers)
  };

  if(parameters.auth.length > 0) {
    options.auth = parameters.auth;
  }

  postData = require('querystring').stringify(parameters.post);

  if(Object.keys(parameters.post).length > 0) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.headers['Content-Length'] = Buffer.byteLength(postData);
  }
console.log(options);
  var req = require('http').request(options, function(res) {
    var data = '';
    res.on('data', function(chunkData) {
      data+= chunkData;
    });

    res.on('end', function() {
      console.log("----");
      console.log(res.statusCode);
      console.log("----");
      console.log(data);
    });

  });
  req.write(postData);
  req.end();
  /*

   return;
   var fs = require('fs');
   var endl = "\r\n";
   var length = 0;
   var contentType = '';
   var files = [];
   var boundary = '-----np' + Math.random();
   var toWrite = [];

   if (filepath !== undefined) {
   files.push(
   {
   param: "image",
   path: filepath,
   length: 0
   }
   );

   var name = '', stats;
   for (var idxFiles in files) {
   if (fs.existsSync(files[idxFiles].path)) {
   name = files[idxFiles].path.replace(/\\/g,'/').replace( /.*\//, '' );

   stats = fs.statSync(files[idxFiles].path);
   files[idxFiles].length = stats.size;

   toWrite.push('--' + boundary + endl);
   toWrite.push('Content-Disposition: form-data; name="image"; filename="' + name + '"' + endl);
   toWrite.push(endl);
   toWrite.push(files[idxFiles]);
   }
   }

   toWrite.push('--' + boundary + '--' + endl);

   for(var idxToWrite in toWrite) {
   length += toWrite[idxToWrite].length;
   }

   contentType = 'multipart/form-data; boundary=' + boundary;
   }

   var options = {
   hostname: this.domainApi,
   port: 443,
   path: '/v1/' + uri,
   method: parameters.method,
   headers: {}
   };

   if(contentType !== '') {
   options.headers['Content-Type'] = contentType;
   }

   if(length !== 0) {
   options.headers['Content-Length'] = length;
   }

   var req = that.https.request(options, function(res) {
   var data = '';
   res.on('data', function(chunkData) {
   data+= chunkData;
   });

   res.on('end', function() {
   if(res.statusCode === 200 || res.statusCode === 201) {
   that.updateRateLimit(res.headers['x-ratelimit-remaining']);
   callback(false, data);
   }
   else {
   that.updateRateLimit(res.headers['x-ratelimit-remaining']);
   callback(JSON.parse(data), false);
   }
   });
   });

   if (files.length > 0) {
   var indexToWrite = 0;
   var lengthToWrite = toWrite.length;

   function writeAsyncBody(req, toWrite, indexToWrite) {
   if(lengthToWrite == indexToWrite) {
   req.end();
   return;
   }

   if (typeof(toWrite[indexToWrite]) == 'string') {
   req.write(toWrite[indexToWrite]);
   indexToWrite++;
   writeAsyncBody(req, toWrite, indexToWrite);
   }
   else {
   var stream = fs.createReadStream(toWrite[indexToWrite].path);

   stream.on('error', function(error) {
   throw new Error(error.message);
   });

   stream.on('data', function(data) {
   req.write(data);
   });

   stream.on('end', function() {
   req.write(endl);
   indexToWrite++;
   writeAsyncBody(req, toWrite, indexToWrite);
   });
   }
   }

   writeAsyncBody(req, toWrite, indexToWrite);
   }
   else {
   req.end();
   }

   req.on('error', function(e) {
   console.log('error call api v1');
   callback(e, false);
   });
   */
};

Request.prototype.RError = function(code, message, file, lineNumber) {
  var _RError = require(__dirname + '/rerror.js');
  return new _RError(code, message, file, lineNumber);
};

module.exports = Request;