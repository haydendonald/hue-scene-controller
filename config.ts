
import { ConfigFile } from "./configFile";
import { Controller } from "./controller";
import { HueController } from "./controllers/hue";
import { Input } from "./input";
import { HTTPInput } from "./inputs/http";
import { Logger, LogLevel } from "./logger";

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
}