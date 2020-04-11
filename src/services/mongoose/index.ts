import * as mongoose from 'mongoose';
import Logger from '../logger';
import {default as initModel} from "../../models";

export default class MongoDb {
    private mongoose: mongoose;
    private serverConfigs: any;
    private dbConfigs: any;
    private isDisconnected: boolean;
    private logger: Logger;
    private masterConnection: any;
    private tenantCode: string = null;

    constructor(dbConfigs: object, serverConfigs: object, tenantCode?: string){
        this.mongoose = mongoose;
        // Store this mongoose instance
        global.mongoose = this.mongoose;
        this.isDisconnected = false;
        this.serverConfigs = serverConfigs;
        this.dbConfigs = dbConfigs;
        this.logger = global.logger;
        if(tenantCode){
            this.tenantCode = tenantCode;
        }
    }

    // Create the connection
    public async createConnection(): Promise<object>{
        try {
            // Create the master connection to database
            this.masterConnection = await this.mongoose.createConnection(this.dbConfigs.dbUri, this.serverConfigs);

            // Log connection status
            switch(this.masterConnection.readyState){
                case 0: {
                    this.logger.info(`Disconnected to :  ${this.dbConfigs.dbUri}`);
                    break;
                }

                case 1: {
                    this.logger.info(`Connected to :  ${this.dbConfigs.dbUri}`);
                    break;
                }

                case 2: {
                    this.logger.info(`Connecting to :  ${this.dbConfigs.dbUri}`);
                    break;
                }

                case 3: {
                    this.logger.info(`Disconnecting to :  ${this.dbConfigs.dbUri}`);
                    break;
                }
            }

            // Create listener on master connection
            this.onConnectionListener(this.masterConnection);


            //Use another tenant  without creating additional connections
            const currentTenantConnection = this.masterConnection.useDb(this.tenantCode ? this.tenantCode : this.dbConfigs.defaultTenantCode);

            this.logger.info(`Connected to tenant:  ${this.dbConfigs.defaultTenantCode}`);

            // Create error listener on this tenant
            currentTenantConnection.on('error', err => {
                this.errorHandler(err);
            });

            // Store this tenants
            let tenants = {};
            tenants[this.dbConfigs.tenantCode] = currentTenantConnection;

            return {
                masterConnection: this.masterConnection,
                currentTenantConnection,
                tenants,
            };
        } catch (err) {
            this.logger.error(err.message);

            return {};
        }
    }

    // Get tenant connection by tenant code
    public async getTenantConnectionByTenantCode(code: string, connections: MongoConnection): Promise<any>{
        let connection;
        let isNew = false;
        // If connection to this db already opened
        if(connections.tenants[code]){
            connection = connections.tenants[code];
        }else{ // If not, switch to the new one
            isNew = true;
            connection = this.masterConnection.useDb(code);
        }

        return {
            connection,
            isNew
        };
    }

    // Update current connection by the new one by code
    public async updateCurrentConnectionByTenantCode(code: string, connections: MongoConnection): Promise<MongoConnection>{
        // Get new connection
        const {connection, isNew} = await this.getTenantConnectionByTenantCode(code, connections);


        // Update
        connections.currentTenantConnection = connection;
        connections.tenants[code] = connection;

        return isNew
    }

    // Connection listener
    private onConnectionListener(connection: any) : void{

        connection.on('error', err => {
            this.errorHandler(err)
        });

        connection.on('connected', () => {
            try {
                this.logger.info(`Connection created`);
                if (this.isDisconnected) {
                    this.isDisconnected = false;
                    process.send({
                        type: 'reload',
                    });
                }
            } catch (err) {
                this.logger.info(err.message);
            }
        });

        connection.on('disconnected', () => {
            try {
                this.logger.info('Connection disconnected! - Reconnect in ' + this.serverConfigs.reconnectInterval / 1000 + ' secs...');
                // Reconnect to mongo
                this.isDisconnected = true;

                setTimeout(() => {
                    this.createConnection();
                }, this.serverConfigs.reconnectInterval);


            } catch (err) {
                this.logger.error(err.message);
            }
        });

        connection.on('reconnected', () => {
            this.logger.info('MongoDB reconnected!');
        });

        connection.on('reconnecting', () => {
            this.logger.info('Reconnecting...!');
        });
    }

    // Error handler
    private errorHandler(err): void{
        this.logger.error(err);
    }
}