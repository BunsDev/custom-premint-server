const axios = require("axios");
const Discord = require("discord.js");

const userModel = require("../api/repository/models");
const { sendErrorToLogChannel, wait } = require("../utils");

const checkIfEligibleForRoles = async () => {
  const bot = new Discord.Client({
    intents: [
      Discord.Intents.FLAGS.GUILDS,
      Discord.Intents.FLAGS.GUILD_MESSAGES,
      Discord.Intents.FLAGS.GUILD_MEMBERS,
      Discord.Intents.FLAGS.GUILD_PRESENCES,
      Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    ],
  });
  try {
    await bot.login(process.env.DISCORD_BOT_TOKEN);
    await wait(3000);
    // eslint-disable-next-line no-console
    console.log("Discord bot is logged in!");
    check(bot);
  } catch (e) {
    throw new Error(e);
  }
};

const check = async (bot) => {
  const guild = await bot.guilds?.fetch(process.env.DISCORD_BOT_GUILD_ID);
  const maniacRole = guild.roles?.cache?.find(
    (r) => r.id === `${process.env.DISCORD_BOT_MANIAC_ROLE_ID}`
  );
  const maniaxRole = guild.roles?.cache?.find(
    (r) => r.id === `${process.env.DISCORD_BOT_MANIAX_ROLE_ID}`
  );

  const users = await userModel.find({}).lean();
  for (let user of users) {
    if (user.walletAddress) {
      try {
        const res = await axios.get(
          `${process.env.MORALIS_API_URL}/${user.walletAddress}/nft/${process.env.NFT_CONTRACT_ADDRESS}/?chain=${process.env.NFT_CHAIN}&format=decimal`,
          {
            headers: {
              "x-api-key": process.env.MORALIS_WEB3_API_KEY,
            },
          }
        );
        const nftnumberOfNftsOwned = res.data?.result?.length;
        const discordUser = guild.members.cache.get(user.discordId);

        checkIfManiac(nftnumberOfNftsOwned, discordUser, maniacRole);
        checkIfManiax(nftnumberOfNftsOwned, discordUser, maniaxRole);
        wait(1000);
      } catch (e) {
        sendErrorToLogChannel(bot, e.response?.data?.message, e);
      }
    }
  }
};

const checkIfManiac = (nftnumberOfNftsOwned, discordUser, maniacRole) => {
  if (nftnumberOfNftsOwned === 0) {
    discordUser.roles.remove(maniacRole);
  }
  if (nftnumberOfNftsOwned === 1) {
    discordUser.roles.add(maniacRole);
  }
};

const checkIfManiax = (nftnumberOfNftsOwned, discordUser, maniaxRole) => {
  if (nftnumberOfNftsOwned < 5) {
    discordUser.roles.remove(maniaxRole);
  }
  if (nftnumberOfNftsOwned >= 5) {
    discordUser.roles.add(maniaxRole);
  }
};

module.exports = {
  checkIfEligibleForRoles,
};
