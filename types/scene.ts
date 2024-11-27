import { LightState } from "./lightState";

export class SceneReference {
    type = "scene";
    id: number;
    constructor(id: number) {
        this.id = id;
    }
}

export interface Scene {
    id: number;
    name: string;
    description: string;
    attributes: SceneAttributes;
}

export interface SceneAttributes {
    priority?: number;
    globalTransitionTime?: number;
    globalBrightness?: number;
    states: LightState[];
}