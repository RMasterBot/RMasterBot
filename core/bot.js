function Bot(){
  this.aze = "APP";
}

Bot.prototype.testA = function(){
  console.log(this.aze);
};

Bot.prototype.testC = function(){
  console.log("non");
};

module.exports = Bot;