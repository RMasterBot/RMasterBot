#!/usr/bin/env node
var newArgs = process.argv.slice(1);
process.argv = newArgs;

if(process.argv[1] === "ats"){
  require('../ats.js');
}
else if(process.argv[1] === "doc"){
  require('../doc.js');
}
else if(process.argv[1] === "install"){
  require('../install.js');
}
else if(process.argv[1] === "job"){
  require('../job.js');
}
else if(process.argv[1] === "pid"){
  require('../pid.js');
}
else {
  console.log('Provide command: ats , doc , install , job , pid');
}