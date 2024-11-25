import path from "path";
import { Groups } from "./groups";
import { HueController, HueLightReference, LightState } from "./controllers/hue";
import { Logger, LogLevel } from "./logger";
import { Scenes } from "./scenes";
import fs from "fs/promises";
import { Config } from "./config";
import { group } from "console";
import { GroupReference } from "./types/group";

async function main() {
    //Load the configuration
    Logger.info("Loading configuration");
    await Config.load();
    await Groups.load();
    await Scenes.load();

    //Connect the controllers
    Logger.info("Connecting controllers");
    await Promise.all(Config.controllers.map(async controller => {
        try {
            await controller.load();
            await controller.connect();
        }
        catch (e) { }
    }));


    // await Scenes.save();


    // //Check if the config directory exists, if not create it


    // Logger.setLogLevel(LogLevel.DEBUG);


    // await HueBridge.connect();

    // console.log(await bridge.lights?.getAll());


    // try {
    //     await loadConfiguration();
    // }
    // catch (e) {
    //     const scene: Scene = {
    //         name: "Test Scene",
    //         description: "A test scene",
    //         lights: {
    //             targets: [61],
    //             state: new LightState().on().getPayload()
    //         }
    //     }

    //     await saveConfiguration([scene]);
    // }



    // console.log(Groups.groups[0]);
    // console.log(Scenes.scenes);




    // var lol: Group = new Group(1, [new HueLight(1), new HueLight(2)]);
    // var ha: Group = new Group(2, [lol, new HueLight(3)]);
    // console.log(ha);

    // Groups.addGroup(lol);
    // Groups.addGroup(ha);


    // Groups.addGroup({ id: 1, targets: [
    //     // new HueLight(1),
    //     // new HueLight(2),
    //     // new Group(3, [new HueLight(3), new HueLight(4)])

    // ] });


    // Scenes.save();




    // console.log(await bridge.lights?.getAll())

    // const group: Group = {
    //     uid: "Test Group",
    //     lightIds: [61, 56]
    // }

    // const scene: Scene = {
    //     uid: "Test Scene",
    //     description: "A test scene",
    //     globalBrightness: 50,
    //     globalTransitionTime: 10,
    //     forceGlobalState: false,
    //     lights: {
    //         targets: [Groups.groups[0].uid],
    //         state: new LightState().transitiontime(40).brightness(50).off().getPayload()
    //     }
    // }
    // Scenes.addScene(scene);
    // Scenes.saveScenes();

    // await saveConfiguration([scene]);


    // await loadConfiguration();

    // console.log(scenes[0]);

    // console.log(Scenes.scenes);

    // let i = 0;

    // setInterval(async () => {
    //     if (i >= Scenes.scenes.length) { i = 0; }
    //     await HueBridge.setScene(Scenes.scenes[i++]);
    // }, 1000);

}
main();