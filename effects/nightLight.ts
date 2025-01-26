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

    async generate(globalTransitionMs?: number, globalBrightnessPct?: number): Promise<Map<Target, LightStateAttributes>> {
        let ret = new Map<Target, LightStateAttributes>();
        for (const target of this.targets) {
            const hour = new Date().getHours();
            const brightnessFloat = (globalBrightnessPct || this._brightness) / 100.0;

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

            const transitionMs = globalTransitionMs || this._fadeTime || this._longFadeTime;
            ret.set(target, {
                ... {
                    on,
                    brightnessPercent
                },
                ...transitionMs ? { transitionMs } : {}
            });
        }

        return ret;
    }

    sent(): void {
        this._lastChange = Date.now();
    }

    shouldGenerate(): boolean {
        return this._checkInterval < Date.now() - this._lastChange;
    }
}