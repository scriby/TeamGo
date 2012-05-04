var tg = {};

(function(){
    var Board = function(){
        var self = this;

        this.rows = [];
        this.players = {
            white: {
                captures: ko.observable(0),
                name: ko.observable(),
                timeLeft: ko.observable(),
                rank: ko.observable()
            },
            black: {
                captures: ko.observable(0),
                name: ko.observable(),
                timeLeft: ko.observable(),
                rank: ko.observable()
            }
        };

        var formatTime = function(totalSeconds){
            if(totalSeconds > 0){
                var seconds = (totalSeconds % 60);
                if(seconds < 10){
                    seconds = '0' + seconds;
                }
                return parseInt(totalSeconds / 60) + ':' + seconds;
            }
        };

        this.players.white.formattedTimeLeft = ko.computed({
            read: function(){
                return formatTime(self.players.white.timeLeft());
            }
        });

        this.players.black.formattedTimeLeft = ko.computed({
            read: function(){
                return formatTime(self.players.black.timeLeft());
            }
        });

        this.gameInProgress = ko.observable(false);
        this.doneLoading = ko.observable(true);
        this.playerCount = ko.observable();

        this.myColor = null;

        this.events = new EventEmitter();

        this.secondsPerMove = 27;
        this.byoYomiSeconds = 30;
        this.remainingSeconds = ko.observable();

        for(var i = 0; i < 19; i++){
            var row = [];
            this.rows.push(row);

            for(var j = 0; j < 19; j++){
                row.push({
                    x: j,
                    y: i,
                    status: ko.observable('empty'),
                    votes: ko.observable(0),
                    confirmed: ko.observable(false),
                    preview: ko.observable(false),
                    click: function(intersection){
                        self.events.emit('intersectionClick', intersection);
                    }
                });
            }
        }
    };

    Board.prototype.setOpponent = function(name, rank){
        if(this.myColor === 'white'){
            this.players.black.name(name);
            this.players.black.rank(rank);

            this.players.white.name('TeamGo');
        } else {
            this.players.white.name(name);
            this.players.white.rank(rank);

            this.players.black.name('TeamGo');
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

    Board.prototype.addVote = function(color, x, y){
        var item = this.rows[y][x];
        item.preview(true);
        item.status(color);
        item.votes(item.votes() + 1);
    };

    Board.prototype.confirmVote = function(x, y){
        var item = this.rows[y][x];
        item.confirmed(true);
    };

    Board.prototype.unconfirmVote = function(x, y){
        var item = this.rows[y][x];
        item.confirmed(false);
    };

    Board.prototype.removeVote = function(color, x, y){
        var item = this.rows[y][x];
        item.votes(item.votes() - 1);

        if(item.votes() <= 0) {
            item.status('empty');
            item.preview(false);
        }
    };

    Board.prototype.removeAllVotes = function(){
        for(var i = 0; i < this.rows.length; i++){
            var row = this.rows[i];

            for(var j = 0; j < row.length; j++){
                if(row[j].votes() > 0){
                    console.log('removing votes');
                    row[j].preview(false);
                    row[j].status('empty');
                    row[j].votes(0);
                }
            }
        }
    };

    Board.prototype._playMove = function(color, x, y){
        this.removeAllVotes();
        this.rows[y][x].status(color);

        var groups = this.findSurroundingGroups(color, x, y);

        for(var i = 0; i < groups.length; i++){
            if(this.isGroupCaptured(groups[i])){
                this.capture(color, groups[i]);
            }
        }
    };

    Board.prototype.checkMove = function(color, x, y){
        if(this.getColor(x, y) !== 'empty'){
            return false;
        }

        //Attempt to play the move against a copy of the board to see if it's legal
        var clone = this.clone();

        clone._playMove(color, x, y);

        return clone.isLegalMove(color, x, y);
    };

    Board.prototype.playMove = function(color, x, y){
        if(this.checkMove(color, x, y)){
            this._playMove(color, x, y);

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
                if(row[j].status() === 'black' && !row[j].preview()){
                    state += 'b';
                } else if(row[j].status() === 'white' && !row[j].preview()) {
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

        if(this.rows[y][x].preview()){
            return 'empty';
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

        var color = this.getColor(x, y);
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

            if(self.getColor(x, y) === color){
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

