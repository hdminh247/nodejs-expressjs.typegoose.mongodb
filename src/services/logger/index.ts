import * as log4js from 'log4js';
import config from './config';

enum LogAction {
    trace = 'trace',
    debug = 'debug',
    info = 'info',
    warn = 'warn',
    error = 'error',
    fatal = 'fatal'
}

export default class Logger {
    constructor(){
        log4js.configure(config.debug);
    }

    public info(message: string): void{
         this.executeLog(LogAction.info, 'app', message);
    }

    public debug(message: string): void{
        console.log(`----- [LOG]: ${message}`);
        this.executeLog(LogAction.debug, 'app', message);
    }

    public warn(message: string): void{
        this.executeLog(LogAction.warn, 'app', message);
    }

    public error(message: string): void{
        this.executeLog(LogAction.error, 'error', message);
    }

    public fatal(message: string): void{
        this.executeLog(LogAction.fatal, 'app', message);
    }

    private executeLog(actionKey: LogAction, category: string, message: string): void{
        let logger = log4js.getLogger(category);
        logger[actionKey](message);
    }
}