var tg = {};

tg.board = {};
tg.board.rows = [];
tg.board.players = {
    white: {
        captures: ko.observable(0)
    },
    black: {
        captures: ko.observable(0)
    }
};

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

    board.clear = function(){
        for(var i = 0; i < board.rows.length; i++){
            var row = board.rows[i];
            for(var j = 0; j < row.length; j++){
                row[j].status('empty');
            }
        }

        board.players.white.captures(0);
        board.players.black.captures(0);

        board.lastMove = null;
    };

    board.playMove = function(color, x, y){
        board.rows[y][x].status(color);

        var groups = board.findSurroundingGroups(color, x, y);

        for(var i = 0; i < groups.length; i++){
            if(board.isGroupCaptured(groups[i])){
                board.capture(color, groups[i]);
            }
        }

        if(!board.isLegalMove(color, x, y)){
            board.resetToState(board.oneStateAgo);
            return false;
        }

        board.twoStatesAgo = board.oneStateAgo;
        board.oneStateAgo = board.getStateString();

        return true;
    };

    board.getStateString = function(){
        var state = '';

        for(var i = 0; i < board.rows.length; i++){
            var row = board.rows[i];
            for(var j = 0; j < row.length; j++){
                if(row[j].status() === 'black'){
                    state += 'b';
                } else if(row[j].status() === 'white') {
                    state += 'w';
                } else {
                    state += '+';
                }
            }
        }

        return state;
    };

    board.resetToState = function(state){
        for(var i = 0; i < state.length; i++){
            var x = i % 19;
            var y = Math.floor(i / 19);

            switch(state[i]){
                case 'b':
                    board.rows[y][x].status('black');
                    break;
                case 'w':
                    board.rows[y][x].status('white');
                    break;
                case '+':
                    board.rows[y][x].status('empty');
                    break;
            }
        }
    };

    board.isLegalMove = function(color, x, y){
        var legalMove = false;

        var group = board.findGroup(x, y);

        if(board.isGroupCaptured(group)){
            return false;
        }

        var state = board.getStateString();


        if(state === board.twoStatesAgo){
            return false;
        }

        return true;
    };

    board.getColor = function(x, y){
        if(x < 0 || y < 0 || x > 18 || y > 18){
            return;
        }

        return board.rows[y][x].status();
    };

    board.getOppositeColor = function(color){
        if(color === 'white'){
            return 'black';
        } else {
            return 'white';
        }
    };

    var getCardinalPoints = function(x, y){
        return [
            { x: x - 1, y: y },
            { x: x + 1, y: y },
            { x: x, y: y - 1 },
            { x: x, y: y + 1 }
        ];
    };

    board.findSurroundingGroups = function(color, x, y){
        var groups = [];
        var oppositeColor = board.getOppositeColor(color);

        getCardinalPoints(x, y).forEach(function(point){
            if(board.getColor(point.x, point.y) === oppositeColor){
                groups.push(board.findGroup(point.x, point.y));
            }
        });

        return groups;
    };

    board.findGroup = function(x, y){
        var group = {
            points: []
        };

        var color = board.rows[y][x].status();
        if(color === 'empty'){
            return group;
        }

        var checked = {};

        var search = function(x, y){
            if(x < 0 || y < 0 || x > 18 || y > 18){
                return;
            }

            if(checked[x + ',' + y]){
                return;
            }

            checked[x + ',' + y] = true;

            if(board.rows[y][x].status() === color){
                group.points.push({x: x, y: y});

                getCardinalPoints(x, y).forEach(function(point){
                    search(point.x, point.y);
                });
            }
        };

        search(x, y);

        return group;
    };

    board.isGroupCaptured = function(group){
        for(var i = 0; i < group.points.length; i++){
            var x = group.points[i].x;
            var y = group.points[i].y;

            var emptyFound = false;

            getCardinalPoints(x, y).forEach(function(point){
                var color = board.getColor(point.x, point.y);

                if(color === 'empty'){
                    emptyFound = true;
                }
            });

            if(emptyFound){
                return false;
            }
        }

        return true;
    };

    board.capture = function(color, group){
        for(var i = 0; i < group.points.length; i++){
            var point = group.points[i];
            board.rows[point.y][point.x].status('empty');
        }

        board.players[color].captures(board.players[color].captures() + group.points.length);
    };
})();