var express = require('express');
var nowjs = require("now");
var gts_gtp = require('../kgs_gtp.js');

var app = express.createServer();
app.use(express.static(__dirname + '/web'));

var server = app.listen(8000);

var everyone = nowjs.initialize(server);
var players = nowjs.getGroup('players');

everyone.on('join', function () {
    players.addUser(this.user.clientId);
});

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

gts_gtp.gtp.commands.genmove = function(args, callback){
    var color = fromGtpColor(args);

    players.now.genMove(color, function(err, x, y){
        callback(err, toVertex(x, y));
    });
};

var playRegex = /([^\s]+)\s([^\s]+)/;
gts_gtp.gtp.commands.play = function(args, callback){
    var match = playRegex.exec(args);

    var color = fromGtpColor(match[1]);
    var coord = fromVertex(match[2]);

    players.now.playMove(color, coord.x, coord.y);

    callback();
};

gts_gtp.start();