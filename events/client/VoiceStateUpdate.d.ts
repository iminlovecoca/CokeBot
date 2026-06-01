import { type VoiceState } from "discord.js";
import { Event, type Lavamusic } from "../../structures/index";
export default class VoiceStateUpdate extends Event {
    constructor(client: Lavamusic, file: string);
    run(oldState: VoiceState, newState: VoiceState): Promise<any>;
    handale: {
        join(newState: VoiceState, client: Lavamusic): Promise<void>;
        leave(newState: VoiceState, client: Lavamusic): Promise<void>;
        move(newState: VoiceState, client: Lavamusic): Promise<void>;
    };
}
