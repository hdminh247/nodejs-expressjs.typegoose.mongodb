import { default as env } from './env';

import { default as config } from '../config';
import { default as initModel } from '../models';
import MongoDb from '../services/mongoose';
import Logger from '../services/logger';
import i18nService from '../services/i18n';

const initGlobalVariables = async () => {
    // Config data
    global.configs = config();
    // Env data
    global.env = env();
    // Logger service
    global.logger = new Logger();
    // i18n service
    global.i18n =  new i18nService(global.configs.i18n, global.env.mode);

    /*///////////////////////////////////////////////////////////////
   /////                START DATABASE CONFIG                  /////
   ///////////////////////////////////////////////////////////////*/


    const { database } = global.configs;

    // Create mongo instance, config is read from .env as default
    global.mongoInstance = new MongoDb(database.general, database.server);

    // Create mongo connection, store it in global variable
    global.connections =  await global.mongoInstance.createConnection();

    // Init models base on current default tenant
    global.mongoModel = initModel(global.connections.currentTenantConnection);

    /*///////////////////////////////////////////////////////////////
    /////                  END DATABASE CONFIG                  /////
    ///////////////////////////////////////////////////////////////*/

    return global;

};

export default initGlobalVariables

