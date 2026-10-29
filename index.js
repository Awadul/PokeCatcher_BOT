const { Client } = require('discord.js-selfbot-v13');
const dotenv = require('dotenv');

dotenv.config();

const CATCH_DELAY = process.env.CATCH_DELAY * 60 * 1000;
const BOT_ID = process.env.BOT_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

let remainingCatchedForHour = 0;
let requestProcessing = false;
const processedcatchButtons = new Set();

const client = new Client();
// messageCreate event => when a message is sent in the channel
// client.on('messageCreate', async (message) => {
//     if (message.channel.id === CHANNEL_ID) { }
// })


client.on('messageUpdate', async (oldMessge, newMessage) => {

    // if the message is not from chosen channel -> return
    if (newMessage.channel.id !== CHANNEL_ID) return;
    // if we didn't create the message -> return
    if (newMessage.author.id !== BOT_ID) return;

    console.log('updated message', newMessage, '\n\n\n');

    const catchButton = newMessage.components[0]?.components[0]
    if (!catchButton) return;

    console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n\nRow Components: ', catchButton)

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
        if ((catchButton.data?.label === 'Catch' || catchButton.label === 'Catch') && targetEmbed?.title?.toLowerCase().includes('appeared')) {

            if (requestProcessing) return;

            // Make sure the catchButton has a valid customId and is not disabled
            const customId = catchButton.customId || catchButton.data.custom_id;
            if (!customId || catchButton.disabled) {
                console.log('Catch Button is disabled or lacks a customId, skipping click.');
                return;
            }

            // Prevent double-clicking the same catchButton customId
            if (processedcatchButtons.has(customId)) {
                console.log('Already clicked this catchButton customId:', customId);
                return;
            }

            // If the catch is issued, we set requestProcessing to true to acquire the lock.
            requestProcessing = true;
            if (processedcatchButtons.size > 100) {
                processedcatchButtons.clear();
            }
            processedcatchButtons.add(customId);

            console.log('Clicking Catch Button...');
            await newMessage.clickButton(customId);

        } else if (catchButton.data?.label === 'Roll Again' || catchButton.label === 'Roll Again') {
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

// running a clock to make sure that after every hour timely reset the bot works again and completes the catching
const invokeBot = async () => {
    requestProcessing = false;
    processedcatchButtons.clear();
    await pokemonCommand();
}

// /pokemon
const pokemonCommand = async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        await channel.sendSlash(BOT_ID, 'pokemon');
    } catch (error) {
        console.error(`[pokemonCommand Error]: `, error);
        requestProcessing = false;
    }
}

// /pokestop
const pokeStopCommand = async () => {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        await channel.sendSlash(BOT_ID, 'pokestop');
    } catch (error) {
        console.error(`[pokeStopCommand Error]: `, error);
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // invoking the bot on start and setting interval for after every 1 hour to catch pokemons
    await invokeBot();
    setInterval(invokeBot, CATCH_DELAY);

    // setting the interval for the pokestop after every 3 hours
    const POKESTOP_TIMER = 3 * 60 * 60 * 1000;
    setInterval(pokeStopCommand, POKESTOP_TIMER);

})


client.login(process.env.TOKEN);
