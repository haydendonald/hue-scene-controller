/**
 * Nightlight Effect
 * Will adjust the brightness of the lights to turn on at night time, as a night light
 */

import { Scenes } from "../scenes";
import { Effect } from "../types/effect";
import { Group } from "../types/group";
import { LightStateAttributes } from "../types/lightState";
import { Target } from "../types/target";

export class NightLightEffect extends Effect {
    private _lastChange = Date.now();
    private _fadeTime;
    private _brightness;
    private _on;
    private _checkInterval = 5 * 60000; // 5 minutes
    private _longFadeTime = 60 * 60000; // 60 minutes

    constructor(target: Target | Group, attributes: LightStateAttributes) {
        super("Night Light", "Adjust the brightness of the lights to only turn on for a night light at night time", target, attributes);
        this._fadeTime = attributes.transitionMs;
        this._brightness = attributes.brightnessPercent || 100; //Maximum brightness
        this._on = attributes.on;
    }

    async queue(forceQueue: boolean = false): Promise<boolean> {
        if (forceQueue != true && Date.now() - this._lastChange < this._checkInterval) { return false; }
        this._lastChange = Date.now();

        for (const target of this.targets) {
            const currentAttributes = Scenes.getCurrentTarget(target) || {};
            if (currentAttributes.on === false) { continue; } // Skip if the light is off

            const hour = new Date().getHours();
            const brightnessFloat = this._brightness / 100.0;

            let on = true;
            let brightnessPercent = 100;
            if (hour >= 6 && hour < 21) {
                on = false;
            }
            else if (hour >= 21 && hour < 22) { brightnessPercent = 10 * brightnessFloat; }
            else if (hour >= 22 && hour < 23) { brightnessPercent = 50 * brightnessFloat; }
            else if (hour >= 23 && hour < 24) { brightnessPercent = 100 * brightnessFloat; }
            else if (hour >= 1 && hour < 2) { brightnessPercent = 50 * brightnessFloat; }
            else if (hour >= 2 && hour < 3) { brightnessPercent = 50 * brightnessFloat; }
            else if (hour >= 3 && hour < 6) { brightnessPercent = 10 * brightnessFloat; }

            const transitionMs = forceQueue == true ? this._fadeTime : this._longFadeTime;
            Scenes.queueTarget(target, {
                ...currentAttributes,
                ... {
                    on,
                    brightnessPercent
                },
                ...transitionMs ? { transitionMs } : {}
            });
        }

        return true;
    }

    async sent(): Promise<void> { }

    async stop(): Promise<void> { }
}