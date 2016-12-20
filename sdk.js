require('colors');

String.prototype.ucfirst = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

function trimAndProtect(item) {
  item = item.trim();
  item = item.replace(/'/g,"\\'");

  return item;
}

function cleanStringForArray(value) {
  value = value.replace(/''/g, '');
  value = value.replace(/,{2,}/g, ',');
  value = value.replace(/^,/g, '');
  value = value.replace(/,$/g, '');
  
  return value;
}

function validate(value, validators) {
  if(validators.required && value.length < 1) {
    return false;
  }

  if(validators.default && value.length < 1) {
    return validators.default;
  }

  if(validators.values && validators.values.indexOf(value) === -1) {
    return false;
  }

  if(validators.format) {
    var idx = 0;
    var count = validators.format.length;
    for(; idx < count; idx++) {
      if(validators.format[idx] === 'comma separated') {
        value = value.trim();
        value = "'" + (value.split(',').map(trimAndProtect).join("','")) + "'";
        value = cleanStringForArray(value);
      }
      if(validators.format[idx] === 'uppercase') {
        value = value.toUpperCase();
      }
      if(validators.format[idx] === 'valid http url') {
        var info = require('url').parse(value);
        if(!info.hostname) {
          return false;
        }
      }
    }
  }
  
  return value;
}

function Sdk() {
  this.actionsAvailable = ['create','export','duplicate','delete'];
  this.typesAvailable = ['bot', 'folder', 'job', 'model'];
  this.action = null;
  this.type = null;
  this.botName = null;
  this.botClassName = null;
  this.path = null;
  this.botNameSrc = null;
  this.botNameDst = null;
  this.botFolderDst = null;
  this.folderToDelete = null;
  this.jobName = null;
  this.modelName = null;
  this.jobFile = null;
  this.modelFile = null;

  this.rootFolder = __dirname;
  this.botsInstalledFile = require('path').join(this.rootFolder, 'bots.json');
  this.botsInstalledJson = null;
  this.foldersToCreate = ['access_tokens', 'applications', 'docs', 'downloads', 'jobs', 'models', 'private_jobs', 'process_ids', 'rate_limits', require('path').join('test','bots')];
  this.maxDepthCopyFolder = 3;

  this.extractArguments();

  this.loadInstalledBots();

  this.checkCommand();

  this.execute();
}

Sdk.prototype.showHelp = function() {
  console.log("\n" + 'Sdk for RMasterBot.');

  console.log("\n" + 'Usage:');
  console.log("    " + 'node sdk create bot <bot_name> [bot_folder]');
  console.log("    " + 'node sdk create job <bot_name> <job_name>');
  console.log("    " + 'node sdk create model <bot_name> <model_name>');
  console.log("    " + 'node sdk export bot <bot_name> <path>');
  console.log("    " + 'node sdk duplicate bot <bot_name_src> <bot_name_dst> [bot_folder]');
  console.log("    " + 'node sdk delete bot <bot_name>');
  console.log("    " + 'node sdk delete folder <bot_folder>');

  console.log("\n" + 'Options:');
  console.log("    " + 'bot_name        bot name');
  console.log("    " + 'bot_name_src    bot name source');
  console.log("    " + 'bot_name_dst    bot name destination');
  console.log("    " + 'bot_folder      bot folder destination');
  console.log("    " + 'path            path to the folder for export');
  console.log("    " + 'job_name        job name');
  console.log("    " + 'model_name      model name');

  process.exit(1);
};

Sdk.prototype.extractArguments = function(){
  if(process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
    this.showHelp();
  }

  this.extractActionArgument();
  this.extractTypeArgument();
  this.extractOptionsArgument();
};

Sdk.prototype.extractActionArgument = function() {
  if(process.argv[2] === undefined) {
    this.stopProcess('No action');
  }

  if(this.actionsAvailable.indexOf(process.argv[2]) === -1) {
    this.stopProcess('action not recognize');
  }

  this.action = process.argv[2];
};

Sdk.prototype.extractTypeArgument = function() {
  if(process.argv[3] === undefined) {
    this.stopProcess('No type');
  }

  if(this.typesAvailable.indexOf(process.argv[3]) === -1) {
    this.stopProcess('type not recognize');
  }

  this.type = process.argv[3];
};

Sdk.prototype.extractOptionsArgument = function() {
  var method = 'extractOptions' + this.action.ucfirst() + this.type.ucfirst();
  if(this[method]) {
    this[method]();
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.extractOptionsCreateBot = function() {
  if(process.argv[4] === undefined) {
    this.stopProcess('bot_name is required');
  }

  this.botName = process.argv[4];
  this.botFolderDst = process.argv[5] || this.botName;
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.extractOptionsCreateJob = function() {
  if(process.argv[4] === undefined) {
    this.stopProcess('bot_name is required');
  }

  if(process.argv[5] === undefined) {
    this.stopProcess('job_name is required');
  }

  this.botName = process.argv[4];
  this.jobName = process.argv[5];
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.extractOptionsCreateModel = function() {
  if(process.argv[4] === undefined) {
    this.stopProcess('bot_name is required');
  }

  if(process.argv[5] === undefined) {
    this.stopProcess('model_name is required');
  }

  this.botName = process.argv[4];
  this.modelName = process.argv[5];
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.extractOptionsExportBot = function() {
  if(process.argv[4] === undefined) {
    this.stopProcess('bot_name and path is required');
  }

  if(process.argv[5] === undefined) {
    this.stopProcess('path is required');
  }

  this.botName = process.argv[4];
  this.path = process.argv[5];
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.extractOptionsDuplicateBot = function() {
  if(process.argv[4] === undefined) {
    this.stopProcess('bot_name_src and bot_name_dst is required');
  }

  if(process.argv[5] === undefined) {
    this.stopProcess('bot_name_dst is required');
  }

  this.botNameSrc = process.argv[4];
  this.botNameDst = process.argv[5];
  this.botFolderDst = process.argv[6] || this.botNameDst;
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.extractOptionsDeleteBot = function() {
  if(process.argv[4] === undefined) {
    this.stopProcess('bot_name is required');
  }

  this.botName = process.argv[4];
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.extractOptionsDeleteFolder = function() {
  if(process.argv[4] === undefined) {
    this.stopProcess('bot_folder is required');
  }

  this.folderToDelete = process.argv[4];
};

Sdk.prototype.loadInstalledBots = function() {
  if(this.isFileExists(this.botsInstalledFile)) {
    this.botsInstalledJson = JSON.parse(require('fs').readFileSync(this.botsInstalledFile, 'utf8'));
  }
  else {
    this.botsInstalledJson = [];
    require('fs').writeFileSync(this.botsInstalledFile, JSON.stringify(this.botsInstalledJson), 'utf8');
  }
};

Sdk.prototype.checkCommand = function() {
  var method = 'checkCommand' + this.action.ucfirst() + this.type.ucfirst();
  if(this[method]) {
    this[method]();
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.checkCommandCreateBot = function() {
  if(this.isBotNameExist(this.botName) === true) {
    this.stopProcess('bot_name already exist');
  }

  if(this.isBotFolderExist(this.botFolderDst) === true) {
    this.stopProcess('bot_folder already exist');
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.checkCommandCreateJob = function() {
  if(this.isBotNameExist(this.botName) === false) {
    this.stopProcess('bot_name not found');
  }

  if(this.isJobExist(this.jobName) === true) {
    this.stopProcess('job already exist');
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.checkCommandCreateModel = function() {
  if(this.isBotNameExist(this.botName) === false) {
    this.stopProcess('bot_name not found');
  }

  if(this.isModelExist(this.modelName) === true) {
    this.stopProcess('model already exist');
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.checkCommandExportBot = function() {
  if(this.isBotNameExist(this.botName) === false) {
    this.stopProcess('bot not found');
  }

  var stats = this.isFileExists(this.path);
  if(stats === false) {
    this.stopProcess('path not accessible');
  }
  if(stats.isDirectory() === false) {
    this.stopProcess('path is not a directory');
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.checkCommandDuplicateBot = function() {
  if(this.isBotNameExist(this.botNameSrc) === false) {
    this.stopProcess('bot source not found');
  }

  if(this.isBotNameExist(this.botNameDst) === true) {
    this.stopProcess('bot name destination already exist');
  }

  if(this.isBotFolderExist(this.botFolderDst) === true) {
    this.stopProcess('bot folder destination already exist');
  }

  if(this.botNameSrc === this.botFolderDst) {
    this.stopProcess('you can\'t duplicate same bot');
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.checkCommandDeleteBot = function() {
  this.folderToDelete = this.getBotFolder(this.botName);
  if(this.folderToDelete === false) {
    this.stopProcess('bot folder not found');
  }
};

Sdk.prototype.isBotNameExist = function(botName) {
  var idx = 0;
  var countBots = this.botsInstalledJson.length;

  for(; idx < countBots; idx++) {
    if(this.botsInstalledJson[idx].bot_name == botName) {
      return true;
    }
  }

  return false;
};

Sdk.prototype.isBotFolderExist = function(botFolder) {
  var idx = 0;
  var countBots = this.botsInstalledJson.length;

  for(; idx < countBots; idx++) {
    if(this.botsInstalledJson[idx].bot_folder == botFolder) {
      return true;
    }
  }

  return false;
};

Sdk.prototype.getBotFolder = function(botName) {
  var idx = 0;
  var countBots = this.botsInstalledJson.length;

  for(; idx < countBots; idx++) {
    if(this.botsInstalledJson[idx].bot_name == botName) {
      return this.botsInstalledJson[idx].bot_folder;
    }
  }

  return false;
};

Sdk.prototype.isJobExist = function(jobName) {
  var botFolder = this.getBotFolder(this.botName);
  this.jobFile = require('path').join(this.rootFolder, 'jobs', botFolder, jobName + '.js');

  return this.isFileExists(this.jobFile) !== false;
};

Sdk.prototype.isModelExist = function(modelName) {
  var botFolder = this.getBotFolder(this.botName);
  this.modelFile = require('path').join(this.rootFolder, 'models', botFolder, modelName.ucfirst() + '.js');

  return this.isFileExists(this.modelFile) !== false;
};

Sdk.prototype.execute = function () {
  var method = 'execute' + this.action.ucfirst() + this.type.ucfirst();
  if(this[method]) {
    this[method]();
  }
  else {
    this.stopProcess(method + ' is not implement');
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.executeCreateBot = function() {
  var that = this;
  var questions = [
    {n:0, log:'===== Wizard ====='},
    {n:1, log:'colors rules: ' + 'required'.red + ' / ' + 'optional'.cyan + ' / ' + 'default value'.yellow},
    {n:2, pass:true},
    {n:3, log:'--- API URL ---'},
      {n:4, q:'base url (https://example.com): '.red, a:'', validators:{required:true, format:['valid http url']}},
      {n:5, q:'prefix (api version): '.cyan, a:'', validators:{}},
    {n:6, pass:true},
    {n:7, log:'--- RATE LIMITS ---'},
      {n:8, q:'max request: '.cyan, a:'', validators:{}},
      {n:9, q:'window time for request in minuts: '.cyan, a:'', validators:{}},
    {n:10, pass:true},
    {n:11, log:'--- ATS ---'},
      {n:12, q:'use ats (yes/no): '.red, a:'', validators:{values:['yes','no']}, jumpno:13},
      {n:13, q:'scopes (comma separated): '.cyan, a:'', validators:{format:['comma separated']}},
    {n:14, log:'--- CONFIGURATION ---'},
      {n:15, q:'use configuration (yes/no): '.red, a:'', validators:{values:['yes','no']}, jumpno:16},
      {n:16, q:'key:value (comma separated): '.cyan, a:'', validators:{format:['comma separated']}}
  ];
  var countQuestions = questions.length;
  var idx = 0;
  this.botClassName = this.botName.ucfirst();
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.clearLine(process.stdout, 0);

  function releaseReadline() {
    rl.clearLine(process.stdout, 0);
    rl.close();
  }

  function next() {
    idx++;

    if(idx < countQuestions) {
      ask();
    }
    else {
      releaseReadline();
      that.createBotFiles(questions);
    }
  }

  function ask() {
    if(questions[idx].pass) {
      console.log('');
      next();
    }
    else if(questions[idx].jump) {
      idx = questions[idx].jump;
      next();
    }
    else if(questions[idx].log) {
      that.logInfo(questions[idx].log);
      next();
    }
    else {
      rl.question(questions[idx].q, function (answer) {
        answer = validate(answer, questions[idx].validators);
        if (answer === false) {
          console.log('Incorrect value'.red);
          ask();
        }
        else {
          questions[idx].a = answer;
          if(questions[idx].a == 'no' && questions[idx].jumpno) {
            idx = questions[idx].jumpno;
          }
          next();
        }
      });
    }
  }

  ask();
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.executeCreateJob = function() {
  var jobNameUcfirst = this.jobName.ucfirst();
  var botNameUcfirst = this.botName.ucfirst();
  var fileContent = `/*
 ${this.jobName}

 Usage:
   node job <bot_name> ${this.jobName} (-a | --app) <app_name> (-u | --user) <user_name>

 API endpoint used:
   GET /

 Scope:
   xxx
*/
/**
 * @param {${botNameUcfirst}} bot
 * @param {string[]} extraArguments
 * @param {Job~Callback} callback
 */
module.exports = function(bot, extraArguments, callback) {
  bot.${this.jobName}(function (error, data) {
    if(error) {
      if(callback) {
        callback(error, null);
      }
      return;
    }

    if(callback) {
      callback(null, data);
    }
  });
};`;

  require('fs').writeFileSync(this.jobFile, fileContent);
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.executeCreateModel = function() {
  var modelNameUcfirst = this.modelName.ucfirst();
  var fileContent = `/**
 * ${modelNameUcfirst} Model
 * @class ${modelNameUcfirst}
 * @param {${modelNameUcfirst}~Json} ${this.modelName} json of the ${this.modelName}
 * @constructor
 */
function ${modelNameUcfirst}(${this.modelName}) {
  this.${this.modelName} = ${this.modelName};
}

/**
 * @return {${modelNameUcfirst}~Json|*}
 */
${modelNameUcfirst}.prototype.getJson = function() {
  return this.${this.modelName};
};

/**
 * @return {string}
 */
${modelNameUcfirst}.prototype.getId = function() {
  return this.${this.modelName}.id;
};

module.exports = ${modelNameUcfirst};

/**
 * ${modelNameUcfirst} Json
 * @typedef {Object} ${modelNameUcfirst}~Json
 * @property {string} id
 */`;

  require('fs').writeFileSync(this.modelFile, fileContent);
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.executeExportBot = function() {
  var botFolder = this.getBotFolder(this.botName);
  var srcInstallJson = require('path').join(this.rootFolder, 'installs', this.botName.toLowerCase() + '.json');
  var dstInstallJson = require('path').join(this.path, 'install.json');
  var folders = ['applications','docs','jobs','models','test'];
  var idx = 0;
  var countFolders = folders.length;
  var pathToCreate;
  var pathToCopy;
  var pathToPaste;
  
  this.copyFile(srcInstallJson, dstInstallJson);

  for(; idx < countFolders; idx++) {
    pathToCreate = require('path').join(this.path, folders[idx]);
    this.createFolder(pathToCreate);

    pathToCopy = require('path').join(this.rootFolder, folders[idx], botFolder);
    pathToPaste = require('path').join(this.path, folders[idx]);
    if(folders[idx] === 'test') {
      pathToCopy = require('path').join(this.rootFolder, folders[idx], 'bots', botFolder);
    }
    this.copyFilesRecursive(pathToCopy, pathToPaste);
  }
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.executeDuplicateBot = function() {
  var idx = 0;
  var countFolders = this.foldersToCreate.length;
  var src;
  var dst;

  for(; idx < countFolders; idx++) {
    src = require('path').join(this.rootFolder, this.foldersToCreate[idx], this.botNameSrc);
    dst = require('path').join(this.rootFolder, this.foldersToCreate[idx], this.botNameDst);
    this.createFolder(dst);
    this.copyFilesRecursive(src, dst);
  }

  src = require('path').join(this.rootFolder, 'installs', this.botNameSrc.toLowerCase() + '.json');
  dst = require('path').join(this.rootFolder, 'installs', this.botNameDst.toLowerCase() + '.json');
  var fileContent = JSON.parse(require('fs').readFileSync(src, 'utf8'));
  fileContent.bot_name = this.botNameDst;
  fileContent.bot_folder = this.botFolderDst;
  require('fs').writeFileSync(dst , JSON.stringify(fileContent));

  this.saveDuplicateBotInInstalledJson();

  this.end();
};

//noinspection JSUnusedGlobalSymbols
Sdk.prototype.executeDeleteBot = function() {
  this.executeDeleteFolder();
  this.deleteBotInInstalledJson(this.botName);

  require('fs').unlinkSync(require('path').join(this.rootFolder, 'installs', this.botName.toLowerCase() + '.json'));
};

Sdk.prototype.executeDeleteFolder = function() {
  var idx = 0;
  var maxFolders = this.foldersToCreate.length;

  for(; idx < maxFolders; idx++){
    this.deleteFolderRecursive(require('path').join(this.rootFolder, this.foldersToCreate[idx], this.folderToDelete));
  }
};

Sdk.prototype.createBotFiles = function(parameters){
  var idx = 0;
  var countFolders = this.foldersToCreate.length;
  var pathToCreate;

  for(; idx < countFolders; idx++) {
    pathToCreate = require('path').join(this.rootFolder, this.foldersToCreate[idx], this.botFolderDst.toLowerCase());
    this.createFolder(pathToCreate);
  }

  require('fs').writeFileSync(require('path').join(this.rootFolder, 'applications', this.botFolderDst.toLowerCase(), 'main.js'), this.completeMainFile(parameters));
  require('fs').writeFileSync(require('path').join(this.rootFolder, 'installs', this.botName.toLowerCase() + '.json'), this.completeInstallFile(parameters));

  this.saveNewBotInInstalledJson();

  this.end();
};

Sdk.prototype.completeMainFile = function(parameters) {
  var info = require('url').parse(parameters[4].a);
  var httpModule = '';
  var pathPrefix = '';
  var port = '';
  var scopes = '';
  var remainingRequest = '';
  var remainingTime = '';

  if(info.protocol == 'https:') {
    httpModule = "\n"+`  this.defaultValues.httpModule = 'https';`;
    port = "\n"+`  this.defaultValues.port = 443;`;
    if(info.port) {
      port = "\n"+`  this.defaultValues.port = ${info.port};`;
    }
  }
  else if(info.protocol == 'http:') {
    httpModule = "\n"+`  this.defaultValues.httpModule = 'http';`;
    port = "\n"+`  this.defaultValues.port = 80;`;
    if(info.port) {
      port = "\n"+`  this.defaultValues.port = ${info.port};`;
    }
  }
  else {
    httpModule = "\n"+`  this.defaultValues.httpModule = '${info.protocol.replace(':','')}';`;
    if(info.port) {
      port = "\n"+`  this.defaultValues.port = ${info.port};`;
    }
  }

  if(parameters[5].a.length > 0) {
    pathPrefix = "\n"+`  this.defaultValues.pathPrefix = '${parameters[5].a}';`;
  }

  if(parameters[13].a.length > 0) {
    scopes = "\n"+`  this.defaultValues.scopes = ${parameters[13].a};`;
  }

  if(parameters[8].a.length > 0) {
    remainingRequest = "\n"+`  this.defaultValues.defaultRemainingRequest = ${parameters[8].a};`;
  }

  if(parameters[9].a.length > 0) {
    remainingTime = "\n"+`  this.defaultValues.defaultRemainingTime = 60*${parameters[9].a};`;
  }

  var ats = `
/**
 * Add access token to query parameters
 * @param {Bot~doRequestParameters} parameters
 */
${this.botClassName}.prototype.addQueryAccessToken = function(parameters) {
  get.access_token = this.accessToken.access_token;

  return get;
};

/**
 * Get remaining requests from result 
 * @param {Request~Response} resultFromRequest
 * @return {Number}
 */
${this.botClassName}.prototype.getRemainingRequestsFromResult = function(resultFromRequest) {
  throw this.RError('XXX-008', "Implement getRemainingRequestsFromResult");
  // return resultFromRequest.headers['x-ratelimit-remaining'] >> 0;
};

/**
 * Get url for Access Token when you have to authorize an application
 * @param {string} scopes
 * @return {string} url
 */
${this.botClassName}.prototype.getAccessTokenUrl = function(scopes) {
  throw this.RError('XXX-005', "Implement getAccessTokenUrl");
  /*
  return 'https://example.com/oauth/?'
    + 'response_type=code&'
    + 'redirect_uri=' + this.currentConfiguration.callback_url + '&'
    + 'client_id=' + this.currentConfiguration.consumer_key + '&'
    + 'scope=' + this.getScopeForAccessTokenServer(scopes);
  */
};

/**
 * Extract response in data for Access Token
 * @param {Object} req request from local node server
 * @return {*} code or something from response
 */
${this.botClassName}.prototype.extractResponseDataForAccessToken = function(req) {
  throw this.RError('XXX-006', "Implement extractResponseDataForAccessToken");
  /*
  var query = require('url').parse(req.url, true).query;

  if(query.code === undefined) {
    return null;
  }

  return query.code;
  */
};

/**
 * Request Access Token after getting code
 * @param {string} responseData
 * @param {Bot~requestAccessTokenCallback} callback
 */
${this.botClassName}.prototype.requestAccessToken = function(responseData, callback) {
  throw this.RError('XXX-007', "Implement requestAccessToken");
  /*
  var uri = 'grant_type=authorization_code&'
    + 'client_id=' + this.currentConfiguration.consumer_key + '&'
    + 'client_secret=' + this.currentConfiguration.consumer_secret + '&'
    + 'code=' + responseData;

  var params = {
    method: 'POST',
    path: 'oauth/token?' + uri
  };

  this.request(params, function(error, result){
    if(error) {
      callback(error, null);
      return;
    }

    if(result.statusCode === 200) {
      callback(null, JSON.parse(result.data));
    }
    else {
      callback(JSON.parse(result.data), null);
    }
  });
  */
};

/**
 * getAccessTokenFromAccessTokenData
 * @param {*} accessTokenData
 * @return {*}
 */
${this.botClassName}.prototype.getAccessTokenFromAccessTokenData = function(accessTokenData) {
  throw this.RError('XXX-009', "Implement getAccessTokenFromAccessTokenData");
  // return accessTokenData.access_token;
};

/**
 * getTypeAccessTokenFromAccessTokenData
 * @param {*} accessTokenData
 * @return {*}
 */
${this.botClassName}.prototype.getTypeAccessTokenFromAccessTokenData = function(accessTokenData) {
  throw this.RError('XXX-010', "Implement getTypeAccessTokenFromAccessTokenData");
  //noinspection JSUnresolvedVariable
  // return accessTokenData.token_type;
};

/**
 * getUserForNewAccessToken
 * @param {*} formatAccessToken
 * @param {Bot~getUserForNewAccessTokenCallback} callback
 */
${this.botClassName}.prototype.getUserForNewAccessToken = function(formatAccessToken, callback) {
  throw this.RError('XXX-011', "Implement getUserForNewAccessToken");
  /*
  var that = this;

  that.setCurrentAccessToken(formatAccessToken.access_token);
  that.verifyAccessTokenScopesBeforeCall = false;
  this.me(function(err, user){
    that.verifyAccessTokenScopesBeforeCall = true;
    if(err) {
      callback(err, null);
    }
    else {
      var username = (user !== null) ? user.getUsername() : null;
      callback(null, username);
    }
  });
  */
};` + "\n\n";

  if(parameters[12].a === 'no') {
    ats = '';
  }

  return `var Bot = require(require('path').join('..','..','core','bot.js'));

/**
 * ${this.botClassName} Bot
 * @class ${this.botClassName}
 * @augments Bot
 * @param {string} name
 * @param {string} folder
 * @param {${this.botClassName}~Configuration[]} allConfigurations
 * @constructor
 */
function ${this.botClassName}(name, folder, allConfigurations){
  Bot.call(this, name, folder, allConfigurations);

  this.defaultValues.hostname = '${info.hostname}';
  ${httpModule}${pathPrefix}${port}${scopes}
  ${remainingRequest}${remainingTime}
}

${this.botClassName}.prototype = new Bot();
${this.botClassName}.prototype.constructor = ${this.botClassName};

/**
 * Prepare and complete parameters for request
 * @param {Bot~doRequestParameters} parameters
 * @param {Bot~requestCallback|*} callback
 */
${this.botClassName}.prototype.prepareRequest = function(parameters, callback) {
  this.doRequest(parameters, callback);
};

/**
 * API example
 * @param {${this.botClassName}~requestCallback} callback
 */
${this.botClassName}.prototype.example = function(callback) {
  var params = {
    method: 'GET',
    path: 'example'
  };

  this.prepareRequest(params, callback);
};

${ats}module.exports = ${this.botClassName};

/**
 * ${this.botClassName} Configuration
 * @typedef {Object} ${this.botClassName}~Configuration
 * @property {string} name
 * @property {string} consumer_key
 * @property {string} consumer_secret
 * @property {string} access_token
 * @property {string} callback_url
 * @property {string} scopes
 */
/**
 * Request callback
 * @callback ${this.botClassName}~requestCallback
 * @param {Error|string|null} error - Error
 * @param {*} data
 */
`;
};

Sdk.prototype.completeInstallFile = function(parameters) {
  return JSON.stringify({
    bot_name : this.botName,
    bot_folder : this.botFolderDst,
    configuration : {
      name:"string"
    }
  });
};

Sdk.prototype.saveNewBotInInstalledJson = function(){
  this.botsInstalledJson.push({
    bot_name: this.botName,
    bot_folder: this.botFolderDst,
    configurations: [],
  });

  require('fs').writeFileSync(this.botsInstalledFile, JSON.stringify(this.botsInstalledJson));
};

Sdk.prototype.deleteBotInInstalledJson = function(botName){
  var idx = 0;
  var countBots = this.botsInstalledJson.length;
  var tmp = [];

  for(; idx < countBots; idx++) {
    if(this.botsInstalledJson[idx].bot_name != botName) {
      tmp.push(this.botsInstalledJson[idx]);
    }
  }
  
  require('fs').writeFileSync(this.botsInstalledFile, JSON.stringify(tmp));
};

Sdk.prototype.saveDuplicateBotInInstalledJson = function() {
  var idx = 0;
  var countBots = this.botsInstalledJson.length;
  var bot = {};
  
  bot.bot_name = this.botNameDst;
  bot.bot_folder = this.botFolderDst;
  bot.configurations = [];

  for(; idx < countBots; idx++) {
    if(this.botsInstalledJson[idx].bot_name == this.botNameDst) {
      bot.configurations = this.botsInstalledJson[idx].configurations;
      if(this.botsInstalledJson[idx].packages) {
        bot.packages = this.botsInstalledJson[idx].packages;
      }
    }
  }

  this.botsInstalledJson.push(bot);
  
  require('fs').writeFileSync(this.botsInstalledFile , JSON.stringify(this.botsInstalledJson));
};

Sdk.prototype.createFolder = function (dst) {
  try {
    var stats = this.isFileExists(dst);
    if(stats === false || stats.isDirectory() === false) {
      require('fs').mkdirSync(dst);
    }
  }
  catch(e) {
    this.stopProcess(e.toString());
  }
};

Sdk.prototype.end = function() {
  this.logInfo('Done');
};

Sdk.prototype.logInfo = function(string) {
  require('npmlog').info('SDK', string);
};

Sdk.prototype.stopProcess = function(exception) {
  require('npmlog').error('SDK', exception);
  process.exit(-1);
};

Sdk.prototype.isFileExists = function(path) {
  try {
    return require('fs').lstatSync(path);
  }
  catch(e){
    return false;
  }
};

Sdk.prototype.deleteFolderRecursive = function(path) {
  var that = this;
  var files = [];
  var currentPath;

  if(that.isFileExists(path)) {
    files = require('fs').readdirSync(path);
    files.forEach(function(file){
      currentPath = path + "/" + file;
      if(that.isFileExists(currentPath).isDirectory()) {
        that.deleteFolderRecursive(currentPath);
      }
      else {
        require('fs').unlinkSync(currentPath);
      }
    });
    require('fs').rmdirSync(path);
  }
};

Sdk.prototype.copyFilesRecursive = function(srcPath, destPath, depth) {
  var that = this;
  var files = [];
  var newSrcPath;
  var newDestPath;

  if(depth > this.maxDepthCopyFolder) {
    this.stopProcess('Depth copy folder exceded');
  }

  if(that.isFileExists(srcPath)) {
    files = require('fs').readdirSync(srcPath);
    files.forEach(function(file){
      newSrcPath = require('path').join(srcPath, file);
      newDestPath = require('path').join(destPath, file);

      if(that.isFileExists(newSrcPath).isDirectory()) {
        depth++;

        if (that.isFileExists(newDestPath) === false || that.isFileExists(newDestPath).isDirectory() === false) {
          try {
            require('fs').mkdirSync(newDestPath);
          }
          catch(e) {
            that.stopProcess(e.toString());
          }
        }

        that.copyFilesRecursive(newSrcPath, newDestPath, depth);
      }
      else {
        that.copyFile(newSrcPath, newDestPath);
      }
    });
  }
};

Sdk.prototype.copyFile = function(src, dst) {
  var fileContent = require('fs').readFileSync(src, 'utf8');
  require('fs').writeFileSync(dst , fileContent);
};

new Sdk();