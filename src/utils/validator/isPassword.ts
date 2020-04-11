import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import * as moment from 'moment'
import { exec } from 'child_process';

export function IsPassword(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsPasswordFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsPassword" })
export class IsPasswordFormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {

        const nameRegex = / /;

        if (!!nameRegex.exec(value)) {
            return false
        }

        return true;

    }

}