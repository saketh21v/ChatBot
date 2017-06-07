'use strict'

// Libraries
var express = require('express');
var Wit = require('node-wit').Wit; // Wit.ai node SDK

/*----------------------------------------------------------------------------------------------------*/

// Constants
var Constants = require('./lib/Constants.js');
var CONV_DB = Constants.CONV_DB;
var ID_DB = Constants.ID_DB

var _ENDPOINT = Constants._ENDPOINT;

/*----------------------------------------------------------------------------------------------------*/

// Webserver parameter setup
const PORT = process.env.PORT || 3000
const app = express();
const client = new Wit({ accessToken: Constants._TOKEN}); // Wit.ai client

/*----------------------------------------------------------------------------------------------------*/

// Initial setup
ID_DB.push(0); // Default ID for test purpopses

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
    while (ID_DB.indexOf(id) != -1) id = Math.round(Math.random() * 1000000000);
    ID_DB.push(id);
    return id;
}

/*----------------------------------------------------------------------------------------------------*/

// Routes and Endpoint functions
app.get(_ENDPOINT + 'id', function(req, res){
    var id = generateId();
    setupConv(id);
    res.end(JSON.stringify({id: id}));
    console.log('ID Request addressed. Sent ID : '+ JSON.stringify({id: id}));
});

/*----------------------------------------------------------------------------------------------------*/
// Setup and Start the server

app.listen(PORT);
console.log("Server running. Waiting for messages...");