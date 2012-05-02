var express = require('express');
var nowjs = require("now");
var gts_gtp = require('../kgs_gtp.js');

var app = express.createServer();

//todo: check on cookie security
app.use(express.static(__dirname + '/web'));

var server = app.listen(8000);

var everyone = nowjs.initialize(server);
var players = nowjs.getGroup('players');
players._moves = [];

var sessionStore = Object.create(null);
var clientMapping = Object.create(null);

var getSession = function(clientId){
    return sessionStore[clientMapping[clientId]];
};

everyone.now.login = function(sessionId, callback) {
    if(sessionStore[sessionId] == null){
        sessionStore[sessionId] = {};
    }

    clientMapping[this.user.clientId] = sessionId;

    var session = sessionStore[sessionId];

    if(session.username == null){
        session.username = "Guest " + Math.floor(Math.random() * 10000);
        this.now.setUsername(session.username);
    }

    players.addUser(this.user.clientId);

    callback();
};

players.now.inGame = false;

players.now.joinPlayers = function(){
    var self = this;

    this.now.clearBoard();

    //Send the initial board state
    players._moves.forEach(function(move){
        self.now.playMove(move.color, move.x, move.y);
    });

    if(players._genmove){
        gts_gtp.gtp.commands.genmove.apply(null, players._genmove);
    }

    if(players.color){
        players.now.setColor(players.color);
    }
};

players.now.sendChat = function(text){
    if(players.now.receiveChat){
        players.now.receiveChat(getSession(this.user.clientId).username, text);
    }
};

var vertexMapping = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    e: 4,
    f: 5,
    g: 6,
    h: 7,
    j: 8,
    k: 9,
    l: 10,
    m: 11,
    n: 12,
    o: 13,
    p: 14,
    q: 15,
    r: 16,
    s: 17,
    t: 18,

    0: 'a',
    1: 'b',
    2: 'c',
    3: 'd',
    4: 'e',
    5: 'f',
    6: 'g',
    7: 'h',
    8: 'j',
    9: 'k',
    10: 'l',
    11: 'm',
    12: 'n',
    13: 'o',
    14: 'p',
    15: 'q',
    16: 'r',
    17: 's',
    18: 't'
};

var fromVertex = function(vertex){
    var firstChar = vertex[0].toLowerCase();

    return {x: vertexMapping[firstChar], y: 19 - parseInt(vertex.substring(1)) };
};

var toVertex = function(x, y){
    return vertexMapping[x] + (19 - parseInt(y));
};

var fromGtpColor = function(color){
    color = color.toLowerCase();

    if(color === 'w' || color === 'white'){
        return 'white';
    } else {
        return 'black';
    }
};

players.secondsPerMove = 27;
players.votes = Object.create(null);

var finalizeMove = function(color, callback){
    return function(){
        //Voting finished
        var votes = {};
        Object.keys(players.votes).forEach(function(key){
            var vote = players.votes[key];
            var voteString = vote.x + ',' + vote.y;

            if(votes[voteString] == null){
                votes[voteString] = 0;
            }

            votes[voteString]++;
        });

        //At the end of those, mostVoted should contain the moves with the most number of votes (more than one if two moves had equal votes)
        var mostVoted = [];
        Object.keys(votes).forEach(function(point){
            var voteCount = votes[point];

            if(mostVoted.length === 0){
                mostVoted.push({ point: point, voteCount: voteCount});
            } else if(voteCount >= mostVoted[0].voteCount){
                //Clear out moves with less votes
                if(voteCount > mostVoted[0].voteCount){
                    mostVoted = [];
                }

                mostVoted.push({ point: point, voteCount: voteCount});
            }
        });

        if(mostVoted.length === 0){
            players.genMoveStarted = new Date();
            players.finalizeTimeoutId = setTimeout(finalizeMove(color, callback), 30 * 1000);
            return;
        }

        //Choose a move randomly
        var move = mostVoted[Math.floor(Math.random() * mostVoted.length)];
        var x = parseInt(move.point.substring(0, move.point.indexOf(',')));
        var y = parseInt(move.point.substring(move.point.indexOf(',') + 1));

        players._genmove = null;
        players._moves.push({color: color, x: x, y: y});
        players.now.playMove(color, x, y);

        //Reset votes dictionary
        players.votes = Object.create(null);

        clearTimeout(players.finalizeTimeoutId);
        players.finalizeTimeoutId = null;

        callback(null, toVertex(x, y));
    }
};

gts_gtp.gtp.commands.genmove = function(args, callback){
    players.now.inGame = true;

    var color = fromGtpColor(args);
    players._genmove = arguments;
    var finalize = finalizeMove(color, callback);

    var secondsAllowed = players.secondsPerMove;
    if(players.finalizeTimeoutId){
        //Reuse existing finalize handler and just send the current seconds left
        secondsAllowed = players.secondsPerMove - Math.floor(((new Date()) - players.genMoveStarted) / 1000);
    } else {
        players.genMoveStarted = new Date();
        players.finalizeTimeoutId = setTimeout(finalize, secondsAllowed * 1000);
    }

    if(players.now.genMove){
        players.now.genMove(color, secondsAllowed, function(err, x, y){
            var username = getSession(this.user.clientId).username;
            var existingVote = players.votes[username];
            if(existingVote != null){
                players.now.removeVote(color, existingVote.x, existingVote.y);
            }
            players.votes[username] = {x: x, y: y};

            players.count(function(count){
                //If only one player, play the move without waiting
                if(count < 2){
                    finalize();
                } else {
                    //Show the vote
                    players.now.addVote(color, x, y);
                }
            });
        });
    }
};

var playRegex = /([^\s]+)\s([^\s]+)/;
gts_gtp.gtp.commands.play = function(args, callback){
    players.now.inGame = true;

    var match = playRegex.exec(args);

    var color = fromGtpColor(match[1]);
    var coord = fromVertex(match[2]);

    if(players.now.playMove){
        players.now.playMove(color, coord.x, coord.y);
    }
    players._moves.push({color: color, x: coord.x, y: coord.y });

    callback();
};

gts_gtp.gtp.commands.quit = function(args, callback){
    players.now.inGame = false;

    callback();
};

gts_gtp.gtp.commands['assign-color'] = function(args, callback){
    players.color = args;

    if(players.now.setColor){
        players.now.setColor(args);
    }

    callback();
};

gts_gtp.start();