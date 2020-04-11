import * as passport from 'passport';
import * as FacebookStrategy from 'passport-facebook';
import { facebookConfig } from '../config';

export default () => {
  passport.use(
    new FacebookStrategy(facebookConfig, async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log(`Access token: ${accessToken}`);
        if (!accessToken) {
          done(null, false);
        }
        done(null, { accessToken, profile, refreshToken });
      } catch (err) {
        done(true, err);
      }
    })
  );
};
