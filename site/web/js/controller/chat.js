tg.chat = {};

(function(){
    var chat = tg.chat;

    chat.messages = ko.observableArray();
    chat.chatMessage = ko.observable();

    chat.send = function(text){
        now.sendChat(text);
    };

    chat.sendClick = function(){
        if(chat.chatMessage() !== '') {
            chat.send(chat.chatMessage());
            chat.chatMessage('');
        }
    };

    now.ready(function(){
        now.receiveChat = function(from, rank, text){
            chat.messages.push({ from: from, rank: rank, text: text });

            var messages = $('.chat-messages');
            messages.scrollTop(messages.prop('scrollHeight'));
        };
    });
})();