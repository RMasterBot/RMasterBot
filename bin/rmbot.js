#!/usr/bin/env node
var newArgs = process.argv.slice(1);
process.argv = newArgs;

var services = {
  ats: require('path').join('..', 'ats.js'),
  doc: require('path').join('..', 'doc.js'),
  install: require('path').join('..', 'install.js'),
  job: require('path').join('..', 'job.js'),
  pid: require('path').join('..', 'pid.js'),
  sdk: require('path').join('..', 'sdk.js')
};

if (services.hasOwnProperty(process.argv[1])) {
  require(services[process.argv[1]]);
}
else {
  console.log('Provide command: ats , doc , install , job , pid , sdk');
}