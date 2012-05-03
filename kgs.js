var request = require('request');
var urlPattern = 'http://www.gokgs.com/gameArchives.jsp?user=*user*&year=*year*&month=*month*';
var noGamesRegex = /no games in the archives/i;
var quotaExceeded = /quota exceeded/i;

var requestRank = function(username, year, month, callback){
    var url = urlPattern.replace('*user*', username).replace('*year*', year).replace('*month*', month);
    var rankRegex = new RegExp(username + '\\s?\\[(.*?)\\]', 'i');

    request.get(url, function(err, response, body){
        if(err != null){
            return callback(err);
        }

        if(quotaExceeded.test(body)){
            return callback('Request quota exceeded');
        }

        if(noGamesRegex.test(body)){
            return callback('Account ' + username + ' does not exist.');
        }

        var match = rankRegex.exec(body);
        if(match){
            callback(null, match[1]);
        } else {
            callback();
        }
    });
};

exports.getUserRank = function(username, callback){
    var start = new Date();
    var year = start.getFullYear();
    var month = start.getMonth() + 1;
    var checks = 0;

    var check = function(){
        checks++;

        requestRank(username, year, month, function(err, rank){
            if(err){
                return callback(err);
            }

            if(rank != null){
                callback(null, rank);
            } else {
                //Only look back a year to find a game for the user
                if(checks <= 3){
                    start.setMonth(start.getMonth() - 1);
                    check();
                } else {
                    callback('No recent games');
                }
            }
        });
    };

    check();
};