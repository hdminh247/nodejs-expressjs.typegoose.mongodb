import * as passport from 'passport';
import * as TwitterStrategy from 'passport-twitter';
import { twitterConfig } from '../config';

export default () => {
  passport.use(
    new TwitterStrategy(twitterConfig, async (req, accessToken, refreshToken, profile, done) => {
      try {
        if (!accessToken) {
          done(null, false);
        }
        done(null, {
          accessToken,
          profile,
          refreshToken
        });
      } catch (err) {
        done(null, false);
      }
    })
  );
};
