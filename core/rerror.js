function RError(){
  this.stack = new Error().stack;

  this.code = arguments["0"] || undefined;
  this.message = arguments["1"] || undefined;
  this.locale = require(__dirname + '/locale.js');
  this.args = [];

  for(var key in arguments) {
    if(arguments.hasOwnProperty(key) && (key !== "0" && key !== "1") ) {
      this.args.push(arguments[key]);
    }
  }
}

RError.prototype.toString = function(){
  var parts = [];
  var translation;
  var idxArgs = 0;
  var lengthArgs = this.args.length;

  if(this.code !== undefined) {
    parts.push(this.locale.localize("Error Code") + " " + this.code);
  }

  if(this.message !== undefined) {
    translation = this.locale.localize(this.message);

    for(; idxArgs < lengthArgs; idxArgs++) {
      translation = translation.replace('%s', this.args[idxArgs]);
    }

    parts.push("> " + translation);
  }

  parts.push(this.stack);

  return parts.join("\n");
};

module.exports = RError;