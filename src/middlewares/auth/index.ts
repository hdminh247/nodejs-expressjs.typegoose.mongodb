import { Request, Response, NextFunction } from 'express';
import * as auth from 'basic-auth';
import * as JWT from 'jsonwebtoken';
import * as _ from 'underscore';
import HttpResponse from '../../services/response';

export default class AuthMiddleware {

    static isAuthenticated(req: Request, res: Response, next: NextFunction): void {
        const token = req.headers['authorization']; //  Bearer token authentication
        const credentials = auth(req); // Basic authentication

        if (token) { // If token is specified, process this with Bearer token way

            let authToken = (<string>token).split(' ')[1];

            // Decode jwt token
            JWT.verify(authToken, global.env.jwtSecret, async (err, decoded) => {
                if (err) {
                    // Return more clear message if jwt token is expired
                    if (err.message === 'Jwt is expired') {
                        let expireTime = _.isObject(err.parsedBody) ? new Date(err.parsedBody.exp * 1000) : '';
                        return HttpResponse.returnUnAuthorizeResponse(res, `Your token expired at: ${expireTime}`);
                    } else if (err.message === 'jwt malformed') {
                        return HttpResponse.returnUnAuthorizeResponse(res, `You are not logged in`);
                    }
                    else {  // Return error directly
                        return HttpResponse.returnUnAuthorizeResponse(res, err.message);
                    }
                } else {
                    const { user: userModel, token: tokenModel } = global.mongoModel;

                    let query = { isDeleted: { $exists: false } };

                    // Local account, find by its own Id
                    if (decoded.provider === 'local') {
                        Object.assign(query, { _id: decoded.id })
                    } else { // Social account
                        Object.assign(query, { socialId: decoded.id })
                    }

                    // Get user data
                    const user = await userModel.findOne(query).populate('avatar paymentAccount').lean().exec();

                    if (user) {
                        // Check if this account is active

                        if (user.active === true) {
                            // Get token list
                            const tokenList = user.tokens.map((tok) => tok.toString());

                            // Get token data
                            const token = await tokenModel.findOne({ token: authToken }).lean();

                            if (token && tokenList.includes(token._id.toString())) {
                                // Attached decoded user id to request
                                Object.assign(req, { userId: user._id, userProfile: user });
                                next();

                            } else {
                                return HttpResponse.returnUnAuthorizeResponse(res, 'token.invalid');
                            }

                        } else {
                            return HttpResponse.returnUnAuthorizeResponse(res, 'account.inactive');
                        }

                    } else {
                        return HttpResponse.returnUnAuthorizeResponse(res, 'system.unauthorized');
                    }
                }
            });
        } else if (credentials) { // If user use basic authentication in case server cant generate tokens or for testing
            if (credentials.name !== process.env.DEFAULT_ACCESS_USER || credentials.pass !== process.env.DEFAULT_ACCESS_PASS) {
                // Return error
                return HttpResponse.returnUnAuthorizeResponse(res, 'system.unauthorized');
            } else {
                // Go to the next middleware
                next();
            }
        } else {
            // Return error
            return HttpResponse.returnUnAuthorizeResponse(res, 'system.unauthorized');
        }
    }

    static isMaster(req: Request, res: Response, next: NextFunction): void {
        if (req['userProfile'].role && req['userProfile'].role.includes('master')) {
            next();
        }
        else {
            // Return error
            return HttpResponse.returnUnAuthorizeResponse(res, 'system.unauthorized');
        }
    }

    static isContent(req: Request, res: Response, next: NextFunction): void {
        if (req['userProfile'].role && req['userProfile'].role.includes('content')) {
            next();
        }
        else {
            // Return error
            return HttpResponse.returnUnAuthorizeResponse(res, 'system.unauthorized');
        }
    }

    static isContentOrMaster(req: Request, res: Response, next: NextFunction): void {
        if (req['userProfile'].role && (req['userProfile'].role.includes('content') || req['userProfile'].role.includes('master'))) {
            next();
        }
        else {
            // Return error
            return HttpResponse.returnUnAuthorizeResponse(res, 'system.unauthorized');
        }
    }

    static isCompany(req: Request, res: Response, next: NextFunction): void {
        if (req['userProfile'].role && req['userProfile'].role.includes('company')) {
            next();
        }
        else {
            // Return error
            return HttpResponse.returnUnAuthorizeResponse(res, 'system.unauthorized');
        }
    }

    static isCompletedSignUp(req: Request, res: Response, next: NextFunction): void {
        if (req['userProfile'].signUpCompleted) {
            next();
        }
        else {
            // Return error
            return HttpResponse.returnUnAuthorizeResponse(res, 'account.notCompletedSignUp');
        }
    }
}