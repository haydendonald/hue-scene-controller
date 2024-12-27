import { Config } from "./config";
import { ConfigFile } from "./configFile";
import { Groups } from "./groups";
import { LightStateAttributes } from "./types/lightState";
import { Logger } from "./logger";
import { Scene, SceneAttributes, SceneReference } from "./types/scene";
import { Target } from "./types/target";
import { GroupReference } from "./types/group";
import { Effect } from "./types/effect";

export class Scenes {
    private static _instance: Scenes;
    private _scenes: Map<number, Scene> = new Map();
    private _activeScenes: Scene[] = [];
    private _unstageScenes: Scene[] = [];
    private _runningEffects: Map<string, Map<Target, Effect>> = new Map();
    private _currentTargets: Map<string, Map<Target, LightStateAttributes>> = new Map();
    private _effectsHandler: NodeJS.Timeout | undefined;

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

    constructor() {
        Scenes._instance = this;

        //Periodically run the effect handlers
        const handleEffects = async () => {
            clearTimeout(this._effectsHandler);

            //Queue any changes for the effects
            const effectQueued = await Scenes.queueEffects();

            //Send the queued targets if any effects were queued
            if (effectQueued == true) {
                await Scenes.sendQueuedTargets();

                //Callback for when the queue is sent to the controllers
                for (const [type, effects] of this._runningEffects) {
                    for (const [target, effect] of effects) {
                        await effect.sent();
                    }
                }
            }

            this._effectsHandler = setTimeout(handleEffects, 10); //Run every 10ms
        }
        handleEffects();
    }

