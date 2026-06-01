import { type Guild } from "discord.js";
import { Event, type Lavamusic } from "../../structures/index";
export default class GuildDelete extends Event {
    constructor(client: Lavamusic, file: string);
    run(guild: Guild): Promise<void>;
}
