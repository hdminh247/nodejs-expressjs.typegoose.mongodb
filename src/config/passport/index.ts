import * as passport from 'passport';
import * as session from 'express-session'
import localStrategy from './strategies/local';
import facebookStrategy from './strategies/facebook';
import twitterStrategy from './strategies/twitter';
import instagramStrategy from './strategies/instagram';
import googleStrategy from './strategies/google';
import linkedinStrategy from './strategies/linkedin';

const passportStrategies =  app => {

    app.use(session({ secret: 'SECRET' })); // Session middleware, enable this if you are using twitter passport or any service requires OAuth 1.0
    app.use(passport.initialize());
    app.use(passport.session()); // Enable this if you are using twitter passport or any service requires OAuth 1.0

    // Init strategy for local authentication
    localStrategy();

    // Init strategy for facebook authentication
    facebookStrategy();

    // Init strategy for google authentication
    googleStrategy();

    // Init strategy for twitter authentication
    //twitterStrategy();

    // Init strategy for instagram authentication
    //instagramStrategy();

    // Uncomment passport service that you want
    // googleStrategy();
    // linkedinStrategy();
};

export default passportStrategies;
