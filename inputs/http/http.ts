import { Input } from "../../input";
import express, { Express, Request, Response } from "express";
import { WebResponse, WebServer, WebStatus } from "../../webServer";
import { Scenes } from "../../scenes";
import { Scene } from "../../types/scene";
import { Logger } from "../../logger";

export abstract class HTTPRequest {
    abstract validate(): void;
}

/**
 * Get a scene by id or name
 * <url>?sceneId=1
 * <url>?sceneName=scene1
 */
export class HTTPGetSceneRequest implements HTTPRequest {
    sceneId?: number;
    sceneName?: string;
    constructor(body: any) {
        this.sceneId = body?.sceneId !== undefined ? parseInt(body.sceneId) : undefined;
        this.sceneName = body?.sceneName;
    }
    validate(): void { }
}

/**
 * Stage a scene
 * <url>?sceneId=[id]&priority=[priority]&transitionMs=[timeMS]&brightnessPercent=[0-100%]
 */
export class HTTPStageSceneRequest implements HTTPRequest {
    sceneId: number;
    priority?: number;
    transitionMs?: number;
    brightnessPercent?: number;
    constructor(body: any) {
        this.sceneId = body?.sceneId !== undefined ? parseInt(body?.sceneId) : -1;
        this.priority = body?.priority !== undefined ? parseInt(body?.priority) : undefined;
        this.transitionMs = body?.transitionMs !== undefined ? parseInt(body?.transitionMs) : undefined;
        this.brightnessPercent = body?.brightnessPercent !== undefined ? parseInt(body?.brightnessPercent) : undefined;
    }
    validate(): void {
        if (this.sceneId === undefined || this.sceneId == -1) { throw "No sceneId provided"; }
        if (typeof this.sceneId !== "number") { throw "sceneId must be a number"; }
    }
}

/**
 * Unstage a scene
 * <url>?sceneId=[id]&transitionMs=[timeMS]
 */
export class HTTPUnstageSceneRequest implements HTTPRequest {
    sceneId: number;
    transitionMs?: number;
    constructor(body: any) {
        this.sceneId = body?.sceneId !== undefined ? parseInt(body?.sceneId) : -1;
        this.transitionMs = body?.transitionMs !== undefined ? parseInt(body?.transitionMs) : undefined;
    }
    validate(): void {
        if (this.sceneId === undefined || this.sceneId == -1) { throw "No sceneId provided"; }
        if (typeof this.sceneId !== "number") { throw "sceneId must be a number"; }
    }
}

/**
 * Send scenes
 * <url>?transitionMs=[timeMS]&brightnessPercent=[0-100%]
 */
export class HTTPSendSceneRequest implements HTTPRequest {
    transitionMs?: number;
    brightnessPercent?: number;
    constructor(body: any) {
        this.transitionMs = body?.transitionMs !== undefined ? parseInt(body?.transitionMs) : undefined;
        this.brightnessPercent = body?.brightnessPercent !== undefined ? parseInt(body?.brightnessPercent) : undefined;
    }
    validate(): void { }
}

export class HTTPInput implements Input {
    constructor() {
        //Get a scene
        WebServer.server.get("/scene", async (req: Request, res: Response) => {
            const request = new HTTPGetSceneRequest(req.query);
            Logger.debug(`Received get scene request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            //If there was no sceneId or sceneName provided, return all scenes
            if (request.sceneId == undefined && request.sceneName == undefined) {
                res.send(new WebResponse(WebStatus.SUCCESS, Array.from(Scenes.scenes.values())));
                return;
            }

            //Otherwise return the requested scene
            const sceneId: number | undefined = request.sceneId == undefined ? Scenes.getSceneId(request.sceneName || "") : request.sceneId;
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
            const request = new HTTPStageSceneRequest(req.query);
            Logger.debug(`Received set stage scene request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            try {
                await Scenes.stageScene(request.sceneId, request.priority, request.transitionMs, request.brightnessPercent);
                res.send(new WebResponse(WebStatus.SUCCESS));
            }
            catch (e) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); }
        });
        
        //Unstage a scene
        WebServer.server.post("/scene/unstage", async (req: Request, res: Response) => {
            const request = new HTTPUnstageSceneRequest(req.query);
            Logger.debug(`Received unstage scene request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            await Scenes.unstageScene(request.sceneId, request.transitionMs);
            res.send(new WebResponse(WebStatus.SUCCESS));
        });

        //Send scenes
        WebServer.server.post("/scene/send", async (req: Request, res: Response) => {
            const request = new HTTPSendSceneRequest(req.query);
            Logger.debug(`Received send scenes request: ${JSON.stringify(request)}`);

            //Validate the request
            try { request.validate(); }
            catch (e: any) { res.status(501).send(new WebResponse(WebStatus.ERROR, e)); return; }

            await Scenes.sendScenes(request.transitionMs, request.brightnessPercent);
            res.send(new WebResponse(WebStatus.SUCCESS));
        });
    }
}