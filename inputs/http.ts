import { Input } from "../input";
import express, { Express, Request, Response } from "express";
import { WebResponse, WebServer, WebStatus } from "../webServer";
import { Scenes } from "../scenes";
import { Scene } from "../types/scene";
import { Logger } from "../logger";

export abstract class HTTPRequest {
    abstract validate(): void;
}

export class HTTPGetSceneRequest implements HTTPRequest {
    sceneId?: number;
    sceneName?: string;
    constructor(body: any) {
        this.sceneId = body?.sceneId;
        this.sceneName = body?.sceneName;
    }
    validate(): void {
        if (this.sceneId === undefined && this.sceneName === undefined) { throw "Must provide sceneId or sceneName"; }
    }
}

export class HTTPStageSceneRequest implements HTTPRequest {
    sceneId: number;
    priority?: number;
    transitionTimeMs?: number;
    brightnessPercent?: number;
    constructor(body: any) {
        this.sceneId = body?.sceneId !== undefined ? parseInt(body?.sceneId) : -1;
        this.priority = body?.priority !== undefined ? parseInt(body?.priority) : undefined;
        this.transitionTimeMs = body?.transitionTimeMs !== undefined ? parseInt(body?.transitionTimeMs) : undefined;
        this.brightnessPercent = body?.brightnessPercent !== undefined ? parseInt(body?.brightnessPercent) : undefined;
    }
    validate(): void {
        if (this.sceneId === undefined || this.sceneId == -1) { throw "No sceneId provided"; }
        if (typeof this.sceneId !== "number") { throw "sceneId must be a number"; }
    }
}

export class HTTPSendSceneRequest implements HTTPRequest {
    transitionTimeMs?: number;
    brightnessPercent?: number;
    constructor(body: any) {
        this.transitionTimeMs = body?.transitionTimeMs !== undefined ? parseInt(body?.transitionTimeMs) : undefined;
        this.brightnessPercent = body?.brightnessPercent !== undefined ? parseInt(body?.brightnessPercent) : undefined;
    }
    validate(): void { }
}

export class HTTPInput implements Input {
    constructor() {

        //Get a scene
        WebServer.server.get("/scene", async (req: Request, res: Response) => {
            const request = new HTTPGetSceneRequest(req.body);
            Logger.debug(`Received get scene request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            const sceneId: number | undefined = request.sceneId == undefined ? Scenes.getSceneId(request.sceneName || "") : undefined;
            const scene: Scene | undefined = sceneId !== undefined ? Scenes.getScene(sceneId) : undefined;

            if (!scene) { res.status(501).send(new WebResponse(WebStatus.ERROR, "scene not found")); return; }
            res.send(new WebResponse(WebStatus.SUCCESS, scene));
        });

        //Get the current staged scenes
        WebServer.server.get("/scene/stage", async (req: Request, res: Response) => {
            Logger.debug(`Received get staged scenes request`);
            res.send(new WebResponse(WebStatus.SUCCESS, Scenes.activeScenes));
        });

        //Stage a scene
        WebServer.server.post("/scene/stage", async (req: Request, res: Response) => {
            const request = new HTTPStageSceneRequest(req.body);
            Logger.debug(`Received set stage scene request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            try {
                await Scenes.stageScene(request.sceneId, request.priority, request.transitionTimeMs, request.brightnessPercent);
                res.send(new WebResponse(WebStatus.SUCCESS));
            }
            catch (e) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); }
        });

        //Get the current unstaged scenes
        WebServer.server.get("/scene/unstage", async (req: Request, res: Response) => {
            Logger.debug(`Received get unstaged scenes request`);
            res.send(new WebResponse(WebStatus.SUCCESS, Array.from(Scenes.scenes.keys()).filter(id => !Scenes.activeScenes.has(id))));
        });

        //Unstage a scene
        WebServer.server.post("/scene/unstage", async (req: Request, res: Response) => {
            const request = new HTTPStageSceneRequest(req.body);
            Logger.debug(`Received unstage scene request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            await Scenes.unstageScene(request.sceneId);
            res.send(new WebResponse(WebStatus.SUCCESS));
        });

        //Send scenes
        WebServer.server.post("/scene/send", async (req: Request, res: Response) => {
            const request = new HTTPSendSceneRequest(req.body);
            Logger.debug(`Received send scenes request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            await Scenes.sendScenes(request.transitionTimeMs, request.brightnessPercent);
            res.send(new WebResponse(WebStatus.SUCCESS));
        });
    }
}