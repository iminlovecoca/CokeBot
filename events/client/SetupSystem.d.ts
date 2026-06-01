import { type Message } from "discord.js";
import { Event, type Lavamusic } from "../../structures/index";
export default class SetupSystem extends Event {
    constructor(client: Lavamusic, file: string);
    run(message: Message): Promise<any>;
}
