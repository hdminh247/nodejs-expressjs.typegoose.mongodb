import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsPhoneNumberFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsPhoneNumber" })
export class IsPhoneNumberFormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const phoneNumberRegex = /^[0-9]{1,}$/ ;
        return !!phoneNumberRegex.exec(value);


    }

}