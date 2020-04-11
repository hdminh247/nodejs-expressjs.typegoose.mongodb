// Library
import { prop, Typegoose, Ref } from '../libs/typegoose/typegoose';

import { User } from './user';

enum PasswordUrlType {
    resetPassword = 'resetPassword',
    setupPassword = 'setupPassword'
}

export class Code extends Typegoose {
    @prop({ ref: User, required: true })
    userId: Ref<User>;

    @prop()
    code: string;

    @prop()
    type: PasswordUrlType;

    @prop()
    verifyData: object;

    @prop()
    expiredAt: Date;
}

export const CodeModel = (connection) => {
    return new Code().getModelForClass(Code, {
        existingConnection: connection,
        schemaOptions: { timestamps: true }
    })
};