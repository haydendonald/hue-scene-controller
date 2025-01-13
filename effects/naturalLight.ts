/**
 * Natural Light Effect
 * This effect will mimic the natural light cycle of the day.
 */

import { Scenes } from "../scenes";
import { Effect } from "../types/effect";
import { Group } from "../types/group";
import { LightStateAttributes } from "../types/lightState";
import { Target } from "../types/target";

export class NaturalLightEffect extends Effect {
    private _lastChange = Date.now();
    private _fadeTime;
    private _brightness;
    private _on;
    private _checkInterval = 5 * 60000; // 5 minutes
    private _longFadeTime = 60 * 60000; // 60 minutes

    constructor(target: Target | Group, attributes: LightStateAttributes) {
        super("Natural Light", "Mimic the natural light cycle of the day", target, attributes);
        this._fadeTime = attributes.transitionMs;
        this._brightness = attributes.brightnessPercent;
        this._on = attributes.on;
    }

    async queue(forceQueue: boolean = false): Promise<boolean> {
        if (forceQueue != true && Date.now() - this._lastChange < this._checkInterval) { return false; }
        this._lastChange = Date.now();

        for (const target of this.targets) {
            const currentAttributes = Scenes.getCurrentTarget(target) || {};
            if (currentAttributes.on === false) { continue; } // Skip if the light is off

            let colorTemperature = 2700;
            const hour = new Date().getHours();
            if (hour >= 21 || hour < 6) { colorTemperature = 2000; } //During the night, 9pm to 6am
            else if (hour >= 6 && hour < 9) { colorTemperature = 2700; } //Morning, 6am to 9am
            else if (hour >= 9 && hour < 18) { colorTemperature = 4000; } //Day, 9am to 6pm
            else if (hour >= 18 && hour < 21) { colorTemperature = 2700; } //Evening, 6pm to 9pm

            const transitionMs = forceQueue == true ? this._fadeTime : this._longFadeTime;
            const attributes = {
                ...currentAttributes,
                ...this._brightness ? { brightnessPercent: this._brightness } : {},
                ... { colorTemperature },
                ...transitionMs ? { transitionMs } : {},
                ...this._on !== undefined ? { on: this._on } : {}
            }
            Scenes.queueTarget(target, attributes);
        }

        return true;
    }

    async sent(): Promise<void> { }

    async stop(): Promise<void> { }
}