'use strict'

var fs = require('fs');
var debugPrint = require('./util.js').debugPrint;
var englishParser = require('./englishParser.js');


var dat = fs.readFileSync('C:/Users/Saketh_Vallakatla/Desktop/Hackathon/Chatbot/FAQ_Tagged.json');

var FAQ_DB = JSON.parse(dat.toString()).FAQs;

function normalize(keyWords) {
    var k = [];
    keyWords.forEach(function (element) {
        var e = element.toLowerCase();
        k.push(e);
    }, this);
    return k.sort();
}

function getAnswer(keyWords) {
    var keyWordsNorm = normalize(keyWords);
    var score = 0;
    var answer = "";
    debugPrint("KeyWords : " + keyWordsNorm);
    FAQ_DB.forEach(function (elem) {
        var s = 0;
        var tags = elem.tags;
        for (var i = 0; i < tags.length; i++) {
            for (var j = 0; j < keyWordsNorm.length; j++) {
                if (tags[i] == keyWordsNorm[j])++s;
            }
        }

        if (s > score) {
            answer = elem.answer;
            score = s;
        };
    }, this);

    return answer;
}

var msg = "The battery in my laptop stopped working";
var tags = englishParser.stripStopWords(msg);

console.log(tags);
console.log(getAnswer(tags));

module.exports.getAnswer = getAnswer;