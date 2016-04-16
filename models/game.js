/**
 * Created by rubenschmidt on 07.04.2016.
 */
var app = require('../index.js');
var Attender = require('./attender.js');
var io = app.io;

// Constructor
function Game(name, nickname, numOfPlayers, id) {
    // always initialize all instance properties
    this.name = name;
    this.numOfPlayers = numOfPlayers;
    this.scoreWeights = [300, 200, 100, 50, 20, 10];
    this.attenders =[];
    this.pos = getRandomInt(0,8);
    this.pic = getRandomInt(0,5);
    this.hit = true;

    this.masterId = id;
    this.isStopped = false;
    if(nickname == null){
        this.nickname = generateRandomNickName();
    }else{
        this.nickname = nickname;
    }
    this.attenders.push(new Attender(id,nickname ,0));
}


Game.prototype.joinGame = function (socketId, nickName)
{
    if (nickName == null){
        nickName = generateRandomNickName();
    }
    var attender = new Attender(socketId, nickName, 0);
    this.attenders.push(attender);
};

Game.prototype.isFull = function ()
{
    return this.attenders.length > 5
};

Game.prototype.setAttenderReady = function(nickName) {
    for(var attender in this.attenders) {
        if(attender.nickName === nickName) {
            attender.ready = true;
        }
    }
    console.log(this.getNumOfReadyAttenders() + " of " + this.attenders.length + " attenders are ready.");
}

Game.prototype.getNumOfReadyAttenders = function() {
    var ready = 0;
    for(var attender in this.attenders) {
        if(attender.ready === true) {
            ready += 1;
        }
    }
    return ready;
}

Game.prototype.gameIsReady = function() {
    var ready = this.getNumOfReadyAttenders();
    // Checks if at least the half part of the attenders has reported "ready"
    if(this.numOfPlayers > 2 && (ready > this.attenders.length / 2)) {
        return true;
    }
    
    // START: TEMPRORARY FOR TESTING
    else if(this.numOfPlayers === 1 && ready === 1) {
        return true;
    }
    //END
    
    else if(this.numOfPlayers === 2 && ready === 2) {
        return true;
    }
    else {
        return false;
    }
}

Game.prototype.start = function()
{
    // Start game after 1 seconds
    setTimeout(this.sendNewMole.bind(this), 500);
};


Game.prototype.stop = function () {
    this.isStopped = true;
};


Game.prototype.registerHit = function (socketId, mole)
{
    if (this.hit){
        return false;
    }
    console.log(this.attenders.length);
    for (var i = 0; i < this.attenders.length; i++) {
        var attender = this.attenders[i];
        if (attender.id === socketId){
            attender.points += this.scoreWeights[mole];
            this.hit = true;
            return true;
        }
    }
};


Game.prototype.sendNewMole = function(){
    if(this.isStopped === true){
        return
    }
    if(this.hit === false){
        setTimeout(this.sendNewMole.bind(this), 500);
        return;
    }
    this.pos = getRandomInt(0, 8);
    this.pic = getRandomInt(0, 5);
    this.hit = false;
    var obj = {
        pos: this.pos,
        pic: this.pic,
        hit: this.hit
    };
    console.log(obj);
    io.to(this.name).emit('new mole', obj);
    setTimeout(this.sendNewMole.bind(this), 500);
};

Game.prototype.getAttender = function(socketId) {
    for(var attender in this.attenders) {
        if(attender.id === socketId){
            return attender;
        }
    }
}
  

function generateRandomNickName()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// export the class
module.exports = Game;