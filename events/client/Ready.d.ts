import { Event, type Lavamusic } from "../../structures/index";
export default class Ready extends Event {
    constructor(client: Lavamusic, file: string);
    run(): Promise<void>;
}
