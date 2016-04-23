var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
module.exports.io = io;
var port = process.env.PORT || 5000;
var Game = require('./models/game.js');


// Routing for the test client
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


// WHACKAMOLE SERVER ------

http.listen(port, function () {
    console.log('listening on *:' + port);
});

// The list of all the currently ongoing games
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

function getNickNameFromId(socketId) {
    for(i = 0; i < games.length; i++) {
        var game = games[i];
        if(game !== null) {
            for(var j = 0; j < game.attenders.length; j++) {
                if(game.attenders[j].id === socketId) {
                    return game.attenders[j].nickName;
                }
            }
        }
    }
    return null;
}


function checkIfGameEmpty(game) {
    if(game.attenders.length === 0) {
        game.stop();
        console.log("Game stop. All attenders left from game " + game.name + ".");
        deleteGame(game);
        return true;
    }
    return false;
}



function deleteGame(game) {
    for(var i = 0; i < games.length; i++) {
        var obj = games[i];
        if(obj !== null) {
            if(game === obj) {
                var gameName = game.name;
                games.splice(i, 1);
                console.log("Deleted game " + gameName + ".");
                console.log(games.length + " games left.");
                console.log("");
            }
        }
    }
}


io.on('connect', function() {
    console.log("Client connected.");
});


io.on('connection', function (socket) {
    
    socket.on('new game', function (data) {
        if (data.gameName === null || data.gameName.length < 3) {
            socket.emit('invalid game name error', 'Game name not long enough.');
            return;
        }
        if (data.nickName === null | data.gameName.length < 3) {
            socket.emit('invalid nickname error', 'Nickname was to short or not provided.');
            
            // Log error
            console.log("Player attempted to create with nickname that was invalid.");
            console.log("Aborted create game request.");
            return;
        }
        // Check if game exists - null if not
        var game = getGame(data.gameName);
        if (game !== null) {
            socket.emit('game already exists error', 'Game with this name already exists');
            
            // Log error
            console.log("Player attempted to create a game, but game name was taken.");
            console.log("Aborted create game request.");
            
            return;
        }

        var creatorId = socket.id;
        game = new Game(data.gameName, data.nickName, data.numOfPlayers, creatorId, data.themeId);
        games.push(game);
        
        // Joins the socket id to the newly created game room (should leave on game finish)
        socket.join(data.gameName);
        
        // Emit success
        socket.emit('new game success', JSON.stringify(game));
        
        // Log success
        console.log("Created game: " + data.gameName + ", " + data.nickName + ", " + data.numOfPlayers);
        
    });
    
    
    socket.on('join game', function (data) {
        var game = getGame(data.gameName);
        if(data.nickName === null || data.nickName.length < 3) {
            socket.emit('invalid nickname error', 'Nickname was to short or not provided.');
            
            // Log error
            console.log("Player attempted to join with nickname that was invalid.");
            console.log("Aborted join request.");
            return;
        }
        if (game === null) {
            socket.emit('game nonexistent error', 'Game does not exist!');
            
            // Log error
            console.log("Player attempted to join, but game didnt exist.");
            console.log("Aborted join request.");
            return;
        }
        if (game.isFull()) {
            socket.emit('game is full error', 'Game is full.');
            
            // Log error
            console.log("Player attempted to join, but game was full.");
            console.log("Aborted join request.");
            return;
        }
        if(game.nickNameTaken(data.nickName)) {
            obj = {
                nickName: data.nickName
            }
            socket.emit('nickname taken error', obj);
            
            // Log error
            console.log("Player attempted to join, but nickname was taken.");
            console.log("Aborted join request.");
            return;
        }
        
        // Player is added to the game and socket is joined to game room
        var attender = game.joinGame(socket.id, data.nickName);
        socket.join(game.name);
    
        socket.emit('join game success', JSON.stringify(game));
        
        // Emit an array of attenders in JSON format to all clients in this game, except sender.
        socket.broadcast.to(game.name).emit('player joined', attender);
        
        // Log success
        console.log('Player ' + attender.nickName + ' joined game ' + game.name);
        
    });
    
    
    
    socket.on('left game', function(data) {
        var game = getGameFromId(socket.id);
        var attender;
        if(game !== null) {
            attender = game.getAttender(socket.id);
            
            if(game.removeAttender(socket.id)) {
                // Log client leave
                console.log("Player " + attender.nickName + " left the game named " + game.name);
                
                // Leave client from game room
                socket.leave(game.name);

                // Check if game is now empty and should be disposed, if not notify clients on leave.
                if(!checkIfGameEmpty(game)) {
                    socket.broadcast.to(game.name).emit('player left', attender);
                }
            }
        }
    });
    
    
    socket.on('ready', function(data) {
         var game = getGame(data.gameName);
         var nickName = data.nickName;
         var attender = game.setAttenderReady(socket.id);
        
         // Notify all players, except sender, that a player is ready. 
         socket.broadcast.to(game.name).emit('player ready', attender);
         console.log(nickName + " is ready.");
         console.log(game.getNumOfReadyAttenders() + " of " + game.attenders.length + " are ready, and " + game.numOfPlayers + " players are required.");
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
    
    
    socket.on('disconnect', function () {
        var game = getGameFromId(socket.id);
        if(game !== null) {
             var attender = game.getAttender(socket.id);
             // Log disconnecion
             console.log("Client disconnected.");
             if(game.removeAttender(socket.id)) {
                 if(attender !== null && game.attenders.length !== 0) {
                     socket.broadcast.to(game.name).emit('player left', attender);
                 }
                 // Check if all players are gone and game should be disposed
                 checkIfGameEmpty(game);
             }
        }
    });
    
    /*
    socket.on('error', function() {
        // Log error
        console.log("A socket error occured.");
    });
    */
   
});
