import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import * as moment from 'moment'

export function IsOverAgeOf18(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsOverAgeOf18FormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsOverAgeOf18" })
export class IsOverAgeOf18FormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {

        if (value !== null && value !== undefined && value !== '') {
            value = new Date(value);
            const age = moment().diff(value, 'years');
            return age >= 18 ? true : false
        }

        return true;

    }

}