import { Groups } from "../groups";
import { Logger } from "../logger";
import { Group } from "./group";
import { LightStateAttributes } from "./lightState";
import { Target } from "./target";

export abstract class Effect {
    name: string;
    description: string;
    targets: Target[];
    attributes: LightStateAttributes;

    constructor(name: string, description: string, target: Target | Group, attributes: LightStateAttributes) {
        let targets: Target[] = [];
        if ((target as Group).targets) { targets = (target as Group).targets; }
        else if (Groups.isGroup(target as Target)) {
            const group = Groups.getGroup((target as Target).id);
            if (!group) { Logger.error(`Group ${(target as Target).id} not found`); }
            else {
                targets = Groups.getTargetsFromGroup(group);
            }
        }
        else {
            targets.push(target as Target);
        }

        this.name = name;
        this.description = description;
        this.targets = targets;
        this.attributes = attributes;
    }

    /**
     * Queue any changes for the targets. Runs approx every 10ms
     * @param forceQueue True if the effect should be queued even if it's not time
     * @returns True if the effect has been queued and should be sent
     */
    abstract queue(forceQueue: boolean): Promise<boolean>;

    /**
     * Callback for when the queue is sent to the controllers
     */
    abstract sent(): Promise<void>;

    /**
     * Stop the effect and destroy it
     */
    abstract stop(): Promise<void>;
}