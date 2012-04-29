var tg = {};

tg.board = {};
tg.board.rows = [];

tg.board.events = new EventEmitter();

(function(){
    var board = tg.board;
    var events = board.events;

    for(var i = 0; i < 19; i++){
        var row = [];
        tg.board.rows.push(row);

        for(var j = 0; j < 19; j++){
            row.push({
                x: j,
                y: i,
                status: ko.observable('empty'),
                click: function(intersection){
                    if(intersection.status() === 'empty'){
                        events.emit('intersectionClick', intersection);
                    }
                }
            });
        }
    }

    board.playMove = function(color, x, y){
        board.rows[y][x].status(color);
    };


})();