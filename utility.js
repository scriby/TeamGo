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

exports.fromVertex = function(vertex){
    var firstChar = vertex[0].toLowerCase();

    return {x: vertexMapping[firstChar], y: 19 - parseInt(vertex.substring(1)) };
};

exports.toVertex = function(x, y){
    return vertexMapping[x] + (19 - parseInt(y));
};

exports.fromGtpColor = function(color){
    color = color.toLowerCase();

    if(color === 'w' || color === 'white'){
        return 'white';
    } else {
        return 'black';
    }
};

exports.toGtpColor = function(color){
    color = color.toLowerCase();

    if(color === 'white'){
        return 'w';
    } else {
        return 'b';
    }
};