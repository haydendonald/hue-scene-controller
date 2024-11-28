import { LightState } from "./lightState";

export class SceneReference {
    type = "scene";
    id: number;
    constructor(id: number) {
        this.id = id;
    }
}

export interface Scene {
    id: number; //The unique identifier of the scene
    name: string; //The name of the scene
    description: string; //The description of the scene
    attributes: SceneAttributes; //The attributes of the scene
}

export interface SceneAttributes {
    priority?: number; //The priority of the scene, higher numbers will mean this scene replaces others with lower priority
    globalTransitionMs?: number; //Force all lights to transition at this speed
    globalBrightnessPercent?: number; //Scale the brightness of lights by this amount
    alwaysStage?: boolean; //Always stage this scene, if true, it cannot be unstaged
    states: LightState[]; //The states of the lights in this scene
}