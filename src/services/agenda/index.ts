import * as AgendaInstance from 'agenda';
import Logger from '../logger';
import { default as initJobs } from './jobs';

const agendaTitle = '[Agenda]';

export default class Agenda {
    agenda: AgendaInstance;
    logger: Logger;

    constructor() {
        const { agenda } = global.configs;
        this.logger = new Logger();

        try {
            // Init agenda instance
            this.agenda = new AgendaInstance({
                db: {
                    address: agenda.dbUri,
                    collection: 'scheduleJobs',
                    options: {
                        useNewUrlParser: true
                    }
                },
            });

            // Init jobs
            initJobs(this.agenda);

            // Agenda ready listener
            this.agenda.on('ready', () => {
                // Start
                this.agenda.start();
                this.logger.info(`${agendaTitle} Started at' ${new Date()}`);

                this.agenda.on('start', job => {
                    this.logger.info(`${agendaTitle} Job %s starting' ${job.attrs.name}`);
                });
                this.agenda.on('fail', (err, job) => {
                    this.logger.error(`${agendaTitle} Job failed with error:' ${err.message}`);
                });
            });

            // Agenda error listener
            this.agenda.on('error', () => {
                this.logger.error(`${agendaTitle} Error:' ${new Date()}`);
            });
        } catch (e) {
            this.logger.error(`${agendaTitle} Unable to connect to Mongo from Agenda`);
        }

    }
}