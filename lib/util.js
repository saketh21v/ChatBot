'use strict'

var _DEBUG = process.env._DEBUG || false;

function debugPrint(msg){
    if(_DEBUG){
        console.log('DEBUG => '+ msg);
    }else{
        console.log('DEBUG set to false');
        // console.log('Proc.DEBUG = ' + JSON.stringify(process.env));
    }
}

module.exports.debugPrint = debugPrint;
module.exports._DEBUG = _DEBUG;