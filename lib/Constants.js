'use strict'

var util = require('../lib/util.js');
var crypto = require('crypto');

var _TOKEN = 'Z7HX6WCPAM27GOWRJLGH5SLAWKFFLZTI'; // Wit.ai token
var _ENDPOINT = '/api/v1/'; // Chat bot API endpoint
var _ID_TIMEOUT = 900000;  // 15 minutes = 900000 millis
var _BOT_ID = '0000000000';
var _CRYPTO_SECRET = 'secret';

var MTYPE = {
    Error: "Error",
    Message: "Message",
    Status: "Status_Update",
    DefaultMessage: "Default_Message"
}


var debugPrint = util.debugPrint;

// in-memory DBs
const CONV_DB = {} // Store conversations
const ID_DB = { // Store valid IDs
    ids: [],
    exists: function (id) {
        for (var i = 0; i < this.ids.length; i++) {
            if (this.ids[i].id == id) {
                return true;
            }
        }
        return false;
    },
    addID: function (id) {
        this.ids.push(id);
    }
};
const MSG_ID_DB = [];

function ID_Status(id_n) { // Constructs an instance of ID_STATUS and sets up destroy time.
    var id = {
        id: id_n,
        timestamp: Date.now()
    }
    setTimeout(() => { recycleID(id) }, _ID_TIMEOUT);
    debugPrint('Timeout Set');
    return id;
}

function recycleID(id) {
    var ids = ID_DB.ids;
    if (Date.now() - id.timestamp >= _ID_TIMEOUT) {
        ids.splice(ids.indexOf(id), 1);
    }
    debugPrint('Timed Out. :::) ' + id.id);
    debugPrint(ID_DB);
}

// Class constructors
class Message { // Message class. Used to send all details to client and vice-versa
    constructor() {
        this.type = "NA";
        this.id = messageID();
        this.timestamp = Date.now();
        this.conversation = "NA";
        this.from = { id: "NA", name: "NA" };
        this.recepient = { id: "NA" },
            this.text = "NA";
    }
}

class Conversation { // Conversation class constructor.
    constructor(id){
        this.type= "Conversation";
        this.id= id;
        this.messages= [];
        this.lastMessageTime = Date.now();
        CONV_DB[id] = this;
    }
    addMessage(msg){
        this.messages.push(msg);
        this.lastMessageTime = msg.timestamp;
    }
    createMessage(){
        var msg = new Message();
        msg.conversation = this;
    }
}

// Utility functions
function messageID() { // Generate new ID for every msg to keep track of the conversation. [For analytics etc.]
    var id = Math.round(Math.random() * 1000000000);
    let id_sha = crypto.createHmac('sha256', _CRYPTO_SECRET).update(id.toString()).digest('hex');
    while (MSG_ID_DB.indexOf(id_sha) != -1) {
        id = Math.round(Math.random() * 1000000000);
        id_sha = crypto.createHmac('sha256', _CRYPTO_SECRET).update(id.toString()).digest('hex');
    }
    MSG_ID_DB.push(id_sha);
    return id_sha;
}

// Constants
module.exports._ENDPOINT = _ENDPOINT;
module.exports._TOKEN = _TOKEN;
module.exports.CONV_DB = CONV_DB;
module.exports.ID_DB = ID_DB;
module.exports._BOT_ID = _BOT_ID;
module.exports.MTYPE = MTYPE;
module.exports._CRYPTO_SECRET = _CRYPTO_SECRET;
// Functions
module.exports.ID_Status = ID_Status;
// module.exports.messageID = messageID;
// Classes
module.exports.Message = Message;
module.exports.Conversation = Conversation;
