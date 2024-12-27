/**
 * Nightlight Effect
 * Will adjust the brightness of the lights to be more comfortable for night time.
 */

import { Scenes } from "../scenes";
import { Effect } from "../types/effect";
import { LightStateAttributes } from "../types/lightState";
import { Target } from "../types/target";

export class NightLightEffect extends Effect {
    private _lastChange = Date.now();
    private _fadeTime;
    private _brightness;
    private _checkInterval = 5 * 60000; // 5 minutes
    private _longFadeTime = 60 * 60000; // 60 minutes

    constructor(target: Target, attributes: LightStateAttributes) {
        super("Night Light", "Adjust the brightness of the lights to be more comfortable for night time", target, attributes);
        this._fadeTime = attributes.transitionMs || 5000;
        this._brightness = attributes.brightnessPercent || 100; //Minimum brightness
    }

    async queue(forceQueue: boolean = false): Promise<boolean> {
        if (forceQueue != true && Date.now() - this._lastChange < this._checkInterval) { return false; }
        this._lastChange = Date.now();

        for (const target of this.targets) {
            const currentAttributes = Scenes.getCurrentTarget(target) || {};
            if (currentAttributes.on === false) { continue; } // Skip if the light is off

            let brightnessPercent = 100;
            const hour = new Date().getHours();
            if (hour >= 21 || hour < 6) { brightnessPercent = 5; } //During the night, 9pm to 6am
            else if (hour >= 6 && hour < 9) { brightnessPercent = 70; } //Morning, 6am to 9am
            else if (hour >= 9 && hour < 21) { brightnessPercent = 100; } //Day, 9am to 9pm

            if (brightnessPercent < this._brightness) { brightnessPercent = this._brightness; } //Don't go below the minimum brightness

            const attributes = {
                ... { brightnessPercent },
                ...currentAttributes,
                ... { transitionMs: forceQueue == true ? this._fadeTime : this._longFadeTime }
            }
            Scenes.queueTarget(target, attributes);
        }

        return true;
    }

    async sent(): Promise<void> { }
}