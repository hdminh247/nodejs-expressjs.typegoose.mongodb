import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import * as _ from 'lodash';

export function Required(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: RequiredConstraint
        });
    };
}

@ValidatorConstraint({ name: "Required" })
export class RequiredConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {

        return !(value === null || value === '' || value === undefined || (typeof value === 'object' && value.length > 0))
    }

}