'use strict'

/*----------------------------------------------------------------------------------------------------*/

// Libraries
var express = require('express');
var Wit = require('node-wit').Wit; // Wit.ai node SDK
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var crypto = require('crypto');
var util = require('./lib/util.js');

/*----------------------------------------------------------------------------------------------------*/

// Constants
var Constants = require('./lib/Constants.js');
var CONV_DB = Constants.CONV_DB;
var ID_DB = Constants.ID_DB
var ID_Status = Constants.ID_Status;
var _ENDPOINT = Constants._ENDPOINT;

var debugPrint = util.debugPrint;
var Message = Constants.Message;
var Conversation = Constants.Conversation;

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
    // CONV_DB[id] = {
    //     numMsgs: 0,
    //     product: {
    //         type: 'NA',
    //         service_tag: 'NA'
    //     },
    //     problem: 'NA',
    //     results: {},
    //     resolved: 'NA',
    // };
}

// ID generator: returns new ID
function generateId() {
    var id = Math.round(Math.random() * 1000000000);
    let id_sha = crypto.createHmac('sha1', Constants._CRYPTO_SECRET).update(id.toString()).digest('hex');
    while (ID_DB.exists(id_sha)) {
        id = Math.round(Math.random() * 1000000000);
        id_sha = crypto.createHmac('sha1', Constants._CRYPTO_SECRET).update(id.toString()).digest('hex');
    }
    var id_s = ID_Status(id_sha);
    ID_DB.addID(id_s);
    return id_sha;
}

/*----------------------------------------------------------------------------------------------------*/

// Custom Middleware 
app.use(_ENDPOINT + 'message', (req, res, next) => { // Reject if expired session.
    req.message = req.body;
    if ((req.session.conversation == undefined) || !ID_DB.exists(req.session.conversation.id)) {
        var msg = new Message();
        msg.conversation = undefined;
        msg.from.id = Constants._BOT_ID // Default Bot ID
        msg.from.name = '_bot';
        msg.type = Constants.MTYPE.Error;
        msg.text = "Session Expired";
        return res.status(401).end(JSON.stringify(msg));
    }
    next();
});

// Routes and Endpoint functions
app.get(_ENDPOINT + 'id', function (req, res) {
    debugPrint('Received ID request');
    var id = generateId();
    // setupConv(id);
    req.session.convID = id;
    req.session.conversation = new Conversation(id);
    res.status(200).end(JSON.stringify({ id: id }));
    debugPrint('ID Request addressed. Sent ID : ' + JSON.stringify({ id: id }));
});

// Message parsing and reply construction.
app.use(_ENDPOINT + 'message', function(req, res, next){
    debugPrint('HH: ' + req.message);
    var msgText = req.message.text;
    if(['Hi', 'Hey', 'Hello'].indexOf(msgText) != -1){ // Greeting [For now without wit.ai]
        var reply = CONV_DB[req.session.convID].createMessage();
        reply.type = Constants.MTYPE.Message;
        reply.text = "Good day to you. What can I help you with?";
        return res.status(200).end(JSON.stringify(reply));
    }
    if(["Bye", "I'm done", "Goodbye"].indexOf(msgText) != -1){
        var reply = CONV_DB[req.session.convID].createMessage();        
        reply.type = Constants.MTYPE.Message;
        reply.text = "Bye! Please visit again :p";
        delete CONV_DB[req.session.convID];
        req.session.destroy();
        return res.status(200).end(JSON.stringify(reply));
    }
    client.message(msgText, {}).then((data) =>{

    }).catch(()=>{next()});
});

/*  TODO: Figure out how to add functions to classes. 
    Using 'new Message' instead of conversation.createMessage */

app.post(_ENDPOINT + 'message', function (req, res) {
    // Initial checking (Valid id and everything)
    debugPrint("ID : " + req.session.conversation.id);
    debugPrint('Message Received: ' + req.message.message);
    var reply = new Message();
    reply.conversation = req.session.conversation;
    reply.type = Constants.MTYPE.DefaultMessage;
    reply.text = "I didn't get that. Could you please rephrase?";
    res.status(200).end(JSON.stringify(reply));
});

/*----------------------------------------------------------------------------------------------------*/
// Setup and Start the server

app.listen(PORT);
console.log("Server running. Waiting for messages...");

/*----------------------------------------------------------------------------------------------------*/
