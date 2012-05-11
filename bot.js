var path = require('path');
var child_process = require('child_process');
var utility = require('./utility.js');

var proc;
var waitingOnResponse = false;
var sendQueue = [];

exports.start = function(){
    proc = child_process.spawn(
        path.join(__dirname, './client/gnugo'),

        ['--mode', 'gtp', '--level', '15'],

        { cwd: path.join(__dirname, './client') }
    );

    proc.stdout.on('data', function(data){
        console.error('bot stdout: ' + data);
    });

    proc.stderr.on('data', function(data){
        console.error('bot stderr: ' + data);
    });

    proc.on('exit', function(code){
        console.log('Exited ' + code);
    });
};

exports.stop = function(){
    proc.kill('SIGINT');
};

var processNextQueue = function(){
    var next = sendQueue.splice(0, 1)[0];
    if(next){
        _send.apply(null, next);
    }
};

var _send = function(command, callback){
    console.log('send bot: ' + command);

    var response = '';

    proc.stdout.on('data', function(data){
        var text = data.toString();
        response += text;

        console.log('bot: ' + text);

        if(response.slice(-2) === '\n\n'){
            proc.stdout.removeAllListeners('data');
            waitingOnResponse = false;

            if(callback){
                callback(null, response);
            }

            processNextQueue();
        }
    });

    waitingOnResponse = true;
    proc.stdin.write(command + '\n\n');
};

exports.send = function(command, callback){
    sendQueue.push(arguments);

    if(waitingOnResponse){
        return;
    } else {
        processNextQueue();
    }
};

exports.register = function(commands){
    var existing = {
        genmove: commands.genmove,
        play: commands.play,
        boardsize: commands.boardsize,
        clear_board: commands.clear_board,
        komi: commands.komi,
        'tg-finalize-move': commands['tg-finalize-move']
    };

    var genmoveRegex = /=\s*([^\s]+)/;
    commands.genmove = function(args, callback){
        exports.send('genmove ' + args, function(err, raw){
            var move = genmoveRegex.exec(raw)[1];
            console.log('bot move: ' + move);

            commands['tg-bot-vote'](move);
        });

        existing.genmove(args, callback);
    };

    commands.play = function(args, callback){
        exports.send('play ' + args);

        existing.play(args, callback);
    };

    commands.boardsize = function(args, callback){
        exports.send('boardsize ' + args);

        existing.boardsize(args, callback);
    };

    commands.komi = function(args, callback){
        exports.send('komi ' + args);

        existing.komi(args, callback);
    };

    commands.clear_board = function(args, callback){
        exports.send('clear_board');

        existing.clear_board(args, callback);
    };

    commands['tg-finalize-move'] = function(moves){
        exports.send('clear_board');

        moves.forEach(function(move){
            if(!move.special){
                exports.send('play ' + utility.toGtpColor(move.color) + ' ' + utility.toVertex(move.x, move.y));
            }
        });

        existing['tg-finalize-move'](moves);
    };
};

process.on("exit", function() {
    exports.stop();
});