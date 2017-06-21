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
var englishParser = require('./lib/englishParser.js');
var findFAQs = require('./lib/findFAQ.js');
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
const PORT = process.env.PORT || 5000;
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

// Debug uses
app.use((req, res, next) => {
    debugPrint(JSON.stringify(Object.keys(CONV_DB)));
    next();
})

/*----------------------------------------------------------------------------------------------------*/

// Util functions
// Function to check if the given tag is valid
// TODO: write functionality to connect to db and check if valid tag
function isValidTag(tag) {
    if (['00000', '11111', '22222'].indexOf(tag) != -1)
        return true;
    return false;
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
        reply.from = Constants._BOT_ID // Default Bot ID
        // reply.from.name = '_bot';
        reply.type = Constants.MTYPE.Error;
        reply.text = "Session Expired";
        res.setHeader('Content-Type', 'application/json');
        return res.status(401).end(reply.toString());
    }
    next();
});

// Routes and Endpoint functions
app.get(_ENDPOINT + 'id', function (req, res) {
    // debugPrint('Received ID request');
    var id = generateId();
    req.session.convID = id;
    req.session.conversation = new Conversation(id);
    var reply = CONV_DB[id].createMessage();
    reply.type = Constants.MTYPE.ID_Message;
    reply.message = { "id": id };
    console.log('{"id: "' + id + "}");
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(reply.toString());
    // debugPrint('ID Request addressed. Sent ID : ' + JSON.stringify({ id: id }));
});

// Message parsing and reply construction.
app.use(_ENDPOINT + 'message', function (req, res, next) {
    // debugPrint('HH: ' + req.message.text);
    // Creating a client Message instance to add to conversation
    var msgText = req.message.text;
    console.log("msg: " + msgText);
    var msg = CONV_DB[req.session.convID].createMessage();
    msg.from = req.session.convID;
    msg.recepient = Constants._BOT_ID;
    msg.text = msgText;
    msg.timestamp = Date.now();
    msg.type = Constants.MTYPE.UserMessage;

    // If serviceTag request is not alive,[i.e., conversation.serviceTagRequest == false] 
    if (!req.session.conversation.serviceTagRequest) {
        if (['Hi', 'Hey', 'Hello'].indexOf(msgText) != -1) { // Greeting [For now without wit.ai]
            var reply = CONV_DB[req.session.convID].createMessage();
            reply.type = Constants.MTYPE.Message;
            reply.text = "Good day to you. What can I help you with?";
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).end(reply.toString());
        }
    }
    if (["Bye", "I'm done", "Goodbye"].indexOf(msgText) != -1) {
        var reply = CONV_DB[req.session.convID].createMessage();
        reply.type = Constants.MTYPE.Message;
        reply.text = "Bye! Please visit again :p";
        delete CONV_DB[req.session.convID];
        req.session.destroy();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).end(reply.toString());
    }
    // If serviceTag request is alive,[i.e., conversation.requestType == CRTYPE.ServiceTagRequest]
    if (req.session.conversation.requestType == Constants.CRTYPE.ServiceTagRequest) {
        if (!isValidTag(msgText)) { // Re-request if service tag is not valid.
            var reply = CONV_DB[req.session.convID].createMessage();
            reply.type = Constants.MTYPE.RequestServiceTag;
            reply.text = "Please input only your service tag.";
            req.session.conversation.requestType = Constants.CRTYPE.ServiceTagRequest;
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).end(reply.toString());
        } else {
            req.session.conversation.serviceTag = msgText;
            req.session.conversation.requestType = Constants.CRTYPE.DescriptionRequest;
            var reply = CONV_DB[req.session.convID].createMessage();
            reply.type = Constants.MTYPE.RequestDescription;
            reply.text = "Please give a description of your problem.";
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).end(reply.toString());
        }
    }

    if (req.session.conversation.requestType == Constants.CRTYPE.DescriptionRequest) {
        debugPrint('ReqType: ' + req.session.conversation.requestType);
        debugPrint('In Desxription Request');
        var desc = msgText;
        req.session.conversation.requestType = Constants.CRTYPE.NoRequest;
        var keyWords = englishParser.stripStopWords(desc);

        var answer = findFAQs.getAnswer(keyWords);

        var reply = CONV_DB[req.session.convID].createMessage();
        reply.type = Constants.MTYPE.SolutionFAQs;
        reply.text = answer + "\n\n" + "Are you satisfied with the answer?";
        // TODO: Remember to change client code to add "Was that helpful" after displaying this message.
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).end(reply.toString());
    }

    if (req.session.conversation.requestType == Constants.CRTYPE.NoRequest) {
        if (["No", "Nope", "Not at all", "It was not helpful"].indexOf(msgText) != -1) {
            var reply = CONV_DB[req.session.convID].createMessage();
            reply.text = "Connecting to experts.";
            reply.type = Constants.MTYPE.Message;
            res.setHeader('Content-Type', 'application/json');
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

                    req.session.conversation.requestType = Constants.CRTYPE.ServiceTagRequest;
                    res.setHeader('Content-Type', 'application/json');
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
    reply.type = Constants.MTYPE.Message;
    reply.text = "I didn't get that. Could you please rephrase?";
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(reply.toString());
});

app.get("/", function(req, res){
    res.end("Nothing here.");
});

/*----------------------------------------------------------------------------------------------------*/
// Setup and Start the server

app.listen(PORT);
console.log("Server running. Waiting for messages...");

/*----------------------------------------------------------------------------------------------------*/
