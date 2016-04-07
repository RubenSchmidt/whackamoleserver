var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
module.exports.io = io;
var port = process.env.PORT || 5000;
var Game = require('./models/game.js');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
    console.log('listening on *:'+port);
});
var games = [];

function getGame(name){
    for (var i = 0; i < games.length; i++) {
        var obj = games[i];
        if(obj.getName() === name){
            return obj;
        }
    }
    return null;
}

function getGameFromMasterId(masterId){
    for (var i = 0; i < games.length; i++) {
        var obj = games[i];
        var id = obj.getMasterId();
        if (id === masterId){
            return obj
        }
    }
    return null;
}

io.on('connection', function(socket){

    socket.on('join game', function (name) {
        var game = getGame(name);
        if (game === null){
            socket.emit('join game error', 'Game does not exist!')
        }

        game.joinGame(socket.id);
        socket.join(game.getName());
    });

    socket.on('new game', function(name){
        if(name.length<3){
            socket.emit('new game error', 'Game name not long enough')
        }
        var creatorId = socket.id;
        game = new Game(name, creatorId);
        games.push(game);
        socket.join(name);
        socket.emit('new game success', 'New game ' + name + ' was created.')
    });

    socket.on('start game', function () {
        var game = getGameFromMasterId(socket.id);
        if(game === null){
            socket.emit('start game error', 'You are not the master of any game')
        }
        game.start();
        socket.emit('start game success', 'New game started, get ready!')
    });

    socket.on('mole hit', function(gameName){
        var game = getGame(gameName);
        var hit = game.registerHit(socket.id);
        if(hit){
            socket.emit('hit success', 'You hit the mole first!')
        }else {
            socket.emit('hit miss', 'You were not first')
        }
    });

    socket.on('disconnect', function () {

    });
});
