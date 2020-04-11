import { Request, Response, NextFunction } from 'express';
import * as moment from 'moment';
import * as _ from 'underscore';
import * as lodash from 'lodash';

import { jwtHelper, normalizeError, helpers } from '../utils';

import ImageService from '../services/image';
import TwillioService from '../services/twilio';
import HttpResponse from '../services/response';
import i18nService from '../services/i18n';

import NotificationController from './notification';
import AuthController from './auth';

export default class UserController {
    /**
     * @swagger
     * tags:
     *   - name: User
     *     description: User
     */

    /**
     * @swagger
     * /v1/user/profile:
     *   get:
     *     description: Get user profile API
     *     tags: [User]
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

    static async getProfile(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { user: userModel, code: codeModel, company: companyModel } = global.mongoModel;
            let resData = await userModel.findOne(
                { _id: req['userId'], isDeleted: { $exists: false } },
                { password: 0, token: 0 }
            ).populate('avatar').populate([
                {
                    path: 'paymentAccount',
                    populate: 'cards'
                }
            ]).lean().exec();

            //Save current progress
            resData.currentProgress = await AuthController.checkProgressComplete(resData);
            if (resData.currentProgress === 2) {
                const codeData = await codeModel.findOne({ userId: resData._id, type: 'verify' }).lean().exec();
                resData.verifyData = codeData.verifyData;
            }

            //Get company info
            let companyData = await companyModel.findOne({ ownedBy: req['userId'] }).populate([
                {
                    path: 'licensesAndCertifications',
                    populate: 'proofs licensesAndCertification'
                }
            ]).lean().exec();
            if (companyData) {

                // Get image url for proof
                for (let i = 0; i < companyData.licensesAndCertifications.length; i++) {
                    if (companyData.licensesAndCertifications[i].proofs.length > 0) {
                        for (let j = 0; j < companyData.licensesAndCertifications[i].proofs.length; j++) {
                            companyData.licensesAndCertifications[i].proofs[j] = {
                                _id: companyData.licensesAndCertifications[i].proofs[j]._id,
                                path: await helpers.getImageUrl(companyData.licensesAndCertifications[i].proofs[j])
                            }
                        }
                    }
                }

                resData.company = companyData;
            }

            // User avatar
            if (resData.avatar) {
                resData.avatar = await helpers.getImageUrl(resData.avatar);
            }

            return HttpResponse.returnSuccessResponse(res, resData)

        } catch (e) { // Pass error to the next middleware
            next(e)
        }
    };


    /**
     * @swagger
     * /v1/user/profile:
     *   put:
     *     description: Update user profile
     *     tags: [User]
     *     produces:
     *       - application/json
     *       - multipart/form-data
     *     parameters:
     *       - name: file
     *         in: formData
     *         description: Edit avatar
     *         paramType: formData
     *         type: file
     *       - name: email
     *         in: formData
     *         description: email
     *         paramType: formData
     *         type: string
     *       - name: firstName
     *         in: formData
     *         description: firstName
     *         paramType: formData
     *         type: string
     *         required: true
     *       - name: lastName
     *         in: formData
     *         description: lastName
     *         paramType: formData
     *         type: string
     *         required: true
     *       - name: gender
     *         in: formData
     *         description: Gender
     *         paramType: formData
     *         type: string
     *         enum:
     *              - male
     *              - female
     *              - na
     *       - name: dob
     *         in: formData
     *         description: Birthday (mm/dd/yyyy format)
     *         paramType: formData
     *         type: string
     *       - name: countryCode
     *         in: formData
     *         description: Country Code (+xx)
     *         paramType: formData
     *         type: string
     *       - name: phoneNumber
     *         in: formData
     *         description: Phone number
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
     *         description: Resource not found]
     *     security:
     *          - auth: []
     */


    static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init models
            const { user: userModel, code: codeModel, company: companyModel } = global.mongoModel;

            // Init services
            const imageService = new ImageService('local');
            const twillioService = new TwillioService();

            // Process form data
            let imageResponse = await imageService.processFormData(req, res);

            if (imageResponse && imageResponse.error) {
                return HttpResponse.returnBadRequestResponse(res, imageResponse.message);
            }

            const { body: data } = req;

            // Validate input data for update profile
            const validateResults = await userModel.validateData([req['userProfile'].isVerified ? 'updateProfile' : 'updateNonVerifiedProfile'], data);

