import { Request, Response, NextFunction } from 'express';
import 'mongoose';
import * as passport from 'passport';
import * as request from 'request';
import * as moment from 'moment'

import { jwtHelper, normalizeError, helpers } from '../utils';
import { facebookConfig, twitterConfig } from '../config/passport/config';

import ImageService from '../services/image';
import TwillioService from '../services/twilio';
import NodeMailerService from '../services/email';
import HttpResponse from '../services/response';
import CodeController from './code';
import UserController from './user';
import * as mongoose from 'mongoose';
import CompanyController from "./company";
import i18nService from '../services/i18n';

export default class AuthController {
    /**
     * @swagger
     * tags:
     *   - name: Auth
     *     description: Authentication
     */

    /*///////////////////////////////////////////////////////////////
    /////                    START LOCAL LOGIN                 /////
    ///////////////////////////////////////////////////////////////*/

    // Local login

    /**
     * @swagger
     * definitions:
     *   SignIn:
     *     required:
     *       - email
     *       - password
     *     properties:
     *       email:
     *         type: string
     *       password:
     *         type: string
     */

    /**
     * @swagger
     * /v1/auth/signIn:
     *   post:
     *     description: Sign in API
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     parameters:
     *       - in: body
     *         name: body
     *         description: Request body
     *         schema:
     *           $ref: '#definitions/SignIn'
     *           type: object
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    static async signIn(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { user: userModel, code: codeModel, company: companyModel } = global.mongoModel;

            // Local authentication
            passport.authenticate('local', {
                session: false
            }, async (err, rs) => {
                // Error, pass to the next middleware
                if (err) {
                    return HttpResponse.returnUnAuthorizeResponse(res, err.errors);
                }

                // get user data
                let resData = await userModel.findOne({ email: rs.data.email, isDeleted: { $exists: false } }, { token: 0, password: 0, social: 0 })
                    .populate('avatar').lean().exec();

                // If user was deleted
                if (!resData) {
                    return HttpResponse.returnBadRequestResponse(res, 'user.not.exist');
                }

                // Check active of user
                if (resData.active === false) {
                    return HttpResponse.returnBadRequestResponse(res, 'account.inactive');
                }

                //Admin can not access 
                if (req.body.role === 'customer' && !resData.role.includes('customer')) {
                    return HttpResponse.returnBadRequestResponse(res, 'access.invalid');
                }

                // Save current progress
                resData.currentProgress = await AuthController.checkProgressComplete(resData);

                // Update token to user data
                resData.token = await UserController.createTokenForUser(resData._id);

                if (resData.currentProgress === 2) {
                    const codeData = await codeModel.findOne({ userId: resData._id, type: 'verify' }).lean().exec();
                    resData.verifyData = codeData.verifyData;
                }

                //Get company info
                let companyData = await companyModel.findOne({ ownedBy: resData._id });
                if (companyData) {
                    resData.company = companyData;
                }

                //Get avatar url
                if (resData.avatar) {
                    resData.avatar = await helpers.getImageUrl(resData.avatar);
                }

                return HttpResponse.returnSuccessResponse(res, resData);

            })(req, res, next);
        } catch (e) {
            next(e)
        }

    };

    /**
     * @swagger
     * /v1/auth/signUp:
     *   post:
     *     description: Sign up API (by email)
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *       - multipart/form-data
     *     parameters:
     *       - name: firstName
     *         in: formData
     *         paramType: formData
     *         type: string
     *       - name: lastName
     *         in: formData
     *         description: lastName
     *         paramType: formData
     *         type: string
     *       - name: email
     *         in: formData
     *         description: Email
     *         paramType: formData
     *         type: string
     *         required: true
     *       - name: password
     *         in: formData
     *         description: Password
     *         paramType: formData
     *         type: string
     *         required: true
     *       - name: confirmPassword
     *         in: formData
     *         description: Confirm password
     *         paramType: formData
     *         type: string
     *         required: true
     *       - name: role
     *         in: formData
     *         description: Role
     *         paramType: formData
     *         type: string
     *         required: true
     *         enum:
     *              - customer
     *              - company
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */
    static async signUp(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { user: userModel, code: codeModel, company: companyModel } = global.mongoModel;
            const { body: data } = req;

            // Validate input data for signUp
            const validateResults = await userModel.validateData(['signUp'], data);

            // Parse error list form validation results
            const errorList = normalizeError(validateResults);

            // Validation Error
            if (errorList.length > 0) {
                return HttpResponse.returnBadRequestResponse(res, errorList);
            }

            // Check if password and confirm password is matched
            if (data.password !== data.confirmPassword) {
                return HttpResponse.returnBadRequestResponse(res, 'password.confirmPassword.not.matched');
            }

            // Check if whether user existed already
            const existingUser = await userModel.findOne({ email: data.email, isDeleted: { $exists: false } }).lean().exec();

            // Signed up by social
            if (existingUser && !existingUser.signUpCompleted) {
                // Generate the new hash password
                const hashPassword = await helpers.generateHashPassword(data.password);
                // Update the new one
                const resData = await userModel.findOneAndUpdate(
                    { _id: existingUser._id },
                    { password: hashPassword, signUpCompleted: true },
                    { projection: { password: 0, social: 0 }, new: true })
                    .lean().exec();

                // Update token to user data
                resData.token = await UserController.createTokenForUser(resData._id);

                return HttpResponse.returnSuccessResponse(res, resData);
            }

            // Return error
            if (existingUser) {
                return HttpResponse.returnDuplicateResponse(res, 'email.existed')
            }

            //Set subRole company user
            if (data.role === 'company') {
                data.subRole = 'member'
            }

            //Set dob
            if (data.dob) {
                data.dob = new Date(data.dob);
            }

            data.role = [data.role]

            // Add customer role
            if (!data.role.includes('customer')) {
                data.role.push('customer');
            }

            // Create the new user with provided info
            let userData = new userModel(data);

            let resData = await userData.save();
            resData = resData.toObject();

            // Update token to user data
            resData.token = await UserController.createTokenForUser(resData._id);

            //Create company for driver
            if (resData.role.includes('company')) {
                resData.company = await CompanyController.registerCompanyStep1To4(resData);
            }

            //Save current progress
            resData.currentProgress = await AuthController.checkProgressComplete(resData);
            if (resData.currentProgress === 2) {
                const codeData = await codeModel.findOne({ userId: resData._id, type: 'verify' }).lean().exec();
                resData.verifyData = codeData.verifyData;
            }

            // Remove password property
            delete resData.password;

            return HttpResponse.returnSuccessResponse(res, resData)

        } catch (e) {
            next(e)
        }
    };

    /*///////////////////////////////////////////////////////////////
    /////                    END LOCAL LOGIN                   /////
    ///////////////////////////////////////////////////////////////*/




    /*///////////////////////////////////////////////////////////////
    /////                  START FACEBOOK LOGIN                 /////
    ///////////////////////////////////////////////////////////////*/

    // Login by facebook
    /**
     * @swagger
     * /v1/auth/facebook:
     *   get:
     *     description: Url login facebook
     *     tags: [Auth]
     *     parameters:
     *       - name: role
     *         in: query
     *         description: role
     *         type: string
     *         enum:
     *          - customer
     *          - company
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */
    static async facebookLogin(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('facebook', {
            session: false,
            state: req.query.role
        })(req, res, next);
    };

    /**
     * @swagger
     * /v1/auth/facebook/callback:
     *   get:
     *     description: Url login facebook callback
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */
    static async facebookLoginCallback(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('facebook', {
            session: false
        }, async (err, facebookData) => {
            try {
                // Error, pass to the next middleware
                if (err) {
                    return next(err);
                }

                let { profile } = facebookData;
                profile['role'] = req.query.state

                let rs = await AuthController.createUser(profile);

                if (!rs) {
                    return HttpResponse.returnBadRequestResponse(res, 'type.not.exist')
                }

                return HttpResponse.returnSuccessResponse(res, rs)
            } catch (err) {
                return HttpResponse.returnInternalServerResponseWithMessage(res, err.message);
            }
        })(req, res, next);
    }

    /**
     * @swagger
     * definitions:
     *   FacebookVerifyToken:
     *     required:
     *       - accessToken
     *     properties:
     *       accessToken:
     *         type: string
     *       role:
     *         type: string
     *         enum:
     *          - customer
     *          - company
     */

    /**
     * @swagger
     * /v1/auth/facebook/validate:
     *   post:
     *     description: Verify facebook token
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     parameters:
     *       - in: body
     *         name: body
     *         description: Request body
     *         schema:
     *           $ref: '#definitions/FacebookVerifyToken'
     *           type: object
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    // Validate and get user data from facebook token
    static async validateFromFacebookToken(req: Request, res: Response, next: NextFunction): Promise<any> {
        const { body: data } = req;

        // Get client language
        const lang = i18nService.getLangFromRequest(res);

        // Basic configs
        const PROVIDER = 'facebook'; // Provider
        const fields = ['id', 'first_name', 'last_name', 'email', 'birthday', 'picture', 'gender']; // Field scope
        const graphApiUrl = `https://graph.facebook.com/v3.1/me?fields=${fields.join(',')}`; // Prepare APIs
        // Prepare params
        const params = {
            access_token: data.accessToken,
            client_id: facebookConfig.clientID,
            client_secret: facebookConfig.clientSecret,
            redirect_uri: facebookConfig.callbackURL
        };
        try {
            if (!data.accessToken) {
                return HttpResponse.returnInternalServerResponse(res, 'facebook.token.required');
            }

            // Request user profile from facebook APIs by access tokens
            request.get({
                url: graphApiUrl,
                qs: params,
                json: true
            }, async (err, response, profile) => {
                // Validate error from facebook
                if (response.statusCode !== 200) {
                    return HttpResponse.returnUnAuthorizeResponseWithMessage(res, profile.error.message)
                }
                // Update provider
                profile.provider = PROVIDER;

                // Set role for the new user
                profile.role = [data.role];

                // Restruct data
                profile['name'] = {
                    'givenName': profile.first_name,
                    'familyName': profile.last_name
                };
                delete profile.first_name;
                delete profile.last_name;

                // Protocol to get avatar url
                profile['protocol'] = req['protocol']

                // Create the new user
                let rs = await AuthController.createUser(profile, lang);

                if (rs.error) {
                    return HttpResponse.returnBadRequestResponse(res, rs.errors[0].errorMessage);
                }

                // Emit event to all connected admin about the new user
                // await global.socket.sendNewEventToAllConnectedAdmin("userUpdated", null);

                return HttpResponse.returnSuccessResponse(res, rs)
            });
        } catch (e) {
            next(e)
        }
    }

    /*///////////////////////////////////////////////////////////////
    /////                   END FACEBOOK LOGIN                 /////
    ///////////////////////////////////////////////////////////////*/



    /*///////////////////////////////////////////////////////////////
    /////                  START GOOGLE LOGIN                   /////
    ///////////////////////////////////////////////////////////////*/

    /**
     * @swagger
     * /v1/auth/google:
     *   get:
     *     description: Url login google
     *     tags: [Auth]
     *   parameters:
     *       - name: role
     *         in: query
     *         description: role
     *         type: string
     *         enum:
     *          - customer
     *          - company
     *   responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */
    static async googleLogin(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('google', {
            session: false,
            state: req.query.role
        })(req, res, next);
    };

    /**
     * @swagger
     * /v1/auth/google/callback:
     *   get:
     *     description: Url login google callback
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */
    static async googleLoginCallback(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('google', {
            session: false
        }, async (err, googleData) => {
            try {
                // Error, pass to the next middleware
                if (err) {
                    return next(err);
                }
                let { profile } = googleData;
                profile['role'] = req.query.state

                let rs = await AuthController.createUser(profile);

                if (!rs) {
                    return HttpResponse.returnBadRequestResponse(res, 'type.not.exist')
                }

                return HttpResponse.returnSuccessResponse(res, rs)
            } catch (err) {
                return HttpResponse.returnInternalServerResponseWithMessage(res, err.message);
            }
        })(req, res, next);
    }

    /**
     * @swagger
     * definitions:
     *   GoogleVerifyToken:
     *     required:
     *       - accessToken
     *     properties:
     *       accessToken:
     *         type: string
     *       role:
     *         type: string
     *         enum:
     *          - customer
     *          - company
     */

    /**
     * @swagger
     * /v1/auth/google/validate:
     *   post:
     *     description: Verify google token
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     parameters:
     *       - in: body
     *         name: body
     *         description: Request body
     *         schema:
     *           $ref: '#definitions/GoogleVerifyToken'
     *           type: object
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    // Validate and get user data from google token
    static async validateFromGoogleToken(req: Request, res: Response, next: NextFunction): Promise<any> {
        const { body: data } = req;

        // Basic configs
        const PROVIDER = 'google'; // Provider
        const graphApiUrl = `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${data.accessToken}`; // Prepare APIs

        try {
            if (!data.accessToken) {
                return HttpResponse.returnInternalServerResponse(res, 'google.token.required');
            }

            // Request user profile from google APIs by access tokens
            request.get({
                url: graphApiUrl
            }, async (err, response, profile) => {
                // Validate error from google
                if (response.statusCode !== 200) {
                    return HttpResponse.returnUnAuthorizeResponseWithMessage(res, profile)
                }

                // Parse profile data
                profile = JSON.parse(profile);

                // Update provider
                profile.provider = PROVIDER;

                // Set role for the new user
                profile.role = [data.role];

                // Restruct data
                profile['name'] = {
                    'givenName': profile.given_name,
                    'familyName': profile.family_name
                };

                delete profile.given_name;
                delete profile.family_name;

                // Create the new user
                let rs = await AuthController.createUser(profile);

                if (rs.error) {
                    return HttpResponse.returnBadRequestResponse(res, rs.errors[0].errorMessage);
                }

                // Emit event to all connected admin about the new user
                // await global.socket.sendNewEventToAllConnectedAdmin("userUpdated", null);

                return HttpResponse.returnSuccessResponse(res, rs)
            });
        } catch (e) {
            next(e)
        }
    }

    /*///////////////////////////////////////////////////////////////
    /////                    END GOOGLE LOGIN                   /////
    ///////////////////////////////////////////////////////////////*/



    /*///////////////////////////////////////////////////////////////
    /////                  START TWITTER LOGIN                 /////
    ///////////////////////////////////////////////////////////////*/

    // Login by twitter
    static async twitterLogin(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('twitter', {
            session: false
        })(req, res, next);
    };

    // Twitter login callback
    static async twitterLoginCallback(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('twitter', {
            session: true
        }, async (err, twitterData) => {
            try {
                // Error, pass to the next middleware
                if (err) {
                    return next(err);
                }
                const { profile } = twitterData;

                let rs = await AuthController.createUser(profile);

                return HttpResponse.returnSuccessResponse(res, rs)
            } catch (err) {
                return HttpResponse.returnInternalServerResponseWithMessage(res, err.message);
            }
        })(req, res, next);
    }

    // /**
    //  * @swagger
    //  * definitions:
    //  *   TwitterVerifyToken:
    //  *     required:
    //  *       - accessToken
    //  *       - refreshToken
    //  *     properties:
    //  *       accessToken:
    //  *         type: string
    //  *       refreshToken:
    //  *         type: string
    //  *       playerId:
    //  *         type: string
    //  */
    //
    // /**
    //  * @swagger
    //  * /v1/auth/twitter/validate:
    //  *   post:
    //  *     description: Verify twitter token
    //  *     tags: [Auth]
    //  *     produces:
    //  *       - application/json
    //  *     parameters:
    //  *       - in: body
    //  *         name: body
    //  *         description: Request body
    //  *         schema:
    //  *           $ref: '#definitions/TwitterVerifyToken'
    //  *           type: object
    //  *     responses:
    //  *       200:
    //  *         description: Success
    //  *       400:
    //  *         description: Invalid request params
    //  *       401:
    //  *         description: Unauthorized
    //  *       404:
    //  *         description: Resource not found
    //  */

    // Validate and get user data from twitter token
    static async validateFromTwitterToken(req: Request, res: Response, next: NextFunction): Promise<any> {
        const { body: data } = req;

        // Basic configs
        const PROVIDER = 'twitter'; // Provider
        const profileApiUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';
        // Prepare params
        const params = {
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            token: data.accessToken,
            token_secret: data.refreshToken
        };

        try {
            if (!data.accessToken || !data.refreshToken) {
                return HttpResponse.returnInternalServerResponse(res, 'twitter.token.required');
            }

            // Request user profile from facebook APIs by access tokens
            request.get({
                url: profileApiUrl,
                qs: {
                    include_email: true
                },
                oauth: params
            }, async (err, response, profile) => {
                // Validate error from facebook
                if (response.statusCode !== 200 || err) {
                    let { errors } = JSON.parse(profile);
                    return HttpResponse.returnUnAuthorizeResponseWithMessage(res, errors[0].message)
                }

                // Parse json from string response
                profile = JSON.parse(profile);

                // Update provider
                profile.provider = PROVIDER;

                // Set role for the new user
                profile.role = ['customer'];

                // Create the new user
                let rs = await AuthController.createUser(profile);

                // Emit event to all connected admin about the new user
                //await global.socket.sendNewEventToAllConnectedAdmin("userUpdated", null);

                return HttpResponse.returnSuccessResponse(res, rs)
            });
        } catch (e) {
            next(e)
        }
    }

    /*///////////////////////////////////////////////////////////////
    /////                   END TWITTER LOGIN                 /////
    ///////////////////////////////////////////////////////////////*/



    /*///////////////////////////////////////////////////////////////
    /////                 START INSTAGRAM LOGIN                 /////
    ///////////////////////////////////////////////////////////////*/

    // Login by instagram
    static async instagramLogin(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('instagram', {
            session: false
        })(req, res, next);
    };

    // Instagram login callback
    static async instagramLoginCallback(req: Request, res: Response, next: NextFunction): Promise<any> {
        passport.authenticate('instagram', {
            session: false
        }, async (err, instagramData) => {
            try {
                // Error, pass to the next middleware
                if (err) {
                    return next(err);
                }
                const { profile } = instagramData;

                let rs = await AuthController.createUser(profile);

                return HttpResponse.returnSuccessResponse(res, rs)
            } catch (err) {
                return HttpResponse.returnInternalServerResponseWithMessage(res, err.message);
            }
        })(req, res, next);
    }

    // /**
    //  * @swagger
    //  * definitions:
    //  *   InstagramVerifyToken:
    //  *     required:
    //  *       - accessToken
    //  *     properties:
    //  *       accessToken:
    //  *         type: string
    //  *       playerId:
    //  *         type: string
    //  */
    //
    // /**
    //  * @swagger
    //  * /v1/auth/instagram/validate:
    //  *   post:
    //  *     description: Verify instagram token
    //  *     tags: [Auth]
    //  *     produces:
    //  *       - application/json
    //  *     parameters:
    //  *       - in: body
    //  *         name: body
    //  *         description: Request body
    //  *         schema:
    //  *           $ref: '#definitions/InstagramVerifyToken'
    //  *           type: object
    //  *     responses:
    //  *       200:
    //  *         description: Success
    //  *       400:
    //  *         description: Invalid request params
    //  *       401:
    //  *         description: Unauthorized
    //  *       404:
    //  *         description: Resource not found
    //  */

    // Validate and get user data from instagram token
    static async validateFromInstagramToken(req: Request, res: Response, next: NextFunction): Promise<any> {
        const { body: data } = req;

        // Basic configs
        const PROVIDER = 'instagram'; // Provider
        const graphApiUrl = `https://api.instagram.com/v1/users/self/?access_token=${data.accessToken}`; // Prepare APIs

        try {
            if (!data.accessToken) {
                return HttpResponse.returnInternalServerResponse(res, 'facebook.token.required');
            }

            // Request user profile from facebook APIs by access tokens
            request.get({
                url: graphApiUrl
            }, async (err, response, profile) => {
                // Validate error from facebook
                if (response.statusCode !== 200) {
                    let { meta: { error_message } } = JSON.parse(profile);
                    return HttpResponse.returnUnAuthorizeResponseWithMessage(res, error_message)
                }

                // Parse profile data
                profile = JSON.parse(profile);

                // Update provider
                profile.data.provider = PROVIDER;

                // Set role for the new user
                profile.role = ['customer'];

                // Create the new user
                let rs = await AuthController.createUser(profile.data);

                // Emit event to all connected admin about the new user
                //await global.socket.sendNewEventToAllConnectedAdmin("userUpdated", null);

                return HttpResponse.returnSuccessResponse(res, rs)
            });
        } catch (e) {
            next(e)
        }
    }

    /*///////////////////////////////////////////////////////////////
    /////                   END INSTAGRAM LOGIN                 /////
    ///////////////////////////////////////////////////////////////*/


    // /**
    //  * @swagger
    //  * /v1/auth/completeSocialSignUp:
    //  *   post:
    //  *     description: Complete social sign up
    //  *     tags: [Auth]
    //  *     produces:
    //  *       - application/json
    //  *       - multipart/form-data
    //  *     parameters:
    //  *       - name: file
    //  *         in: formData
    //  *         description: Upload avatar
    //  *         paramType: formData
    //  *         type: file
    //  *       - name: avatarUrl
    //  *         in: formData
    //  *         description: Avatar Url (in case user use photo from social)
    //  *         paramType: formData
    //  *         type: string
    //  *       - name: username
    //  *         in: formData
    //  *         description: Username
    //  *         paramType: formData
    //  *         type: string
    //  *       - name: displayName
    //  *         in: formData
    //  *         description: Display name
    //  *         paramType: formData
    //  *         type: string
    //  *       - name: password
    //  *         in: formData
    //  *         description: Password
    //  *         paramType: formData
    //  *         type: string
    //  *       - name: confirmPassword
    //  *         in: formData
    //  *         description: Confirm password
    //  *         paramType: formData
    //  *         type: string
    //  *     responses:
    //  *       200:
    //  *         description: Success
    //  *       400:
    //  *         description: Invalid request params
    //  *       401:
    //  *         description: Unauthorized
    //  *       404:
    //  *         description: Resource not found
    //  *     security:
    //  *          - auth: []
    //  */

    static async completeSocialSignUp(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { user: userModel } = global.mongoModel;

            // Init image service
            const imageService = new ImageService('local');

            // Process form data
            let imageResponse = await imageService.processFormData(req, res);

            if (imageResponse && imageResponse.error) {
                return HttpResponse.returnBadRequestResponse(res, imageResponse.message);
            }

            const { body: data } = req;

            // Validate input data for signUp
            const validateResults = await userModel.validateData(['completeSocialSignUp'], data);

            // Parse error list form validation results
            const errorList = normalizeError(validateResults);

            // Validation Error
            if (errorList.length > 0) {
                return HttpResponse.returnBadRequestResponse(res, errorList);
            }

            // Check if password and confirm password is not matched
            if (data.password !== data.confirmPassword) {
                return HttpResponse.returnBadRequestResponse(res, 'password.confirmPassword.not.matched');
            }

            // Check if whether username existed already
            const existingUser = await userModel.findOne({ username: data.username }).lean().exec();

            // Return error
            if (existingUser) {
                return HttpResponse.returnDuplicateResponse(res, 'username.existed')
            }

            // If file is available, start to upload
            if (req['file']) {
                // Upload avatar
                const uploadResults = await imageService.upload(req['file']);

                // Error
                if (uploadResults.error) {
                    return HttpResponse.returnInternalServerResponseWithMessage(res, uploadResults.message);
                }

                data.avatarUrl = uploadResults.imageId;
            }

            // Generate hash password
            data.password = await helpers.generateHashPassword(data.password);


            // Complete this signUp process
            data.signUpCompleted = true;

            const rs = await userModel.findOneAndUpdate({ _id: req['userId'] }, data, { new: true }).lean().exec();

            // Emit event to all connected admin about the new user
            //await global.socket.sendNewEventToAllConnectedAdmin('userUpdated', null);

            return HttpResponse.returnSuccessResponse(res, rs)

        } catch (e) {
            next(e)
        }

    }

    /**
     * @swagger
     * /v1/auth/setupPassword:
     *   post:
     *     description: Set up password
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *       - multipart/form-data
     *     parameters:
     *       - name: code
     *         in: query
     *         required: true
     *         description: Code Data
     *         type: string
     *       - name: password
     *         in: formData
     *         required: true
     *         description: Password
     *         paramType: formData
     *         type: string
     *       - name: confirmPassword
     *         in: formData
     *         required: true
     *         description: Confirm Password
     *         paramType: formData
     *         type: string
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    static async setupPassword(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {

            // Init  models
            const { user: userModel, code: codeModel } = global.mongoModel;
            const { body: data } = req;
            const { code } = req.query;

            // Validate input data for setup 
            const validateResults = await userModel.validateData(['setupPassword'], data);

            // Parse error list form validation results
            const errorList = normalizeError(validateResults);

            // Validation Error
            if (errorList.length > 0) {
                return HttpResponse.returnBadRequestResponse(res, errorList);
            }

            // Check the latest code
            const codeData = await codeModel.findOne({ code, type: 'setupPassword' }).sort({ updatedAt: -1 }).exec();

            // If code does not exist or too old
            if (!codeData) {
                return HttpResponse.returnBadRequestResponse(res, 'setupPassword.code.invalid');
            }

            // If password and confirm password does not match
            if (data.password !== data.confirmPassword) {
                return HttpResponse.returnBadRequestResponse(res, 'resetPassword.password.confirmPassword.not.match');
            }

            // Generate the new hash password
            const hashPassword = await helpers.generateHashPassword(data.password);

            // Update the new one
            const resData = await userModel.findOneAndUpdate(
                { _id: codeData.userId },
                { password: hashPassword, signUpCompleted: true },
                { projection: { password: 0, social: 0 }, new: true })
                .lean().exec();

            // Update token to user data
            resData.token = await UserController.createTokenForUser(resData._id);

            // Remove old reset codes
            codeModel.remove({ userId: codeData.userId, type: 'setupPassword' }).exec();

            return HttpResponse.returnSuccessResponse(res, resData);

        } catch (e) { // Pass error to the next middleware
            next(e)
        }

    };

    /**
     * @swagger
     * /v1/auth/requestResetPassword:
     *   post:
     *     description: Request reset Password
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *       - multipart/form-data
     *     parameters:
     *       - name: role
     *         in: formData
     *         description: role
     *         paramType: formData
     *         type: string
     *       - name: email
     *         in: formData
     *         required: true
     *         description: Email
     *         paramType: formData
     *         type: string
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    static async requestResetPassword(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Models
            const { user: userModel } = global.mongoModel;
            const { body: data } = req;

            // Check if this user existed
            const userData = await userModel.findOne({ email: data.email, isDeleted: { $exists: false }, signUpCompleted: true }).lean().exec();

            // User doesnt not exist, return error
            if (!userData) {
                return HttpResponse.returnBadRequestResponse(res, 'resetPassword.email.not.existed');
            }

            if (data.role !== 'customer' && !userData.role.includes('master') && !userData.role.includes('content')) {
                return HttpResponse.returnBadRequestResponse(res, 'adminPanel.access.invalid');
            }

            if (data.role === 'customer' && !userData.role.includes('customer') && !userData.role.includes('company')) {
                return HttpResponse.returnBadRequestResponse(res, 'access.invalid');
            }

            await AuthController.sendResetPasswordUrl(userData, data.role);

            return HttpResponse.returnSuccessResponse(res, null);

        } catch (e) {
            next(e)
        }
    };

    /**
     * @swagger
     * /v1/auth/resendResetPassword:
     *   post:
     *     description: forgot password
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *       - multipart/form-data
     *     parameters:
     *       - name: role
     *         in: formData
     *         description: role
     *         paramType: formData
     *         type: string
     *       - name: email
     *         in: formData
     *         required: true
     *         description: Email
     *         paramType: formData
     *         type: string
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    static async resendResetPassword(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Models
            const { user: userModel, code: codeModel } = global.mongoModel;
            const { body: data } = req;

            // Check if this user existed
            const userData = await userModel.findOne({ email: data.email, isDeleted: { $exists: false }, signUpCompleted: true }).lean().exec();

            // User doesnt not exist, return error
            if (!userData) {
                return HttpResponse.returnBadRequestResponse(res, 'resetPassword.email.not.existed');
            }

            if (data.role !== 'customer' && (userData.role.includes('customer') || userData.role.includes('company'))) {
                return HttpResponse.returnBadRequestResponse(res, 'adminPanel.access.invalid');
            }

            if (data.role === 'customer' && (userData.role.includes('master') || userData.role.includes('content'))) {
                return HttpResponse.returnBadRequestResponse(res, 'access.invalid');
            }

            // Check if this code existed
            let codeData = await codeModel.findOne({ userId: userData._id, type: 'resetPassword' }).lean().exec();

            // Check if codeData is updated less than 90s
            if (codeData) {
                if (moment(codeData.updatedAt).add(90, 's') < moment()) {
                    await AuthController.sendResetPasswordUrl(userData, data.role);
                }
                else {
                    return HttpResponse.returnBadRequestResponse(res, 'resetPassword.wait.resend.forgotPassword');
                }
            }
            else {
                await AuthController.sendResetPasswordUrl(userData, data.role);
            }

            return HttpResponse.returnSuccessResponse(res, null);

        } catch (e) {
            next(e)
        }
    };

    /**
     * @swagger
     * /v1/auth/resetPassword:
     *   post:
     *     description: Reset password
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: code
     *         in: query
     *         required: true
     *         description: Code Data
     *         type: string
     *       - name: password
     *         in: formData
     *         required: true
     *         description: Password
     *         paramType: formData
     *         type: string
     *       - name: confirmPassword
     *         in: formData
     *         required: true
     *         description: Confirm Password
     *         paramType: formData
     *         type: string
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init  models
            const { user: userModel, code: codeModel } = global.mongoModel;
            const { body: data } = req;
            const { code } = req.query;

            // Validate input data for reset 
            const validateResults = await userModel.validateData(['resetPassword'], data);

            // Parse error list form validation results
            const errorList = normalizeError(validateResults);

            // Validation Error
            if (errorList.length > 0) {
                return HttpResponse.returnBadRequestResponse(res, errorList);
            }

            // Check the latest code
            const codeData = await codeModel.findOne({ code, type: 'resetPassword' }).sort({ updatedAt: -1 }).exec();

            // If code does not exist or too old
            if (!codeData) {
                return HttpResponse.returnBadRequestResponse(res, 'resetPassword.code.invalid');
            }

            // If password and confirm password does not match
            if (data.password !== data.confirmPassword) {
                return HttpResponse.returnBadRequestResponse(res, 'resetPassword.password.confirmPassword.not.match');
            }

            // Generate the new hash password
            const hashPassword = await helpers.generateHashPassword(data.password);

            // Update the new one
            await userModel.findOneAndUpdate({ _id: codeData.userId }, { password: hashPassword }, { new: true }).lean().exec();

            // Remove old reset codes
            codeModel.findOneAndRemove({ userId: codeData.userId, type: 'resetPassword' }).exec();

            return HttpResponse.returnSuccessResponse(res, null);

        } catch (e) { // Pass error to the next middleware
            next(e)
        }
    }

    /**
     * @swagger
     * /v1/auth/country/list:
     *   get:
     *     description: Get country list
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *       - multipart/form-data
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     */

    static async getCountryList(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { country: countryModel } = global.mongoModel;

            let condition = [
                {
                    $lookup: {
                        from: 'images',
                        localField: 'icon',
                        foreignField: '_id',
                        as: 'icon'
                    }

                },
                {
                    $unwind: {
                        path: '$icon',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$countryCode',
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]

            // Get country list
            let resData = await countryModel.aggregate(condition);

            // Get icon url
            for (let i = 0; i < resData.length; i++) {
                resData[i].icon = helpers.getImageUrl(resData[i].icon);
            }


            return HttpResponse.returnSuccessResponse(res, resData);

        } catch (e) {
            next(e)
        }
    }

    /**
    * @swagger
    * definitions:
    *   verifyUser:
    *     required:
    *       - dob
    *       - countryCode
    *       - phoneNumber
    *     properties:
    *       dob:
    *         type: string
    *       countryCode:
    *         type: string
    *       phoneNumber:
    *         type: string
    */

    /**
     * @swagger
     * /v1/auth/verifyUser:
     *   post:
     *     description: Verify user
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     parameters:
     *       - in: body
     *         name: body
     *         description: Request body
     *         schema:
     *           $ref: '#definitions/verifyUser'
     *           type: object
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async verifyUser(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { code: codeModel, user: userModel } = global.mongoModel;

            if (!req['userProfile'].isVerified) {
                const { body: data } = req;

                // Check if this code existed
                let codeData = await codeModel.findOne({
                    userId: req['userProfile']._id,
                    type: 'verify',
                    "verifyData.changePhoneNumber": { $exists: false }
                }).lean().exec();

                // Check if verify data not exist
                if (codeData) {
                    return HttpResponse.returnBadRequestResponse(res, 'verify.code.is.exist');
                }

                // Validate input data for signUp
                const validateResults = await userModel.validateData(['verifyUser'], data);

                // Parse error list form validation results
                const errorList = normalizeError(validateResults);

                // Validation Error
                if (errorList.length > 0) {
                    return HttpResponse.returnBadRequestResponse(res, errorList);
                }

                // Check dob in case driver
                if (req['userProfile'].role.includes('company')) {
                    // Check age is greater than 21
                    const age = moment().diff(new Date(data.dob), 'years');

                    if (age < 21) {
                        return HttpResponse.returnBadRequestResponse(res, 'age.under.21');
                    }
                }

                // Remove the first 0 at phone number
                data.phoneNumber = helpers.stripeZeroOut(data.phoneNumber);

                // Call twillio service
                const twillioService = new TwillioService();

                // Generate verify code
                const verifyCode = helpers.generateVerifyCode().toString();

                // Send sms to user
                await twillioService.sendSms({ to: `${data.countryCode}${data.phoneNumber}`, message: verifyCode });

                // Save code, verified data to db   
                const saveCode = await CodeController.createOrUpdateCode(req['userId'], 'verify', verifyCode, 30, data);

                // Delete after 1h 
                global.agendaInstance.agenda.schedule('60 minutes from now', 'RemoveResetPasswordCodeAfter1h', saveCode);

                return HttpResponse.returnSuccessResponse(res, null)
            } else {
                return HttpResponse.returnBadRequestResponse(res, 'user.isVerified');
            }

        } catch (e) {
            next(e)
        }
    }


    /**
     * @swagger
     * /v1/auth/verifyUser/confirmOTP:
     *   post:
     *     description: Confirm OTP after verifying user
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *       - multipart/form-data
     *     parameters:
     *       - name: code
     *         in: formData
     *         description: code
     *         paramType: formData
     *         type: string
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async confirmOtp(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const userData = req['userProfile'];

            const { body: data } = req;

            // Check if current code existed and not expired
            const existedCode = await CodeController.getCode(userData._id, data.code, 'verify');

            // Code not existed
            if (!existedCode) {
                return HttpResponse.returnBadRequestResponse(res, 'verifyCode.invalid');
            }

            //Confirm verify user
            if (userData.isVerified && !existedCode.verifyData.changePhoneNumber) {
                return HttpResponse.returnBadRequestResponse(res, 'isVerified');
            }

            // Check expired
            if (helpers.checkExpiredTime(existedCode.expiredAt)) {
                // Expired code, return error
                return HttpResponse.returnBadRequestResponse(res, 'verifyCode.expired');
            } else {
                // Finish verify user
                existedCode.verifyData.isVerified = true;

                // Update verified data to user collection
                await UserController.updateUser(existedCode.userId, existedCode.verifyData);

                // Remove old OTPs
                await CodeController.removeCode(existedCode.userId, 'verify');

            }

            return HttpResponse.returnSuccessResponse(res, null)

        } catch (e) {
            next(e)
        }

    }

    /**
     * @swagger
     * /v1/auth/verifyUser/resendOTP:
     *   post:
     *     description: Resend OTP code
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { code: codeModel } = global.mongoModel;

            // Check if this code existed
            let codeData = await codeModel.findOne({ userId: req['userProfile']._id, type: 'verify' }).lean().exec();

            if (req['userProfile'].isVerified && !codeData.verifyData.changePhoneNumber) {
                return HttpResponse.returnBadRequestResponse(res, 'user.isVerified');
            }

            // Check if codeData is updated less than 90s
            if (codeData) {
                if (moment(codeData.updatedAt).add(90, 's') < moment()) {
                    await AuthController.sendOPT(req['userProfile']);
                }
                else {
                    return HttpResponse.returnBadRequestResponse(res, 'resendOTP.wait.resend');
                }
            }
            else {
                // await AuthController.sendOPT(req['userProfile']);
                return HttpResponse.returnBadRequestResponse(res, 'verify.code.not.exist');
            }


            return HttpResponse.returnSuccessResponse(res, null);
        } catch (e) {
            next(e)
        }

    }

    /**
     * @swagger
     * /v1/auth/verifyUser/driverInfo:
     *   post:
     *     description: Verify driverinfo
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: answerList
     *         in: formData
     *         paramType: formData
     *         type: string
     *         description: answerList
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async confirmDriverInfo(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { question: questionModel, user: userModel } = global.mongoModel;
            const { body: data } = req;

            const userData = await userModel.findOne({ _id: req['userProfile']._id }).lean().exec();
            if (userData.isCompletedDriverInfo) {
                return HttpResponse.returnBadRequestResponse(res, 'isCompletedDriverInfo');
            }

            // Parse string to object
            const answerList = JSON.parse(data.answerList);

            // DriverInfo questions
            let driverInfoQuestions = await questionModel.find({ type: 'driver_info' }).lean().exec();
            driverInfoQuestions = driverInfoQuestions.map(data => data._id.toString());

            if (answerList.length !== driverInfoQuestions.length) {
                return HttpResponse.returnBadRequestResponse(res, 'answer.not.complete');
            }

            for (let i = 0; i < answerList.length; i++) {
                if (driverInfoQuestions.indexOf(answerList[i].question) === -1) {
                    return HttpResponse.returnBadRequestResponse(res, 'question.invalid');
                }
            }

            // Convert string to objectId
            answerList.map((data) => {
                data.question = mongoose.Types.ObjectId(data.question);
                return data;
            });


            let resData = await userModel.findOneAndUpdate({ _id: req['userProfile']._id }, { driverInfo: answerList, isCompletedDriverInfo: true }, { new: true });

            return HttpResponse.returnSuccessResponse(res, resData);

        } catch (e) {
            next(e)
        }

    }

    /**
     * @swagger
     * /v1/auth/verifyUser/driverInfoQuestion:
     *   get:
     *     description: Get driverinfo question
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async getDriverInfoQuestion(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { question: questionModel, user: userModel } = global.mongoModel;

            // Check user complete banking detail 
            // const userData = await userModel.findOne({ _id: req['userProfile']._id }).lean().exec();
            // if (await AuthController.checkProgressComplete(userData) !== 5) {
            //     return HttpResponse.returnBadRequestResponse(res, 'question.cannot.access');
            // }

            // DriverInfo questions
            let resData = await questionModel.find({ type: 'driver_info' }).lean().exec();

            return HttpResponse.returnSuccessResponse(res, resData);

        } catch (e) {
            next(e)
        }
    }

    /**
     * @swagger
     * /v1/auth/signUpAsDriver:
     *   get:
     *     description: Get driverinfo question
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async signUpAsDriver(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { user: userModel, company: companyModel } = global.mongoModel;

            // Check dob
            if (req['userProfile'].isVerified) {
                // Check age is greater than 21

                const age = moment().diff(new Date(req['userProfile'].dob), 'years');

                if (age < 21) {
                    return HttpResponse.returnBadRequestResponse(res, 'age.under.21');
                }
            }

            const companyData = await companyModel.findOne({ ownedBy: req['userId'] }).lean().exec();

            if (companyData) {
                return HttpResponse.returnBadRequestResponse(res, 'cannot.signUp.driver')
            }

            let resData = await userModel.findOneAndUpdate(
                { _id: req['userId'] },
                { $addToSet: { role: 'company' }, subRole: 'member' },
                { projection: { password: 0, social: 0, tooken: 0 }, new: true }
            )

            //Create company for driver
            await CompanyController.registerCompanyStep1To4(resData);

            return HttpResponse.returnSuccessResponse(res, resData);

        } catch (e) {
            next(e)
        }
    }

    /**
     * @swagger
     * /v1/auth/logout:
     *   put:
     *     description: Logout
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async logout(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            if (!req.header('authorization')) {
                return HttpResponse.returnBadRequestResponse(res, 'token.invalid');
            }

            // Clear user token
            const clear = await UserController.clearTokenForUser(req['userId'], req.header('authorization').split(' ')[1]);

            if (clear && clear.error) {
                return HttpResponse.returnBadRequestResponse(res, clear.errors[0].errorMessage);
            }

            // Close socket connection
            global.socket.closeSocketByUserId(req['userProfile']._id.toString());

            return HttpResponse.returnSuccessResponse(res, null);

        } catch (e) { // Pass error to the next middleware

            next(e)
        }

    }

    /**
     * @swagger
     * definitions:
     *   ChangePassword:
     *     required:
     *       - currentPassword
     *       - newPassword
     *       - confirmNewPassword
     *     properties:
     *       currentPassword:
     *         type: string
     *       newPassword:
     *         type: string
     *       confirmNewPassword:
     *         type: string
     *
     */

    /**
     * @swagger
     * /v1/auth/changePassword:
     *   put:
     *     description: Change password
     *     tags: [Auth]
     *     produces:
     *       - application/json
     *     parameters:
     *       - in: body
     *         name: body
     *         description: Request body
     *         schema:
     *           $ref: '#definitions/ChangePassword'
     *           type: object
     *     responses:
     *       200:
     *         description: Success
     *       400:
     *         description: Invalid request params
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Resource not found
     *     security:
     *          - auth: []
     */

    static async changePassword(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init  models
            const { user: userModel } = global.mongoModel;

            const { body: data } = req;

            const emailService = new NodeMailerService();

            // Validate current password
            const currentPasswordIsCorrect = await userModel.validatePassword(data.currentPassword, req['userProfile'].password);

            // Current password is not correct
            if (!currentPasswordIsCorrect) {
                return HttpResponse.returnBadRequestResponse(res, 'changePassword.currentPassword.not.correct');
            }

            // If password and confirm password does not match
            if (data.newPassword !== data.confirmNewPassword) {
                return HttpResponse.returnBadRequestResponse(res, 'resetPassword.password.confirmPassword.not.match');
            }
            // Generate the new hash password
            const hashPassword = await helpers.generateHashPassword(data.newPassword);

            // Update the new one
            const userData = await userModel.findOneAndUpdate(
                { _id: req['userProfile']._id },
                { password: hashPassword },
                { new: true, fields: { password: 0, token: 0 } }
            ).lean().exec();

            await emailService.sendEmailChangePassword(
                userData.email,
                userData.firstName
            )

            return HttpResponse.returnSuccessResponse(res, userData);

        } catch (e) { // Pass error to the next middleware
            next(e)
        }
    }

    /*///////////////////////////////////////////////////////////////
    /////               START HELPER FUNCTION                   /////
    ///////////////////////////////////////////////////////////////*/

    // Create user
    static async createUser(profile: any, lang?: string): Promise<any> {
        const { user: userModel, company: companyModel, code: codeModel, social: socialModel } = global.mongoModel;

        //turn off DeprecationWarning: Mongoose: `findOneAndUpdate()` and `findOneAndDelete()` without the `useFindAndModify` option set to false are deprecated.
        mongoose.set('useFindAndModify', false);

        //Find And Update/Create social data
        let newSocialData = {
            socialId: profile.id,
            provider: profile.provider,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.email
        }

        //Update of create social info
        const socialData = await socialModel.findOneAndUpdate({ socialId: profile.id }, newSocialData, { new: true, upsert: true, projection: { password: 0, social: 0 } });

        // Check if whether user existed in system already
        const userData = await userModel.findOne({ email: profile.email, isDeleted: { $exists: false } }).lean().exec();

        // User existed already, create the new token and throw back to user
        if (userData) {
            // Check active of user
            if (userData.active === false) {
                return HttpResponse.returnErrorWithMessage('account.inactive', lang);
            }

            // Update data
            let updateData = {
                friends: profile.friendList,
                $addToSet: { social: socialData._id }
            }

            // Update token and friends to user data
            let resData = await userModel.findOneAndUpdate({ _id: userData._id, isDeleted: { $exists: false } }, updateData, { new: true, projection: { password: 0, social: 0 } }).lean();

            // Generate jwt token
            if (userData.signUpCompleted) {
                // Update token to user data
                resData.token = await UserController.createTokenForUser(resData._id);
            }

            // Check user didn't sign up complete
            if (!userData.signUpCompleted) {
                // Generate code and save to collection
                const insertCodeData = await codeModel.create({
                    userId: userData._id,
                    code: await helpers.getRandomCode(),
                    type: 'setupPassword',
                    expiredAt: moment().add(24, 'hours') // This code expires in 24 hours
                });

                // Delete after 24 hours
                global.agendaInstance.agenda.schedule('24 hours from now', 'RemoveSetupPasswordCodeAfter24h', insertCodeData);
                resData['setupPasswordCode'] = insertCodeData.code;
            }

            //Save current progress
            resData.currentProgress = await AuthController.checkProgressComplete(resData);
            if (resData.currentProgress === 2) {
                const codeData = await codeModel.findOne({ userId: resData._id, type: 'verify' }).lean().exec();
                resData.verifyData = codeData.verifyData;
            }

            //Get avatar url
            if (resData.avatar) {
                resData.avatar = await helpers.getImageUrl(resData.avatar);
            }

            //Get company info
            let companyData = await companyModel.findOne({ ownedBy: userData._id });
            if (companyData) {
                resData.company = companyData;
            }

            return resData;
        }

        let insertData = {
            social: [socialData._id],
            signUpCompleted: false,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.email
        };

        // Check role is exist and not null
        if (profile.role && (profile.role.includes('customer') || profile.role.includes('company'))) {
            insertData['role'] = profile.role;
        }
        else {
            return HttpResponse.returnErrorWithMessage('type.not.exist', lang);
        }

        // Add customer role
        if (!insertData['role'].includes('customer')) {
            insertData['role'].push('customer');
        }

        // Signup as driver
        if (insertData['role'].includes('company')) {
            insertData['subRole'] = 'member';
        }

        // Create the new user and throw token back
        let resData = await userModel.create(insertData);
        resData = resData.toObject();

        //Create company for driver
        if (resData.role.includes('company')) {
            await companyModel.create({
                name: resData.firstName + ' ' + resData.lastName,
                phoneNumber: resData.phoneNumber,
                address: resData.address[0],
                ownedBy: resData._id,
                staff: [resData._id]
            })
        }

        //Save current progress
        resData.currentProgress = await AuthController.checkProgressComplete(resData);
        if (resData.currentProgress === 2) {
            const codeData = await codeModel.findOne({ userId: resData._id, type: 'verify' }).lean().exec();
            resData.verifyData = codeData.verifyData;
        }

        //Get company info
        let companyData = await companyModel.findOne({ ownedBy: resData._id });
        if (companyData) {
            resData.company = companyData;
        }

        // Generate code and save to collection
        const insertCodeData = await codeModel.create({
            userId: resData._id,
            code: await helpers.getRandomCode(),
            type: 'setupPassword',
            expiredAt: moment().add(24, 'hours') // This code expires in 24 hours
        });

        // Delete after 24 hours
        global.agendaInstance.agenda.schedule('24 hours from now', 'RemoveSetupPasswordCodeAfter24h', insertCodeData);

        resData['setupPasswordCode'] = insertCodeData.code;

        return resData;
    };

    static async sendResetPasswordUrl(userData: any, role: string): Promise<any> {
        const { code: codeModel } = global.mongoModel;

        const emailService = new NodeMailerService();

        // Generate code and save to collection
        const insertCodeData = await codeModel.findOneAndUpdate({
            userId: userData._id,
            type: 'resetPassword'
        }, {
            userId: userData._id,
            code: await helpers.getRandomCode(),
            type: 'resetPassword',
            expiredAt: moment().add(60, 'minutes') // This code expires in 30 minutes
        }, {
            new: true, // Return updated object
            upsert: true // Update or create the new one if not exist
        }).lean().exec();

        // Delete after 1h 
        global.agendaInstance.agenda.schedule('60 minutes from now', 'RemoveResetPasswordCodeAfter1h', insertCodeData);

        // Send email to user
        return await emailService.sendEmailResetPassword({
            userId: userData._id,
            toEmail: userData.email,
            name: userData.firstName,
            code: insertCodeData.code,
            role: role
        });
    }

    static async sendOPT(userData: any): Promise<any> {
        // Save code, verified data to db and send sms to user
        const saveCode = await CodeController.createOrUpdateCode(userData._id, 'verify', helpers.generateVerifyCode().toString(), 30);

        // Call twillio service
        const twillioService = new TwillioService();

        // Send sms to user
        return await twillioService.sendSms({ to: `${saveCode.verifyData.countryCode}${saveCode.verifyData.phoneNumber}`, message: saveCode.code });

    }

    static async checkProgressComplete(userData: any): Promise<any> {
        // Init model
        const { code: codeModel, company: companyModel } = global.mongoModel;

        // User has a payment account
        if (userData.paymentAccount) {

            // Driver has banking detail
            if (userData.role.includes('company') && userData.subRole === 'member') {
                const companyData = await companyModel.findOne({ ownedBy: userData._id }).populate('payoutAccount').lean().exec();

                //Completed diver info
                if (userData.isCompletedDriverInfo) {
                    return 7;
                }

                //Input driver question
                if (companyData.licensesAndCertifications.length !== 0) {
                    return 6;
                }

                //Input driver license
                if (companyData.payoutAccount && companyData.payoutAccount.banks.length !== 0) {
                    return 5;
                }
            }
            // Input bank info
            return 4;
        }

        // User confirm OTP
        if (userData.isVerified) {
            return 3;
        }

        const codeData = await codeModel.findOne({
            userId: mongoose.Types.ObjectId(userData._id),
            type: 'verify',
            "verifyData.changePhoneNumber": { $exists: false }
        }).lean().exec();

        // User submit dob,phone number
        if (codeData) {
            return 2;
        }

        // Default is 1 (account is created) 
        return 1;
    }
    /*///////////////////////////////////////////////////////////////
    /////                 END HELPER FUNCTION                  /////
    ///////////////////////////////////////////////////////////////*/

    /*///////////////////////////////////////////////////////////////
    /////             START  AGENDA CONTROLLERS                 /////
    ///////////////////////////////////////////////////////////////*/

    // Remove code expired
    static async removeCodeExpired(code: string, type: string): Promise<void> {

        const { code: codeModel } = global.mongoModel

        await codeModel.findOneAndRemove({ code, type }).exec();

    }

    /*///////////////////////////////////////////////////////////////
    /////              END  AGENDA CONTROLLERS                  /////
    ///////////////////////////////////////////////////////////////*/
}

