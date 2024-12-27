import { Target } from "./target";

export interface LightStateAttributes {
    on?: boolean; //Should we turn the light on or off
    transitionMs?: number; //The transition time in milliseconds
    brightnessPercent?: number; //The brightness percentage
    colorTemperature?: number; //The color temperature in kelvin
    hue?: number; //The hue between 0 and 360 degrees
    sat?: number; //The saturation between 0 and 100 percent
    effect?: string; //The effect to apply to the light
}

export interface LightState {
    targets: Target[]; //The targets of this state
    attributes?: LightStateAttributes; //The attributes of this state
    effect?: string; //Should we apply an effect to the light
}