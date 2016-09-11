function RError(code, message, file, lineNumber){
  this.code = code;
  this.message = message;
  this.file = file;
  this.lineNumber = lineNumber;
  this.locale = require(__dirname + '/locale.js');
}

RError.prototype.toString = function(){
  var parts = [];

  if(this.code !== undefined) {
    parts.push(this.locale.localize("Error Code") + " " + this.code);
  }

  if(this.message !== undefined) {
    parts.push("> " + this.locale.localize(this.message));
  }

  if(this.file !== undefined) {
    parts.push(this.locale.localize("File") + " " + this.file);
  }

  if(this.lineNumber !== undefined) {
    parts.push(this.locale.localize("Line") + " " + this.lineNumber);
  }

  return parts.join("\n");
};

module.exports = RError;