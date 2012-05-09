var express = require('express');
var nowjs = require("now");
var async = require('async');
var gts_gtp = require('../kgs_gtp.js');
var kgs = require('../kgs.js');

var app = express.createServer();

//todo: check on cookie security
app.use(express.static(__dirname + '/web'));

var server = app.listen(80);

var everyone = nowjs.initialize(server, { closureTimeout: 20 * 60 * 1000 });
var players = nowjs.getGroup('players');
players._moves = [];

var sessionStore = Object.create(null);
var clientMapping = Object.create(null);

var getSession = function(clientId){
    return sessionStore[clientMapping[clientId]];
};

var getOppositeColor = function(color){
    color = color.toLowerCase();

    if(color === 'white'){
        return 'black';
    } else {
        return 'white';
    }
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
players.now.lookingForGame = false;

players.now.joinPlayers = function(){
    var self = this;

    this.now.clearBoard();

    //Send the initial board state
    players._moves.forEach(function(move){
        self.now.playMove(move.color, move.x, move.y, move.special);
    });

    if(players._genmove){
        gts_gtp.gtp.commands.genmove.apply(null, players._genmove);
    }

    if(players.color){
        players.now.setColor(players.color);
    }
};

players.now.sendChat = function(text){
    if(text.length > 200){
        text = text.substring(0, 200);
    }

    if(players.now.receiveChat){
        var session = getSession(this.user.clientId);
        players.now.receiveChat(session.username, session.rank, text);
    }
};

var getReadyCount = function(callback){
    var count = 0;

    players.getUsers(function(users){
        async.forEach(
            users,

            function(clientId, callback){
                nowjs.getClient(clientId, function(){
                    if(this.now.isReady){
                        count++;
                    }

                    callback();
                });
            },

            function(){
                callback(null, count);
            }
        );
    });
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

var rankMapping = (function(){
    var ranks = {};
    var i;

    for(i = 1; i <= 30; i++){
        ranks[i + 'k'] = i;
    }

    for(i = 1; i <= 9; i++){
        ranks[i + 'd'] = i + 30;
    }

    for(i = 1; i <= 9; i++){
        ranks[i + 'p'] = i + 39;
    }
})();

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

var getMostVoted = function(){
    var votes = {};
    Object.keys(players.votes).forEach(function(key){
        var vote = players.votes[key];
        if(vote.special == null){
            var voteString = vote.x + ',' + vote.y;

            if(votes[voteString] == null){
                votes[voteString] = 0;
            }

            votes[voteString]++;
        }
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

    return mostVoted;
};

var getNumberOfVotes = function(){
    var count = 0;
    Object.keys(players.votes).forEach(function(key){
        count++;
    });

    return count;
};

var getNumberOfConfirmedVotes = function(){
    var count = 0;
    Object.keys(players.votes).forEach(function(key){
        if(players.votes[key].confirmed){
            count++;
        }
    });

    return count;
};

//Grant more time if more than half the players requested
var checkSpecialVote = function(type){
    var votes = 0;
    var totalVotes = 0;

    Object.keys(players.votes).forEach(function(key){
        totalVotes++;

        if(players.votes[key].special === type){
            votes++;
        }
    });

    return votes / totalVotes;
};

var clearSpecialVote = function(type){
    Object.keys(players.votes).forEach(function(key){
        if(players.votes[key].special === type){
            delete players.votes[key];
        }
    });
};


var finalizeMove = function(color, callback){
    return function(gameOver){
        var restartVoting = function(){
            if(players.now.receiveChat){
                players.now.receiveChat('Game info', null, 'Extending move time.');

            }

            if(players.now.clearMoreTimeVote) {
                players.now.clearMoreTimeVote();
            }

            clearSpecialVote('moreTime');

            players.genMoveStarted = new Date();
        };

        var move = function(x, y, special){
            players._genmove = null;
            players._moves.push({color: color, x: x, y: y, special: special});
            players.now.playMove(color, x, y, special);

            //Reset votes dictionary
            players.votes = Object.create(null);

            players.genMoveStarted = null;
            players.now.turnTimeRemaining = null;

            players.now.whoseTurn = getOppositeColor(color);

            players.finalize = null;

            if(special == null){
                callback(null, toVertex(x, y));
            } else {
                callback(null, special);
            }
        };

        if(gameOver){
            callback();
        }

        if(checkSpecialVote('moreTime') > 0.5){
            return restartVoting();
        }

        if(checkSpecialVote('pass') > 0.6){
            players.now.receiveChat('Game info', null, 'TeamGo passed');
            return move(null, null, 'pass');
        }

        if(checkSpecialVote('resign') > 0.8){
            players.now.receiveChat('Game info', null, 'TeamGo resigned');
            players.now.inGame = false;
            reset();
            return move(null, null, 'resign');
        }

        //Voting finished
        var mostVoted = getMostVoted();

        if(mostVoted.length === 0){
            return restartVoting();
        }

        //Choose a move randomly
        var chosenMove = mostVoted[Math.floor(Math.random() * mostVoted.length)];
        var x = parseInt(chosenMove.point.substring(0, chosenMove.point.indexOf(',')));
        var y = parseInt(chosenMove.point.substring(chosenMove.point.indexOf(',') + 1));

        move(x, y);
    }
};

gts_gtp.gtp.commands.genmove = function(args, callback){
    players.now.inGame = true;

    var color = fromGtpColor(args);

    players.now.whoseTurn = color;
    players._genmove = arguments;
    players.finalize = finalizeMove(color, callback);

    if(!players.genMoveStarted) {
        players.genMoveStarted = new Date();
    }

    if(players.now.genMove){
        players.now.genMove(color, function(err, x, y, special){
            console.log('received move');
            var session = getSession(this.user.clientId);
            var username = session.username;

            session.lastVoteTime = new Date();
            var existingVote = players.votes[username];
            var addVote = true;

            if(existingVote != null){
                if(existingVote.x === x && existingVote.y === y && existingVote.special === special){
                    if(!existingVote.confirmed && special == null){
                        //If they vote for the same place twice, confirm the vote
                        existingVote.confirmed = true;
                        this.now.confirmVote(x, y);
                    }

                    addVote = false;
                } else {
                    this.now.unconfirmVote(existingVote.x, existingVote.y);
                    players.now.removeVote(color, existingVote.x, existingVote.y, existingVote.special);
                }
            }

            if(addVote){
                players.now.addVote(color, x, y, special);
                players.votes[username] = {x: x, y: y, special: special};

                if(special === 'pass' || special === 'resign'){
                    //Immediately confirm pass, resign, etc. votes
                    players.votes[username].confirmed = true;
                }
            }
        });
    }
};

var playRegex = /([^\s]+)\s([^\s]+)/;
gts_gtp.gtp.commands.play = function(args, callback){
    players.now.inGame = true;

    var match = playRegex.exec(args);

    var color = fromGtpColor(match[1]);
    var coord = {};
    var special;
    if(match[2] === 'pass'){
        special = 'pass';
    } else {
        coord = fromVertex(match[2]);
    }

    if(players.now.playMove){
        players.now.playMove(color, coord.x, coord.y, special);
    }
    players._moves.push({color: color, x: coord.x, y: coord.y, special: special });

    callback();
};

gts_gtp.gtp.commands['tg-final-score'] = function(args, callback){
    var color = fromGtpColor(args.winner);
    color = color.substring(0, 1).toUpperCase() + color.substring(1);

    if(args.resign){
        players.now.receiveChat('Game info', null, color + ' won the game by resignation.');
    } else {
        players.now.receiveChat('Game info', null, color + ' won the game by ' + args.score + ' points.');
    }

    callback();
};

gts_gtp.gtp.commands.quit = function(args, callback){
    players.now.inGame = false;
    reset();

    if(players.finalize){
        players.finalize(true);
    }

    callback();
};

gts_gtp.gtp.commands['assign-color'] = function(args, callback){
    players.color = args;
    players.now.inGame = true;

    players.now.myColor = args;
    if(players.now.setColor){
        players.now.setColor(args);
    }

    callback();
};

gts_gtp.gtp.commands['opponent-name'] = function(args, callback){
    players.now.opponentName = args;
    players.now.inGame = true;
    //Starting a new game, so start everyone out as active
    touchLastVoteTime();

    kgs.getUserRank(args, function(err, rank){
        players.now.opponentRank = rank;
    });

    callback();
};

var timeSettingsRegex = /byoyomi (\d+) (\d+) (\d+)/i;
gts_gtp.gtp.commands['kgs-time_settings'] = function(args, callback){
    var match = timeSettingsRegex.exec(args);

    players.now.timeSettings = { type: 'byoyomi', mainTime: match[1], byoyomiTime: match[2], byoyomiCount: match[3] };

    callback();
};

var timeLeftRegex = /([bw]) (\d+)/i;
gts_gtp.gtp.commands['time_left'] = function(args, callback){
    var match = timeLeftRegex.exec(args);

    var color = fromGtpColor(match[1]);
    var seconds = parseInt(match[2]);

    if(players.now.timeLeft == null){
        players.now.timeLeft = {
            white: null,
            black: null
        }
    }

    players.now.timeLeft[color] = seconds;

    callback();
};

var linkKgsAccount = function(sessionId, name, callback){
    var session = sessionStore[sessionId];

    if(session == null){
        return callback(null, 'A problem occurred when linking the account: Could not find TeamGo user');
    }

    session.username = name;

    kgs.getUserRank(name, function(err, rank){
        session.rank = rank;
    });

    callback(null, 'Account ' + name + ' linked successfully. Please note that you will need to reset your account again in the future if the TeamGo server resets.');
};

var chatKgsLinkRegex = /([^\s]+) link (.*)/i;
gts_gtp.gtp.commands['kgs-chat'] = function(args, callback){
    var match = chatKgsLinkRegex.exec(args);
    if(match != null){
        return linkKgsAccount(match[2], match[1], callback);
    }

    callback(null, 'Visit http://www.TeamGo.us to vote on moves for me!');
};

var reset = function(){
    clearBoard();
    players._genmove = null;
    players.now.myColor = null;
    players.now.timeLeft = null;
    players.now.opponentName = null;
    players.now.opponentRank = null;
};

var clearBoard = function(){
    players._moves = [];
    if(players.now.clearBoard){
        players.now.clearBoard();
    }
};

gts_gtp.gtp.commands['clear_board'] = function(args, callback){
    clearBoard();

    callback();
};

var getActivePlayerCount = function(){
    var currentTime = new Date();
    var count = 0;

    players.getUsers(function(users){
        for(var i = 0; i < users.length; i++){
            var session = getSession(users[i]);

            if(session.lastVoteTime && currentTime - session.lastVoteTime < 3 * 60 * 1000){
                count++;
            }
        }
    });

    return count;
};

var touchLastVoteTime = function(){
    players.getUsers(function(users){
        for(var i = 0; i < users.length; i++){
            var session = getSession(users[i]);
            session.lastVoteTime = new Date();
        }
    });
};

/*gts_gtp.gtp.commands['tg-got-challenge'] = function(args, callback){
    players.now.opponentName = args.opponent;
};*/

gts_gtp.gtp.commands.boardsize = function(args, callback){
    var normalHandler = function(){
        if(args != 19){
            callback('unacceptable size');
        } else {
            callback();
        }
    };

    if(gts_gtp.isIdle()){
        //Refuse games until ready
        return callback('unacceptable size');
    }

    //If we don't want to play against the player, we can return an error on this call to abort the game
    /*if(players.now.opponentName != null) {
        kgs.getUserRank(args.opponent, function(err, rank){
            isChallengerOk({ opponent: args.opponent, rank: rank }, function(err, ok){
                if(ok){
                    normalHandler();
                } else {
                    callback('unacceptable size');
                }
            });
        });
    } else {*/
        normalHandler();
    //}
};

setInterval(function(){
    if(players.now.inGame){
        players.now.lookingForGame = false;
    }

    if(players.now.lookingForGame){
        getReadyCount(function(err, count){
            if(count < 2 && !gts_gtp.isIdle()){
                gts_gtp.stop();
                players.now.lookingForGame = false;
            }
        });
    }

    if(!players.now.inGame && !players.now.lookingForGame){
        getReadyCount(function(err, count){
            if(count >= 2){
                gts_gtp.start({ idle: false });
                players.now.lookingForGame = true;
            } else if(!gts_gtp.isIdle()) {
                gts_gtp.stop();
                players.now.lookingForGame = false;
            }
        });
    }

    var timeLeft = players.now.timeLeft;
    if(timeLeft != null && players.now.myColor === players.now.whoseTurn){
        if(timeLeft.white != null){
            timeLeft.white--;
        }

        if(timeLeft.black != null){
            timeLeft.black--;
        }
    }

    players.now.activePlayerCount = getActivePlayerCount();

    if(players.genMoveStarted){
        var currentTime = new Date();
        var elapsedSeconds = Math.floor((currentTime - players.genMoveStarted) / 1000);

        var numberConfirmed = getNumberOfConfirmedVotes();

        var overallTurnTime = players.secondsPerMove - elapsedSeconds;
        var shortCircuit = overallTurnTime;

        if(numberConfirmed >= players.now.activePlayerCount && players.now.activePlayerCount > 0){
            //If all votes are confirmed, go ahead and move
            shortCircuit = 0;
        }

        players.now.turnTimeRemaining = Math.min(overallTurnTime, shortCircuit);

        if(players.now.whoseTurn === players.now.myColor && players.now.turnTimeRemaining <= 0){
            if(players.finalize){
                players.finalize();
            }
        }
    } else {
        players.now.turnTimeRemaining = null;
    }

    players.count(function(count){
        players.now.playerCount = count;
    });

}, 1000);

gts_gtp.start({ idle: true });