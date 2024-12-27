/**
 * Natural Light Effect
 * This effect will mimic the natural light cycle of the day.
 */

import { Scenes } from "../scenes";
import { Effect } from "../types/effect";
import { LightStateAttributes } from "../types/lightState";
import { Target } from "../types/target";

export class NaturalLightEffect extends Effect {
    private _lastChange = Date.now();
    private _fadeTime;
    private _brightness;
    private _checkInterval = 5 * 60000; // 5 minutes
    private _longFadeTime = 60 * 60000; // 60 minutes

    constructor(target: Target, attributes: LightStateAttributes) {
        super("Natural Light", "Mimic the natural light cycle of the day", target, attributes);
        this._fadeTime = attributes.transitionMs;
        this._brightness = attributes.brightnessPercent || 100;
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
                ... { brightnessPercent: this._brightness },
                ...currentAttributes,
                ... { colorTemperature },
                ...transitionMs ? { transitionMs } : {}
            }
            Scenes.queueTarget(target, attributes);
        }

        return true;
    }

    async sent(): Promise<void> { }
}