            // Parse error list from validation results
            const errorList = normalizeError(validateResults);

            // Validation Error
            if (errorList.length > 0) {
                return HttpResponse.returnBadRequestResponse(res, errorList);
            }

            // If file is available, start to upload
            if (req['file']) {
                // Upload avatar
                const uploadResults = await imageService.upload(req['file']);

                // Error
                if (uploadResults.error) {
                    return HttpResponse.returnInternalServerResponseWithMessage(res, uploadResults.message);
                }
                data.avatar = uploadResults.imageId;
            }

            // Add dob
            if (data.dob) {
                data.dob = new Date(data.dob);

                // Check age is greater than 18
                const age = moment().diff(moment(data.dob), 'years');

                if (age < 18) {
                    return HttpResponse.returnBadRequestResponse(res, 'age.under.18');
                }
            }

            // Stripe the first 0 number out
            data.phoneNumber = data.phoneNumber ? helpers.stripeZeroOut(data.phoneNumber) : data.phoneNumber;

            // If user is changing phone number
            if (req['userProfile'].countryCode != data.countryCode || req['userProfile'].phoneNumber != data.phoneNumber) {

                // Mark that user is changing phone number
                data.changePhoneNumber = true;

                // Save code and verified data to db
                const codeSavedRs = await codeModel.findOneAndUpdate({
                    userId: req['userProfile']._id,
                    type: 'verify'
                }, {
                    userId: req['userProfile']._id,
                    code: helpers.generateVerifyCode().toString(),
                    type: 'verify',
                    expiredAt: moment().add(30, 'minutes'), // This code expires in 60 minutes,
                    verifyData: data
                }, {
                    new: true, // Return updated object
                    upsert: true // Update or create the new one if not exist
                }).lean().exec();

                // Send sms to user
                await twillioService.sendSms({ to: `${data.countryCode}${data.phoneNumber}`, message: codeSavedRs.code });
            }

            // Remove phone number
            delete data.countryCode;
            delete data.phoneNumber;

            // Update normal data
            let resData = await userModel.findOneAndUpdate(
                { _id: req['userProfile']._id },
                data,
                { new: true, fields: { password: 0, token: 0 } }
            ).populate('avatar').lean();

            resData.changePhoneNumber = data.changePhoneNumber || false;

            // User avatar
            if (resData.avatar) {
                resData.avatar = await helpers.getImageUrl(resData.avatar);
            }

            //Save current progress
            resData.currentProgress = await AuthController.checkProgressComplete(resData);
            if (resData.currentProgress === 2) {
                const codeData = await codeModel.findOne({ userId: resData._id, type: 'verify' }).lean().exec();
                resData.verifyData = codeData.verifyData;
            }

            //Get company info
            let companyData = await companyModel.findOne({ ownedBy: req['userId'] }).populate([
                {
                    path: 'licensesAndCertifications',
                    populate: 'proofs licensesAndCertification'
                }
            ]).lean().exec();

            if (companyData) {

                // Get image url for proof
                for (let i = 0; i < companyData.licensesAndCertifications.length; i++) {
                    if (companyData.licensesAndCertifications[i].proofs.length > 0) {
                        for (let j = 0; j < companyData.licensesAndCertifications[i].proofs.length; j++) {
                            companyData.licensesAndCertifications[i].proofs[j] = {
                                _id: companyData.licensesAndCertifications[i].proofs[j]._id,
                                path: await helpers.getImageUrl(companyData.licensesAndCertifications[i].proofs[j])
                            }
                        }
                    }
                }

                resData.company = companyData;
            }

