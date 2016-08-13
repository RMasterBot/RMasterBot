console.log("\n" + 'Manage process launched by bot. PID meaning process id.');

console.log("\n" + 'Usage:');
console.log("    " + 'node pid                  list all process running (pid + job + options)');
console.log("    " + 'node pid kill <pid>       kill given process id');
console.log("    " + 'node pid kill all         kill all process running');
console.log("    " + 'node pid <bot>            list all process running for a specific bot (pid + job + options)');
console.log("    " + 'node pid kill all <bot>   kill all process running for a specific bot');

console.log("\n" + 'Options:');
console.log("    " + 'pid    process id');
console.log("    " + 'bot    name of the bot');