var child_process = require('child_process');
var path = require('path');
var gtp = require('./gtp.js')('TeamGo.us', '0.1');

var proc;
var startOptions;

exports.start = function(options){
    if(options == null){
        options = {};
    }

    startOptions = options;

    var startArgs = ['-jar', 'kgsGtp.jar', 'config.txt'];

    if(options.opponent){
        startArgs.push('opponent=' + options.opponent);
    }

    if(options.idle){
        startArgs.push('mode=wait');
        if(!options.opponent){
            startArgs.push('opponent=zzzzzzzz');
        }
    } else {
        startArgs.push('mode=custom');
        startArgs.push('gameNotes=I relay moves voted on by players at www.TeamGo.us' );
    }

    proc = child_process.spawn(
        'java',

        startArgs,

        { cwd: path.join(__dirname, './client') }
    );

    var handler = function(err, response){
        if(err){
            throw err;
        }

        console.log('writing: ' + response);

        proc.stdin.write(response);
    };

    proc.stdout.on('data', function(data){
        var text = data.toString();

        console.log('received: ' + text);

        gtp.receive(text, handler);
    });

    proc.stderr.on('data', function(data){
        gtp.receiveError(data.toString());

        console.error('stderr: ' + data);
    });

    proc.on('exit', function(code){
        console.log('Exited with code ' + code);

        console.log('Restarting...');

        setTimeout(function(){
            proc = exports.start({ idle: true });
        }, 3000);

    });

    return proc;
};

exports.stop = function(){
    if(proc && !exports.isIdle()){
        //proc.removeAllListeners('exit');
        proc.kill('SIGINT');

        /*setTimeout(function(){
            exports.start({ idle: true }); //start the client in "wait" mode
        }, 3000);*/
    }
};

exports.isIdle = function(){
    return !!startOptions.idle;
};

exports.isStarted = function(){
    return proc != null;
};

exports.gtp = gtp;