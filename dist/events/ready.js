"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-unused-vars */
const readline_1 = __importDefault(require("readline"));
const websocket_1 = require("websocket");
const discord_js_1 = require("discord.js");
const os_1 = __importDefault(require("os"));
const structure_1 = require("../structure");
/*
Copyright 2023 Sayrix (github.com/Sayrix)

Licensed under the Creative Commons Attribution 4.0 International
please check https://creativecommons.org/licenses/by/4.0 for more informations.
*/
class ReadyEvent extends structure_1.BaseEvent {
    connected = false;
    constructor(client) {
        super(client);
    }
    async execute() {
        if (!this.client.config.guildId) {
            console.log("⚠️⚠️⚠️ Please add the guild id in the config.jsonc file. ⚠️⚠️⚠️");
            process.exit(0);
        }
        await this.client.guilds.fetch(this.client.config.guildId);
        await this.client.guilds.cache.get(this.client.config.guildId)?.members.fetch();
        if (!this.client.guilds.cache.get(this.client.config.guildId)?.members.me?.permissions.has("Administrator")) {
            console.log("\n⚠️⚠️⚠️ I don't have the Administrator permission, to prevent any issues please add the Administrator permission to me. ⚠️⚠️⚠️");
            process.exit(0);
        }
        const embedMessageId = (await this.client.prisma.config.findUnique({
            where: {
                key: "openTicketMessageId",
            }
        }))?.value;
        await this.client.channels.fetch(this.client.config.openTicketChannelId).catch(() => {
            console.error("The channel to open tickets is not found!");
            process.exit(0);
        });
        const openTicketChannel = await this.client.channels.cache.get(this.client.config.openTicketChannelId);
        if (!openTicketChannel) {
            console.error("The channel to open tickets is not found!");
            process.exit(0);
        }
        if (!openTicketChannel.isTextBased()) {
            console.error("The channel to open tickets is not a channel!");
            process.exit(0);
        }
        const locale = this.client.locales;
        let footer = locale.getSubValue("embeds", "openTicket", "footer", "text").replace("ticket.pm", "");
        // Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
        footer = `ticket.pm ${footer.trim() !== "" ? `- ${footer}` : ""}`; // Please respect the LICENSE :D
        // Please respect the project by keeping the credits, (if it is too disturbing you can credit me in the "about me" of the bot discord)
        const embed = new discord_js_1.EmbedBuilder({
            ...locale.getSubRawValue("embeds.openTicket"),
            color: 0,
        })
            .setColor(locale.getNoErrorSubValue("embeds", "openTicket", "color") ??
            this.client.config.mainColor)
            .setFooter({
            text: footer,
            iconURL: locale.getNoErrorSubValue("embeds.openTicket.footer.iconURL")
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("openTicket").setLabel(this.client.locales.getSubValue("other", "openTicketButtonMSG")).setStyle(discord_js_1.ButtonStyle.Primary));
        try {
            // Fetch Message object and return undefined if not found
            const msg = embedMessageId ? await (() => new Promise((res) => {
                openTicketChannel?.messages?.fetch(embedMessageId)
                    .then(msg => res(msg))
                    .catch(() => res(undefined));
            }))() : undefined;
            if (msg && msg.id) {
                msg.edit({
                    embeds: [embed],
                    components: [row]
                });
            }
            else {
                const channel = this.client.channels.cache.get(this.client.config.openTicketChannelId);
                if (!channel || !channel.isTextBased())
                    return console.error("Invalid openTicketChannelId");
                channel.send({
                    embeds: [embed],
                    components: [row]
                }).then((rMsg) => {
                    this.client.prisma.config.upsert({
                        create: {
                            key: "openTicketMessageId",
                            value: rMsg.id
                        },
                        update: {
                            value: rMsg.id
                        },
                        where: {
                            key: "openTicketMessageId"
                        }
                    }).then(); // I need .then() for it to execute?!?!??
                });
            }
        }
        catch (e) {
            console.error(e);
        }
        this.setStatus();
        setInterval(() => this.setStatus(), 9e5); // 15 minutes
        readline_1.default.cursorTo(process.stdout, 0);
        process.stdout.write(`\x1b[0m🚀  The bot is ready! Logged in as \x1b[37;46;1m${this.client.user?.tag}\x1b[0m (\x1b[37;46;1m${this.client.user?.id}`.replace(/\t/g, ""));
        
        if ((await this.client.prisma.config.findUnique({
            where: {
                key: "firstStart",
            }
        })) === null) {
            await this.client.prisma.config.create({
                data: {
                    key: "firstStart",
                    value: "true",
                }
            });
            if (!this.client.config.minimalTracking)
                console.warn(`
				PRIVACY NOTICES
				-------------------------------
				Telemetry is current set to full and the following information are sent to the server anonymously:
				* Discord Bot's number of guilds & users
				* Current Source Version
				* NodeJS Version
				* OS Version
				* CPU version, name, core count, architecture, and model
				* Current Process up-time
				* System total ram and freed ram
				* Client name and id
				* Guild ID
				-------------------------------
				If you wish to minimize the information that are being sent, please set "minimalTracking" to true in the config
		`.replace(/\t/g, ""));
            else
                console.warn(`
				PRIVACY NOTICES
				-------------------------------
				Minimal tracking has been enabled; the following information are sent anonymously:
				* Current Source Version
				* NodeJS Version
				-------------------------------
		`.replace(/\t/g, ""));
        }
        this.connect(this.client.config.showWSLog);
        this.client.deployCommands();
    }
    setStatus() {
        if (this.client.config.status) {
            if (!this.client.config.status.enabled)
                return;
            let type = 0;
            switch (this.client.config.status.type) {
                case "PLAYING":
                    type = 0;
                    break;
                case "STREAMING":
                    type = 1;
                    break;
                case "LISTENING":
                    type = 2;
                    break;
                case "WATCHING":
                    type = 3;
                    break;
                case "COMPETING":
                    type = 4;
                    break;
            }
            if (this.client.config.status.type && this.client.config.status.text) {
                // If the user just want to set the status but not the activity
                const url = this.client.config.status.url;
                this.client.user?.setPresence({
                    activities: [{ name: this.client.config.status.text, type: type, url: (url && url.trim() !== "") ? url : undefined }],
                    status: this.client.config.status.status,
                });
            }
            this.client.user?.setStatus(this.client.config.status.status);
        }
    }
    connect(enableLog) {
        if (this.connected)
            return;
        const ws = new websocket_1.client();
        ws.on("connectFailed", (e) => {
            this.connected = false;
            setTimeout(() => this.connect(enableLog), Math.random() * 1e4);
            if (enableLog)
                console.log(`❌  WebSocket Error: ${e.toString()}`);
        });
        ws.on("connect", (connection) => {
            connection.on("error", (e) => {
                this.connected = false;
                setTimeout(() => this.connect(enableLog), Math.random() * 1e4);
                if (enableLog)
                    console.log(`❌  WebSocket Error: ${e.toString()}`);
            });
            connection.on("close", (e) => {
                this.connected = false;
                setTimeout(() => this.connect(enableLog), Math.random() * 1e4);
                if (enableLog)
                    console.log(`❌  WebSocket Error: ${e.toString()}`);
            });
            this.connected = true;
            if (enableLog)
                console.log("✅  Connected to WebSocket server.");
            this.telemetry(connection);
            setInterval(() => {
                this.telemetry(connection);
            }, 120_000);
        });
        ws.connect("wss://ws.ticket.pm", "echo-protocol");
    }
    telemetry(connection) {
        let fullInfo = {
            os: os_1.default.platform(),
            osVersion1: os_1.default.release(),
            osVersion2: os_1.default.version(),
            uptime: process.uptime(),
            ram: {
                total: os_1.default.totalmem(),
                free: os_1.default.freemem()
            },
            cpu: {
                model: os_1.default.cpus()[0].model,
                cores: os_1.default.cpus().length,
                arch: os_1.default.arch()
            }
        };
        let moreInfo = {
            clientName: this.client?.user?.tag,
            clientId: this.client?.user?.id,
            guildId: this.client?.config?.guildId
        };
        // Minimal tracking enabled, remove those info from being sent
        if (this.client.config.minimalTracking) {
            fullInfo = {};
            moreInfo = {};
        }
        connection.sendUTF(JSON.stringify({
            type: "telemetry",
            data: {
                stats: {
                    guilds: this.client?.guilds?.cache?.size,
                    users: this.client?.users?.cache?.size
                },
                infos: {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    ticketbotVersion: require("../../package.json").version,
                    nodeVersion: process.version,
                    ...fullInfo
                },
                ...moreInfo
            }
        }));
    }
}
exports.default = ReadyEvent;
