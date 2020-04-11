import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsUsername(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsUsernameFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsUsername" })
export class IsUsernameFormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const usernameRegex = /^[a-z0-9_-]{2,20}$/i;
        return !!usernameRegex.exec(value);


    }

}