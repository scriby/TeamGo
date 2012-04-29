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

    commands.boardsize = function(args, callback){
        if(args != 19){
            callback('unacceptable size');
        } else {
            callback();
        }
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
};

if(typeof exports !== 'undefined'){
    module.exports = function(clientName, clientVersion){
        return new GTP(clientName, clientVersion);
    };
}