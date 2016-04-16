var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
module.exports.io = io;
var port = process.env.PORT || 5000;
var Game = require('./models/game.js');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});
var games = [];

function getGame(name) {
    for (var i = 0; i < games.length; i++) {
        var obj = games[i];
        if (obj !== null) {
            if (obj.name === name) {
                return obj;
            }
        }
    }
    return null;
}

function getGameFromMasterId(masterId) {
    for (var i = 0; i < games.length; i++) {
        var obj = games[i];
        if (obj !== null) {
            var id = obj.masterId;
            if (id === masterId) {
                return obj
            }
        }
    }
    return null;
}

function deleteGame(game) {
    for (var i = 0; i < games.length; i++) {
        var obj = games[i];
        if (obj !== null) {
            if (game.name == obj.name) {
                games[i] = null;
                // Remove the game from the array
                games.slice(i, 1);
                console.log("Deleted");
                console.log("");
            }
        }
    }
}

io.on('connection', function (socket) {

    socket.on('join game', function (data) {
        var game = getGame(data.gameName);
        if (game === null) {
            socket.emit('join game error', 'Game does not exist!');
            return;
        }
        if (game.isFull()) {
            socket.emit('join game error', 'Game is full!');
            return;
        }

        game.joinGame(socket.id, data.nickName);
        // Join the user socket to the room specific to the game so it receives game updates.
        socket.join(game.name);
        // Emit an array of attenders in JSON format to all clients in this game
        io.to(game.name).emit('players', JSON.stringify(game.attenders));
    });
    
    socket.on('ready', function(data) {
         var game = getGame(data.gameName);
         var nickName = data.nickName;
         game.setAttenderReady(nickName);
        
         if(game.gameIsReady) {
            game.start();
            console.log("Game start");
            io.to(game.name).emit('start game success', 'New game started, get ready!')
         }
    });

    socket.on('new game', function (data) {
        if (data.gameName.length < 3) {
            socket.emit('new game error', 'Game name not long enough');
            return;
        }
        // Check if game exists
        var game = getGame(data.gameName);
        if (game !== null) {
            socket.emit('new game error', 'Game with this name already exists');
            return;
        }

        var creatorId = socket.id;
        game = new Game(data.gameName, data.nickName, data.numOfPlayers, creatorId);
        games.push(game);
        socket.join(data.gameName);
        console.log("Game created: " + data.gameName);
        socket.emit('new game success', 'New game ' + data.gameName + ' was created.')
    });

    socket.on('start game', function () {
        var game = getGameFromMasterId(socket.id);
        if (game === null) {
            socket.emit('start game error', 'You are not the master of any game')
        }
        game.start();
        console.log("Game start");
        socket.emit('start game success', 'New game started, get ready!')
    });

    socket.on('mole hit', function (data) {
        console.log("Mole " + data.mole + " hit on " + data.gameName);
        var game = getGame(data.gameName);
        var mole = data.mole;
        if (game === null) {
            socket.emit('hit error', 'Game with that name does not exist');
            return
        }
        //TODO: SOMETHING WRONG WITH REGISTER HIT??
        var hit = game.registerHit(socket.id, mole);
        
        if (hit) {
            socket.emit('hit success', 'You hit the mole first!')
        } else {
            socket.emit('hit miss', 'You were not first')
        }
        
        socket.emit('player score', JSON.stringify(game.getAttender(socket.id)));
    });

    socket.on('disconnect', function () {
        console.log("Disconnect");
        var game = getGameFromMasterId(socket.id);
        if (game !== null) {
            game.stop();
            console.log("Game stop");
            deleteGame(game);
        }
    });
});
