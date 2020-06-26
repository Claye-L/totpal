const express = require("express");
const path = require("path");

const app = express();

app.get("/", (req,res) =>   res.send("hello world"));

app.use(express.static(path.join(__dirname,'public')));

app.listen(5000, console.log("listening on 5000"));