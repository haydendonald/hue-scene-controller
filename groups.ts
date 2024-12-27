import { ConfigFile } from "./configFile";
import { Logger } from "./logger";
import { Group } from "./types/group";
import { Target } from "./types/target";

export class Groups {
    private static _instance: Groups;
    private _groups: Map<number, Group> = new Map();

    private static get instance() {
        if (!Groups._instance) { Groups._instance = new Groups(); }
        return Groups._instance;
    }

    static get groups() {
        return Groups.instance._groups;
    }

    /**
     * Load the configuration from file
     */
    static async load() {
        const read = await ConfigFile.loadConfig("groups", {});
        Groups.instance._groups.clear();
        for (const [id, group] of Object.entries(read)) {
            Groups.instance._groups.set(parseInt(id), group as Group);
        }
        Logger.info(`Loaded ${Groups.groups.size} groups`);
        for (const [id, group] of Groups.groups) {
            Logger.info(`\t${id}: ${group.name}`);
        }
    }

    /**
     * Save the configuration to file
     */
    static async save() {
        let record: Record<number, Group> = {};
        for (const [id, group] of Groups.instance._groups) {
            record[id] = group;
        }
        await ConfigFile.saveConfig("groups", record);
    }

    static addGroup(name: string, description: string, targets: Target[]) {
        for (let id = 1; true; id++) {
            if (Groups.groups.has(id)) { continue; }
            const group: Group = {
                name,
                description,
                targets: targets
            }
            Groups.groups.set(id, group);
            break;
        }
    }

    static getGroup(id: number) {
        return Groups.groups.get(id);
    }

    static isGroup(target: Target) {
        return target.type === "group";
    }

    /**
     * Iterate down a group and return all targets in the group and subgroups
     * @param group The group
     * @returns A list of targets
     */
    static getTargetsFromGroup(group: Group): Target[] {
        let targets: Target[] = [];
        for (const target of group.targets) {
            if (Groups.isGroup(target)) {
                const group = Groups.getGroup(target.id);
                if (group) {
                    targets = [
                        ...targets,
                        ...Groups.getTargetsFromGroup(group)
                    ]
                }
            }
            else {
                targets.push(target);
            }
        }
        return targets;
    }
}