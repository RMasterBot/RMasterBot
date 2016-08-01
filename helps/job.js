givenJob = null;
process.argv.forEach(function (val, index) {
  if(index == 3) {
    givenJob = val;
  }
});

if(givenJob === '-h' || givenJob === '--help') {
  console.log("\n" + 'Launch Job (dedicated task). It will create a pid file.');

  console.log("\n" + 'Usage:');
  console.log("    " + 'node job <application> <job_name> [options]   launch job given');

  console.log("\n" + 'Options:');
  console.log("    " + 'application             use specific application network');
  console.log("    " + 'job_name                job file to load (see informations below)');
  console.log("    " + 'options                 different depending on job');
  console.log("    " + '-a --app <app_name>     use specific app by using name defined in conf');
  console.log("    " + '-f --file <filepath>    set a filepath');
  console.log("    " + '-u --user <user_name>   use specific user access_token');

  console.log("\n" + 'Informations:');
  console.log("    " + 'Job name is filename without .js');
  console.log("    " + 'Folder scan priority is private_jobs then jobs');

  process.exit(1);
}

fs = require('fs');
content = null;
try{
  content = fs.readFileSync(__dirname + '/../private_jobs/' + givenJob + '.js', 'utf-8');
}
catch(e) {
  //
}

if(content == null) {
  try{
    content = fs.readFileSync(__dirname + '/../jobs/' + givenJob + '.js', 'utf-8');
  }
  catch(e) {
    //
  }
}

if(content === null) {
  console.log('No job found');
  process.exit(1);
}

if(content.substr(0,2) !== '/*') {
  console.log('No doc found for this job');
  process.exit(1);
}

startPos = 2;
stopPos = content.indexOf('*/');
if(stopPos === -1) {
  stopPos = content.length;
}
else {
  stopPos = stopPos - 2;
}

console.log(content.substr(startPos, stopPos));