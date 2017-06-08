'use strict'

/*----------------------------------------------------------------------------------------------------*/

// Libraries
var express = require('express');
var Wit = require('node-wit').Wit; // Wit.ai node SDK
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var sha256 = require('sha256');
var util = require('./lib/util.js');

util._DEBUG = true;
/*----------------------------------------------------------------------------------------------------*/

// Constants
var Constants = require('./lib/Constants.js');
var CONV_DB = Constants.CONV_DB;
var ID_DB = Constants.ID_DB
var ID_Status = Constants.ID_Status;
var _ENDPOINT = Constants._ENDPOINT;

var debugPrint = util.debugPrint;

/*----------------------------------------------------------------------------------------------------*/

// Webserver parameter setup
const PORT = process.env.PORT || 3000
const app = express();
const client = new Wit({ accessToken: Constants._TOKEN }); // Wit.ai client

/*----------------------------------------------------------------------------------------------------*/

// App Uses
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'Secret', saveUninitialized: false, resave: false
}));

/*----------------------------------------------------------------------------------------------------*/

// Util functions

/* Function to setup and initialize 
conversation parameters and records in CONV_DB */
function setupConv(id) {
    CONV_DB[id] = {
        numMsgs: 0,
        product: {
            type: 'NA',
            service_tag: 'NA'
        },
        problem: 'NA',
        results: {},
        resolved: 'NA',
    };
}

// ID generator: returns new ID
function generateId() {
    var id = Math.round(Math.random() * 1000000000);
    let id_sha = sha256(id.toString());
    while (ID_DB.exists(id_s)) {
        id = Math.round(Math.random() * 1000000000);
    }
    var id_s = ID_Status(id_sha);
    ID_DB.addID(id_s);
    return id_sha;
}

/*----------------------------------------------------------------------------------------------------*/

// Routes and Endpoint functions
app.get(_ENDPOINT + 'id', function (req, res) {
    debugPrint('Received ID request');
    var id = generateId();
    setupConv(id);
    req.session.conv_id = id;
    res.end(JSON.stringify({ id: id }));
    debugPrint('ID Request addressed. Sent ID : ' + JSON.stringify({ id: id }));
});

app.post(_ENDPOINT + 'message', function (req, res) {
    debugPrint(req.session.conv_id);
    debugPrint(JSON.stringify(ID_DB.ids));
    if (!ID_DB.exists(req.session.conv_id)) {
        return res.status(401).end('{"status": "Session Expired"}');
    }
    debugPrint('Message = ' + req.body.m);
    var msg = req.query.msg;
    debugPrint('Message Received: ' + msg);
    res.status(200).end('{"status": "Cool bruh"}');
});

/*----------------------------------------------------------------------------------------------------*/
// Setup and Start the server

app.listen(PORT);
console.log("Server running. Waiting for messages...");

/*----------------------------------------------------------------------------------------------------*/
