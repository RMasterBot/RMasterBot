console.log("\n" + 'API Endpoints Description');

console.log("\n" + 'Usage:');
console.log("    " + 'node doc <application>                                 list all endpoints');
console.log("    " + 'node doc <application> <http_method>                   list all endpoints using given method');
console.log("    " + 'node doc <application> <endpoint_url>                  endpoint detail');
console.log("    " + 'node doc <application> <http_method> <endpoint_url>    endpoint detail using given method');
console.log("    " + 'node doc <application> parameters                      list all parameters');

console.log("\n" + 'Options:');
console.log("    " + 'application    use specific application network');
console.log("    " + 'http_method    get, post, patch, delete');
console.log("    " + 'endpoint_url   /v1/me/');