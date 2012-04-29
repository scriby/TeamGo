var tg = {};

(function(){
    var Board = function(){
        var self = this;

        this.rows = [];
        this.players = {
            white: {
                captures: ko.observable(0)
            },
            black: {
                captures: ko.observable(0)
            }
        };

        this.events = new EventEmitter();

        for(var i = 0; i < 19; i++){
            var row = [];
            this.rows.push(row);

            for(var j = 0; j < 19; j++){
                row.push({
                    x: j,
                    y: i,
                    status: ko.observable('empty'),
                    click: function(intersection){
                        if(intersection.status() === 'empty'){
                            self.events.emit('intersectionClick', intersection);
                        }
                    }
                });
            }
        }
    };

    Board.prototype.clone = function(){
        var clone = new Board();
        var boardState = this.getStateString();
        clone.resetToState(boardState);
        clone.oneStateAgo = this.oneStateAgo;
        clone.twoStatesAgo = this.twoStatesAgo;

        return clone;
    };

    Board.prototype.clear = function(){
        for(var i = 0; i < this.rows.length; i++){
            var row = this.rows[i];
            for(var j = 0; j < row.length; j++){
                row[j].status('empty');
            }
        }

        this.players.white.captures(0);
        this.players.black.captures(0);
    };



    Board.prototype.playMove = function(color, x, y){
        var playMove = function(board){
            board.rows[y][x].status(color);

            var groups = board.findSurroundingGroups(color, x, y);

            for(var i = 0; i < groups.length; i++){
                if(board.isGroupCaptured(groups[i])){
                    board.capture(color, groups[i]);
                }
            }
        };

        //Attempt to play the move against a copy of the board to see if it's legal
        var checkMove = function(board){
            playMove(board);

            return board.isLegalMove(color, x, y);
        };

        var clone = this.clone();

        if(checkMove(clone)){
            playMove(this);

            this.twoStatesAgo = this.oneStateAgo;
            this.oneStateAgo = this.getStateString();

            return true;
        } else {
            return false;
        }
    };

    Board.prototype.getStateString = function(){
        var state = '';

        for(var i = 0; i < this.rows.length; i++){
            var row = this.rows[i];
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

    Board.prototype.resetToState = function(state){
        for(var i = 0; i < state.length; i++){
            var x = i % 19;
            var y = Math.floor(i / 19);

            switch(state[i]){
                case 'b':
                    this.rows[y][x].status('black');
                    break;
                case 'w':
                    this.rows[y][x].status('white');
                    break;
                case '+':
                    this.rows[y][x].status('empty');
                    break;
            }
        }
    };

    Board.prototype.isLegalMove = function(color, x, y){
        var group = this.findGroup(x, y);

        if(this.isGroupCaptured(group)){
            return false;
        }

        var state = this.getStateString();

        if(state === this.twoStatesAgo){
            return false;
        }

        return true;
    };

    Board.prototype.getColor = function(x, y){
        if(x < 0 || y < 0 || x > 18 || y > 18){
            return;
        }

        return this.rows[y][x].status();
    };

    var getOppositeColor = function(color){
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

    Board.prototype.findSurroundingGroups = function(color, x, y){
        var self = this;
        var groups = [];
        var oppositeColor = getOppositeColor(color);

        getCardinalPoints(x, y).forEach(function(point){
            if(self.getColor(point.x, point.y) === oppositeColor){
                groups.push(self.findGroup(point.x, point.y));
            }
        });

        return groups;
    };

    Board.prototype.findGroup = function(x, y){
        var self = this;
        var group = {
            points: []
        };

        var color = this.rows[y][x].status();
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

            if(self.rows[y][x].status() === color){
                group.points.push({x: x, y: y});

                getCardinalPoints(x, y).forEach(function(point){
                    search(point.x, point.y);
                });
            }
        };

        search(x, y);

        return group;
    };

    Board.prototype.isGroupCaptured = function(group){
        var self = this;

        for(var i = 0; i < group.points.length; i++){
            var x = group.points[i].x;
            var y = group.points[i].y;

            var emptyFound = false;

            getCardinalPoints(x, y).forEach(function(point){
                var color = self.getColor(point.x, point.y);

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

    Board.prototype.capture = function(color, group){
        for(var i = 0; i < group.points.length; i++){
            var point = group.points[i];
            this.rows[point.y][point.x].status('empty');
        }

        this.players[color].captures(this.players[color].captures() + group.points.length);
    };

    tg.board = new Board();
})();

