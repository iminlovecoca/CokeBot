"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../structures/index");
class ChannelDelete extends index_1.Event {
    constructor(client, file) {
        super(client, file, {
            name: "channelDelete",
        });
    }
    async run(channel) {
        const { guild } = channel;
        const setup = await this.client.db.getSetup(guild.id);
        const stay = await this.client.db.get_247(guild.id);
        if (Array.isArray(stay)) {
            for (const s of stay) {
                if (channel.type === 2 && s.voiceId === channel.id) {
                    await this.client.db.delete_247(guild.id);
                    break;
                }
            }
        }
        else if (stay) {
            if (channel.type === 2 && stay.voiceId === channel.id) {
                await this.client.db.delete_247(guild.id);
            }
        }
        if (setup && channel.type === 0 && setup.textId === channel.id) {
            await this.client.db.deleteSetup(guild.id);
        }
        const player = this.client.manager.getPlayer(guild.id);
        if (player && player.voiceChannelId === channel.id) {
            player.destroy();
        }
    }
}
exports.default = ChannelDelete;