            return HttpResponse.returnSuccessResponse(res, resData)

        } catch (e) { // Pass error to the next middleware
            next(e)
        }
    };



    /**
     * @swagger
     * /v1/user/deleteAccount:
     *   delete:
     *     description: Delete user account
     *     tags: [User]
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

    static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { user: userModel } = global.mongoModel;
            await userModel.findOneAndDelete({ _id: req['userProfile']._id }, { password: 0, token: 0 });

            return HttpResponse.returnSuccessResponse(res, null)

        } catch (e) { // Pass error to the next middleware
            next(e)
        }

    };

    /**
     * @swagger
     * definitions:
     *   AddressItem:
     *     properties:
     *       type:
     *         type: string
     *         enum:
     *              - address
     *              - pickupLocation
     *              - destination
     *         description: Type
     *       latitude:
     *          type: number
     *          description: latitude
     *       longitude:
     *         type: number
     *         description: longitude
     *       address:
     *          type: string
     *          description: address
     *       name:
     *          type: string
     *          description: address
     *
     */

    /**
     * @swagger
     * definitions:
     *   Address:
     *     properties:
     *       addressArr:
     *         type: array
     *         items:
     *           type: object
     *           $ref: '#definitions/AddressItem'
     *           description: Address object
     */

    /**
     * @swagger
     * /v1/user/address:
     *   post:
     *     description: Create address
     *     tags: [User]
     *     parameters:
     *       - name: body
     *         in: body
     *         required: true
     *         description: address
     *         schema:
     *           type: object
     *           $ref: '#definitions/Address'
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

    static async createAddress(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { user: userModel, location: locationModel } = global.mongoModel;
            const { body: data } = req

            let addressArrId = [], resData = [];

            //Check address exist in user data
            const userData = await userModel.findOne({ _id: req['userProfile']._id, isDeleted: { $exists: false } }).lean().exec();

            if (!userData) {
                return HttpResponse.returnBadRequestResponse(res, 'user.not.exist');
            }

            if (userData.address) {
                addressArrId = userData.address
            }

            for (let i = 0; i < data.addressArr.length; i++) {
                const rawData = data.addressArr[i];

                resData.map(data => {
                    if (rawData.latitude === data.latitude && rawData.longitude === data.longitude) {
                        return HttpResponse.returnBadRequestResponse(res, 'address.invalid');
                    }
                })

                // Create address
                let addressData = await locationModel.create({
                    address: rawData.address,
                    latitude: rawData.latitude,
                    longitude: rawData.longitude,
                    name: rawData.name,
                    type: rawData.type
                })

                resData.push(addressData);
                addressArrId.push(addressData._id);
            }

            // Save address to user
            await userModel.findOneAndUpdate({ _id: req['userProfile']._id }, { address: addressArrId }, { upsert: true }).exec()

            return HttpResponse.returnSuccessResponse(res, resData)

        } catch (e) { // Pass error to the next middleware
            next(e)
        }

    };

    /**
     * @swagger
     * /v1/user/address/{id}:
     *   put:
     *     description: Edit address by id
     *     tags: [User]
     *     parameters:
     *       - name: id      
     *         in: path
     *         required: true
     *         type: string
     *         description: address id
     *       - name: name      
     *         in: formData
     *         type: string
     *         description: name
     *       - name: latitude      
     *         in: formData
     *         type: number
     *         description: latitude
     *       - name: longitude      
     *         in: formData
     *         type: number
     *         description: longitude
     *       - name: address      
     *         in: formData
     *         type: string
     *         description: address
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

    static async editAddress(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { location: locationModel } = global.mongoModel;

            const { id: addressId } = req.params;

            const { body: data } = req;

            const resData = await locationModel.findOneAndUpdate({ _id: addressId }, data, { upsert: true, new: true }).lean().exec();

            return HttpResponse.returnSuccessResponse(res, resData)

        } catch (e) { // Pass error to the next middleware
            next(e)
        }

    };

    /**
     * @swagger
     * /v1/user/address/{id}:
     *   delete:
     *     description: Delete address by id
     *     tags: [User]
     *     parameters:
     *       - name: id      
     *         in: path
     *         required: true
     *         type: string
     *         description: Address id
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

    static async deleteAddress(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init user model
            const { location: locationModel, user: userModel } = global.mongoModel;

            const { id: addressId } = req.params

            await userModel.findOneAndUpdate({ address: addressId }, { $pull: { address: addressId } }, { upsert: true }).lean().exec();

            // Delete address
            await locationModel.findOneAndRemove({ _id: addressId }).lean().exec();

            return HttpResponse.returnSuccessResponse(res, null)

        } catch (e) { // Pass error to the next middleware
            next(e)
        }

    };

    /**
    * @swagger
    * /v1/user/job/list:
    *   get:
    *     description: get my job list
    *     tags: [User]
    *     produces:
    *       - application/json
    *       - multipart/form-data
    *     parameters:
    *       - name: keyword      
    *         in: query
    *         type: string
    *         description: Keyword to find job
    *       - name: sortBy      
    *         in: query
    *         type: string
    *         description: Sort By
    *         enum:
    *              - jobId
    *              - pickupLocation
    *              - destination
    *              - createdAt
    *       - name: sortType      
    *         in: query
    *         type: string
    *         description: Sort Type
    *         enum:
    *              - ascending
    *              - descending
    *       - name: paymentStatus    
    *         in: query
    *         default: all
    *         type: string
    *         description: Filter payment status
    *         enum:
    *              - all
    *              - unpaid
    *              - paid
    *              - pending
    *              - canceled
    *       - name: size
    *         in: query
    *         description: Number of user returned
    *         type: integer
    *         default: 20
    *       - name: page
    *         in: query
    *         default: 0
    *         description: Current page
    *         type: integer   
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

    static async getMyJobs(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init job model
            const { job: jobModel } = global.mongoModel;
            let {
                sortBy,
                size,
                page,
                keyword,
                paymentStatus
            } = req.query;
            const sortType = req.query.sortType === 'ascending' ? 1 : -1;

            //escape regexp keyword
            keyword = helpers.escapeRegexp(keyword);

            let sort;

            if (keyword && !helpers.checkValidKeyword(keyword)) {

                const resData = helpers.paginateAnArray([], size, page);

                return HttpResponse.returnSuccessResponse(res, resData);
            }

            //If payment status is not exist, get all payment status
            if (!paymentStatus) {
                paymentStatus = 'all'
            }

            let resData = await jobModel.find({ createdBy: req['userId'], isDeleted: { $exists: false } })
                .populate(
                    'pickupLocation status createdBy category subCategory promotion assignedCompany service vehicle',
                    { _id: 0, createdAt: 0, updatedAt: 0, type: 0, password: 0, token: 0 }
                ).populate([{
                    path: 'destination',
                    select: { createdAt: 0, updatedAt: 0, type: 0 },
                },
                {
                    path: 'pickupLocation',
                    select: { createdAt: 0, updatedAt: 0, type: 0 },
                }])
                .lean().exec();

            resData = resData.filter(data => {
                let condition = new RegExp(keyword, 'i');

                let resData = data.destination.map(data => {
                    return (condition.test(data.address) || condition.test(data.name)) ? 'true' : 'false';
                })

                if (condition.test(data.createdBy.firstName) || condition.test(data.createdBy.lastName)) {
                    resData.push('true')
                }

                if (data.assignedCompany) {
                    if (condition.test(data.assignedCompany.ownedBy.firstName) || condition.test(data.assignedCompany.ownedBy.lastName)) {
                        resData.push('true')
                    }
                }

                return resData.includes('true') ? true : false
            })

            if (sortBy && sortType) {
                switch (sortBy) {
                    case 'jobId':
                        {
                            sort = { 'jobId': sortType };
                            break;
                        }
                    case 'pickupLocation':
                        {
                            sort = { 'pickupLocation.address': sortType };
                            break;
                        }
                    case 'destination':
                        {
                            sort = { 'destination.address': sortType };
                            break;
                        }
                    case 'createdAt':
                        {
                            sort = { 'createdAt': sortType };
                            break;
                        }
                }

                resData = helpers.sortArrayByField(resData, sort)
            }

            resData = await helpers.paginateAnArray(resData, size, page);

            return HttpResponse.returnSuccessResponse(res, resData);
        }
        catch (e) {
            next(e)
        }
    };

    /**
    * @swagger
    * /v1/user/currentBookings:
    *   get:
    *     description: get upcoming booking
    *     tags: [User]
    *     produces:
    *       - application/json
    *       - multipart/form-data
    *     parameters:
    *       - name: keyword      
    *         in: query
    *         type: string
    *         description: Keyword to find job
    *       - name: sortBy      
    *         in: query
    *         type: string
    *         description: Sort By
    *         enum:
    *              - bookingId
    *              - pickupLocation
    *              - destination
    *              - createdAt
    *       - name: sortType      
    *         in: query
    *         type: string
    *         description: Sort Type
    *         enum:
    *              - ascending
    *              - descending
    *       - name: size
    *         in: query
    *         description: Number of booking returned
    *         type: integer
    *         default: 20
    *       - name: page
    *         in: query
    *         default: 0
    *         description: Current page
    *         type: integer   
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

    static async getCurrentBookings(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init job model
            const { job: jobModel, jobRequest: jobRequestModel } = global.mongoModel;
            let {
                sortBy,
                size,
                page,
                keyword
            } = req.query;
            const sortType = req.query.sortType === 'ascending' ? 1 : -1;
            let sort, condition;

            condition = [
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'pickupLocation',
                        foreignField: '_id',
                        as: 'pickupLocation'
                    }
                },
                { $unwind: { path: '$pickupLocation', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'destination',
                        foreignField: '_id',
                        as: 'destination'
                    }
                },
                {
                    $lookup: {
                        from: 'jobStatuses',
                        localField: 'status',
                        foreignField: '_id',
                        as: 'status'
                    }
                },
                {
                    $lookup: {
                        from: 'activities',
                        localField: 'activities',
                        foreignField: '_id',
                        as: 'activities'
                    }
                },
                {
                    $addFields: {
                        currentStatus: {
                            '$slice': ['$status', -1]
                        }
                    }
                },
                { $unwind: { path: '$currentStatus', preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $and: [
                            {
                                // Search name, phone number, email by string input
                                $or: [
                                    { 'pickupLocation.address': new RegExp(keyword, 'i') },
                                    { 'destination.address': new RegExp(keyword, 'i') },
                                    !Number.isNaN(keyword) ? { jobId: parseInt(keyword) } : {},
                                    { email: new RegExp(keyword, 'i') }
                                ]
                            }
                        ],
                        createdBy: req['userProfile']._id,
                        'currentStatus.key': { $nin: ['completed', 'canceled'] },
                        isDeleted: { $exists: false }
                    }
                },
                {
                    //Group by status
                    $group: {
                        _id: {
                            $concat: [
                                { $cond: [{ '$eq': ['$currentStatus.key', 'new_lead'] }, 'Pending', ''] },
                                { $cond: [{ '$ne': ['$currentStatus.key', 'new_lead'] }, 'Confirmed', ''] }
                            ]
                        },
                        data: { $push: "$$ROOT" },
                        "count": { "$sum": 1 }
                    }
                }
            ];

            if (sortBy && sortType) {
                switch (sortBy) {
                    case 'bookingId':
                        {
                            sort = { 'jobId': sortType };
                            break;
                        }
                    case 'pickupLocation':
                        {
                            sort = { 'pickupLocation.address': sortType };
                            break;
                        }
                    case 'destination':
                        {
                            sort = { 'destination.address': sortType };
                            break;
                        }
                    case 'createdAt':
                        {
                            sort = { 'createdAt': sortType };
                            break;
                        }
                }

                condition.push({ $sort: sort });
            }

            let resData = await jobModel.paginate(size, page, condition);

            let bookingData = {
                Pending: {
                    count: 0,
                    data: []
                },
                Confirmed: {
                    count: 0,
                    data: []
                }
            }

            for (let i = 0; i < resData.data.length; i++) {
                if (resData.data[i]._id === 'Confirmed') {
                    for (let j = 0; j < resData.data[i].data.length; j++) {
                        const jobRequestData = await jobRequestModel.findOne({ _id: { $in: resData.data[i].data[j].jobRequests }, status: 'accepted' }).populate({
                            path: 'fromUser',
                            model: 'User'
                        }).lean().exec();

                        if (jobRequestData && jobRequestData.fromUser) {
                            resData.data[i].data[j]['driverName'] = jobRequestData.fromUser.firstName + ' ' + jobRequestData.fromUser.lastName;
                        }
                        else {
                            resData.data[i].data[j]['driverName'] = '';
                        }

                        if (resData.data[i].data[j].category.allowSubCategory) {
                            delete resData.data[i].data[j].pickupLocation
                        }
                    }
                    bookingData['Confirmed'] = {
                        data: resData.data[i].data,
                        count: resData.data[i].count
                    }

                    resData.data[i].data.map(data => {
                        if (data.activities) {
                            data.activities = helpers.sortArrayByField(data.activities, { createdAt: -1 })
                        }
                    });
                }
                else {
                    for (let j = 0; j < resData.data[i].data.length; j++) {
                        resData.data[i].data[j]['driverBiding'] = resData.data[i].data[j].jobRequests.length;
                    }
                    bookingData['Pending'] = {
                        data: resData.data[i].data,
                        count: resData.data[i].count
                    }

                    resData.data[i].data.map(data => {
                        if (data.activities) {
                            data.activities = helpers.sortArrayByField(data.activities, { createdAt: -1 })
                        }
                    });
                }
            }

            resData.data = bookingData;

            return HttpResponse.returnSuccessResponse(res, resData);
        }
        catch (e) {
            next(e)
        }
    };

    /**
     * @swagger
     * /v1/user/applyPromotionCode:
     *   get:
     *     description: apply promotion code
     *     tags: [User]
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: code
     *         in: query
     *         type: string
     *         required: true
     *         description: code
     *       - name: categoryId
     *         in: query
     *         type: string
     *         required: true
     *         description: categoryId
     *       - name: subCategoryId
     *         in: query
     *         type: string
     *         description: subCategoryId
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

    static async applyPromotionCode(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init job model
            const { promotion: promotionModel, coupon: couponModel, subCategory: subCategoryModel } = global.mongoModel;

            const { code, categoryId, subCategoryId } = req.query;

            //Code/categoryId is required
            if (!code || !categoryId) {
                return HttpResponse.returnSuccessResponse(res, { valid: false });
            }

            const couponData = await couponModel.findOne({ code: code, isDeleted: { $exists: false } });

            //Code is not exists or used up
            if (!couponData || couponData.usedQuantity === couponData.usageLimit) {
                return HttpResponse.returnSuccessResponse(res, { valid: false });
            }

            const promotionData = await promotionModel.findOne({ coupons: couponData._id }).populate('category').lean().exec();
            const categoryData = promotionData.category

            //Check category of promotion
            if (categoryData._id.toString() !== categoryId) {
                return HttpResponse.returnSuccessResponse(res, { valid: false });
            }

            //Check subCategory of promotion
            if (subCategoryId && categoryData.allowSubCategory && promotionData.subCategory) {
                const subCategoryData = await subCategoryModel.findOne({ _id: subCategoryId, category: categoryId }).lean().exec();

                //Subcategory not exists or not equal with subCategory of promotion
                if (!subCategoryData || promotionData.subCategory.toString() !== subCategoryId) {
                    return HttpResponse.returnSuccessResponse(res, { valid: false });
                }
            }

            return HttpResponse.returnSuccessResponse(res, { valid: true });
        }
        catch (e) {
            next(e)
        }
    };

    /**
    * @swagger
    * /v1/user/historyBookings:
    *   get:
    *     description: get history booking
    *     tags: [User]
    *     produces:
    *       - application/json
    *       - multipart/form-data
    *     parameters:
    *       - name: keyword      
    *         in: query
    *         type: string
    *         description: Keyword to find job
    *       - name: sortBy      
    *         in: query
    *         type: string
    *         description: Sort By
    *         enum:
    *              - bookingId
    *              - pickupLocation
    *              - destination
    *              - createdAt
    *              - driverName
    *              - rating
    *              - vehicle
    *              - status
    *       - name: sortType      
    *         in: query
    *         type: string
    *         description: Sort Type
    *         enum:
    *              - ascending
    *              - descending
    *       - name: size
    *         in: query
    *         description: Number of booking returned
    *         type: integer
    *         default: 20
    *       - name: page
    *         in: query
    *         default: 0
    *         description: Current page
    *         type: integer   
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

    static async getHistoryBookings(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            // Init job model
            const { job: jobModel, jobRequest: jobRequestModel } = global.mongoModel;
            let {
                sortBy,
                size,
                page,
                keyword
            } = req.query;
            const sortType = req.query.sortType === 'ascending' ? 1 : -1;
            let sort, condition;

            condition = [
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'pickupLocation',
                        foreignField: '_id',
                        as: 'pickupLocation'
                    }
                },
                { $unwind: { path: '$pickupLocation', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'destination',
                        foreignField: '_id',
                        as: 'destination'
                    }
                },
                {
                    $lookup: {
                        from: 'jobStatuses',
                        localField: 'status',
                        foreignField: '_id',
                        as: 'status'
                    }
                },
                {
                    $addFields: {
                        currentStatus: {
                            '$slice': ['$status', -1]
                        }
                    }
                },
                { $unwind: { path: '$currentStatus', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'vehicles',
                        localField: 'vehicle',
                        foreignField: '_id',
                        as: 'vehicle'
                    }
                },
                { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'ratingAndReviews',
                        localField: 'rating',
                        foreignField: '_id',
                        as: 'rating'
                    }
                },
                { $unwind: { path: '$rating', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'companies',
                        localField: 'assignedCompany',
                        foreignField: '_id',
                        as: 'assignedCompany'
                    }
                },
                { $unwind: { path: '$assignedCompany', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'assignedCompany.ownedBy',
                        foreignField: '_id',
                        as: 'driver'
                    }
                },
                { $unwind: { path: '$driver', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        driverName: {
                            $concat: ["$driver.firstName", " ", "$driver.lastName"]
                        }
                    }
                },
                {
                    $match: {
                        $and: [
                            {
                                // Search name, phone number, email by string input
                                $or: [
                                    { 'pickupLocation.address': new RegExp(keyword, 'i') },
                                    { 'destination.address': new RegExp(keyword, 'i') },
                                    { jobId: new RegExp(keyword, 'i') },
                                    { email: new RegExp(keyword, 'i') }
                                ]
                            }
                        ],
                        createdBy: req['userProfile']._id,
                        'currentStatus.key': { $in: ['completed', 'canceled'] },
                        isDeleted: { $exists: false }
                    }
                }
            ];

            if (sortBy && sortType) {
                switch (sortBy) {
                    case 'bookingId':
                        {
                            sort = { 'jobId': sortType };
                            break;
                        }
                    case 'pickupLocation':
                        {
                            sort = { 'pickupLocation.address': sortType };
                            break;
                        }
                    case 'destination':
                        {
                            sort = { 'destination.address': sortType };
                            break;
                        }
                    case 'createdAt':
                        {
                            sort = { 'createdAt': sortType };
                            break;
                        }

                    case 'driverName':
                        {
                            sort = { 'createdAt': sortType };
                            break;
                        }
                    case 'rating':
                        {
                            sort = { 'rating.avgRating': sortType };
                            break;
                        }
                    case 'vehicle':
                        {
                            sort = { 'vehicle.name': sortType };
                            break;
                        }
                    case 'status':
                        {
                            sort = { 'currentStatus.name': sortType };
                            break;
                        }
                }

                condition.push({ $sort: sort });
            }

            let resData = await jobModel.paginate(size, page, condition);

            return HttpResponse.returnSuccessResponse(res, resData);
        }
        catch (e) {
            next(e)
        }
    };

    /*///////////////////////////////////////////////////////////////
    /////               START HELPER FUNCTION                  /////
    ///////////////////////////////////////////////////////////////*/

    // Get user by id
    static async getUserData(userId: string): Promise<any> {
        const { user: userModel } = global.mongoModel;

        // Find data of user
        return await userModel.findOne({ _id: userId, isDeleted: { $exists: false } }).populate('paymentAccount').lean();
    }

    // Update user by id
    static async updateUser(_id: string, fields: object): Promise<any> {
        const { user: userModel } = global.mongoModel;

        // Find and data of user
        return await userModel.findOneAndUpdate({ _id }, fields, { new: true });
    }

    // Validate user model
    static async validateData(data: object, group: string): Promise<any> {
        const { user: userModel } = global.mongoModel;

        // Validate input data for verify user
        const validateResults = await userModel.validateData([group], data);

        // Parse error list form validation results
        return normalizeError(validateResults);
    }

    // Create and update token for for
    static async createTokenForUser(userId: string): Promise<any> {
        const { user: userModel, token: tokenModel } = global.mongoModel;

        // Generate jwt token
        const signToken = jwtHelper.signToken(userId, 'local');

        // Create token in system
        const token = await tokenModel.create({ token: signToken.token, user: userId, expiredAt: signToken.expiredAt });

        // Update user
        await userModel.update({ _id: userId }, { $addToSet: { tokens: token._id } });

        return signToken.token;
    }

    // Create and update token for for
    static async clearTokenForUser(userId: string, userToken: string): Promise<any> {
        const { user: userModel, token: tokenModel } = global.mongoModel;

        // Get user data
        const user = await userModel.findOne({ _id: userId }).lean();

        // Get token data
        const token = await tokenModel.findOne({ token: userToken }).lean();

        if (!token) {
            return HttpResponse.returnErrorWithMessage('token.invalid');
        }

        // Update user
        await userModel.update({ _id: userId }, { $set: { tokens: user.tokens.filter((tok) => tok.toString() != token._id.toString()) } });

        // Remove token in system
        await tokenModel.remove({ _id: token._id });

        return true;
    }

    /*///////////////////////////////////////////////////////////////
    /////                 END HELPER FUNCTION                  /////
    ///////////////////////////////////////////////////////////////*/

}

