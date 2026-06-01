import { Event, type Lavamusic } from "../../structures/index";
export default class ChannelDelete extends Event {
    constructor(client: Lavamusic, file: string);
    run(channel: any): Promise<void>;
}
