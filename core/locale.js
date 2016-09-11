function Locale(text){
  this.text = text;
  this.locale = 'en';
  this.translations = null;
  this.languagesFolder = __dirname + '/../languages';
}

Locale.prototype.localize = function() {
  this.getLocale();
  this.getFileForCurrentLocale();

  if(this.translations === null) {
    return this.text;
  }
  else {
    return this.translations[this.text] || this.text;
  }
};

Locale.prototype.getLocale = function() {
  var env = process.env;
  var lang = env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE;
  if(typeof lang === "string" && lang.length >= 2) {
    this.locale = lang.substr(0,2).toLowerCase();
  }
};

Locale.prototype.getFileForCurrentLocale = function() {
  var path = this.languagesFolder + '/' + this.locale + '.json';
  var fs = require('fs');

  try {
    fs.lstatSync(path);
    this.translations = JSON.parse(fs.readFileSync(path));
    return true;
  }
  catch(e){
    return false;
  }
};

module.exports.localize = function(text) {
  return new Locale(text).localize();
};