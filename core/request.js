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
  if(typeof parameters.method !== "string") {
    throw "method not a string";
  }

  parameters.method = parameters.method.trim().toUpperCase();

  if(parameters.method.length < 1) {
    throw "method empty";
  }

  var idx = this.validHTTPMethods.indexOf(parameters.method);
  if(idx === -1) {
    throw "method invalid";
  }

  return this.validHTTPMethods[idx];
};

Request.prototype.checkParameterPathForRequestApi = function (parameters) {
  var path = this.defaultValues.path;
  var prefix = this.defaultValues.pathPrefix;

  if(parameters.path !== undefined) {
    if(typeof parameters.path !== "string") {
      throw "path not a string";
    }
    path = parameters.path.trim();
  }

  if(parameters.pathPrefix !== undefined) {
    if(typeof parameters.pathPrefix !== "string") {
      throw "pathPrefix not a string";
    }
    prefix = parameters.pathPrefix.trim();
  }

  return prefix + path;
};

Request.prototype.checkParameterHostnameForRequestApi = function (parameters) {
  if(typeof parameters.hostname !== "string") {
    throw "hostname not a string";
  }

  parameters.hostname = parameters.hostname.trim();

  if(parameters.hostname.length < 1) {
    throw "hostname empty";
  }

  return parameters.hostname;
};

Request.prototype.checkParameterPortForRequestApi = function (parameters) {
  if(parameters.port === undefined) {
    return this.defaultValues.port;
  }

  if(typeof parameters.port !== "number") {
    throw "port not a number";
  }

  if(parameters.port < 0 || parameters.port > 65535) {
    throw "port invalid";
  }

  return parameters.port;
};

Request.prototype.checkParameterHeadersForRequestApi = function (parameters) {
  return [];
};

Request.prototype.checkParameterGetForRequestApi = function (parameters) {
  return [];
};

Request.prototype.checkParameterPostForRequestApi = function (parameters) {
  return [];
};

Request.prototype.checkParameterFilesForRequestApi = function (parameters) {
  return [];
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
    files: this.checkParameterFilesForRequestApi(parameters)
  }
};

Request.prototype.transformParameterGet = function(values) {
  var queries = [];
  for(var key in values) {
    queries.push(key + '=' + encodeURIComponent(values[key]));
  }
  return "?" + queries.join('&');
};

Request.prototype.transformParameterHeader = function(values) {
  var headers = {};
  for(var key in values) {
    headers[key] = values[key];
  }
  return headers;
};

Request.prototype.requestApi = function(parameters, callback) {
  var that = this;
  console.log(parameters);
  parameters = this.formatParametersForRequestApi(parameters);
  console.log(parameters);

  var options = {
    hostname: parameters.hostname,
    port: parameters.port,
    path: parameters.path + this.transformParameterGet(parameters.get),
    method: parameters.method,
    headers: this.transformParameterHeader(parameters.headers)
  };

  var req = require('http').request(options, function(res) {
    var data = '';
    res.on('data', function(chunkData) {
      data+= chunkData;
    });

    res.on('end', function() {
      console.log(res.statusCode);
      console.log(data);
    });

  });
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

module.exports = Request;