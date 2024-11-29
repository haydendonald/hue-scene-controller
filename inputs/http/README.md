# HTTP Input
This input provides control via HTTP requests.

It can be accessed at `<URL>:8080` with the following endpoints:

## Scenes - `/scene`
### GET `/scene`
Get all scenes available (no parameters will get all scenes)
* sceneId - The scene id to get
* sceneName - The scene name to get

## Scene Staging - `/scene/stage`
### GET `/scene/stage`
Get a list of scenes currently staged (this included modifiers)
### POST `/scene/stage`
 Stage a scene (activate it)
 * sceneId (required) - The sceneId to stage
 * priority - What priority to stage with (higher number will put it above other scenes)
 * transitionMs - How long to fade for in milliseconds
 * brightnessPercent - How bright to set the scene in percentage

## Scene Unstaging - `/scene/unstage`
### POST `/scene/unstage`
 Unstage a scene (deactivate it)
 * sceneId (required) - The sceneId to unstage
 * transitionMs - How long to fade out for in milliseconds

## Send - `/scene/send`
### POST `/scene/send`
 Unstage a scene (deactivate it)
 * transitionMs - How long to fade for in milliseconds
 * brightnessPercent - How bright to set the scene in percentage