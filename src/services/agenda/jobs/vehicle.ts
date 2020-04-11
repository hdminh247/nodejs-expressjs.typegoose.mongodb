import Logger from '../../logger';
import { jwtHelper, normalizeError, helpers } from '../../../utils';
import * as moment from 'moment';
import NotificationController from '../../../controllers/notification';

const agendaTitle = '[Agenda]';

export default agenda => {
    const logger = new Logger();

    // Send notification when expired
    agenda.define('SendNotificationExpired', async (job, done) => {
        try {
            logger.info(`${agendaTitle} Job SendNotificationExpired run at ${new Date()}`);
            let data = job.attrs.data;

            // Models
            const { vehicle: vehicleModel } = global.mongoModel;

            const newVehicleData = vehicleModel
                .findOne({ _id: data._id })
                .populate([
                    {
                        path: 'rentBy',
                        model: 'User'
                    }
                ])
                .lean()
                .exec();

            if (newVehicleData.rentBy) {
                const startRentDate = moment(newVehicleData.startRentDate, 'HH:mm DD/MM/YYYY');
                const endRentDate = moment(newVehicleData.endRentDate, 'HH:mm DD/MM/YYYY');

                //To driver
                const notificationMessageToUser = `Your car loan term has ended. Please return the vehicle or contact us if any problem occurs.`;
                const emailMessageToUser = `We would like to inform you that your ${newVehicleData.name} car loan term from ${startRentDate} - to ${endRentDate} has ended. Please return the vehicle to us or contact us if there is an emergency occurs.`;
                await NotificationController.sendNotificationToUsers(
                    [newVehicleData.rentBy._id],
                    notificationMessageToUser,
                    true,
                    null,
                    emailMessageToUser
                );

                //To master
                const notificationMessageToMaster = `The loan term of driver ${newVehicleData.rentBy.firstName} has expired. Please check and contact ${newVehicleData.rentBy.firstName} to get your vehicle back.`;
                const emailMessageToMaster = `${newVehicleData.name} car loan term of driver ${newVehicleData.rentBy.firstName} from ${startRentDate} - to ${endRentDate} has ended. Please contact the ${newVehicleData.rentBy.firstName} driver to get your car back on time.`;
                await NotificationController.sendNotificationToUserWithRole(
                    ['master'],
                    notificationMessageToMaster,
                    true,
                    null,
                    emailMessageToMaster
                );
            }

            done();
        } catch (err) {
            logger.error(`${agendaTitle} [Execute SendNotificationBeforeCheckInTime job failed]' ${err}`);
            done();
        }
    });
};
