import * as passportLocal from 'passport-local';
import * as passport from 'passport';
import { normalizeError } from '../../../utils';

const LocalStrategy = passportLocal.Strategy;

export default () => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true,
      },
      async (req, email, password, done) => {
        try {
          const { user: userModel } = global.mongoModel;
          const { body: data } = req;

          // Default validation
          let loginValidationType = 'signInWithEmail';
          let errorCode = 'email.not.existed';

          // Login by username
          // if(data.email.indexOf('@') === -1){
          //     loginValidationType = 'signInWithUsername';
          //     errorCode = 'username.not.existed'
          // }

          // Validate input data for sign in
          const validateResults = await userModel.validateData([loginValidationType], { email, password });

          // Parse error list form validation results
          const errorList = normalizeError(validateResults);

          // Error
          if (errorList.length > 0) {
            return done({
              errors: errorList
            }, null);
          }

          // Find user by email
          const rs = await userModel.findOne({ $or: [{ email }, { username: email }], isDeleted: { $exists: false } }).lean().exec();

          // Check if user already login
          // if (!_.isEmpty(rs.token)){
          //     return done({
          //         errors: ['token.existed']
          //     },null);
          // }

          // Check email existed or not
          if (!rs) {
            return done({
              errors: [errorCode]
            }, null);
          }


          // Check if matched password
          const isMatch = await userModel.validatePassword(password, rs.password);

          // Not matched password, callback error
          if (!isMatch) {
            return done({
              errors: ['password.not.matched']
            }, null);
          }

          // Remove password property
          delete rs.password;

          return done(null, {
            data: rs
          });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};
