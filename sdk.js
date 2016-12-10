function trimAndProtect(item) {
  item = item.trim();
  item = item.replace(/\'/g,"\\'");

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
    }
  }
  
  return value;
}

function Sdk() {
  this.action = null;
  this.botName = null;
  this.path = null;
  this.botNameSrc = null;
  this.botNameDst = null;
  this.botFolderDst = null;
  this.hasToConfirmEraseBotNameDst = false;
  this.hasToConfirmEraseBotFolderDst = false;

  this.rootFolder = __dirname;
  this.botsInstalledFile = require('path').join(this.rootFolder, 'bots.json');
  this.botsInstalledJson = null;
  this.foldersToCreate = ['access_tokens', 'applications', 'docs', 'downloads', 'jobs', 'models', 'private_jobs', 'process_ids', 'rate_limits'];
  this.maxDepthCopyFolder = 3;

  this.extractArguments();

  this.loadInstalledBots();

  this.checkArguments();

  this.launch();
}

Sdk.prototype.showHelp = function() {
  console.log("\n" + 'Sdk for RMasterBot.');

  console.log("\n" + 'Usage:');
  console.log("    " + 'node sdk create <bot_name> [bot_folder]');
  console.log("    " + 'node sdk duplicate <bot_name_src> <bot_name_dst> [bot_folder]');
  //console.log("    " + 'node sdk export <bot_name> <path>');

  console.log("\n" + 'Options:');
  console.log("    " + 'bot_name        bot name');
  console.log("    " + 'bot_name_src    bot name source');
  console.log("    " + 'bot_name_dst    bot name destination');
  console.log("    " + 'bot_folder      bot folder destination');
  console.log("    " + 'path            path to the folder for export');

  process.exit(1);
};

Sdk.prototype.extractArguments = function(){
  var idx = 3;
  var argc = process.argv.length;
  var actions = ['create','export','duplicate'];

  if(process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
    this.showHelp();
  }

  if(process.argv[2] === undefined) {
    this.stopProcess('No action');
  }

  this.action = process.argv[2];

  if(actions.indexOf(this.action) === -1) {
    this.stopProcess('action not recognize');
  }

  if(this.action === 'create') {
    if(process.argv[3] === undefined) {
      this.stopProcess('bot_name is required');
    }

    this.botName = process.argv[3];
    this.botFolderDst = process.argv[4] || this.botName;
  }
  else if(this.action === 'duplicate') {
    if(process.argv[3] === undefined) {
      this.stopProcess('bot_name_src and bot_name_dst is required');
    }

    if(process.argv[4] === undefined) {
      this.stopProcess('bot_name_dst is required');
    }

    this.botNameSrc = process.argv[3];
    this.botNameDst = process.argv[4];
    this.botFolderDst = process.argv[5] || this.botName;
  }
  else if(this.action === 'export') {
    if(process.argv[3] === undefined) {
      this.stopProcess('bot_name and path is required');
    }

    if(process.argv[4] === undefined) {
      this.stopProcess('path is required');
    }

    this.botName = process.argv[3];
    this.path = process.argv[4];
  }
};

