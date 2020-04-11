// Libraries
import * as _ from 'underscore';
import * as bcrypt from 'bcryptjs';
import { Length, validate, IsNotEmpty, IsAlpha } from 'class-validator';

// Models
import { prop, Typegoose, ModelType, staticMethod, pre, Ref, arrayProp } from '../libs/typegoose/typegoose';
import { Location } from './location';
import { Image } from './image';
import { PaymentAccount } from './paymentAccount';
import { Social } from './social';
import { Job } from './job'
import { Vehicle } from './vehicle'
import { Question } from './question';
import { Token } from './token';

// Utils
import {
    IsEmailFormat,
    IsBirthdayFormat,
    IsGender,
    IsCountryCode,
    IsPhoneNumber,
    IsObjectId,
    IsAlphaIncludeSpace,
    IsRole,
    IsPassword,
    IsOverAgeOf18
} from '../utils/validator';
import { helpers } from '../utils';
enum Role {
    customer = 'customer', // Normal user
    company = 'company', // An admin user that manage provider,
    master = 'master', // An admin user who manage all things
    content = 'content' // An content user who manage limit things
}

// Sub role for company user
enum SubRole {
    admin = 'admin', // Normal company user
    member = 'member', // A company admin user but can only manage limited things
}

enum Gender {
    male = 'male',
    female = 'female',
    na = 'n/a'
}

interface Answer {
    question: Question,
    answer: boolean;
}

// Before save hook
@pre<User>('save', async function (next) {
    // Only crypt password for non-social login
    if (this.provider !== 'facebook' && this.provider !== 'twitter' && this.provider !== 'instagram' && this.provider !== 'google') {
        if (this.password) {
            // Replace raw password by the hashed one
            this.password = await helpers.generateHashPassword(this.password);

            //Complete this sign up process
            this.signUpCompleted = true;
        }
    }

    next()
})

export class User extends Typegoose {
    @prop()
    @IsEmailFormat({
        groups: ['signIn', 'signUp', 'createUserByAdmin'],
        message: 'email.invalid'
    })
    email?: string;

    @prop()
    @IsPassword({
        groups: ['signIn', 'signUp', 'resetPassword', 'setupPassword'],
        message: 'password.wrong.format'
    })
    @Length(8, 30, {
        groups: ['signIn', 'signUp', 'resetPassword', 'setupPassword'],
        message: 'password.length.invalid'
    })
    password?: string;

    @arrayProp({ itemsRef: Social, default: [] })
    social?: Ref<Social>[];

    @prop()
    provider?: string;

    @prop()
    @Length(1, 30, {
        groups: ['signUp', 'completeSocialSignUp', 'updateProfile', 'updateNonVerifiedProfile', 'editUserByAdmin', 'createUserByAdmin'],
        message: 'firstName.length.invalid'
    })
    @IsAlphaIncludeSpace({
        groups: ['signUp', 'completeSocialSignUp', 'updateProfile', 'updateNonVerifiedProfile', 'editUserByAdmin', 'createUserByAdmin'],
        message: 'firstName.invalid'
    })
    firstName: string;

    @prop()
    @IsAlpha()
    @Length(1, 30, {
        groups: ['signUp', 'completeSocialSignUp', 'updateProfile', 'updateNonVerifiedProfile', 'editUserByAdmin', 'createUserByAdmin'],
        message: 'lastName.length.invalid'
    })
    @IsAlphaIncludeSpace({
        groups: ['signUp', 'completeSocialSignUp', 'updateProfile', 'updateNonVerifiedProfile', 'editUserByAdmin', 'createUserByAdmin'],
        message: 'lastName.invalid'
    })
    lastName: string;

    @prop({ ref: Image })
    avatar?: Ref<Image>;

    @prop({ enum: Gender })
    @IsNotEmpty({
        groups: ['updateProfile'],
        message: 'gender.required'
    })
    @IsGender({
        groups: ['updateProfile'],
        message: 'gender.invalid'
    })
    gender?: Gender;

    @prop()
    @IsNotEmpty({
        groups: ['verifyUser'],
        message: 'dob.required'
    })
    @IsBirthdayFormat({
        groups: ['verifyUser', 'updateProfile'],
        message: 'dob.invalid'
    })
    @IsOverAgeOf18({
        groups: ['verifyUser', 'updateProfile', 'editUserByAdmin'],
        message: 'age.under.18'
    })
    dob?: Date;

    @prop()
    @IsCountryCode({
        groups: ['verifyUser', 'updateProfile'],
        message: 'countryCode.invalid'
    })
    countryCode: string;

