// Facebook config
export const facebookConfig = {
  clientID: process.env.SOCIAL_FACEBOOK_CLIENT_ID,
  clientSecret: process.env.SOCIAL_FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.SOCIAL_FACEBOOK_CALLBACK_URL,
  passReqToCallback: process.env.SOCIAL_FACEBOOK_PASS_REQ_TO_CALLBACK === 'true',
  profileFields: process.env.SOCIAL_FACEBOOK_PROFILE_FIELDS.split(',')
};

// Twitter config
export const twitterConfig = {
    consumerKey: process.env.SOCIAL_TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.SOCIAL_TWITTER_SECRET,
    callbackURL: process.env.SOCIAL_TWITTER_CALLBACK_URL,
    passReqToCallback: process.env.SOCIAL_TWITTER_PASS_REQ_TO_CALLBACK === 'true'
};

// Instagram config
export const instagramConfig = {
    clientID: process.env.SOCIAL_INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.SOCIAL_INSTAGRAM_CLIENT_SECRET,
    callbackURL: process.env.SOCIAL_INSTAGRAM_CALLBACK_URL,
    passReqToCallback: process.env.SOCIAL_INSTAGRAM_PASS_REQ_TO_CALLBACK === 'true',
};

// Google config
export const googleConfig = {
    clientID: process.env.SOCIAL_GOOGLE_CLIENT_ID,
    clientSecret: process.env.SOCIAL_GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.SOCIAL_GOOGLE_CALLBACK_URL,
    passReqToCallback: process.env.SOCIAL_GOOGLE_PASS_REQ_TO_CALLBACK === 'true',
    scope: process.env.SOCIAL_GOOGLE_SCOPES.split(',')
};

// Linkedin config
export const linkedinConfig = {
  consumerKey: '81qlarzdgliej0',
  consumerSecret: 'nFqQA3zkYMjZMtgk',
  callbackURL: '/auth/linkedin/callback',
  passReqToCallback: true,
  profileFields: [ 'id', 'first-name', 'last-name', 'email-address', 'headline' ]
};