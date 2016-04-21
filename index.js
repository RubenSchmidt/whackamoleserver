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

// The list of games
var games = [];

function getGame(name) {
    for (i = 0; i < games.length; i++) {
        var obj = games[i];
        if (obj !== null) {
            if (obj.name === name) {
                return obj;
            }
        }
    }
    return null;
}

function getGameFromId(socketId) {
    for(i = 0; i < games.length; i++) {
        var game = games[i];
        if(game !== null) {
            for(var j = 0; j < game.attenders.length; j++) {
                if(game.attenders[j].id === socketId) {
                    return game;
                }
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
            if (game.name === obj.name) {
                // games[i] = null;
                // Remove the game from the array
                console.log("Game list before: " + games);
                games.slice(i, 1);
                console.log("Game list after delete: " + games);
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
            socket.emit('game nonexistent', 'Game does not exist!');
            console.log("Player attempted to join, but game didnt exist.");
            return;
        }
        if (game.isFull()) {
            socket.emit('game is full', 'Game is full!');
            console.log("Player attempted to join, but game was full.");
            return;
        }
        if(game.nickNameTaken(data.nickName)) {
            obj = {
                nickName: data.nickName
            }
            // Nickname is taken, and that nickname i sent back to the client if needed
            socket.emit('nickname taken', obj);
            console.log("Player attempted to join, but nickname was taken.");
            return;
        }

        var attender = game.joinGame(socket.id, data.nickName);
        // Join the user socket to the room specific to the game so it receives game updates.
        socket.join(game.name);
        // Emit an array of attenders in JSON format to all clients in this game
        console.log('Player ' + attender.nickName + ' joined game ' + game.name);
        socket.emit('join game success', JSON.stringify(game));
        socket.broadcast.to(game.name).emit('player joined', attender);
        
    });
    
    
    //TEST
    io.on('ready to join', function(data) {
        // Notify all players, except for the sender, that a new player joined.
        var game = getGame(data.gameName);
        socket.emit('join game done', JSON.stringify(game.attenders));
        
    });
    //---------
    
    socket.on('ready', function(data) {
         var game = getGame(data.gameName);
         var nickName = data.nickName;
         var attender = game.setAttenderReady(socket.id);
        
         // Notify all players, except sender, that a player is ready. 
         socket.broadcast.to(game.name).emit('player ready', attender);
         if(game.gameIsReady()) {
            game.start();
            console.log("Game start");
            // Notify all players that the game starts
            io.to(game.name).emit('start game success', 'New game started, get ready!');
         }
    });
    
    socket.on('mole hit', function (data) {
        console.log("Mole " + data.mole + " hit on " + data.gameName);
        var game = getGame(data.gameName);
        var mole = data.mole;
        if (game === null) {
            socket.emit('hit error', 'Game with that name does not exist');
            return
        }
        var player = game.registerHit(socket.id, mole);
        if(player.hit) {
            // If mole is now hit, notify all players about the player that hit it.
            console.log("Player " + player.nickName + " hit the mole for " + player.points + " points and now has " + player.totalScore + " points in total.");
            io.to(game.name).emit('player hit', player);
        }
    });

    socket.on('new game', function (data) {
        if (data.gameName.length < 3) {
            socket.emit('game name length error', 'Game name not long enough');
            return;
        }
        // Check if game exists
        var game = getGame(data.gameName);
        if (game !== null) {
            socket.emit('game already exists error', 'Game with this name already exists');
            return;
        }

        var creatorId = socket.id;
        game = new Game(data.gameName, data.nickName, data.numOfPlayers, creatorId, data.themeId);
        games.push(game);
        console.log("Created game: " + data.gameName + ", " + data.nickName + ", " + data.numOfPlayers);
        socket.join(data.gameName);
        socket.emit('new game success', 'New game ' + data.gameName + ' was created.')
    });
    
    socket.on('disconnect', function () {
        console.log("Disconnect");
        var game = getGameFromId(socket.id);
        if(game !== null) {
             if(game.removeAttender(socket.id)) {
                 if(game.attenders.length === 0) {
                     game.stop();
                     console.log("Game stop. All attenders left.");
                     deleteGame(game);
                 }
             }
        }
    });

   
});
