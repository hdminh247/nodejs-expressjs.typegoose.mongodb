import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsObjectId(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsObjectIdFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsObjectId" })
export class IsObjectIdFormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const topicRegex = /^[a-f\d]{24}$/i;
        return !!topicRegex.exec(value);


    }

}