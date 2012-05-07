var child_process = require('child_process');
var path = require('path');
var gtp = require('./gtp.js')('TeamGo.us', '0.1');

var proc;

exports.start = function(){
    proc = child_process.spawn(
        'java',

        ['-jar', 'kgsGtp.jar', 'config.txt'],

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
            proc = exports.start();
        }, 1000);

    });

    return proc;
};

exports.stop = function(){
    if(proc){
        proc.removeAllListeners('exit');
        proc.kill('SIGINT');

        setTimeout(function(){
            proc = null;
        }, 1000);
    }
};

exports.isStarted = function(){
    return proc != null;
};

exports.gtp = gtp;