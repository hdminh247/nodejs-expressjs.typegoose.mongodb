import * as express from 'express';

import AuthController from '../controllers/auth';
import AuthMiddleware from '../middlewares/auth';

const authRoute = express.Router();

/*///////////////////////////////////////////////////////////////
/////                  START FACEBOOK LOGIN                 /////
///////////////////////////////////////////////////////////////*/

// Facebook Login
authRoute.route('/facebook')
    .get(AuthController.facebookLogin);

// Facebook login callback
authRoute.route('/facebook/callback')
    .get(AuthController.facebookLoginCallback);
// Facebook login validate accesstoken
authRoute.route('/facebook/validate')
    .post(AuthController.validateFromFacebookToken);


/*///////////////////////////////////////////////////////////////
/////                  STOP FACEBOOK LOGIN                 /////
///////////////////////////////////////////////////////////////*/

/*///////////////////////////////////////////////////////////////
/////                   START GOOGLE LOGIN                  /////
///////////////////////////////////////////////////////////////*/

// Google Login
authRoute.route('/google')
    .get(AuthController.googleLogin);

// Google login callback
authRoute.route('/google/callback')
    .get(AuthController.googleLoginCallback);

// Google login validate accesstoken
authRoute.route('/google/validate')
    .post(AuthController.validateFromGoogleToken);
/*///////////////////////////////////////////////////////////////
/////                   END GOOGLE LOGIN                    /////
///////////////////////////////////////////////////////////////*/

/*///////////////////////////////////////////////////////////////
/////                    START LOCAL LOGIN                 /////
///////////////////////////////////////////////////////////////*/

// Local login
authRoute.route('/signIn')
    .post(AuthController.signIn);

// Local sign up
authRoute.route('/signUp')
    .post(AuthController.signUp);


/*///////////////////////////////////////////////////////////////
/////                     END LOCAL LOGIN                 /////
///////////////////////////////////////////////////////////////*/

// Setup Password
authRoute.route('/setupPassword')
    .post(AuthController.setupPassword);

// Request to reset password
authRoute.route('/requestResetPassword')
    .post(AuthController.requestResetPassword);

// Resend Reset Password
authRoute.route('/resendResetPassword')
    .post(AuthController.resendResetPassword);

// Reset Password
authRoute.route('/resetPassword')
    .post(AuthController.resetPassword);

// Get country list
authRoute.route('/country/list')
    .get(AuthController.getCountryList);



/*///////////////////////////////////////////////////////////////
/////                 START AUTH MIDDLEWARE                 /////
///////////////////////////////////////////////////////////////*/


authRoute.use(AuthMiddleware.isAuthenticated);

// Verify user
authRoute.route('/verifyUser')
    .post(AuthController.verifyUser);

// Confirm verifed OTP
authRoute.route('/verifyUser/confirmOTP')
    .post(AuthController.confirmOtp);

// Resend OTP
authRoute.route('/verifyUser/resendOTP')
    .post(AuthController.resendOtp);

// Confirm driver info
authRoute.route('/verifyUser/driverInfo')
    .post(AuthController.confirmDriverInfo);

// Get driver info question
authRoute.route('/verifyUser/driverInfoQuestion')
    .get(AuthController.getDriverInfoQuestion);

// Get driver info question
authRoute.route('/signUpAsDriver')
    .get(AuthController.signUpAsDriver);

// Logout
authRoute.route('/logout')
    .put(AuthController.logout);

// Logout
authRoute.route('/changePassword')
    .put(AuthController.changePassword);


/*///////////////////////////////////////////////////////////////
/////                 END AUTH MIDDLEWARE                 /////
///////////////////////////////////////////////////////////////*/

export default authRoute;