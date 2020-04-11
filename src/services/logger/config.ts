const config = {
    debug: {
        appenders: {
            app: {
                type: 'file',
                filename: 'logs/debug.log',
                maxLogSize: 10 * 1024 * 1024, // = 10Mb
                numBackups: 5, // keep five backup files
                compress: true, // compress the backups
                encoding: 'utf-8',
                mode: parseInt('0640', 8),
            },
            errorFile: {
                type: 'file',
                filename: 'logs/errors.log',
                maxLogSize:  1024 * 1024,
                numBackups: 5,
                compress: true,
                encoding: 'utf-8',
            },
            error: {
                type: 'logLevelFilter',
                level: 'ERROR',
                appender: 'errorFile'
            }

        },
        categories: {
            default: { 'appenders': ['app', 'error'], 'level': 'DEBUG' }
        }
    }
};


export default config