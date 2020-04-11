import * as express from 'express';

import UserController from '../controllers/user';
import AuthMiddleware from '../middlewares/auth';
import Proprocess from '../middlewares/preprocess';
import ContentController from '../controllers/content';
import NotificationController from '../controllers/notification';

const userRoute = express.Router();

/*///////////////////////////////////////////////////////////////
/////                 START AUTH MIDDLEWARE                 /////
///////////////////////////////////////////////////////////////*/

userRoute.use(AuthMiddleware.isAuthenticated);
userRoute.use(Proprocess.removeEmptyString);

// Get/Update user profile
userRoute.route('/profile')
    .get(UserController.getProfile)
    .put(UserController.updateProfile);

// Delete user
userRoute.route('/deleteAccount')
    .delete(UserController.deleteAccount);

// Create address
userRoute.route('/address')
    .post(UserController.createAddress);

// Edit and Delete address
userRoute.route('/address/:id')
    .put(UserController.editAddress)
    .delete(UserController.deleteAddress);

// Get my job list
userRoute.route('/job/list')
    .get(UserController.getMyJobs)

// Get current bookings
userRoute.route('/currentBookings')
    .get(UserController.getCurrentBookings);

// Get history bookings
userRoute.route('/historyBookings')
    .get(UserController.getHistoryBookings);

// Check promotion code
userRoute.route('/applyPromotionCode')
    .get(UserController.applyPromotionCode);

// Get notification list
userRoute.route('/notification/list')
    .get(NotificationController.getNotificationList);

// Mark notification at read
userRoute.route('/notification/markAtRead')
    .put(NotificationController.changeStatusNotification);

// Delete notifications
userRoute.route('/notifications')
    .delete(NotificationController.deleteNotifications);

/*///////////////////////////////////////////////////////////////
/////                  END AUTH MIDDLEWARE                 /////
///////////////////////////////////////////////////////////////*/

export default userRoute;