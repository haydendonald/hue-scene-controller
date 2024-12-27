/**
 * Color Cycle effect
 * Do a RGB color cycle on the lights
 */

import { Scenes } from "../scenes";
import { Effect } from "../types/effect";
import { LightStateAttributes } from "../types/lightState";
import { Target } from "../types/target";

export class ColorCycle extends Effect {

    private _colors: { hue: number, sat: number }[] = [
        { hue: 0, sat: 100 },
        { hue: 60, sat: 100 },
        { hue: 120, sat: 100 },
        { hue: 180, sat: 100 },
        { hue: 240, sat: 100 },
        { hue: 300, sat: 100 },
    ];
    private _currentColor = 0;
    private _lastChange = Date.now();
    private _fadeTime;
    private _brightness;

    constructor(target: Target, attributes: LightStateAttributes) {
        super("Color Cycle", "Do a color cycle", target, attributes);
        this._fadeTime = attributes.transitionMs || 5000;
        this._brightness = attributes.brightnessPercent || 100;
    }

    async queue(forceQueue: boolean = false): Promise<boolean> {
        if (forceQueue != true && Date.now() - this._lastChange < this._fadeTime) { return false; }
        this._lastChange = Date.now();

        let offset = 0;
        for (const target of this.targets) {
            const currentAttributes = Scenes.getCurrentTarget(target) || {};
            if (currentAttributes.on === false) { continue; } // Skip if the light is off
            let color = this._currentColor + offset++;
            if (color >= this._colors.length) { color = color - this._colors.length; }
            const attributes = {
                ... { brightnessPercent: this._brightness },
                ...currentAttributes,
                ... this._colors[color],
                ... { transitionMs: this._fadeTime }
            }
            Scenes.queueTarget(target, attributes);
        }

        if (this._currentColor++ >= this._colors.length) { this._currentColor = 0; }
        return true;
    }

    async sent(): Promise<void> { }
}