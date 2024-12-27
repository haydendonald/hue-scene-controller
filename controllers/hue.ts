import * as hue from "node-hue-api";
import { Api } from "node-hue-api/dist/esm/api/Api";
import { Logger } from "../logger";
import os from "os";
import { DiscoveryBridgeDescription } from "node-hue-api/dist/esm/api/discovery/discoveryTypes";
import { ConfigFile } from "../configFile";
import { LightStateAttributes } from "../types/lightState";
import { Controller } from "../controller";
import { Target } from "../types/target";
import { Light } from "../types/light";

export class LightState extends hue.v3.lightStates.LightState { }
export class LightScene extends hue.model.LightScene { }
export class SceneLightState extends hue.v3.lightStates.SceneLightState { }
type SceneId = string | LightScene | hue.model.GroupScene;

export class HueLightReference implements Target {
    type = "hue";
    id: number;
    name: string;
    constructor(id: number, name?: string) {
        this.id = id;
        this.name = name || `Hue Light ${id}`;
    }
}

export interface HueBridgeConfiguration {
    serial: string; //The bridge serial number
    userId: string; //The user id to use
    userKey?: string; //The user key to use
    useScene: boolean; //If true, a scene will be created and activated, if false the lights will be activated one by one. Default true
}

export class HueController implements Controller {
    private _config?: HueBridgeConfiguration;
    private _api?: Api;
    private _queuedTargets: Map<Target, LightState> = new Map();
    private _lights: Map<number, Light> = new Map();

    /**
     * Discover bridges on the network
     * @returns A list of bridges found on the network
     */
    private async _discoverBridges(): Promise<DiscoveryBridgeDescription[]> {
        let discoveryResults;
        try { discoveryResults = await hue.discovery.mdnsSearch(); }
        catch (e) { Logger.error(`Error searching for bridges: ${e}`); throw e; }
        return discoveryResults;
    }

    private get useScene(): boolean { return this._config?.useScene === undefined ? true : this._config?.useScene; }

    async load() {
        try { this._config = await ConfigFile.loadConfig("hue"); }
        catch (e: any) {
            if (e.code === "ENOENT") {
                Logger.error(`No configuration saved. Please connect to the bridge for the first time`);
            }
        }
    }

    async save() {
        await ConfigFile.saveConfig("hue", this._config);
    }

    private attributesToLightState(attributes: LightStateAttributes): LightState {
        const state = new LightState();
        if (attributes.on !== undefined) { state.on(attributes.on); }
        if (attributes.transitionMs !== undefined) {
            let time = attributes.transitionMs / 100;
            if (time < 0) { time = 0; }
            else if (time > 65535) { time = 65535; }
            state.transitiontime(time);
        }
        if (attributes.on === false) { return state; } //If the light is off we cannot set any other attributes
        if (attributes.brightnessPercent !== undefined) {
            let brightness = attributes.brightnessPercent;
            if (brightness < 0) { brightness = 0; }
            else if (brightness > 100) { brightness = 100; }
            state.brightness(brightness);
        }
        if (attributes.colorTemperature !== undefined) {
            const mired = 1000000 / attributes.colorTemperature;
            if (mired < 153) { state.ct(153); }
            else if (mired > 500) { state.ct(500); }
            state.ct(mired);
        }
        if (attributes.hue !== undefined) { state.hue((attributes.hue / 360) * 65535); }
        if (attributes.sat !== undefined) { state.sat((attributes.sat / 100) * 254); }
        if (attributes.effect !== undefined) { state.effect(attributes.effect); }
        return state;
    }

    private lightStateToSceneState(attributes: LightState): SceneLightState {
        return new SceneLightState().populate(attributes);
    }

