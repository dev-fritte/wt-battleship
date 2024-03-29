// get websocket class, firefox has a different way to get it
var WS = window['MozWebSocket'] ? window['MozWebSocket'] : WebSocket;

var socket = new WS(getSocketAddress());

console.log(socket);

var myTurn = true;

var matrix_self = [];
var matrix_opponent = [];

initMatrix(matrix_self);
initMatrix(matrix_opponent);

var shipIcon = "maps:directions-boat";
var hitIcon  = "icons:close";

$(document).ready(function () {
 
    socket.onmessage = handleMessage;
    socket.onclose = function () {setPlayerInfo("Your opponent left the Game!");};
    
    // ------- BUILD GAMEFIELD --------
    createGamefield(matrix_self, true);
    createGamefield(matrix_opponent, false);
    
    //Chat mit Enter bestätigen
    $('#chatInput').keypress(function(key) {
        if (key.which == 13) {
            chat();
        }
    });
    
    Polymer.updateStyles();
    
});

var messageType = {
        CHAT: "CHAT",
        PLAYERNAME: "PLAYERNAME",
        // HIT and MISS
        HIT: "HIT",
        MISS: "MISS",
        // INVALID
        WRONGINPUT: "WRONGINPUT",
        PLACEERR: "PLACEERR",
        WAIT: "WAIT",
        START: "START",
        // PLACE
        PLACE1: "PLACE1",
        PLACE2: "PLACE2",
        FINALPLACE1: "FINALPLACE1",
        FINALPLACE2: "FINALPLACE2",
        // SHOOT
        SHOOT1: "SHOOT1",
        SHOOT2: "SHOOT2",
        // WIN
        WIN1: "WIN1",
        WIN2: "WIN2",
    };

var handleMessage = function handleMessage(message) {
    var msg = JSON.parse(message.data);
        console.log("Message %o received", msg);
        switch (msg.type) {
            case messageType.WAIT:
                myTurn = false;
                setPlayerInfo("This is not your turn. Wait for your opponent");
                break;
            case messageType.CHAT: 
                displayChatMessage(message);
                break;
            case messageType.PLAYERNAME:
                myTurn = true;
                getPlayerName(); 
                 setPlayerInfo("Game is about to begin");
                break;
            case messageType.PLACE1: 
            case messageType.PLACE2:
            case messageType.FINALPLACE1:
            case messageType.FINALPLACE2:
                myTurn = true;
                setPlayerInfo("Place your ships on the right side. (CTRL + Click = vertical)");
                fillField(matrix_opponent, msg.boardmap);
                setPlaceFunction(matrix_opponent);
                break;
            case messageType.SHOOT1:
            case messageType.SHOOT2:
                removeOnclickFunction(matrix_opponent);
                myTurn = true;
                setPlayerInfo("Shoot the hell out of your opponent!");
                setShootFunction(matrix_self);
                fillField(matrix_self, msg.ownMap);
                fillField(matrix_opponent, msg.opponentMap);
                break;
            case messageType.HIT:
            case messageType.MISS:
                myTurn = false;
                setPlayerInfo("Wait for your opponent");
                fillField(matrix_self, msg.hitMap);
                break;
            case messageType.WIN1:
            case messageType.WIN2:
                myTurn = false;
                if(msg.win) {
                    setPlayerInfo("YOU WON!");
                } else {
                    setPlayerInfo("You lost. Sorry Mate");
                }
                fillField(matrix_self, msg.ownMap);
                fillField(matrix_opponent, msg.opponentMap);
                removeOnclickFunction(matrix_self);
                removeOnclickFunction(matrix_opponent);
                break;
            case messageType.PLACEERR:
                    if(myTurn) {
                        alert("Ship could not be placed! Try another location");
                    }
                break;
            default: break;
        }
};

function sendMessage(message) {
    if (myTurn) {
        socket.send(message);
    }
}

function chat() {
    var chatPrefix = "CHAT ";
    var text = document.getElementById('chatInput').value;
    document.getElementById('chatInput').value = "";
    socket.send(chatPrefix + text);
}

function displayChatMessage(message) {
    var msg = JSON.parse(message.data);
    var date = new Date();
    var hours = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours());
    var minutes = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
    var charView = document.getElementById('chatView');
    chatView.append ("[" + hours + ":" + minutes + "] " + msg.sender + ": " + msg.message + "\n");
}

function setPlayerInfo(text) {
    $('#playerinfo').text(text);
}

function fillField(matrix, boardmap) {
    for(var row = 0; row < matrix.length; row++) {
       for (var col = 0; col < matrix.length; col++) {
            matrix[row][col].setAttribute("color", boardmap[row][col]);
            if(boardmap[row][col] == "S" || boardmap[row][col] == "H")
                matrix[row][col].setAttribute("icon", shipIcon);
            else if(boardmap[row][col] == "M")
                matrix[row][col].setAttribute("icon", hitIcon);
       }
    }
    Polymer.updateStyles();
}

function setPlaceFunction(matrix) {
   for(var row = 0; row < matrix.length; row++) {
       for (var col = 0; col < matrix.length; col++) {
           matrix[row][col].onclick = placeShip();
       }
   }
}

function placeShip() {
    return function (event) {
        if(!event.ctrlKey)
            sendMessage(this.getAttribute("row") + " " + this.getAttribute("col") + " false");
        else {
            sendMessage(this.getAttribute("row") + " " + this.getAttribute("col") + " true");
        }
        
    };
}

function setShootFunction(matrix) {
     for(var row = 0; row < matrix.length; row++) {
       for (var col = 0; col < matrix.length; col++) {
           matrix[row][col].onclick = shootOnField();
       }
   }
}

function shootOnField() {
    return function () {
        sendMessage(this.getAttribute("row") + " " + this.getAttribute("col"));
    };
}

function removeOnclickFunction(matrix) {
     for(var row = 0; row < matrix.length; row++) {
       for (var col = 0; col < matrix.length; col++) {
           matrix[row][col].onclick = "";
       }
   }
}

function getPlayerName() {
    var playername = prompt("Please enter your name", "");
    sendMessage("PLAYERNAME " + playername);
}

function getSocketAddress() {
    var socketAddress = window.location.origin.replace("http", "ws");
    return socketAddress + "/websocket";
}

function initMatrix(matrix) {
    for(var i = 0; i < 10; i++) {
    matrix[i] = new Array(10);
}
}

function createGamefield(matrix, self) {
    var gamefield;
    var id;
    if(self === true) {
        gamefield = document.getElementById('gamefield_self');
        id = "gamefield_leftSide";
    } else {
        gamefield = document.getElementById('gamefield_opponent');
        id = "gamefield_rightSide";
    }
    
    for (var count = 0; count < 10; count++) {
        var row = document.createElement('div');
        row.setAttribute("class", "row");
        row.setAttribute("id", "row#" + count);
        
        for (var bCount = 0; bCount < 10; bCount++) {
            var button = document.createElement('gamefield-button');
            button.setAttribute("row", count.toString());
            button.setAttribute("col", bCount.toString());
            button.setAttribute("color", "O");
            button.setAttribute("id", id);
            matrix [count][bCount] = button;
            row.appendChild(button);
        }
        gamefield.appendChild(row);
    }
}
