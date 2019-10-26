require('dotenv').config();
const tmi = require('tmi.js');
const shuffle = require('knuth-shuffle').knuthShuffle;
const fighters = require('./fighters.js');

// Define config options
const opts = {
  connections: {
    reconnect: true,
    secure: true,
  },
  identity: {
    username: 'Stark-Bot',
    password: process.env.OAUTH_TOKEN,
  },
  channels: ['VinMags16'],
};

// Create client
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Key is channel name, value is array of fighter names for ironman
const ironmans = {};

function onMessageHandler(target, context, msg, self) {
  if (self) return; // ignore self messages

  const message = msg.trim();
  if (message.substring(0, 7) != '!stark ') return;

  // Parse out the command to get only the body
  const content = message.substring(7, message.length);
  switch (content) {
    // Start ironman
    case 'start':
      if (!context.badges.broadcaster) {
        console.log(`${context.username} not authorized to run "start"`);
        return;
      }

      console.log(`ironman started for ${context.username}`);
      ironmans[context.username] = shuffle([...fighters]);
      client.say(
        target,
        `First 5: ${ironmans[context.username]
          .slice(0, 5)
          .toString()
          .replace(/,/g, ', ')}`,
      );
      break;

    // Won match, get next fighter
    case 'win':
      if (!context.badges.broadcaster) {
        console.log(`${context.username} not authorized to run "win"`);
        return;
      }

      console.log(`${context.username} ran "win"`);
      if (!hasIronMan(target, context.username)) return;
      // Get new fighter
      ironmans[context.username].shift();
      if (ironmans[context.username].length === 0) {
        client.say(target, 'Ironman complete! Congratulations!');
        return;
      }
      const newFighter = ironmans[context.username][0];
      client.say(
        target,
        `Next fighter: ${newFighter}. ${ironmans[context.username].length} left`,
      );
      break;

    // Display next 5 fighters and number of fighters left
    case 'list':
      console.log(`${context.username} ran "list"`);
      if (!hasIronMan(target, context.username)) return;
      const nextFive = ironmans[context.username]
        .slice(1, 6)
        .toString()
        .replace(/,/g, ', ');
      client.say(
        target,
        `Next 5: ${nextFive}. ${ironmans[context.username].length} left`,
      );
      break;

    // Show current fighter
    case 'current':
      console.log(`${context.username} ran "current"`);
      if (!hasIronMan(target, context.username)) return;
      client.say(target, `Current fighter: ${ironmans[context.username][0]}`);
      break;

    default:
      console.log(
        `Unknown command "${content}" ran by user ${context.username}`,
      );
      break;
  }
}

function hasIronMan(target, username) {
  if (ironmans[username] === undefined || ironmans[username].length <= 0) {
    console.log(`${username} tried "win" but does not have a current ironman`);
    client.say(
      target,
      'No ironman started, message "!stark ironman" to start one',
    );
    return false;
  }

  return true;
}

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