Sdk.prototype.stopProcess = function(exception) {
  require('npmlog').error('SDK', exception);
  process.exit(-1);
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

Sdk.prototype.checkArguments = function() {
  var stats;

  if(this.action === 'create') {
    if(this.isBotNameExist(this.botName) === true) {
      this.stopProcess('bot name already exist');
    }

    if(this.isBotFolderExist(this.botFolderDst) === true) {
      this.stopProcess('bot folder already exist');
    }
  }
  else if(this.action === 'export' && this.isBotNameExist(this.botName) === false) {
    this.stopProcess('bot not found');
  }

  if(this.path !== null) {
    try {
      stats = require('fs').lstatSync(this.path);
      if (stats.isDirectory() === false) {
        this.stopProcess('path not a directory');
      }
    }
    catch (e) {
      this.stopProcess('path not found');
    }
  }

  if(this.botNameSrc !== null) {
    if(this.isBotNameExist(this.botNameSrc) === false) {
      this.stopProcess('bot not found');
    }
  }

  if(this.botNameDst !== null) {
    if(this.isBotNameExist(this.botNameDst) === true) {
      this.hasToConfirmEraseBotNameDst = true;
    }
    
    if(this.isBotFolderExist(this.botFolderDst) === true) {
      this.hasToConfirmEraseBotFolderDst = true;
    }
    
    if(this.botNameSrc === this.botFolderDst) {
      this.stopProcess('you can\'t duplicate same bot');
    }
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

Sdk.prototype.launch = function () {
  if(this.action === 'create') {
    this.launchCreate();
  }
  else if(this.action === 'duplicate') {
    if(this.hasToConfirmEraseBotNameDst === true) {
      this.askConfirmEraseBotNameDst();
    }
    else if(this.hasToConfirmEraseBotFolderDst === true) {
      this.askConfirmEraseBotFolderDst();
    }
    else {
      this.launchDuplicate();
    }
  }
  else if(this.action === 'export') {
    this.launchExport();
  }
};

Sdk.prototype.launchCreate = function () {
  this.askInformationsForCreateBot();
};

Sdk.prototype.askInformationsForCreateBot = function() {
  var that = this;
  var questions = [
    {q:'api hostname: ', a:'', validators:{required:true}},
    {q:'http OR https: (https) ', a:'', validators:{values:['http','https'],default:'https'}},
    {q:'api prefix: ', a:'', validators:{}},
    {q:'http methods (comma separated): ', a:'', validators:{format:['comma separated','uppercase']}},
    {q:'scopes (comma separated): ', a:'', validators:{format:['comma separated']}},
    {q:'max request: ', a:'', validators:{}},
    {q:'window time for request in minuts: ', a:'', validators:{}},
    {q:'use ats (yes/no) : ', a:'', validators:{values:['yes','no']}}
  ];
  var countQuestions = questions.length;
  var idx = 0;
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.clearLine(process.stdout, 0);

  function next() {
    idx++;

    if(idx < countQuestions) {
      ask();
    }
    else {
      that.createBot(questions);
    }
  }

  function ask() {
    rl.question(questions[idx].q, function (answer) {
      answer = validate(answer ,questions[idx].validators);
      if(answer === false) {
        console.log('Incorrect value');
        ask();
      }
      else {
        questions[idx].a = answer;
        next();
      }
    });
  }
  ask();
};

Sdk.prototype.createBot = function(parameters){
  var idx = 0;
  var countFolders = this.foldersToCreate.length;
  var pathToCreate;
  var mainFileContent;

  for(; idx < countFolders; idx++) {
    pathToCreate = require('path').join(this.rootFolder, this.foldersToCreate[idx], this.botFolderDst);
    //this.createFolder(pathToCreate);
  }

  mainFileContent = this.completeMainFile(parameters);
  //require('fs').writeFileSync(require('path').join(this.rootFolder, 'applications', this.botFolderDst, 'main.js'), mainFile);
  console.log(mainFileContent);

  //this.saveNewBotInInstalledJson();
  this.end();
};

Sdk.prototype.completeMainFile = function(parameters) {
  var methods = '';
  if(parameters[3].a.length > 0) {
    methods = "\n"+`  this.validHttpMethods = [${parameters[3].a}];` + "\n";
  }

  var port = '';
  /*if(parameters[4].a.length > 0) {
    port = `this.defaultValues.port = ${parameters[3].a};`;
  }*/

  var pathPrefix = '';
  if(parameters[2].a.length > 0) {
    pathPrefix = "\n"+`  this.defaultValues.pathPrefix = '${parameters[2].a}';`;
  }

  var httpModule = '';
  if(parameters[1].a.length > 0) {
    httpModule = "\n"+`  this.defaultValues.httpModule = '${parameters[1].a}';`;
  }

  var scopes = '';
  if(parameters[4].a.length > 0) {
    scopes = "\n"+`  this.defaultValues.scopes = ${parameters[4].a};`;
  }

  var remainingRequest = '';
  if(parameters[5].a.length > 0) {
    remainingRequest = "\n"+`  this.defaultValues.defaultRemainingRequest = ${parameters[5].a};`;
  }

  var remainingTime = '';
  if(parameters[6].a.length > 0) {
    remainingTime = "\n"+`  this.defaultValues.defaultRemainingTime = 60*${parameters[6].a};`;
  }

  var ats = `${this.botName}.prototype.addQueryAccessToken = function(get) {
  get.access_token = this.accessToken.access_token;

  return get;
};

${this.botName}.prototype.getRemainingRequestsFromResult = function(resultFromRequest) {
  throw this.RError('XXX-009', "Implement getRemainingRequestsFromResult");
};

${this.botName}.prototype.getAccessTokenUrl = function(scopes) {
  throw this.RError('XXX-006', "Implement getAccessTokenUrl");
};

${this.botName}.prototype.extractResponseDataForAccessToken = function(req) {
  throw this.RError('XXX-007', "Implement extractResponseDataForAccessToken");
};

${this.botName}.prototype.requestAccessToken = function(responseData, callback) {
  throw this.RError('XXX-008', "Implement requestAccessToken");
};

${this.botName}.prototype.getAccessTokenFromAccessTokenData = function(accessTokenData) {
  throw this.RError('XXX-010', "Implement getAccessTokenFromAccessTokenData");
};

${this.botName}.prototype.getTypeAccessTokenFromAccessTokenData = function(accessTokenData) {
  throw this.RError('XXX-011', "Implement getTypeAccessTokenFromAccessTokenData");
};

${this.botName}.prototype.getUserForNewAccessToken = function(formatAccessToken, callback) {
  throw this.RError('XXX-012', "Implement getUserForNewAccessToken");
};` + "\n\n";

  if(parameters[7].a === 'no') {
    ats = '';
  }
  
  return `var Bot = require(require('path').join('..','..','core','bot.js'));

function ${this.botName}(name, folder, allConfigurations){
  Bot.call(this, name, folder, allConfigurations);
  ${methods}
  this.defaultValues.hostname = '${parameters[0].a}';
  ${httpModule}${pathPrefix}${port}${scopes}
  ${remainingRequest}${remainingTime}
}

${this.botName}.prototype = new Bot();
${this.botName}.prototype.constructor = ${this.botName};

/**
 * Prepare and complete parameters for request
 * @param {Bot~doRequestParameters} parameters
 * @param {Bot~requestCallback|*} callback
 */
${this.botName}.prototype.prepareRequest = function(parameters, callback) {
  this.doRequest(parameters, callback);
};

/**
 * API example
 * @param {${this.botName}~requestCallback} callback
 */
${this.botName}.prototype.example = function(callback) {
  var params = {
    method: 'GET'
    path: 'example',
  };

  this.prepareRequest(params, callback);
};

${ats}module.exports = ${this.botName};`;
};

Sdk.prototype.saveNewBotInInstalledJson = function(){
  console.log('saveNewBotInInstalledJson');

  this.end();
};

Sdk.prototype.askConfirmEraseBotNameDst = function() {
  var that = this;
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.clearLine(process.stdout, 0);

  console.log('Bot Name destination already exist');
  function ask() {
    rl.question('Do you do erase it? (yes/no/quit) ', function (answer) {
      answer = answer.toLowerCase();
      if(answer == 'yes' || answer == 'y') {
        if(that.hasToConfirmEraseBotFolderDst === true) {
          that.askConfirmEraseBotFolderDst();
        }
        else {
          that.launchDuplicate();
        }
        return;
      }

      if(answer == 'no' || answer == 'n' || answer == 'quit' || answer == 'q') {
        that.stopProcess('Stop by user');
      }
    });
  }
  ask();
};

Sdk.prototype.askConfirmEraseBotFolderDst = function() {
  var that = this;
  var rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.clearLine(process.stdout, 0);

  console.log('Bot Folder destination already exist');
  function ask() {
    rl.question('Do you do erase it? (yes/no/quit) ', function (answer) {
      answer = answer.toLowerCase();
      if(answer == 'yes' || answer == 'y') {
        that.launchDuplicate();
        return;
      }

      if(answer == 'no' || answer == 'n' || answer == 'quit' || answer == 'q') {
        that.stopProcess('Stop by user');
      }
    });
  }
  ask();
};

Sdk.prototype.launchDuplicate = function () {
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

  src = require('path').join(this.rootFolder, 'installs', this.botNameSrc + '.json');
  dst = require('path').join(this.rootFolder, 'installs', this.botNameDst + '.json');

  this.copyFile(src, dst);

  this.saveDuplicateBotInInstalledJson();

  this.end();
};

Sdk.prototype.launchExport = function () {
  // take all folder and format and copy to destination
};

Sdk.prototype.saveDuplicateBotInInstalledJson = function() {
  var idx = 0;
  var countBots = this.botsInstalledJson.length;
  var bot = {};
  
  if(this.hasToConfirmEraseBotNameDst === true && this.hasToConfirmEraseBotFolderDst === false) {
    for(; idx < countBots; idx++) {
      if(this.botsInstalledJson[idx].bot_name == this.botNameDst) {
        this.botsInstalledJson[idx].bot_folder = this.botFolderDst;
      }
    }
  }
  else if(this.hasToConfirmEraseBotNameDst === false && this.hasToConfirmEraseBotFolderDst === true) {
    for(; idx < countBots; idx++) {
      if(this.botsInstalledJson[idx].bot_folder == this.botFolderDst) {
        this.botsInstalledJson[idx].bot_name = this.botNameDst;
      }
    }
  }
  else if(this.hasToConfirmEraseBotNameDst === false && this.hasToConfirmEraseBotFolderDst === false) {
    bot.bot_name = this.botNameDst;
    bot.bot_folder = this.botFolderDst;

    for(; idx < countBots; idx++) {
      if(this.botsInstalledJson[idx].bot_name == this.botNameDst) {
        bot.configurations = this.botsInstalledJson[idx].configurations;
        if(this.botsInstalledJson[idx].packages) {
          bot.packages = this.botsInstalledJson[idx].packages;
        }
      }
    }

    this.botsInstalledJson.push(bot);
  }
  
  require('fs').writeFileSync(this.botsInstalledFile , this.botsInstalledJson);
};

Sdk.prototype.createFolder = function (dst) {
  try {
    require('fs').mkdirSync(dst);
  }
  catch(e) {
    this.stopProcess(e.toString());
  }
};

Sdk.prototype.copyFilesRecursive = function(srcPath, destPath, depth) {
  var that = this;
  var files = [];
  var newSrcPath;
  var newDestPath;
  var fileContent;

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

Sdk.prototype.isFileExists = function(path) {
  try {
    return require('fs').lstatSync(path);
  }
  catch(e){
    return false;
  }
};

Sdk.prototype.end = function() {
  this.logInfo('Done');
  process.exit(0);
};

Sdk.prototype.logInfo = function(string) {
  require('npmlog').info('SDK', string);
};

new Sdk();