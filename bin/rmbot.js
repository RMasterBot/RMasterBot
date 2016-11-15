#!/usr/bin/env node
var newArgs = process.argv.slice(1);
process.argv = newArgs;

var services = {
  ats: '../ats.js',
  doc: '../doc.js',
  install: '../install.js',
  job: '../job.js',
  pid: '../pid.js'
};

if (services.hasOwnProperty(process.argv[1])) {
  require(services[process.argv[1]]);
}
else {
  console.log('Provide command: ats , doc , install , job , pid');
}