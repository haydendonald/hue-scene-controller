import { Groups } from "../groups";
import { Logger } from "../logger";
import { Group } from "./group";
import { LightStateAttributes } from "./lightState";
import { Target } from "./target";

export abstract class Effect {
    uid: string;
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
        this.uid = `${this.name}-${this.targets.map(t => t.id).join("-")}`;
    }

    /**
     * Generate the effect
     * @param globalTransitionMs Global transition time in milliseconds
     * @param globalBrightnessPct Global brightness percentage
     * @returns A map of targets and their attributes
     */
    abstract generate(globalTransitionMs?: number, globalBrightnessPct?: number): Promise<Map<Target, LightStateAttributes>>;

    /**
     * Is this effect ready to be generated again. This is called by the Scene handler every second
     * @returns True if the effect is ready to be generated
     */
    abstract shouldGenerate(): boolean;

    /**
     * Callback for when the queue is sent to the controllers
     */
    abstract sent(): void;
}