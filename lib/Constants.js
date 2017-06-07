'use strict'

var _TOKEN = 'Z7HX6WCPAM27GOWRJLGH5SLAWKFFLZTI'; // Wit.ai token
var _ENDPOINT = '/api/v1/'; // Chat bot API endpoint
var _ID_TIMEOUT = 900000;  // 15 minutes

// in-memory DBs
const CONV_DB = {} // Store conversations
const ID_DB = []; // Store valid IDs

function ID_Status(id_n){ // Constructs an instance of ID_STATUS and sets up destroy time.
    var id = {
        id: id_n,
        timestamp: Date.now()
    }
    setTimeout(_ID_TIMEOUT, recycleID, [id]);
    return id;
}

function recycleID(id){
    if(Date.now() - id.timestamp > _ID_TIMEOUT){
        ID_DB.splice(ID_DB.indexOf(id), 1);
    }
}

module.exports._ENDPOINT = _ENDPOINT;
module.exports._TOKEN = _TOKEN;
module.exports.CONV_DB = CONV_DB;
module.exports.ID_DB = ID_DB;