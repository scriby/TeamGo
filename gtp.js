// http://www.lysator.liu.se/~gunnar/gtp/gtp2-spec-draft2/gtp2-spec.html

var GTP = function(clientName, clientVersion) {
    var commands = this.commands = {};

    commands.list_commands = function(args, callback){
        var commandList = [];
        Object.keys(commands).forEach(function(key){
            commandList.push(key);
        });

        callback(null, commandList);
    };

    commands.name = function(args, callback){
        callback(null, clientName);
    };

    commands.version = function(args, callback){
        callback(null, clientVersion);
    };

    commands.komi = function(args, callback){
        callback();
    };

    var handle = function(command, args, callback){
        if(commands[command]){
            commands[command](args, callback);
        } else {
            return callback('Command ' + command + ' not supported');
        }
    };

    var convertResponse = function(response){
        if(Array.isArray(response)){
            response = response.join('\n');
        }

        return response;
    };

    var parseRegex = /(\d+)?([^\s]+)?\s?([^\s]+)?\s?(.*)?/;
    this.receive = function(text, callback){
        var match = parseRegex.exec(text);

        var id;
        var command;
        var args;

        if(match[1] != null){
            id = match[1];
            command = match[3];
            args = match[4];
        } else {
            command = match[2];
            args = match[3];
            if(match[4] != null){
                args += ' ' + match[4];
            }
        }

        var cb = function(err, response){
            if(err){
                response = err;
            }

            if(response == null){
                response = '';
            }

            response = convertResponse(response);

            if(id != null){
                response = id + ' ' + response;
            }

            var prepend = err == null ? '=' : '?';

            callback(null, prepend + response + '\n\n');
        };

        handle(command, args, cb);
    };

    var colorPlayerRegex = /Starting game as ([^\s]+) against ([^\s]+)/i;
    var finalScore = /final result = ([B|W])\+([^\)]+)/i;
    var leavingGame = /leaving game/i;
    var gotChallenge = /Got challenge from "([^"]+)"/i;
    //KGS logs status info to stderr. We can parse it to get more information
    this.receiveError = function(text){
        //Parse KGS message to figure out which color we are
        var match = colorPlayerRegex.exec(text);
        if(match){
            var color = match[1];
            var player = match[2];
            handle('assign-color', color, function(){});
            handle('opponent-name', player, function(){});
        }

        match = finalScore.exec(text);
        if(match){
            handle('tg-final-score', { winner: match[1], score: match[2], resign: match[2] === 'Res.' }, function(){});
        }

        match = leavingGame.exec(text);
        if(match){
            handle('quit', null, function(){});
        }

        match = gotChallenge.exec(text);
        if(match){
            handle('tg-got-challenge', { opponent: match[1] }, function(){});
        }
    };
};

if(typeof exports !== 'undefined'){
    module.exports = function(clientName, clientVersion){
        return new GTP(clientName, clientVersion);
    };
}