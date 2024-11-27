import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import { Logger } from "./logger";
import multer from "multer";

export enum WebStatus {
    SUCCESS = "success",
    ERROR = "error",
}
export class WebResponse {
    status: WebStatus;
    message?: any;
    constructor(status: WebStatus, message?: any) {
        this.status = status;
        this.message = message;
    }
}

export class WebServer {
    static _instance: WebServer;
    private _server: express.Application;
    private _upload: multer.Multer;

    private static get instance() {
        if (!WebServer._instance) { WebServer._instance = new WebServer(); }
        return WebServer._instance
    }

    private get port(): number {
        return 8080;
    }

    static get server() {
        return WebServer.instance._server;
    }

    constructor() {
        this._server = express();
        this._upload = multer();
        this._server.use(bodyParser.urlencoded({ extended: true }));
        this._server.use(bodyParser.json());
        this._server.use(this._upload.none()); 
        this._server.listen(this.port, () => {
            Logger.info(`Started web server on port ${this.port}`);
        });
    }
}