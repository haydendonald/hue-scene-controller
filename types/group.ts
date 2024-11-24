import { Groups } from "../groups";
import { Target } from "./target";

export class GroupReference implements Target {
    type = "group";
    id: number;
    name: string
    constructor(id: number) {
        this.id = id;
        this.name = Groups.getGroup(id)?.name || `Group ${id}`;
    }
}

export interface Group {
    name: string;
    description: string;
    targets: Target[];
}