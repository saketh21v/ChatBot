'use strict'

var _TOKEN = 'Z7HX6WCPAM27GOWRJLGH5SLAWKFFLZTI'; // Wit.ai token
var _ENDPOINT = 'api/v1/'; // Chat bot API endpoint

// in-memory DBs
const CONV_DB = {} // Store conversations
const ID_DB = []; // Store valid IDs

module.exports._ENDPOINT = _ENDPOINT;
module.exports._TOKEN = _TOKEN;
module.exports.CONV_DB = CONV_DB;
module.exports.ID_DB = ID_DB; 