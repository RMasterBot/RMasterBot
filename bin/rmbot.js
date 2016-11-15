#!/usr/bin/env node

if(process.argv[1] === "ats"){
  require('../ats.js');
}

if(process.argv[1] === "doc"){
  require('../doc.js');
}

if(process.argv[1] === "install"){
  require('../install.js');
}

if(process.argv[1] === "job"){
  require('../job.js');
}

if(process.argv[1] === "pid"){
  require('../pid.js');
}