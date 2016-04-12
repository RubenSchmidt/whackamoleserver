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

    socket.on('join game', function (data) {
        var game = getGame(data.gameName);
        if (game === null){
            socket.emit('join game error', 'Game does not exist!');
            return;
        }
        if(game.isFull()){
            socket.emit('join game error', 'Game is full!');
            return;
        }

        game.joinGame(socket.id, data.nickName);
        // Join the user socket to the room specific to the game so it receives game updates.
        socket.join(game.getName());
    });

    socket.on('new game', function(data){
        if(data.gameName.length<3){
            socket.emit('new game error', 'Game name not long enough');
            return;
        }
        // Check if game exists
        var game = getGame(data.gameName);
        if (game !== null){
            socket.emit('new game error', 'Game with this name already exists');
            return;
        }

        var creatorId = socket.id;
        game = new Game(data.gameName, data.nickName ,creatorId);
        games.push(game);
        socket.join(data.gameName);
        socket.emit('new game success', 'New game ' + data.gameName + ' was created.')
    });

    socket.on('start game', function () {
        var game = getGameFromMasterId(socket.id);
        if(game === null){
            socket.emit('start game error', 'You are not the master of any game')
        }
        game.start();
        console.log("Game start");
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
        console.log("disconect");
        var game = getGameFromMasterId(socket.id);
        if (game !== null){
            game.stop();
            console.log("game stop");
        }

    });
});
