import { Event, type Lavamusic } from "../../structures/index";
export default class SetupButtons extends Event {
    constructor(client: Lavamusic, file: string);
    run(interaction: any): Promise<void>;
}
