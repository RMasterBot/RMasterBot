var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');

describe('Request', function(){

  describe('validHttpMethods', function(){
    var request = require('../../core/request.js');

    it('defaultValues is an array', function(){
      var instance = new request();
      assert.isArray(instance.validHttpMethods, 'validHttpMethods is not an object');
    });

    it('should access to validHttpMethods', function(){
      var instance = new request();
      assert.strictEqual(instance.validHttpMethods.length, 30, 'validHttpMethods has been changed');
    });
  });

  describe('defaultValues', function(){
    var request = require('../../core/request.js');

    it('defaultValues is an object', function(){
      var instance = new request();
      assert.isObject(instance.defaultValues, 'defaultValues is not an object');
    });

    it('should access to defaultValues.hostname', function(){
      var instance = new request();
      assert.strictEqual(instance.defaultValues.hostname, '', 'Hostname not empty');
    });

    it('should access to defaultValues.httpModule', function(){
      var instance = new request();
      assert.strictEqual(instance.defaultValues.httpModule, 'http', 'httpModule not equal to http');
    });

    it('should access to defaultValues.path', function(){
      var instance = new request();
      assert.strictEqual(instance.defaultValues.path, '/', 'Path not equal to /');
    });

    it('should access to defaultValues.pathPrefix', function(){
      var instance = new request();
      assert.strictEqual(instance.defaultValues.pathPrefix, '', 'pathPrefix not empty');
    });

    it('should access to defaultValues.port', function(){
      var instance = new request();
      assert.strictEqual(instance.defaultValues.port, 80, 'Port not equal to 80');
    });
  });

  describe('extractParameterMethodForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterMethodForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-003 not a string', function(){
      assert.throws(function(){instance.extractParameterMethodForRequest({method:956});}, 'REQ-003');
    });

    it('should throw exception REQ-004 string empty', function(){
      instance.defaultValues.method = '';
      assert.throws(function(){instance.extractParameterMethodForRequest({});}, 'REQ-004');
      assert.throws(function(){instance.extractParameterMethodForRequest({method:''});}, 'REQ-004');
    });

    it('should throw exception REQ-005 not valid', function(){
      instance.defaultValues.method = ' yolo ';
      assert.throws(function(){instance.extractParameterMethodForRequest({});}, 'REQ-005');
      assert.throws(function(){instance.extractParameterMethodForRequest({method:' yalo '});}, 'REQ-005');
    });

    it('should return correct method', function(){
      instance.defaultValues.method = ' pOst ';
      assert.strictEqual(instance.extractParameterMethodForRequest({}), 'POST');
      assert.strictEqual(instance.extractParameterMethodForRequest({method:' pUt '}), 'PUT');
    });
  });

  describe('extractParameterPathForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterPathForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-003 not a string', function(){
      assert.throws(function(){instance.extractParameterPathForRequest({path:956});}, 'REQ-003');
      assert.throws(function(){instance.extractParameterPathForRequest({pathPrefix:956});}, 'REQ-003');
    });

    it('should return correct path and pathPrefix', function(){
      instance.defaultValues.path = ' /la ';
      instance.defaultValues.pathPrefix = ' /v10 ';
      assert.strictEqual(instance.extractParameterPathForRequest({}), '/v10/la');
      assert.strictEqual(instance.extractParameterPathForRequest({path:' /lo '}), '/v10/lo');
      assert.strictEqual(instance.extractParameterPathForRequest({pathPrefix:' /v8 '}), '/v8/la');
      assert.strictEqual(instance.extractParameterPathForRequest({path:' /lo ', pathPrefix:' /v8 '}), '/v8/lo');
    });
  });

  describe('extractParameterHostnameForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterHostnameForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-003 not a string', function(){
      assert.throws(function(){instance.extractParameterHostnameForRequest({hostname:956});}, 'REQ-003');
    });

    it('should throw exception REQ-004 string empty', function(){
      instance.defaultValues.hostname = '';
      assert.throws(function(){instance.extractParameterHostnameForRequest({});}, 'REQ-004');
      assert.throws(function(){instance.extractParameterHostnameForRequest({hostname:''});}, 'REQ-004');
    });

    it('should return correct hostname', function(){
      instance.defaultValues.hostname = ' lelocal ';
      assert.strictEqual(instance.extractParameterHostnameForRequest({}), 'lelocal');
      assert.strictEqual(instance.extractParameterHostnameForRequest({hostname:' lautrelocal '}), 'lautrelocal');
    });
  });

  describe('extractParameterPortForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterPortForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-003 not a number', function(){
      assert.throws(function(){instance.extractParameterPortForRequest({port:"956"});}, 'REQ-003');
    });

    it('should throw exception REQ-007 port invalid', function(){
      instance.defaultValues.port = 99999999;
      assert.throws(function(){instance.extractParameterPortForRequest({});}, 'REQ-007');
      assert.throws(function(){instance.extractParameterPortForRequest({port:99999999});}, 'REQ-007');
    });

    it('should return correct port', function(){
      instance.defaultValues.port = 6534;
      assert.strictEqual(instance.extractParameterPortForRequest({}), 6534);
      assert.strictEqual(instance.extractParameterPortForRequest({port:9874}), 9874);
    });
  });

  describe('extractParameterHeadersForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterHeadersForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-002 not an object', function(){
      assert.throws(function(){instance.extractParameterHeadersForRequest({headers:'vnkzoe'});}, 'REQ-002');
    });

    it('should return correct headers', function(){
      instance.defaultValues.headers = {a:"a"};
      assert.deepEqual(instance.extractParameterHeadersForRequest({}), {a:"a"});
      assert.deepEqual(instance.extractParameterHeadersForRequest({headers:{b:"b"}}), {b:"b"});
    });
  });

  describe('extractParameterGetForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterGetForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-002 not an object', function(){
      assert.throws(function(){instance.extractParameterGetForRequest({get:'vnkzoe'});}, 'REQ-002');
    });

    it('should return correct get', function(){
      instance.defaultValues.get = {a:"a"};
      assert.deepEqual(instance.extractParameterGetForRequest({}), {a:"a"});
      assert.deepEqual(instance.extractParameterGetForRequest({get:{b:"b"}}), {b:"b"});
    });
  });

  describe('extractParameterPostForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterPostForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-002 not an object', function(){
      assert.throws(function(){instance.extractParameterPostForRequest({post:'vnkzoe'});}, 'REQ-002');
    });

    it('should return correct post', function(){
      instance.defaultValues.post = {a:"a"};
      assert.deepEqual(instance.extractParameterPostForRequest({}), {a:"a"});
      assert.deepEqual(instance.extractParameterPostForRequest({post:{b:"b"}}), {b:"b"});
    });
  });

  describe('extractParameterFilesForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterFilesForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-002 not an object', function(){
      assert.throws(function(){instance.extractParameterFilesForRequest({files:'vnkzoe'});}, 'REQ-002');
    });

    it('should throw exception REQ-010 file not found', function(){
      assert.throws(function(){instance.extractParameterFilesForRequest({files:{a:'vnkzoe'}});}, 'REQ-010');
    });

    it('should throw exception REQ-008 try to load directory but not enable', function(){
      assert.throws(function(){instance.extractParameterFilesForRequest({files:{a:__dirname}});}, 'REQ-008');
    });
    
    it.skip('should throw exception REQ-011 file error', function(){
      assert.throws(function(){instance.extractParameterFilesForRequest({files:{'a':__filename}});}, 'REQ-011');
    });

    it.skip('should throw exception REQ-009 not a file and not a directory', function(){
      assert.throws(function(){instance.extractParameterFilesForRequest({files:{'a':__filename}});}, 'REQ-009');
    });

    it('should return correct files', function(){
      instance.defaultValues.files = {a:__filename};
      var stats = require('fs').lstatSync(__filename);
      var defaultCorrectFiles = [
        {
          path: __filename,
          parameter: 'a',
          length: stats.size,
          name: 'request.js'
        }
      ];
      
      var customCorrectFiles = JSON.parse(JSON.stringify(defaultCorrectFiles));
      customCorrectFiles[0].parameter = 'b';

      assert.deepEqual(instance.extractParameterFilesForRequest({}), defaultCorrectFiles);
      assert.deepEqual(instance.extractParameterFilesForRequest({files:{b:__filename}}), customCorrectFiles);
    });

    it('should return correct files from directory', function(){
      instance.defaultValues.files = {a:__dirname};
      instance.enableDirectoryForFiles = true;

      var defaultCorrectFiles = [];
      var filesInDirectory = require('fs').readdirSync(__dirname);
      var maxFilesInDirectory = filesInDirectory.length;
      for(var idxFilesInDirectory = 0; idxFilesInDirectory < maxFilesInDirectory; idxFilesInDirectory++) {
        var _tmpPath = __dirname + '/' + filesInDirectory[idxFilesInDirectory];
        var statsFileInDirectory = require('fs').lstatSync(_tmpPath);

        defaultCorrectFiles.push({
          "path": _tmpPath,
          "parameter": 'a_' + idxFilesInDirectory,
          "length": statsFileInDirectory.size,
          "name": filesInDirectory[idxFilesInDirectory].replace(/\\/g,'/').replace( /.*\//, '' )
        });
      }
      
      var customCorrectFiles = JSON.parse(JSON.stringify(defaultCorrectFiles));
      customCorrectFiles[0].parameter = 'b_0';

      assert.deepEqual(instance.extractParameterFilesForRequest({}), defaultCorrectFiles);
      assert.deepEqual(instance.extractParameterFilesForRequest({files:{b:__dirname}}), customCorrectFiles);
    });
  });

  describe('handleParameterNameForFilesFromDirectory', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should return correct string', function(){
      assert.strictEqual(instance.handleParameterNameForFilesFromDirectory('toto', [], 1), 'toto_1');
    });
  });

  describe('extractParameterAuthForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterAuthForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-003 not a string', function(){
      assert.throws(function(){instance.extractParameterAuthForRequest({auth:956});}, 'REQ-003');
    });

    it('should return correct auth', function(){
      instance.defaultValues.auth = ' lelocal ';
      assert.strictEqual(instance.extractParameterAuthForRequest({}), ' lelocal ');
      assert.strictEqual(instance.extractParameterAuthForRequest({auth:' lautrelocal '}), ' lautrelocal ');
    });
  });

  describe('extractParameterHttpModuleForRequest', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should throw exception REQ-001 parameters undefined', function(){
      assert.throws(function(){instance.extractParameterHttpModuleForRequest();}, 'REQ-001');
    });

    it('should throw exception REQ-003 not a string', function(){
      assert.throws(function(){instance.extractParameterHttpModuleForRequest({httpModule:956});}, 'REQ-003');
    });

    it('should throw exception REQ-005 not valid', function(){
      instance.defaultValues.httpModule = ' yolo ';
      assert.throws(function(){instance.extractParameterHttpModuleForRequest({});}, 'REQ-005');
      assert.throws(function(){instance.extractParameterHttpModuleForRequest({httpModule:' yalo '});}, 'REQ-005');
    });
    
    it('should return correct httpModule', function(){
      instance.defaultValues.httpModule = 'http';
      assert.strictEqual(instance.extractParameterHttpModuleForRequest({}), 'http');
      assert.strictEqual(instance.extractParameterHttpModuleForRequest({httpModule:'https'}), 'https');
    });
  });

  describe('transformParameterGet', function(){
    var request = require('../../core/request.js');
    var instance = new request();

    it('should return correct string', function(){
      assert.strictEqual(instance.transformParameterGet({}), '');
      assert.strictEqual(instance.transformParameterGet({a:'b'}), '?a=b');
      assert.strictEqual(instance.transformParameterGet({a:'b', b:'c'}), '?a=b&b=c');
    });
  });

  describe('request rancoud.com', function(){
    var request = require('../../core/request.js');

    it('request on rancoud.com', function(done){
      var parameters = {
        method: 'GET',
        path: '/',
        hostname: 'rancoud.com'
      };
      var instance = new request();
      instance.request(parameters, function(error, data){
        assert.strictEqual(null, error, 'No error');
        done();
      });
    });
  });

  describe('request rancoud.com', function(){
    var request = require('../../core/request.js');

    it('request on rancoud.com', function(done){
      var parameters = {
        method: 'POST',
        path: '/',
        hostname: 'rancoud.com',
        post: {a:'b'}
      };
      var instance = new request();
      instance.request(parameters, function(error, data){
        assert.strictEqual(null, error, 'No error');
        done();
      });
    });
  });
  
  describe('request rancoud.com', function(){
    var request = require('../../core/request.js');

    it('request on rancoud.com', function(done){
      var parameters = {
        method: 'POST',
        path: '/',
        hostname: 'rancoud.com',
        files: {a: __filename},
        post: {c:'b'},
        auth: 'a'
      };
      var instance = new request();
      instance.request(parameters, function(error, data){
        assert.strictEqual(null, error, 'No error');
        done();
      });
    });
  });
  
/*
  describe('false request with stubs on request', function(){
    var request = require('../../core/request.js');

    it('do false request with stubs on request', function(done){
      var instance = new request();
      var stub = sinon.stub(instance, 'request');
      stub.yields(null, {count:4});

      instance.request(null, function(error, data){
        expect(data.count).to.be.equal(4);
        done();
      });
    });
  });
*/
});