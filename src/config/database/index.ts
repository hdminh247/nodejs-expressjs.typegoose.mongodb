export default ()=>{
    return {
        general: {
            dbUri: process.env.MONGO_DB_URI,
            defaultTenantCode: process.env.DEFAULT_TENANT_CODE
        },
        server: {
            useNewUrlParser: true,
            auto_reconnect: true,
            reconnectInterval: 30000, // milliseconds to retry connection
            reconnectTries: Infinity,
            socketOptions: {
                keepAlive: 10000,
                connectTimeoutMS: 50000,
            },
        }
    }
}