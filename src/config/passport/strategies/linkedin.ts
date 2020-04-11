import passport from 'passport';
import LinkedInStrategy from 'passport-linkedin';
import { linkedinConfig } from '../config';

export default () => {
  passport.use(
    new LinkedInStrategy(linkedinConfig, async (req, accessToken, refreshToken, profile, done) => {
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
