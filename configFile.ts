import path from "path";
import { Logger } from "./logger";
import fs from "fs/promises";

export class ConfigFile {
    static get configDirectory() { return path.join(__dirname, "..", "config"); }

    /**
     * Load a configuration from disk
     * @param name The configuration name
     * @param defaults The default configuration
     * @returns The loaded configuration
     */
    static async loadConfig<T>(name: string, defaults?: T): Promise<T> {
        const configPath = path.join(ConfigFile.configDirectory, `${name}.json`);

        Logger.info(`Loading config from ${configPath}`);
        try {
            //Check that the config directory exists, if not create it
            try { await fs.readdir(ConfigFile.configDirectory); }
            catch (e) {
                Logger.info(`Creating config directory at ${ConfigFile.configDirectory}`);
                await fs.mkdir(ConfigFile.configDirectory);
            }

            //Read the config
            const read = await fs.readFile(configPath);
            return JSON.parse(read.toString());
        }
        catch (e: any) {
            if (e.code === "ENOENT") {
                Logger.warn(`No config file found at ${configPath}`);
                if (defaults) {
                    Logger.info(`Creating new config file with defaults at ${configPath}`);
                    await ConfigFile.saveConfig<T>(name, defaults);
                    return defaults;
                }
            }
            Logger.error(`Error loading config at ${configPath}: ${e}`);
            throw e;
        }
    }

    /**
     * Save a configuration to disk
     * @param name The configuration name
     * @param config The configuration object
     */
    static async saveConfig<T>(name: string, config: T) {
        const configPath = path.join(ConfigFile.configDirectory, `${name}.json`);
        Logger.debug(`Saving config to ${configPath}`);

        //Check that the config directory exists, if not create it
        try { await fs.readdir(ConfigFile.configDirectory); }
        catch (e) {
            Logger.info(`Creating config directory at ${ConfigFile.configDirectory}`);
            try { await fs.mkdir(ConfigFile.configDirectory); }
            catch (e) {
                Logger.error(`Error creating config directory at ${ConfigFile.configDirectory}: ${e}`);
                throw e;
            }
        }

        //Write the config file
        try { await fs.writeFile(configPath, JSON.stringify(config)); }
        catch (e) {
            Logger.error(`Error saving config at ${configPath}: ${e}`);
            throw e;
        }
    }
}