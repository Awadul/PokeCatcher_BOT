const { Client } = require('discord.js-selfbot-v13');
const dotenv = require('dotenv');

dotenv.config();


const client = new Client();
BOT_ID = process.env.BOT_ID;
let remainingCatchedForHour = 0;
let requestProcessing = false;
const processedButtons = new Set();

// testing the bot to send a message to the channel
// messageCreate event = when a message is sent in the channel
client.on('messageCreate', async (message) => {

    if (message.channel.id === process.env.CHANNEL_ID) {

        if (message.content === `!test`) {
            // Reset lock and cleared clicked buttons cache on manual/scheduled test command
            requestProcessing = false;
            processedButtons.clear();

            // send a slash command to the channel
            // sendSlash(target: UserResolvable, commandName: string, ...args: any[]): Promise<Message | Modal>;
            // set the options for the slash command ; type: egg
            await message.channel.sendSlash(BOT_ID, 'pokemon');

            // the bot replies and updates the prvious message
            // we need to work on the updated message

        }   

        // console.log(message)
    }

})


client.on('messageUpdate', async (oldMessge, newMessage) => {

    if (newMessage.channel.id !== process.env.CHANNEL_ID) return;
    if (newMessage.author.id !== BOT_ID) return;

    console.log('updated message', newMessage, '\n\n\n');

    const button = newMessage.components[0]?.components[0]
    if (!button) return;

    console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n\nRow Components: ', button)

    // Dynamically find the embed containing the wild pokemon appearance or roll count details
    const targetEmbed = newMessage.embeds.find(embed =>
        embed.title?.toLowerCase().includes('appeared') || embed.description?.includes('Rolls remaining')
    );

    if (targetEmbed && targetEmbed.description) {
        const parse = targetEmbed.description.match(/Rolls remaining:\s\*\*(\d+)\*\*/);
        if (parse) {
            remainingCatchedForHour = Number(parse[1]);
            console.log('Updated Remaining Rolls:', remainingCatchedForHour);
        }
    }

    try {
        if (button.data.label === 'Catch' && targetEmbed?.title?.toLowerCase().includes('appeared')) {
            // If the catch is issued, we set requestProcessing to true to acquire the lock.
            // Any further processing of 'Catch' is ignored until the lock is released.
            if (requestProcessing) return;

            // Make sure the button has a valid customId and is not disabled
            const customId = button.customId || button.data.custom_id;
            if (!customId || button.disabled) {
                console.log('Catch button is disabled or lacks a customId, skipping click.');
                return;
            }

            // Prevent double-clicking the same button customId
            if (processedButtons.has(customId)) {
                console.log('Already clicked this button customId:', customId);
                return;
            }

            requestProcessing = true;
            processedButtons.add(customId);
            if (processedButtons.size > 100) {
                processedButtons.clear();
            }

            console.log('Clicking Catch button...');
            await newMessage.clickButton(customId);

        } else if (button.data.label === 'Roll Again') {
            // When 'Roll Again' appears, it means the catch has completed.
            // We remove the lock and send a new /pokemon command.
            if (requestProcessing) {
                console.log('Catch completed. Releasing lock and triggering next roll.');
                requestProcessing = false;
                if (remainingCatchedForHour > 0) {
                    await pokemonCommand();
                }
            }
        }
    } catch (error) {
        console.error("[Update Request Handling Error]: ", error);
        // Ensure lock is released in case of errors to prevent stuck states
        requestProcessing = false;
    }
})

const ONE_HOUR = 15 * 60 * 1000;
// running a clock to make sure that after every hour timely reset the bot works again and completes the catching
const invokeBot = async () => {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    await channel.send('!test');
}

// function to send the pokemon command
const pokemonCommand = async () => {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    await channel.sendSlash(BOT_ID, 'pokemon');
}

const pokeStopCommand = async () => {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    await channel.sendSlash(BOT_ID, 'pokestop');
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // invoking the bot on start and setting interval for after every 1 hour to catch pokemons
    await invokeBot();
    setInterval(invokeBot, ONE_HOUR);

    // setting the interval for the pokestop after every 3 hours
    const POKESTOP_TIMER = 3 * 60 * 60 * 1000;
    setInterval(pokeStopCommand, POKESTOP_TIMER);

})


client.login(process.env.TOKEN);
