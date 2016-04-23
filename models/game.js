/**
 * Created by rubenschmidt on 07.04.2016.
 */
var app = require('../index.js');
var Attender = require('./attender.js');
var io = app.io;

// Constructor
function Game(name, nickname, numOfPlayers, id, themeId) {
    // always initialize all instance properties
    this.name = name;
    this.numOfPlayers = numOfPlayers;
    this.themeId = themeId;
    this.scoreWeights = [500, 400, 300, 200, 100, 50];
    this.maxScore = 5000;
    this.attenders = [];
    this.pos = getRandomInt(0, 8);
    this.pic = getRandomInt(0, 5);
    this.hit = true;
    this.lastTimeSent = 0;

    this.masterId = id;
    this.isStopped = false;
    if(nickname == null){
        this.nickname = generateRandomNickName();
    }else{
        this.nickname = nickname;
    }
    this.attenders.push(new Attender(id, nickname, 0));
    console.log("New game have master user: " + this.nickname);
}

Game.prototype.joinGame = function (socketId, nickName)
{
    if (nickName == null){
        nickName = generateRandomNickName();
    }
    var attender = new Attender(socketId, nickName, 0);
    this.attenders.push(attender);
    return attender;
};

Game.prototype.isFull = function ()
{
    return this.attenders.length >= this.numOfPlayers;
};

Game.prototype.setAttenderReady = function(socketId) {
    JSON.stringify(this.attenders); //TEST
    for(i = 0; i < this.attenders.length; i++) {
        var attender = this.attenders[i];
        if(attender.id === socketId) {
            attender.ready = true;
            return attender;
        }
    }
    return null;
}

Game.prototype.getNumOfReadyAttenders = function() {
    var ready = 0;
    for(i = 0; i < this.attenders.length; i++) {
        if(this.attenders[i].ready === true) {
            ready += 1;
        }
    }
    return ready;
}

Game.prototype.gameIsReady = function() {
    var ready = this.getNumOfReadyAttenders();
    // Checks if at least the half part of the attenders has reported "ready"
    if(this.numOfPlayers > 2 && this.attenders.length
       === this.numOfPlayers && (ready > this.numOfPlayers/2)) {
        return true;
    }
    
    // START TESTING: Temporary code for testing. Normally one player shouldn't be able to play alone.
    else if(this.numOfPlayers === 1 && ready === 1) {
        return true;
    }
    //END TESTING
    
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
    setTimeout(this.sendNewMole.bind(this), 4000);
};


Game.prototype.stop = function () {
    this.isStopped = true;
};

Game.prototype.gameIsFinished = function(){
    for(i = 0; i < this.attenders.length; i++) {
        if(this.attenders[i].points >= this.maxScore) {
            return true;
        }
    }
    return false;
}


Game.prototype.registerHit = function (socketId, mole) {
    if (this.hit){
        return player = {
            nickName: "",
            points: 0,
            totalScore: 0,
            hit: false
        };
    }
    for (var i = 0; i < this.attenders.length; i++) {
        var attender = this.attenders[i];
        if (attender.id === socketId){
            var points = this.scoreWeights[mole];
            attender.points += points;
            this.hit = true;
            return player = {
                nickName: attender.nickName,
                points: points,
                totalScore: attender.points,
                hit: true
            };
        }
    }
};


Game.prototype.sendNewMole = function(){
    if(this.isStopped === true){
        return;
    }
    if(this.gameIsFinished()) {
        io.to(this.name).emit('game finished', JSON.stringify(this.attenders));  
        this.stop();
    }
    var timeDiffSinceLastSend = Math.floor(new Date().getTime()/1000) - this.lastTimeSent;
    // Waits with sending a new mole until hit or two seconds have passed.
    if(this.hit === false && (timeDiffSinceLastSend < 4)){
        setTimeout(this.sendNewMole.bind(this), 500);
        return;
    }
    else {
        this.send();
        setTimeout(this.sendNewMole.bind(this), 500);
    }
};

Game.prototype.send = function() {
    this.pos = getRandomInt(0, 8);
    this.pic = getRandomInt(0, 5);
    this.hit = false;
    var obj = {
        pos: this.pos,
        pic: this.pic,
        hit: this.hit
    };
    io.to(this.name).emit('new mole', obj);
    this.lastTimeSent = Math.floor(new Date().getTime()/1000);
    console.log('Mole is sent');
}

Game.prototype.getAttender = function(socketId) {
    for(i = 0; i < this.attenders.length; i++) {
        var attender = this.attenders[i];
        if(attender.id === socketId){
            return attender;
        }
    }
}

Game.prototype.nickNameTaken = function(nickName) {
    for(i = 0; i < this.attenders.length; i++) {
        var attender = this.attenders[i];
        if(attender.nickName === nickName) {
            return true;
        }
    }
    return false;
}

Game.prototype.removeAttender = function(socketId) {
    for(i = 0; i < this.attenders.length; i++) {
        var attender = this.attenders[i];
        if(attender.id === socketId) {
            this.attenders.splice(i, 1);
            console.log("Removed attender: " + attender.nickName);
            return true;
        }
    }
    return false;
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