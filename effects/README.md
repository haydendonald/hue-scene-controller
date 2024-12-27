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

## Natural Light - `Natural Light`
Set the color temperature of the lights to white during the day and warm white at night
- `transitionMS` time to fade on/off (will always fade between colors at 60 minutes)
- `brightnessPercent` will set the brightness

The scene will set the color temperatures as follows:
- 9pm - 6am: 2000K
- 6am - 9am: 2700K
- 9am - 6pm: 4000K
- 6pm - 9pm: 2700K

## Night Light - `Night Light`
Set the brightness of the lights to be duller at night
- `transitionMS` time to fade on/off (will always fade between colors at 60 minutes)
- `brightnessPercent` the minimum brightness to reach

The scene will set the brightness as follows:
- 9pm - 6am: 5%
- 6am - 9am: 70%
- 9am - 6pm: 100%
- 6pm - 9pm: 70%