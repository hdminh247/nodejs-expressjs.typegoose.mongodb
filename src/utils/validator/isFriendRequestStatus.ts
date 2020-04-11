import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsFriendRequestStatus(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsFriendRequestStatusConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsFriendRequestStatus" })
export class IsFriendRequestStatusConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const requestStatus = ['pending', 'completed', 'rejected'];

        return !!requestStatus.includes(value)


    }

}