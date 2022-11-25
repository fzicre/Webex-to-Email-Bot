//Don't forget to edit config.json , to change the bot token. This example is running on websockets.
// Based on Webex-node-bot-framework own by Cisco
//dev: Francisco Zicre @ 2022


var framework = require('webex-node-bot-framework');
var http = require('http');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var sha1 = require('js-sha1');
var app = express();
app.use(bodyParser.json());
const config = require("./config.json");

// init framework
var framework = new framework(config);
framework.start();
console.log("Starting framework, please wait...");

framework.on("initialized", () => {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
});

framework.on('spawn', (bot, id, actorId) => {
  if (!actorId) {
    // don't say anything here or your bot's spaces will get
    // spammed every time your server is restarted
    console.log(`While starting up, the framework found our bot in a space called: ${bot.room.title}`);
  } else {
    // When actorId is present it means someone added your bot got added to a new space
    // Lets find out more about them..
    var msg = 'Welcome to this space';
    bot.webex.people.get(actorId).then((user) => {
      msg = `Hi! ${user.displayName}. ${msg}`;
    }).catch((e) => {
      console.error(`Failed to lookup user details in framwork.on("spawn"): ${e.message}`);
      msg = `Hi. ${msg}`;
    }).finally(() => {
      // Say hello, and tell users what you do!
      if (bot.isDirect) {
        bot.say('markdown', msg);
      } else {
        let botName = bot.person.displayName;
        msg += `\n\nDon't forget that you need to use the *@mention* to talk to me in a group space.${botName}.`;
        bot.say('markdown', msg);
      }
    });
  }
});

/* On mention with command
ex User enters @botname help, the bot will write back in markdown
*/
framework.hears(/help|what can i (do|say)|what (can|do) you do/i, (bot, trigger) => {
  console.log(`someone needs help! They asked ${trigger.text}`);
  responded = true;
  bot.say(`Hi ${trigger.person.displayName}.`)
    .then(() => sendHelp(bot))
    .catch((e) => console.error(`Problem in help hander: ${e.message}`));
});

//Process incoming messages and makes the POST request)
//Don't you forget to change the hostname and the port number to reach the webservice

let responded = false;

framework.hears('email' ,   (bot, trigger) => {
  console.log(`Hi! ${trigger.person.displayName} wants to send an email.`); 
  const address =  trigger.args.slice(1)[0]
  const textoo =  trigger.args.slice(2).join(" ")
  responded = true;
  const options = {
    'method': 'POST',
    'hostname': 'localhost',
    'port': 9090,
    'path': '/sendMail',
    'headers': {
      'Content-Type': 'application/json'
    },
    'maxRedirects': 20
  };
  
  var req = http.request(options, function (res) {
    var chunks = [];
  
    res.on("data", function (chunk) {
      chunks.push(chunk);
    });
  
    res.on("end", function (chunk) {
      var body = Buffer.concat(chunks);
      console.log(body.toString());
      bot.say(`An Email was sent to this address: ${address} with this content: ${textoo}`);
    });
  
    res.on("error", function (error) {
      console.error(error);
      bot.say(`Error: The email was not sent to: ${address} `);
    });
  });
  
  var postData = JSON.stringify({
    "recipient": `${address}`,
    "msgBody": `${textoo}`
  });
  
  req.write(postData);
  console.log(`An Email was sent to this address: ${address} and this was the text: ${textoo} On Date: ${ Date( Date.now) } "`);
  req.end();
});

framework.hears(/.*/, function(bot, trigger) {
  // This will fire for any input so only respond if we haven't already
  if (!responded) {
    console.log(`catch-all handler fired for user input: ${trigger.text}`);
    bot.say(`Sorry, i don't know how to answer that. Try with **Help.**"${trigger.text}"`)
      .then(() => sendHelp(bot))
      .catch((e) => console.error(`Problem in the unexepected command hander: ${e.message}`));
  }
  responded = false;
});

//Help function
function sendHelp(bot) {
  bot.say("markdown", 'This is what i can do:', '\n\n ' +
    '**email**   (Usage: email + email address + text of the message Ej:"email fzicre@gmail.com Hi!") \n' +
    '**help** (Help command)');
}

// gracefully shutdown (ctrl-c)
process.on('SIGINT', function() {
  framework.debug('stoppping...');
  server.close();
  framework.stop().then(function() {
    process.exit();
  });
});
