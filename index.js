const express = require("express");
const path = require("path");
const { disconnect } = require("process");
const app = express();
const expressWs = require("express-ws")(app);

app.ws('/ws', (ws, req) => {
    ws.on('message', msg => {
        console.log(msg);
        handleMessage(ws,msg);
    });
});

app.get("/", (req,res) =>   res.send("hello world"));

app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(path.join(__dirname,'public')));

app.listen(5000, console.log("listening on 5000"));

let users = {};
let gamestate = {state: "stop", guesser: null, tellers : []};

function handleMessage(ws,ev) {
    let msg = JSON.parse(ev);
    if(msg.action == "connect") {
        if(msg.data.username == "") {
            ws.send(JSON.stringify({action: "connect", data: {success : false, reason: "username can not be null"}}));
            return;
        }
        if(users[msg.data.username] != undefined) {
           ws.send(JSON.stringify({action: "connect", data: {success : false, reason: "username already taken"}}));
           return;
        }
        users[msg.data.username] = {username: msg.data.username, ws : ws};
        ws.on("close", (ev) => {
           delete users[msg.data.username];
           removeUserFromGame();
           notifyUsersChanged();
        });
        ws.send(JSON.stringify({action: "connect", data: {success : true}}));
        notifyUsersChanged();
    }
    if(msg.action == "join") {
        //check user exists
        if(msg.username == undefined || users[msg.username] == undefined) {
            ws.send(JSON.stringify({action: "join", data:{success: false, reason : "must connect as a user to join the game"}}))
            return;
        }
        if(gamestate.state != "stop") {
            ws.send(JSON.stringify({action: "join", data: {success : false, reason : "can not change players while game is running"}}));
            return;
        }
        //user is not in game -> add em
        //user is already in game -> remove em to the new role
        removeUserFromGame(msg.username);
        if(msg.data.role == "guesser") {
            if(gamestate.guesser != null) {
                ws.send(JSON.stringify({action: "join", data : {success : false, reason: "can only be one guesser"}}))
                return;
            }
            else {
                gamestate.guesser = msg.username;
            }
        }
        else if(msg.data.role == "teller") {
            gamestate.tellers.push({username : msg.username});
        }
        notifyGameStateChanged();
    }
    if(msg.action == "gamestate") {
        ws.send(JSON.stringify({action: "gamestate", data :gamestate}));
        return;
    }
}

function notifyUsersChanged() {
    let allUsernames = Object.keys(users);
    for(var username in users) {
       let ws = users[username].ws;
       ws.send(JSON.stringify({action : "users", data : allUsernames}));
    }
}

function notifyGameStateChanged() {
    let allUsernames = Object.keys(users);
    for(var username in users) {
       let ws = users[username].ws;
       ws.send(JSON.stringify({action: "gamestate", data :gamestate}));
    }
}

function removeUserFromGame(username) {
    if(gamestate.guesser == username) {
        gamestate.guesser = null;
    }
    let teller = gamestate.tellers.find(x => x.username == username);
    if(teller != undefined) {
        let pos = gamestate.tellers.indexOf(teller);
        gamestate.tellers.splice(pos,1);
    }
    checkGamestate();
    notifyGameStateChanged();
}
function checkGamestate() {
    //check if game need to be reset to stopped state
    if(gamestate.state == "start" || gamestate.state == "waiting") {
        if(gamestate.guesser == null || gamestate.tellers.length < 2) {
            gamestate.state = "stop";
            return;
        }
    }
}
function setToWaitingState() {
    gamestate.action = "waiting";
    gamestate.tellers.forEach(p => delete p.page);
}