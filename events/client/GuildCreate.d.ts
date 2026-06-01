import { type Guild } from "discord.js";
import { Event, type Lavamusic } from "../../structures/index";
export default class GuildCreate extends Event {
    constructor(client: Lavamusic, file: string);
    run(guild: Guild): Promise<void>;
}