    static async queueEffects(forceQueue: boolean = false): Promise<boolean> {
        let effectQueued = false;
        for (const [type, effects] of this.instance._runningEffects) {
            for (const [target, effect] of effects) {
                if (await effect.queue(forceQueue)) { effectQueued = true; }
            }
        }
        return effectQueued;
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

    static async stageScene(id: (number | SceneReference)[] | number | SceneReference, priority?: number, transitionMs?: number, brightness?: number) {
        if (!Array.isArray(id)) { id = [id]; }
        for (const i of id) {
            let sceneId: number | undefined;
            if (i instanceof SceneReference) { sceneId = i.id; }
            else { sceneId = i; }

            const scene = Scenes.getScene(sceneId);
            if (!scene) {
                Logger.error(`Failed to activate scene ${sceneId}, it was not found`);
                throw `scene ${sceneId} not found`;
            }

            Logger.info(`Activating scene ${scene.name}`);
            let newScene = structuredClone(scene);
            newScene.attributes.priority = priority !== undefined ? priority : newScene.attributes.priority;
            newScene.attributes.globalTransitionMs = transitionMs !== undefined ? transitionMs : newScene.attributes.globalTransitionMs;
            newScene.attributes.globalBrightnessPercent = brightness !== undefined ? brightness : newScene.attributes.globalBrightnessPercent;

            this.instance._activeScenes = this.instance._activeScenes.filter(s => s.id !== scene.id); //Remove old scene if it exists
            this.instance._activeScenes.push(newScene); //Place the scene at the end of the list
        }
    }

    static async unstageScene(id: (number | SceneReference)[] | number | SceneReference, transitionMs?: number) {
        if (!Array.isArray(id)) { id = [id]; }
        for (const i of id) {
            let sceneId: number | undefined;
            if (i instanceof SceneReference) { sceneId = i.id; }
            else { sceneId = i; }
            Logger.info(`Deactivating scene ${sceneId}`);

            //Stage the scene with only the transition time, so we fade out the scene
            if (transitionMs !== undefined) {
                const scene = Scenes.getScene(sceneId);
                if (scene) {
                    let newScene: Scene = structuredClone(scene);
                    for (const i in newScene?.attributes.states || []) {
                        newScene.attributes.states[i].attributes = {
                            transitionMs
                        }
                    }
                    this.instance._unstageScenes.push(newScene);
                }
            }

            //Remove the scene from the active scenes
            this.instance._activeScenes = this.instance._activeScenes.filter(s => s.id !== sceneId);
        }
    }

    static async toggleScene(id: (number | SceneReference)[] | number | SceneReference, priority?: number, transitionMs?: number, brightness?: number) {
        if (!Array.isArray(id)) { id = [id]; }
        for (const i of id) {
            let sceneId: number | undefined;
            if (i instanceof SceneReference) { sceneId = i.id; }
            else { sceneId = i; }

            //If it's staged, unstage it, otherwise stage it
            const isStaged = Scenes.activeScenes.filter(scene => scene.id == sceneId).length != 0;
            if (isStaged) {
                Scenes.unstageScene(sceneId, transitionMs);
            }
            else {
                Scenes.stageScene(sceneId, priority, transitionMs, brightness);
            }
        }
    }

    static getCurrentTargets(type: string) {
        return this.instance._currentTargets.get(type);
    }

    static getCurrentTarget(target: Target) {
        return this.instance._currentTargets.get(target.type)?.get(target);
    }

    static async queueTarget(target: Target, attributes: LightStateAttributes) {
        let foundTarget = false;
        for (const controller of Config.controllers) {
            if (controller.queueTarget(target, attributes)) {
                const type = target.type;
                if (!this._instance._currentTargets.has(type)) { this._instance._currentTargets.set(type, new Map()); }
                this._instance._currentTargets.get(type)?.set(target, attributes);
                foundTarget = true;
                break;
            }
        }
        if (!foundTarget) {
            Logger.warn(`Failed to fully activate target ${target.name}(${target.id}), target type ${target.type} was not found`);
        }
    }

    static async queueTargets(actions: Map<string, Map<Target, LightStateAttributes>>) {
        for (const [type, targets] of actions) {
            for (const [target, attributes] of targets) {
                this.queueTarget(target, attributes);
            }
        }
    }

    static async sendQueuedTargets() {
        await Promise.all(Config.controllers.map(async controller => {
            await controller.sendQueuedTargets();
        }));
    }

    static async sendScenes(transitionMs?: number, brightness?: number) {
        var actions: Map<string, Map<Target, LightStateAttributes>> = new Map();

        const addTarget = (scene: Scene, target: Target, attributes: LightStateAttributes, fromGroup: boolean) => {
            //If its a group then handle all the targets in the group
            if (Groups.isGroup(target)) {
                const groupTarget = target as GroupReference;
                const group = Groups.getGroup(groupTarget.id);
                if (group) {
                    //Should we run any effects on the group?
                    if (fromGroup == false && attributes.effect) {
                        const effect = Config.createEffect(attributes.effect, target, attributes);
                        if (effect) {
                            const uid = `${target.type}-${target.id}`;
                            if (!this._instance._runningEffects.has(uid)) { this._instance._runningEffects.set(uid, new Map()); }
                            this.instance._runningEffects.get(uid)?.set(target, effect);
                        }
                    }

                    //Add all the targets in the group
                    for (const target of group.targets) {
                        addTarget(scene, target, attributes, true);
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

            const globalBrightnessPercent = brightness !== undefined ? brightness : scene.attributes.globalBrightnessPercent;
            const globalTransitionMs = transitionMs !== undefined ? transitionMs : scene.attributes.globalTransitionMs;
            if (globalBrightnessPercent !== undefined) {
                if (attributes.brightnessPercent === undefined) { newAttributes.brightnessPercent = globalBrightnessPercent; }
                else {
                    newAttributes.brightnessPercent = Math.floor(attributes.brightnessPercent * (globalBrightnessPercent / 100));
                }
            }
            if (globalTransitionMs !== undefined) { newAttributes.transitionMs = globalTransitionMs; }


            //Should we run any effects on the light directly?
            if (newAttributes.effect) {
                const effect = fromGroup == false ? Config.createEffect(newAttributes.effect, target, newAttributes) : undefined;
                if (effect) {
                    if (!this._instance._runningEffects.has(target.type)) { this._instance._runningEffects.set(target.type, new Map()); }
                    this.instance._runningEffects.get(target.type)?.set(target, effect);
                }
                delete newAttributes.effect;
            }

            //Add the target to the actions
            if (!actions.has(target.type)) { actions.set(target.type, new Map()); }
            actions.get(target.type)?.set(target, newAttributes);
        }

        //Sort the scenes by priority
        const sortedScenes = [
            ...this.instance._activeScenes.reverse().sort((a, b) => { //Sort the scenes by priority
                if (!a) { return 1; }
                if (!b) { return -1; }
                if (a.attributes.priority === undefined && b.attributes.priority === undefined) { return 0; }
                if (a.attributes.priority === undefined) { return 1; }
                if (b.attributes.priority === undefined) { return -1; }
                return b.attributes.priority - a.attributes.priority;
            }),
            ...Array.from(this.instance._scenes.values()).filter(scene => scene.attributes.alwaysStage), //Add the scenes with always stage at the end
            ...this.instance._unstageScenes //Add the scenes to unstage at the end so they always fade with the desired transition time
        ];
        this.instance._unstageScenes = [];

        if (sortedScenes.length == 0) {
            Logger.warn("No scenes to active, no need to send them");
            return;
        }
        Logger.debug(`Sorted scenes: ${sortedScenes.map(s => s.name).join(", ")}`);

        //Stop all running effects
        for (const [type, effects] of this._instance._runningEffects) {
            this.instance._runningEffects.get(type)?.clear();
            this._instance._runningEffects.delete(type);
        }

        //Loop through all the scenes and queue all the targets in the scenes by priority
        for (const scene of sortedScenes) {
            Logger.info(`Applying scene ${scene.name} with priority ${scene.attributes.priority || "0"}`);
            for (const state of scene.attributes.states) {
                for (const target of state.targets) {
                    if (state.attributes) {
                        addTarget(scene, target, state.attributes, false);
                    }
                }
            }
        }

        //Queue and send the targets to the controllers
        await Scenes.queueTargets(actions);
        await Scenes.queueEffects(true);
        await Scenes.sendQueuedTargets();
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
            Logger.debug(`\t\t${JSON.stringify(scene.attributes)}`);
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