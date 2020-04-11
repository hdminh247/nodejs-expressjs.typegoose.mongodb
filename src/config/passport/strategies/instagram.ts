import * as passport from 'passport';
import * as InstagramStrategy from 'passport-instagram';
import { instagramConfig } from '../config';

export default () => {
    passport.use(
        new InstagramStrategy(instagramConfig, async (req, accessToken, refreshToken, profile, done) => {
            try {
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
