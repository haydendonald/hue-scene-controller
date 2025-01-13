import { Config } from "./config";
import { ConfigFile } from "./configFile";
import { Groups } from "./groups";
import { LightStateAttributes } from "./types/lightState";
import { Logger } from "./logger";
import { Scene, SceneAttributes, SceneReference } from "./types/scene";
import { Target } from "./types/target";
import { Group } from "./types/group";
import { Effect } from "./types/effect";

export class Scenes {
    private static _instance: Scenes;
    private _scenes: Map<number, Scene> = new Map();
    private _activeScenes: { date: Date, scene: Scene }[] = [];
    private _unstageScenes: Scene[] = [];
    private _runningEffects: Effect[] = [];
    private _currentTargets: Map<string, Map<number, LightStateAttributes>> = new Map();
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
                await Promise.all(this._runningEffects.map((effect) => {
                    return new Promise<void>(async (resolve) => {
                        await effect.sent();
                        resolve();
                    })
                }));
            }

            this._effectsHandler = setTimeout(handleEffects, 100); //Run every 100ms
        }
        handleEffects();
    }

    static async queueEffects(forceQueue: boolean = false): Promise<boolean> {
        let effectQueued = false;
        await Promise.all(this.instance._runningEffects.map((effect) => {
            return new Promise<void>(async (resolve) => {
                if (await effect.queue(forceQueue)) { effectQueued = true; }
                resolve();
            })
        }));
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

            Logger.info(`Activating scene ${scene.name}(${scene.id})`);
            let newScene = structuredClone(scene);
            newScene.attributes.priority = priority !== undefined ? priority : newScene.attributes.priority;
            newScene.attributes.globalTransitionMs = transitionMs !== undefined ? transitionMs : newScene.attributes.globalTransitionMs;
            newScene.attributes.globalBrightnessPercent = brightness !== undefined ? brightness : newScene.attributes.globalBrightnessPercent;

            //Convert the groups to targets
            for (let state of newScene.attributes.states) {
                let newTargets: Target[] = [];
                for (let target of state.targets) {
                    if (Groups.isGroup(target)) {
                        const group = Groups.getGroup(target.id);
                        if (group) {
                            newTargets = newTargets.concat(Groups.getTargetsFromGroup(group));
                        }
                    }
                    else { newTargets.push(target); }
                }
                state.targets = newTargets;
            }

            this.instance._activeScenes = this.instance._activeScenes.filter(s => s.scene.id !== scene.id); //Remove old scene if it exists
            this.instance._activeScenes.push({
                date: new Date(),
                scene: newScene
            });
        }
    }

    static async unstageScene(id: (number | SceneReference)[] | number | SceneReference, transitionMs?: number) {
        if (!Array.isArray(id)) { id = [id]; }
        for (const i of id) {
            let sceneId: number | undefined;
            if (i instanceof SceneReference) { sceneId = i.id; }
            else { sceneId = i; }

            const scene = this.activeScenes.filter(s => s.scene.id == sceneId)[0]?.scene;
            if (!scene) { return; }

            Logger.info(`Deactivating scene ${scene ? scene.name + "(" + scene.id + ")" : sceneId}`);

            //Stage the scene with only the transition time, so we fade out the scene
            if (transitionMs !== undefined) {
                scene.attributes.globalTransitionMs = transitionMs;
                for (const i in scene.attributes.states || []) {
                    scene.attributes.states[i].attributes = {};
                }
                this.instance._unstageScenes.push(scene);
            }

            //Remove the scene from the active scenes
            this.instance._activeScenes = this.instance._activeScenes.filter(s => s.scene.id !== sceneId);
        }
    }

    static async toggleScene(id: (number | SceneReference)[] | number | SceneReference, priority?: number, transitionMs?: number, brightness?: number) {
        if (!Array.isArray(id)) { id = [id]; }
        for (const i of id) {
            let sceneId: number | undefined;
            if (i instanceof SceneReference) { sceneId = i.id; }
            else { sceneId = i; }

            //If it's staged, unstage it, otherwise stage it
            const isStaged = Scenes.activeScenes.filter(s => s.scene.id == sceneId).length != 0;
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
        return this.instance._currentTargets.get(target.type)?.get(target.id);
    }

    static async queueTarget(target: Target, attributes: LightStateAttributes) {
        let foundTarget = false;
        for (const controller of Config.controllers) {
            if (controller.queueTarget(target, attributes)) {
                const type = target.type;
                if (!this._instance._currentTargets.has(type)) { this._instance._currentTargets.set(type, new Map()); }
                this._instance._currentTargets.get(type)?.set(target.id, attributes);
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
        //Stop all running effects
        await Promise.all(this._instance._runningEffects.map(effect => effect.stop)); //TODO: this may not work correctly
        this._instance._runningEffects = [];

        //Sort the scenes
        let sortedScenes = [
            ...this.instance._unstageScenes,
            ...this.instance._activeScenes.sort((a, b) => b.date.getTime() - a.date.getTime()).map(s => s.scene).sort((a, b) => { //Sort the scenes by priority
                if (!a) { return 1; }
                if (!b) { return -1; }
                if (a.attributes.alwaysStage && !b.attributes.alwaysStage) { return 1; }
                if (!a.attributes.alwaysStage && b.attributes.alwaysStage) { return -1; }
                if (a.attributes.priority === undefined && b.attributes.priority === undefined) { return 0; }
                if (a.attributes.priority === undefined) { return 1; }
                if (b.attributes.priority === undefined) { return -1; }
                return b.attributes.priority - a.attributes.priority;
            })
        ];

        //Add the unstage scenes to the end of the list to ensure they are applied last
        this.instance._unstageScenes = [];
        if (sortedScenes.length == 0) { Logger.warn("No scenes to active, no need to send them"); return; }

        let actions: Map<string, Map<number, { target: Target, attributes: LightStateAttributes }>> = new Map();
        for (let scene of sortedScenes) {
            Logger.info(`Applying scene ${scene.name}`);
            for (let state of scene.attributes.states) {

                //Should we generate an effect for this state
                if (state.attributes?.effect) {
                    const effectType = Config.getEffect(state.attributes.effect);
                    if (effectType) {
                        let effectTarget: Target | Group;
                        if (state.targets.length > 1) {
                            effectTarget = {
                                name: `effect-${state.effect}`,
                                description: `Generated effect target for scene ${scene.id}`,
                                targets: state.targets
                            }
                        }
                        else {
                            effectTarget = state.targets[0];
                        }

                        //Generate the effect
                        const effect = new effectType(effectTarget, state.attributes);
                        if (effect) {
                            this._instance._runningEffects.push(effect);
                            continue;
                        }
                    }
                }

                //If we don't have an effect to apply, do the other states
                for (let target of state.targets) {
                    if (state.attributes) {
                        //Apply the global transition time if it's not set
                        if (transitionMs !== undefined) { state.attributes.transitionMs = transitionMs; }
                        else if (scene.attributes.globalTransitionMs !== undefined) { state.attributes.transitionMs = scene.attributes.globalTransitionMs; }

                        //Apply the global brightness if it's not set
                        const brightnessModifier = (brightness !== undefined ? brightness : scene.attributes.globalBrightnessPercent) || 100;
                        if (state.attributes.brightnessPercent === undefined) {
                            state.attributes.brightnessPercent = brightnessModifier;
                        }
                        else {
                            state.attributes.brightnessPercent = Math.floor(state.attributes.brightnessPercent * (brightnessModifier / 100));
                        }

                        //Combine the attributes
                        const newAttributes = {
                            ...state.attributes,
                            ...actions.get(target.type)?.get(target.id)?.attributes || {}
                        };

                        //Add the action to the list
                        if (!actions.has(target.type)) { actions.set(target.type, new Map()); }
                        actions.get(target.type)?.set(target.id, { target, attributes: newAttributes });
                    }
                }
            }
        }

        //Convert the actions to a map of targets (this is not ideal but using a Target as key in the map causes problems)
        let targetActions: Map<string, Map<Target, LightStateAttributes>> = new Map();
        for (const [type, targets] of actions) {
            targetActions.set(type, new Map());
            for (const [, data] of targets) {
                targetActions.get(type)?.set(data.target, data.attributes);
            }
        }

        //Queue and send the targets to the controllers
        await Scenes.queueTargets(targetActions);
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