import Logger from '../../logger';
import { jwtHelper, normalizeError, helpers } from '../../../utils';
import JobController from '../../../controllers/job';
import NotificationController from '../../../controllers/notification';

const agendaTitle = '[Agenda]';

export default agenda => {
    const logger = new Logger();

    // Send notification before check in time 15 minutes
    agenda.define('SendNotificationBeforeCheckInTime', async (job, done) => {
        try {
            logger.info(`${agendaTitle} Job SendNotificationBeforeCheckInTime run at ${new Date()}`);
            let data = job.attrs.data;

            // Models
            const { job: jobModel, activity: activityModel, activityCategory: activityCategoryModel } = global.mongoModel;

            // Get new job data
            const newJobData = await jobModel.findOne({ _id: data._id }).populate('status').lean().exec();

            // Get jobStatus
            const jobStatusKey = helpers.getArrayByField(newJobData.status, 'key');

            // Check job not have request
            if (newJobData.jobRequests.length === 0 && !jobStatusKey.includes('canceled')) {
                const message = `Offer #${data.jobId} - We're afraid that your offer didn't receive any request from Driver. Please review the link below to find out recommended location.`

                // Get data of activity cancel
                const activityCategoryData = await activityCategoryModel.findOne({ type: 'canceled_before15minutes' }).lean().exec();

                // Activity data 
                const nextActivity = await activityModel.create({
                    job: newJobData._id,
                    data: [{
                        _id: newJobData._id,
                        firstName: 'Offer',
                        lastName: '#' + newJobData.jobId,
                        type: null
                    }],
                    activity: activityCategoryData
                })

                // Cancel job and send notification
                await JobController.cancelJobAndSendMessage(data._id.toString(), message, nextActivity, await helpers.getRecommendLocationUrl(data._id));
            }

            done();

        } catch (err) {
            logger.error(`${agendaTitle} [Execute SendNotificationBeforeCheckInTime job failed]' ${err}`);
            done();
        }
    });

    // Send notification If it is check-in time but the customer didn't accept any request.
    agenda.define('SendNotificationNotAcceptedRequest', async (job, done) => {
        try {
            logger.info(`${agendaTitle} Job SendNotificationBeforeCheckInTime run at ${new Date()}`);
            let data = job.attrs.data;


            // Models
            const { job: jobModel, activity: activityModel, activityCategory: activityCategoryModel } = global.mongoModel;

            // Get new job data
            const newJobData = await jobModel.findOne({ _id: data._id }).populate('status').lean().exec();

            // Check job has accepted already
            const jobStatusKey = helpers.getArrayByField(newJobData.status, 'key');

            if (!jobStatusKey.includes('accepted') && !jobStatusKey.includes('canceled')) {
                let message = `Offer #${data.jobId} - We would like to inform you that it is check in time. However, you didn't accept any request from Driver. We're afraid that we have to cancel your booking.`
                let type = 'canceled_checkin'
                if (data.category.allowSubCategory) {
                    message = `Offer #${data.jobId} - We would like to inform you that it is check in time. However, your offer is not accepted by Thai Mobility. We're afraid that we have to cancel your booking.`
                    type = 'canceled_checkin_racecourse'
                }

                // Get data of activity cancel
                const activityCategoryData = await activityCategoryModel.findOne({ type }).populate([
                    {
                        path: 'createdBy',
                        model: 'User'
                    }
                ]).lean().exec();

                // Activity data 
                const nextActivity = await activityModel.create({
                    job: newJobData._id,
                    data: [{
                        _id: newJobData._id,
                        firstName: 'Offer',
                        lastName: '#' + newJobData.jobId,
                        type: null
                    },
                    {
                        _id: newJobData.createdBy._id,
                        firstName: newJobData.createdBy.firstName,
                        lastName: newJobData.createdBy.lastName,
                        type: 'customer'
                    }],
                    activity: activityCategoryData
                })

                // Cancel job and send notification
                await JobController.cancelJobAndSendMessage(data._id.toString(), message, nextActivity);
            }


            done();

        } catch (err) {
            logger.error(`${agendaTitle} [Execute SendNotificationBeforeCheckInTime job failed]' ${err}`);
            done();
        }
    });
}