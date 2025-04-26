# Smart Light Scene Controller
A controller for controlling smart bulbs using scenes like a traditional lighting desk controller.

The basic idea of this project is to provide "scenes" which combine given factors like priority and time activated to control many smart bulbs.

I have created this project because i wanted an global scene to control all my bulbs to set their color, then activate scenes on top of this to turn them on/off. This simplifies my control methods as my entire setup can have the same color (which changes throughout the day) but each area overrides this providing individual room control.

Below is an example of how my scenes are laid out, they get combined based on if the scene is active and it's priority

![alt text](<./img/example.png>)

# Features
* Create scenes
* Scene priority
* Agnostic light type (Multiple bulb brands can be grouped together and act generically)
* Light groups
* Effects

# Supported Lights
* Hue

# Supported Control Methods
* HTTP