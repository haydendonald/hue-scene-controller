
import { ConfigFile } from "./configFile";
import { Controller } from "./controller";
import { HueController } from "./controllers/hue";
import { ColorCycle } from "./effects/colorCycle";
import { DayLightEffect } from "./effects/dayLight";
import { NaturalLightEffect } from "./effects/naturalLight";
import { NightLightEffect } from "./effects/nightLight";
import { Input } from "./input";
import { HTTPInput } from "./inputs/http/http";
import { Logger, LogLevel } from "./logger";
import { Effect } from "./types/effect";
import { Group } from "./types/group";
import { LightStateAttributes } from "./types/lightState";
import { Target } from "./types/target";

interface Configs {
    logLevel: LogLevel;
}

export class Config {
    private static _instance: Config;
    private _configurations: Configs = { logLevel: LogLevel.INFO };
    private _controllers: Controller[] = [
        new HueController()
    ];
    private _inputs: Input[] = [
        new HTTPInput()
    ];

    static get instance() {
        if (!Config._instance) { Config._instance = new Config(); }
        return Config._instance;
    }

    static get controllers() {
        return Config.instance._controllers;
    }

    static get inputs() {
        return Config.instance._inputs;
    }

    static get LogLevel() {
        return Config.instance._configurations.logLevel;
    }

    static set LogLevel(level: LogLevel) {
        Config.instance._configurations.logLevel = level;
    }

    /**
     * Load the current configuration from disk
     */
    static async load() {
        if (!Config._instance) { Config._instance = new Config(); }
        Config._instance._configurations = await ConfigFile.loadConfig("config", Config._instance._configurations);
        Logger.setLogLevel(Config._instance._configurations.logLevel);
    }

    /**
     * Save the config to disk
     */
    static async save() {
        if (!Config._instance) { Config._instance = new Config(); }
        ConfigFile.saveConfig("config", Config._instance._configurations);
    }

    /**
     * Get an effect type by name
     * @param name The effect name
     * @returns The effect type
     */
    static getEffect(name: string) {
        switch (name) {
            case "Color Cycle":
                return ColorCycle;
            case "Natural Light":
                return NaturalLightEffect;
            case "Night Light":
                return NightLightEffect;
            case "Day Light":
                return DayLightEffect;
        }
    }

    /**
     * Create an effect by name
     * @param name The name
     * @param targets The targets
     * @param attributes The attributes
     * @returns A new instance of the effect
     */
    static createEffect(name: string, target: Target | Group, attributes: LightStateAttributes): Effect | undefined {
        const effectType = Config.getEffect(name);
        if (!effectType) { return; }
        return new effectType(target, attributes);
    }
}