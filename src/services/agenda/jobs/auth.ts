import Logger from '../../logger';
import AuthController from '../../../controllers/auth';
import AdminController from '../../../controllers/admin';
const agendaTitle = '[Agenda]';

export default agenda => {
    const logger = new Logger();

    // Remove code after 30 minutes
    agenda.define('RemoveOTPCodeAfter30m', (job, done) => {
        try {
            logger.info(`${agendaTitle} Job RemoveResetPasswordCodeAfter1h run at ${new Date()}`);
            let data = job.attrs.data;
            AuthController.removeCodeExpired(data.code, data.type);
            done();

        } catch (err) {
            logger.error(`${agendaTitle} [Execute RemoveResetPasswordCodeAfter1h job failed]' ${err}`);
            done();
        }
    });

    // Remove code after 1h
    agenda.define('RemoveResetPasswordCodeAfter1h', (job, done) => {
        try {
            logger.info(`${agendaTitle} Job RemoveResetPasswordCodeAfter1h run at ${new Date()}`);
            let data = job.attrs.data;

            AuthController.removeCodeExpired(data.code, data.type);

            done();

        } catch (err) {
            logger.error(`${agendaTitle} [Execute RemoveResetPasswordCodeAfter1h job failed]' ${err}`);
            done();
        }
    });

    // Remove code after 24h
    agenda.define('RemoveSetupPasswordCodeAfter24h', (job, done) => {
        try {
            logger.info(`${agendaTitle} Job RemoveSetupPasswordCodeAfter24h run at ${new Date()}`);
            let data = job.attrs.data;

            AuthController.removeCodeExpired(data.code, data.type);

            done();

        } catch (err) {
            logger.error(`${agendaTitle} [Execute RemoveSetupPasswordCodeAfter24h job failed]' ${err}`);
            done();
        }
    });

    // Remove user after 24h
    agenda.define('RemoveUserAfter24h', (job, done) => {
        try {
            logger.info(`${agendaTitle} Job RemoveUserAfter24h run at ${new Date()}`);
            let data = job.attrs.data;

            AdminController.removeUserNotPassword(data._id, data.role);

            done();

        } catch (err) {
            logger.error(`${agendaTitle} [Execute RemoveUserAfter24h job failed]' ${err}`);
            done();
        }
    });
}