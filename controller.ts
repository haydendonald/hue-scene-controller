import { LightStateAttributes } from "./types/lightState";
import { Target } from "./types/target";

export abstract class Controller {
    /**
     * Load any configuration required from file
     */
    abstract load(): Promise<void>;

    /**
     * Save any configuration required to file
     */
    abstract save(): Promise<void>;

    /**
     * Authorize the controller
     */
    abstract authorize(): Promise<void>;

    /**
     * Connect to the controller
     */
    abstract connect(): Promise<void>;

    /**
     * Que a target to be controlled. Return true if this controller was responsible for the target
     * @param target The target to add to the queue
     */
    abstract queueTarget(target: Target, attributes: LightStateAttributes): boolean;

    /**
     * Send all queued targets
     */
    abstract sendQueuedTargets(): Promise<void>;
}