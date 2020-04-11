import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsCountryCode(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsCountryCodeFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsCountryCode" })
export class IsCountryCodeFormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const countryRegex = /^(\+\d{1,4})$/ ;
        return !!countryRegex.exec(value);


    }

}