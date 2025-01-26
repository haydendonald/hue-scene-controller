/**
 * Color Cycle effect
 * Do a RGB color cycle on the lights
 */

import { Scenes } from "../scenes";
import { Effect } from "../types/effect";
import { Group } from "../types/group";
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
    private _on;

    constructor(target: Target | Group, attributes: LightStateAttributes) {
        super("Color Cycle", "Do a color cycle", target, attributes);
        this._fadeTime = attributes.transitionMs || 5000;
        this._brightness = attributes.brightnessPercent || 100;
        this._on = attributes.on;
    }

    async generate(globalTransitionMs?: number, globalBrightnessPct?: number): Promise<Map<Target, LightStateAttributes>> {
        let ret = new Map<Target, LightStateAttributes>();
        let offset = 0;
        for (const target of this.targets) {
            let color = this._currentColor + offset++;
            if (color >= this._colors.length) { color = color - this._colors.length; }

            const brightnessPct = globalBrightnessPct || this._brightness || 100;
            const transitionMs = globalTransitionMs || this._fadeTime || 5000;

            const attributes = {
                ...{
                    brightnessPct,
                    transitionMs,
                    colorTemperature: undefined
                },
                ... this._colors[color],
                ...this._on !== undefined ? { on: this._on } : {}
            }
            ret.set(target, attributes);
        }

        if (this._currentColor++ >= this._colors.length) { this._currentColor = 0; }
        return ret;
    }

    sent(): void {
        this._lastChange = Date.now();
    }

    shouldGenerate(): boolean {
        return this._fadeTime < Date.now() - this._lastChange;
    }
}