    async authorize() {
        for (let i = 0; true; i++) {
            if (i >= 30) {
                Logger.error("Failed to connect to any bridges. Did you press the button?");
                throw "Failed to connect to any bridges";
            }

            try {
                let userConfig: HueBridgeConfiguration | undefined = undefined;
                Logger.info("Searching for bridges...");
                const discoveryResults = await this._discoverBridges();
                if (discoveryResults.length === 0) { Logger.error("No bridges found"); throw "No bridges found"; }

                //Loop through all the bridges found and try to create a user
                for (const bridge of discoveryResults) {
                    if (!bridge.ipaddress) { continue; }
                    if (!bridge.model?.serial) { continue; }

                    try {
                        Logger.info(`Attempting to connect to bridge at ${bridge.ipaddress}`);
                        Logger.debug(`Bridge: ${JSON.stringify(bridge)}`);
                        const unauthenticatedApi = await hue.api.createLocal(bridge.ipaddress).connect();
                        const appName = process.env.npm_package_name || "HueSceneController";
                        const deviceName = (os.hostname() || "unknown").substring(0, 35 - appName.length);
                        Logger.debug(`Trying to create user for bridge at ${bridge.ipaddress} with app name ${appName} and device name ${deviceName}`);
                        const createdUser = await unauthenticatedApi.users.createUser(appName, deviceName);
                        const authenticatedApi = await hue.api.createLocal(bridge.ipaddress).connect(createdUser.username, createdUser.clientkey);
                        const bridgeConfig = await authenticatedApi.configuration.getConfiguration();
                        Logger.info(`Connected to bridge: ${bridgeConfig.name}(${bridgeConfig.ipaddress})!`);
                        userConfig = {
                            serial: bridge.model.serial,
                            userId: createdUser.username,
                            userKey: createdUser.clientkey,
                            useScene: true
                        };
                    }
                    catch (e) { }
                }

                if (userConfig) {
                    this._config = { ...this._config || {}, ...userConfig };
                    await this.save();
                    break;
                }
            }
            catch (e) { }

            //Wait 5 seconds before trying again
            Logger.info("Waiting 5 seconds before trying again...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async getLights(): Promise<Map<number, Light>> {
        if (!this._api) { Logger.error(`Cannot get lights, no bridge connected`); throw "No bridge connected"; }
        try {
            this._lights.clear();
            (await this._api.lights.getAll()).map((light: any) => {
                let ret: Light =
                {
                    id: light.id,
                    controller: "hue",
                    name: light.name,
                    state: {
                        on: light.state.on,
                        brightnessPercent: light.state.bri !== undefined ? light.state.bri / 254 * 100 : undefined,
                        colorTemperature: light.state.ct !== undefined ? Math.floor(1000000 / light.state.ct) : undefined,
                        hue: light.state.hue,
                        sat: light.state.sat,
                        effect: light.state.effect
                    },
                    model: light.productname,
                    manufacturer: light.manufacturername,
                    version: light.swversion
                }
                this._lights.set(light.id, ret);
                return ret;
            });
            return this._lights;
        }
        catch (e) { Logger.error(`Error getting lights: ${e}`); throw e; }
    }

    getLight(id: number): Light | undefined {
        return this._lights.get(id);
    }

    async connect() {
        if (!this._config) { Logger.error("Cannot connect to the bridge, authorize the bridge"); throw "No configuration loaded"; }

        //Try to connect
        Logger.info("Searching for the bridge...");
        while (true) {
            try {
                const discoveryResults = await this._discoverBridges();
                if (discoveryResults.length === 0) { Logger.error("No bridges found"); throw "No bridges found"; }
                for (const bridge of discoveryResults) {
                    Logger.debug(`Found bridge: ${JSON.stringify(bridge)}`);
                    if (bridge.model?.serial == this._config?.serial) {
                        if (!bridge.ipaddress) { continue; }
                        const api = await hue.v3.api.createLocal(bridge.ipaddress).connect(this._config?.userId, this._config?.userKey);
                        Logger.info(`Found bridge at ${bridge.ipaddress}`);
                        this._api = api;
                        break;
                    }
                }
                if (this._api) { break; }
            }
            catch (e) { }
        }

        //Print the lights detected on the bridge
        Logger.info("Lights detected on bridge:");
        for (const [id, light] of await this.getLights()) {
            Logger.info(`\t${id}: ${light.name}`);
        }
    }

    queueTarget(target: Target, attributes: LightStateAttributes): boolean {
        if (target.type == "hue") {
            this._queuedTargets.set(target, this.attributesToLightState(attributes));
            return true;
        }
        return false;
    }

    async sendQueuedTargets(): Promise<void> {
        const self = this;
        if (!self._api) { Logger.error(`Cannot send states, no bridge connected`); return; }
        if (self._queuedTargets.size == 0) { return; }
        Logger.info(`Sending states`);

        //Set the state of the lights directly
        if (!self.useScene) {
            await Promise.all(Array.from(self._queuedTargets, ([target, attributes]) => {
                return new Promise<void>(async (resolve) => {
                    try {
                        Logger.debug(`Setting light ${target.id} to state: ${JSON.stringify(attributes.getPayload())}`);
                        await self._api?.lights.setLightState(target.id, attributes);
                    }
                    catch (e) { Logger.error(`Failed to set light ${target.id}: ${e}`); }
                    resolve();
                })
            }));
        }
        else {
            //Create a temporary scene with the lights and activate it
            const send = hue.v3.model.createLightScene();
            send.name = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            send.lights = Array.from(self._queuedTargets.keys()).map(target => target.id.toString());
            send.recycle = true;
            Logger.debug(`Creating scene: ${send.name}`);
            const result = await self._api.scenes.createScene(send);

            //Set the state of the lights into the scene
            await Promise.all(Array.from(self._queuedTargets, ([target, attributes]) => {
                return new Promise<void>(async (resolve) => {
                    const state = self.lightStateToSceneState(attributes);
                    try {
                        await self._api?.scenes.updateLightState(result.id as SceneId, target.id, state);
                        Logger.debug(`Set light ${target.id} to state: ${JSON.stringify(state.getPayload())} in scene ${result.id}`);
                    }
                    catch (e) { Logger.error(`Error setting light state for ${target.id}: ${e}`); }
                    resolve();
                })
            }));

            //Activate the scene
            Logger.debug(`Activating scene: ${result.id}`);
            await self._api.scenes.activateScene(result.id as SceneId);

            //Delete the scene now
            Logger.debug(`Deleting scene: ${result.id}`);
            await self._api.scenes.deleteScene(result.id as SceneId);
        }

        //Clear the queued targets
        self._queuedTargets.clear();
    }
}