var child_process = require('child_process');
var path = require('path');
var gtp = require('./gtp.js')('TeamGo.us', '0.1');

gtp.commands['kgs-chat'] = function(args, callback){
    callback(null, 'Join the online sensation at http://www.TeamGo.us');
};

exports.start = function(){
    var proc = child_process.spawn(
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
        console.error('stderr: ' + data);
    });

    proc.on('exit', function(code){
        console.log('Exited with code ' + code);
    })
};

exports.gtp = gtp;