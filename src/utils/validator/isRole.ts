import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import * as _ from 'lodash';

export function IsRole(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsRoleConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsRole" })
export class IsRoleConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const roleList = ['master', 'content', 'company', 'customer'];

        if (_.isEmpty(value)) {
            return true
        }

        if (typeof value === 'string') {
            return !!roleList.includes(value)
        }

        return !!value.filter(role => roleList.includes(role)).length !== value.length


    }

}