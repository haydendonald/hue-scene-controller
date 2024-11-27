import { Config } from "./config";
import { ConfigFile } from "./configFile";
import { Groups } from "./groups";
import { LightStateAttributes } from "./types/lightState";
import { Logger } from "./logger";
import { Scene, SceneAttributes, SceneReference } from "./types/scene";
import { Target } from "./types/target";
import { GroupReference } from "./types/group";

export class Scenes {
    private static _instance: Scenes;
    private _scenes: Map<number, Scene> = new Map();
    private _activeScenes: Scene[] = [];

    static get instance() {
        if (!Scenes._instance) { Scenes._instance = new Scenes(); }
        return Scenes._instance;
    }

    static get scenes() {
        if (!Scenes._instance) { Scenes._instance = new Scenes(); }
        return Scenes._instance._scenes;
    }

    static get activeScenes() {
        return Scenes.instance._activeScenes;
    }

    static addScene(name: string, description: string, attributes: SceneAttributes) {
        for (let id = 1; true; id++) {
            if (Scenes.scenes.has(id)) { continue; }
            const scene: Scene = {
                id: id,
                name: name,
                description: description,
                attributes: attributes
            }
            Scenes.instance._scenes.set(id, scene);
            break;
        }
    }

    static getScene(id: number) {
        return Scenes.scenes.get(id);
    }

    static getSceneId(name: string) {
        for (const [id, scene] of Scenes.scenes) {
            if (scene.name == name) {
                return id;
            }
        }
    }

    static async stageScene(id: (number | SceneReference)[] | number | SceneReference, priority?: number, transitionTimeMs?: number, brightness?: number) {
        if (!Array.isArray(id)) { id = [id]; }
        for (const i of id) {
            let sceneId: number | undefined;
            if (i instanceof SceneReference) { sceneId = i.id; }
            else { sceneId = i; }

            let scene = Scenes.getScene(sceneId);
            if (!scene) {
                Logger.error(`Failed to activate scene ${sceneId}, it was not found`);
                throw `scene ${sceneId} not found`;
            }

            Logger.info(`Activating scene ${scene.name}`);
            scene.attributes.priority = priority !== undefined ? priority : scene.attributes.priority;
            scene.attributes.globalTransitionTime = transitionTimeMs !== undefined ? transitionTimeMs : scene.attributes.globalTransitionTime;
            scene.attributes.globalBrightness = brightness !== undefined ? brightness : scene.attributes.globalBrightness;

            this.instance._activeScenes = this.instance._activeScenes.filter(s => s.id !== scene.id); //Remove old scene if it exists
            this.instance._activeScenes.push(scene); //Place the scene at the end of the list
        }
    }

    static async unstageScene(id: (number | SceneReference)[] | number | SceneReference) {
        if (!Array.isArray(id)) { id = [id]; }
        for (const i of id) {
            let sceneId: number | undefined;
            if (i instanceof SceneReference) { sceneId = i.id; }
            else { sceneId = i; }
            Logger.info(`Deactivating scene ${sceneId}`);
            this.instance._activeScenes = this.instance._activeScenes.filter(s => s.id !== sceneId);
        }
    }

    static async sendScenes(transitionTimeMs?: number, brightness?: number) {
        var actions: Map<string, Map<Target, LightStateAttributes>> = new Map();
        if (this.instance._activeScenes.length == 0) {
            Logger.warn("No scenes to active, no need to send them");
            return;
        }

        const addTarget = (scene: Scene, target: Target, attributes: LightStateAttributes) => {
            //If its a group then handle all the targets in the group
            if (target.type === "group") {
                const groupTarget = target as GroupReference;
                const group = Groups.getGroup(groupTarget.id);
                if (group) {
                    for (const target of group.targets) {
                        addTarget(scene, target, attributes);
                    }
                }
                else {
                    Logger.warn(`Failed to fully activate scene ${scene.name}, group ${groupTarget.id} was not found`);
                }
                return;
            }

            //Apply any global attributes
            const newAttributes = {
                ...attributes,
                ...actions.get(target.type)?.get(target) || {}
            };

            const globalBrightness = brightness !== undefined ? brightness : scene.attributes.globalBrightness;
            const globalTransitionTime = transitionTimeMs !== undefined ? transitionTimeMs : scene.attributes.globalTransitionTime;
            if (globalBrightness !== undefined) {
                if (attributes.brightnessPercent === undefined) { newAttributes.brightnessPercent = globalBrightness; }
                else {
                    newAttributes.brightnessPercent = Math.floor(attributes.brightnessPercent * (globalBrightness / 100));
                }
            }
            newAttributes.transitionMs = globalTransitionTime !== undefined ? globalTransitionTime : attributes.transitionMs;

            if (!actions.has(target.type)) { actions.set(target.type, new Map()); }
            actions.get(target.type)?.set(target, newAttributes);
        }

        //Sort the scenes by priority
        const sortedScenes = this.instance._activeScenes.reverse().sort((a, b) => {
            if (!a) { return 1; }
            if (!b) { return -1; }
            if (a.attributes.priority === undefined && b.attributes.priority === undefined) { return 0; }
            if (a.attributes.priority === undefined) { return 1; }
            if (b.attributes.priority === undefined) { return -1; }
            return b.attributes.priority - a.attributes.priority;
        });

        //Loop through all the scenes and queue all the targets in the scenes by priority
        for (const scene of sortedScenes) {
            Logger.info(`Applying scene ${scene.name} with priority ${scene.attributes.priority || "0"}`);
            for (const state of scene.attributes.states) {
                for (const target of state.targets) {
                    addTarget(scene, target, state.attributes);
                }
            }
        }

        //Now queue all the targets
        for (const [type, targets] of actions) {
            for (const [target, attributes] of targets) {
                let foundTarget = false;
                for (const controller of Config.controllers) {
                    if (controller.queueTarget(target, attributes)) {
                        foundTarget = true;
                        break;
                    }
                }
                if (!foundTarget) {
                    Logger.warn(`Failed to fully activate scenes, target type ${target.type} was not found`);
                }
            }
        }

        //Ok, now send all the queued targets
        return Promise.all(Config.controllers.map(async controller => {
            await controller.sendQueuedTargets();
        }));
    }

    /**
     * Load the configuration from file
     */
    static async load() {
        const read = await ConfigFile.loadConfig("scenes", {});
        Scenes.instance._scenes.clear();
        for (const [id, scene] of Object.entries(read)) {
            Scenes.instance._scenes.set(parseInt(id), scene as Scene);
        }
        Logger.info(`Loaded ${Scenes.scenes.size} scenes`);
        for (const [id, scene] of Scenes.scenes) {
            Logger.info(`\t${id}: ${scene.name} (${scene.description}). Priority: ${scene.attributes.priority ? scene.attributes.priority : 0}`);
        }
    }

    /**
     * Save the configuration to file
     * @param scenes The scenes to save
     */
    static async save() {
        let record: Record<number, Scene> = {};
        for (const [id, scene] of Scenes.instance._scenes) {
            record[id] = scene;
        }
        await ConfigFile.saveConfig("scenes", record);
    }
}