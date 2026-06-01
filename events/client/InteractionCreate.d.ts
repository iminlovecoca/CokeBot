import { type AutocompleteInteraction, CommandInteraction } from "discord.js";
import { Event, type Lavamusic } from "../../structures/index";
export default class InteractionCreate extends Event {
    constructor(client: Lavamusic, file: string);
    run(interaction: CommandInteraction | AutocompleteInteraction): Promise<any>;
}
