const express = require("express");
const path = require("path");

const app = express();

app.get("/", (req,res) =>   res.send("hello world"));

app.listen(80, console.log("listening on 80"));