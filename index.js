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
           notifyUsersChanged();
        });
        ws.send(JSON.stringify({action: "connect", data: {success : true}}));
        notifyUsersChanged();
    }
}

function notifyUsersChanged() {
    let allUsernames = Object.keys(users);
    for(var username in users) {
       let ws = users[username].ws;
       ws.send(JSON.stringify({action : "users", data : allUsernames}));
    }
}
