import { Event, type Lavamusic } from "../../structures/index";
export default class Raw extends Event {
    client: Lavamusic;
    constructor(client: Lavamusic, file: string);
    run(d: any): Promise<void>;
}
