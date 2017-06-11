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
// Function to check if the given tag is valid
// TODO: write functionality to connect to db and check if valid tag
function isValidTag(tag){
    return true;
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
        var reply = new Message();
        reply.conversation = undefined;
        reply.from.id = Constants._BOT_ID // Default Bot ID
        reply.from.name = '_bot';
        reply.type = Constants.MTYPE.Error;
        reply.text = "Session Expired";
        return res.status(401).end(reply.toString());
    }
    next();
});

// Routes and Endpoint functions
app.get(_ENDPOINT + 'id', function (req, res) {
    debugPrint('Received ID request');
    var id = generateId();
    req.session.convID = id;
    req.session.conversation = new Conversation(id);
    var reply = CONV_DB[id].createMessage();
    reply.type = Constants.MTYPE.ID_Message;
    reply.message = {"id": id};
    res.status(200).end(reply.toString());
    debugPrint('ID Request addressed. Sent ID : ' + JSON.stringify({ id: id }));
});

// Message parsing and reply construction.
app.use(_ENDPOINT + 'message', function (req, res, next) {
    debugPrint('HH: ' + req.message.text);
    var msgText = req.message.text;
    // var msg = CONV_DB[req.session.convID].createMessage();
    var msg = new Message();
    msg.from = req.session.convID;
    msg.recepient = Constants._BOT_ID;
    msg.text =  msgText;
    msg.timestamp = Date.now();
    msg.type = Constants.MTYPE.UserMessage;

    if (!req.session.conversation.serviceTagRequest) {
        if (['Hi', 'Hey', 'Hello'].indexOf(msgText) != -1) { // Greeting [For now without wit.ai]
            var reply = CONV_DB[req.session.convID].createMessage();
            reply.type = Constants.MTYPE.Message;
            reply.text = "Good day to you. What can I help you with?";
            return res.status(200).end(reply.toString());
        }
    }
    if (["Bye", "I'm done", "Goodbye"].indexOf(msgText) != -1) {
        var reply = CONV_DB[req.session.convID].createMessage();
        reply.type = Constants.MTYPE.Message;
        reply.text = "Bye! Please visit again :p";
        delete CONV_DB[req.session.convID];
        req.session.destroy();
        return res.status(200).end(reply.toString());
    }
    if (req.session.conversation.serviceTagRequest) {
        if (!isValidTag(msgText)) {
            var reply = CONV_DB[req.session.convID].createMessage();
            reply.type = Constants.MTYPE.RequestServiceTag;
            reply.text = "Please input only your service tag.";
            req.session.conversation.serviceTagRequest = true;
            return res.status(200).end(reply.toString());
        }else{
            req.session.conversation.serviceTag = msgText;
            req.session.conversation.serviceTagRequest = false;
            var reply = CONV_DB[req.session.convID].createMessage();
            reply.type = Constants.MTYPE.Message;
            reply.text = "Please give a description of your problem.";
            return res.status(200).end(reply.toString());
        }
    }

    // msgText = "My mouse is troubling me";
    client.message(msgText, {})
        .then((data) => {
            console.log(JSON.stringify(data));
            if (data.entities['intent'] != undefined) msg.intent = data.entities['intent'][0].value;
            // var reply = Replies.CreateReply();
            if (data.entities['product'] != undefined) {
                if (req.session.product == undefined) {
                    req.session.product = data.entities['product'][0].value;
                    var reply = CONV_DB[req.session.convID].createMessage();
                    reply.type = Constants.MTYPE.RequestServiceTag;
                    reply.text = "Please provide your device's service tag";

                    req.session.conversation.serviceTagRequest = true;

                    return res.status(200).end(reply.toString());
                }
            }
            next();
        })
        .catch(console.error);
});

/*  TODO: Figure out how to add functions to classes. 
    Using 'new Message' instead of conversation.createMessage */

app.post(_ENDPOINT + 'message', function (req, res) {
    // Initial checking (Valid id and everything)
    // debugPrint("ID : " + req.session.conversation.id);
    // debugPrint('Message Received: ' + req.message.message);
    var reply = CONV_DB[req.session.convID].createMessage();
    reply.type = Constants.MTYPE.DefaultMessage;
    reply.text = "I didn't get that. Could you please rephrase?";
    res.status(200).end(reply.toString());
});

/*----------------------------------------------------------------------------------------------------*/
// Setup and Start the server

app.listen(PORT);
console.log("Server running. Waiting for messages...");

/*----------------------------------------------------------------------------------------------------*/
