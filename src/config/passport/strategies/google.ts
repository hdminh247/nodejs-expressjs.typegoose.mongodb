import * as passport from 'passport';
import * as GoogleStrategy from 'passport-google-oauth20';
import { googleConfig } from '../config';

export default () => {
  passport.use(
    new GoogleStrategy(googleConfig, (req, accessToken, refreshToken, profile, done) => {
      try {
        if (!accessToken) {
          done(null, false);
        }
        done(null, { accessToken, profile, refreshToken });
      } catch (err) {
        done(null, false);
      }
    })
  );
};
