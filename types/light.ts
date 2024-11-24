import { LightStateAttributes } from "./lightState";

export interface Light {
    id: any; //The unique identifier of the light
    controller: string; //The controller that manages this light
    type?: string; //The type of light
    name: string; //The name of the light
    state: LightStateAttributes; //The current state of the light
    model?: string; //The model of the light
    manufacturer?: string; //The manufacturer of the light
    version?: string; //The version of the light
}