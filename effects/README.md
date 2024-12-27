# Effects
Effects can be placed on a target or group using the `effect` parameter. An example scene can be seen below which will do a `Color Cycle` on a group of lights.
```json
{
    "id": 1,
    "name": "Color Cycle",
    "description": "Do a color cycle across the lights",
    "attributes": {
        "states": [
            {
                "targets": [
                    {
                        "name": "All Lights",
                        "type": "group",
                        "id": 1
                    }
                ],
                "attributes": {
                    "effect": "Color Cycle"
                }
            }
        ]
    }
}
```
## Controller Specific Effects
If you know an effect that is supported by the controller (hue) this can be used as well, it will be requested on the bulb directly

## Color Cycle - `Color Cycle`
Do a RGB cycle
- `transitionMS` will set how long to fade between colors
- `brightnessPercent` will set the brightness