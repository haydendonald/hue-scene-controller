export class LogLevel {
    static DEBUG = 0;
    static INFO = 1;
    static WARN = 2;
    static ERROR = 3;
}

export class Logger {
    private static _instance: Logger;
    _logLevel: LogLevel = LogLevel.INFO;

    private logConsole(level: LogLevel, header: string, message: string, styles?: string[]) {
        if (level >= this._logLevel) {
            console.log(`${styles ? styles.join("") : ""}[${header}][${new Date().toLocaleString()}] - ${message}${styles ? "\x1b[0m" : ""}`);
        }
    }

    static setLogLevel(level: LogLevel) {
        if (!Logger._instance) { Logger._instance = new Logger(); }
        Logger._instance._logLevel = level;
    }

    static info(message: string) {
        if (!Logger._instance) { Logger._instance = new Logger(); }
        Logger._instance.logConsole(LogLevel.INFO, "INFO", message, ["\x1b[32m"]);
    }

    static warn(message: string) {
        if (!Logger._instance) { Logger._instance = new Logger(); }
        Logger._instance.logConsole(LogLevel.WARN, "WARN", message, ["\x1b[33m"]);
    }

    static error(message: string) {
        if (!Logger._instance) { Logger._instance = new Logger(); }
        Logger._instance.logConsole(LogLevel.ERROR, "ERROR", message, ["\x1b[31m"]);
    }

    static debug(message: string) {
        if (!Logger._instance) { Logger._instance = new Logger(); }
        Logger._instance.logConsole(LogLevel.DEBUG, "DEBUG", message, ["\x1b[90m"]);
    }
}