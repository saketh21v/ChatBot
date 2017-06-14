'use strict'

var fs = require('fs');

var stop_words_data = fs.readFileSync('./lib/english/stop_words.txt');
// console.log(stop_words_data.toString());
var stop_words_r = stop_words_data.toString().split('\n');
var stop_words = [];
for(var i=0;i<stop_words_r.length;i++){
    stop_words.push(stop_words_r[i].split('\r')[0])
}
// console.log(stop_words);

function stripStopWords(msg){
    var impWords = [];
    var words = msg.toLowerCase().split(' ');
    words.forEach(function(element) {
        if(stop_words.indexOf(element) == -1){
            impWords.push(element);
        }
    }, this);

    console.log(impWords);
    return impWords;
}

// var m = "The laptop screen is showing dots and does not go to proper resolution."

// stripStopWords(m);

module.exports.stripStopWords = stripStopWords;