    @prop()
    @IsNotEmpty({
        groups: ['verifyUser', 'updateProfile'],
        message: 'phoneNumber.required'
    })
    @IsPhoneNumber({
        groups: ['verifyUser', 'updateProfile'],
        message: 'phoneNumber.invalid'
    })
    phoneNumber: string;

    @prop({ enum: Role })
    @IsRole({
        groups: ['signUp', 'createUserByAdmin'],
        message: 'role.required'
    })
    role: Role[];

    @prop({ enum: SubRole })
    subRole: SubRole;

    @arrayProp({ itemsRef: Token })
    tokens?: Ref<Token>[];

    @prop({ default: false })
    isVerified?: boolean;

    @prop({ default: false })
    signUpCompleted: boolean;

    @prop({ default: true })
    active?: boolean;

    @prop()
    playerId: string;

    @arrayProp({ itemsRef: Location, default: [] })
    address: Ref<Location>[];

    @prop({ ref: User })
    @IsObjectId()
    createdBy: Ref<User>;

    @prop({ ref: PaymentAccount })
    paymentAccount: Ref<PaymentAccount>;

    @arrayProp({ itemsRef: Job, default: [] })
    currentJob: Ref<Job>[];

    @prop()
    isDeleted?: boolean;

    @prop({ default: false })
    isCompletedDriverInfo: boolean;

    @prop()
    driverInfo?: Answer[];

    @arrayProp({ itemsRef: Vehicle, default: [] })
    vehicles: Ref<Vehicle>[];

    @prop()
    reason?: string;

    @staticMethod
    static async validatePassword(inputPassword: string, userPassword: string, ): Promise<any> {
        try {
            return await bcrypt.compare(inputPassword, userPassword);
        } catch (error) {
            throw new Error(error);
        }
    }

    // TODO: Move this to parent class
    @staticMethod
    static async validateData(this: ModelType<User> & typeof User, groups: any, data: any): Promise<any> {
        try {
            // Init user class
            let userData = new User();

            // Assign value
            helpers.assignObjectValueFromOtherObject(userData, data);

            // Validate input data first
            return await validate(userData, {
                groups: groups,
                validationError: { target: false }
            });
        } catch (error) {
            throw new Error(error);
        }
    }

    // TODO: Move this to parent class
    @staticMethod
    static async paginate(this: ModelType<User> & typeof User, size: number, page: number, aggregation?: object[], conditions?: object, filter?: object): Promise<any> {
        try {
            // const { user: userModel } = global.mongoModel;
            let pipeLine = [];

            // Add condition pipeline
            if (_.isObject(conditions)) {
                pipeLine.push({
                    $match: conditions
                });
            }

            // Add filter pipeline
            if (_.isObject(filter)) {
                pipeLine.push({
                    $project: filter
                });
            }

            // Add custom aggregation, using custom aggregation will ignore condition and filter
            if (_.isObject(aggregation)) {
                pipeLine = pipeLine.concat(aggregation)
            }

            // Limit item
            if (size && +size > 0) {
                // Limit page with size
                if (page && +page > 0) {
                    pipeLine.push({
                        $skip: +page * +size
                    });
                    pipeLine.push({
                        $limit: +size
                    });
                } else { // Limit page with default
                    pipeLine.push({
                        $limit: +size
                    });
                }
            } else {
                if (page && +page > 0) {
                    return {
                        currentPage: +page,
                        totalPage: 1,
                        data: []
                    };
                }
            }

            let data = await this.aggregate(pipeLine).exec();

            let totalPage = 1;

            let totalRow = 0;

            // Get sum of documents
            if (_.isObject(aggregation)) {
                aggregation.push({
                    $count: "number"
                });

                // Get total documents base on aggregation
                let totalDocs = await this.aggregate(aggregation).exec();

                if (totalDocs.length > 0) {
                    totalRow = totalDocs[0].number
                }

                // Calculate total page
                totalPage = +size > 0 ? (totalDocs.length > 0 ? Math.ceil(totalDocs[0].number / +size) : 1) : 1;
            } else { // I
                let totalDocumentCount = await this.find(conditions ? conditions : {}).count().lean().exec();

                // Calculate total page
                totalPage = +size > 0 ? Math.ceil(totalDocumentCount / +size) : 1;
            }

            return {
                currentPage: +page ? +page : 0,
                totalRow,
                totalPage,
                data
            };

        } catch (error) {
            throw new Error(error);
        }
    }
}

export const UserModel = (connection: any) => {
    return new User().setModelForClass(User, {
        existingConnection: connection,
        schemaOptions: {
            collection: 'users',
            timestamps: true
        }
    })
};