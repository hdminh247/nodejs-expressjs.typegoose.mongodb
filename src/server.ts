import * as express from 'express';
import * as bodyParser from 'body-parser';
import 'reflect-metadata';
import * as cors from "cors";
import * as swaggerUi from 'swagger-ui-express';
import * as swaggerJSDoc from 'swagger-jsdoc';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from 'morgan';
import { Seeder } from 'mongo-seeding';
import * as dotenv from 'dotenv';
import * as http from 'http';
import * as AgendaInstance from 'agenda';
import * as AgendashInstance from 'agendash';

import initGlobalVariables from './constants';
import HttpResponse from './services/response';
import Logger from './services/logger';
import CustomResponse from './services/response/customResponse';
import SeederHelper from './services/seeder';

import { default as initModel } from "./models";

/** Rotation is based on copying the file contents and then truncating the file size to 0.
 *  This way we avoid file renaming problems where programs are not always prepared to handle a log file being renamed.
 */

import * as  logrotate from 'logrotator';
const rotator = logrotate.rotator;

// Load environment variables from .env file
dotenv.config();

import SocketIO from './services/socket.io';
import Agenda from './services/agenda';

// Import passport strategies
import passportStrategies from './config/passport';


(async () => {

    // Init global variables
    await initGlobalVariables();

    // DB seeders
    const seederHelper = new SeederHelper();
    seederHelper.run();

    // Create Express server
    const app = express();

    // Express configuration
    app.all('/*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        next();
    });

    // Request body parser
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));


    // Enable CORS
    app.use(cors());

    // Middleware to check tenant code
    app.use(async (req, res, next) => {
        let tenantCode = req.get('code');
        if (tenantCode) {
            // Update current connection by the new one
            // NOTE THAT SWITCHING TENANT DB WILL AFFECT TO ALL REQUEST FROM NOW ON
            await global.mongoInstance.updateCurrentConnectionByTenantCode(tenantCode, global.connections);

            // Re init model base on the new connection
            global.mongoModel = initModel(global.connections.currentTenantConnection);
        }

        next();

    });

    // Import public routers
    const initPublicRouter = await import('./routes');
    initPublicRouter(app);

    // Set template engine
    app.set('views', 'src/views');
    app.set('view engine', 'hbs');

    /*///////////////////////////////////////////////////////////////
    /////                   START LOGS CONFIG                  /////
    ///////////////////////////////////////////////////////////////*/

    // For production, access logs keep all logs about http requests, including error logs
    if (process.env.NODE_ENV === 'development') {

        // Create log directory
        const logDirectory = path.resolve('logs');
        fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

        // Define directory to write access logs
        const logPath = path.join(process.cwd(), '/logs/access.log');
        const accessLogStream = fs.createWriteStream(logPath, { flags: 'a' });
        app.use(logger('combined', { stream: accessLogStream }));

        // Check file rotation every 30 minutes, and rotate the file if its size exceeds 10 mb.
        // Keep only 3 rotated files and compress (gzip) them.
        rotator.register(logPath, { schedule: '30m', size: '10m', compress: true, count: 3 });
        rotator.on('error', function (err) {
            logger('Oops, an error occured!');
        });

        // 'rotate' event is invoked whenever a registered file gets rotated
        rotator.on('rotate', function (file) {
            logger('File ' + file + ' was rotated!');
        });
    }

    // Show method, url, status , response time, res content length in console log
    app.use(logger('dev'));

    /*///////////////////////////////////////////////////////////////
    /////                    END LOGS CONFIG                  /////
    ///////////////////////////////////////////////////////////////*/



    /*///////////////////////////////////////////////////////////////
    /////                 START SWAGGER CONFIG                  /////
    ///////////////////////////////////////////////////////////////*/

    const swaggerDefinition = {
        info: {
            // API informations (required)
            title: 'Thai Mobility APIs', // Title (required)
            version: '1.0.0', // Version (required)
        },
        basePath: '/api', // Base path (optional),
        securityDefinitions: {
            // Enable api key in header, using security: - auth: [] in jsdoc to enable check this
            auth: {
                type: 'apiKey',
                in: 'header',
                name: 'Authorization',
            },
        },
    };

    const options = {
        swaggerDefinition,
        apis: [process.env.NODE_ENV === 'development' ? './build/controllers/*.js' : (process.env.NODE_ENV === 'local' ? './src/controllers/*.ts' : './controllers/*.js')], // <-- not in the definition, but in the options
    };

    const swaggerSpec = swaggerJSDoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    /*///////////////////////////////////////////////////////////////
    /////                  END SWAGGER CONFIG                  /////
    ///////////////////////////////////////////////////////////////*/


    /*///////////////////////////////////////////////////////////////
    /////             START AGENDA DASHBOARD CONFIG             /////
    ///////////////////////////////////////////////////////////////*/

    // Init agenda instance
    const agenda = new AgendaInstance({
        db: {
            address: global.configs.agenda.dbUri,
            collection: 'scheduleJobs',
            options: {
                useNewUrlParser: true
            }
        },
    });
    // Serve agenda dashboard
    app.use('/agenda/dashboard', AgendashInstance(agenda));


    /*///////////////////////////////////////////////////////////////
    /////               END AGENDA DASHBOARD CONFIG             /////
    ///////////////////////////////////////////////////////////////*/


    // Init Passport
    passportStrategies(app);

    /*///////////////////////////////////////////////////////////////
    /////                 START CORS MIDDLEWARE                 /////
    ///////////////////////////////////////////////////////////////*/

    app.use(function (req, res, next) {
        let value = req.get('referer');

        if (!value) {
            value = req.get('origin');
        }

        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, Content-Type, Authorization, REST-API-KEY-HEADER, x-auth-token, switch-company-code'
        );

        // intercept OPTIONS method
        if ('OPTIONS' === req.method) {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    /*///////////////////////////////////////////////////////////////
    /////                 END CORS MIDDLEWARE                 /////
    ///////////////////////////////////////////////////////////////*/



    /*///////////////////////////////////////////////////////////////
    /////                   START STATIC PATH                  /////
    ///////////////////////////////////////////////////////////////*/

    app.use(express.static(path.resolve('public')));
    app.use(express.static(path.resolve('src/views')));

    app.use('/images/', express.static(path.resolve('public/images')));

    // Test socket client
    app.get('/socketClient', function (req, res) {
        res.sendFile(path.join(process.cwd(), '/public/socketClient.html'));
    });

    /*///////////////////////////////////////////////////////////////
    /////                    END STATIC PATH                   /////
    ///////////////////////////////////////////////////////////////*/


    // Catch 404 and forward to error handler
    app.use(function (req, res, next) {
        // Normalize error format
        let error = HttpResponse.returnErrorWithMessage(`Not found: ${req.method} ${req.originalUrl}`);
        // Set error status code
        res.status(404);
        // Pass to the next middleware
        next(error);
    });

    // Step 1:  Write error logs file in production mode
    if (process.env.NODE_ENV === 'development') {
        app.use((err, req, res, next) => {
            const logger = new Logger();
            logger.error(`${res.statusCode} ${req.method} ${req.url} ${err.stack}`);
            next(err)
        });
    }

    // Step 2: Return meaningful error, so there is no stack traces leaked to user
    app.use(function (err, req, res, next) {
        if (err instanceof CustomResponse && res.statusCode !== null) {
            res.json(err);
        } else {
            // Set error status code
            res.status(500);
            HttpResponse.returnInternalServerResponseWithMessage(res, err.message)
        }

    });

    // Create http server with express
    const httpServer = http.createServer(app);

    // Start Express server
    httpServer.listen(process.env.PORT || 3000, () => {
        console.log(("  App is running at http://localhost:%d in %s mode"), process.env.PORT || 3000, app.get("env"));
        console.log("  Press CTRL-C to stop\n");
    });

    // Start socket server
    global.socket = new SocketIO();
    global.socket.run(httpServer);

    // Allow maximum 20 mongo connection listener
    process.setMaxListeners(20);

    // Init agenda
    global.agendaInstance = new Agenda();

})();