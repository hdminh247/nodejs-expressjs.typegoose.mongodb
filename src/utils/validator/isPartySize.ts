import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsPartySize(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsPartySizeConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsPartySize" })
export class IsPartySizeConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        if (value !== undefined && value !== null && value !== '') {
            return Number.isInteger(value) ? ((value >= 1 && value <= 17) ? false : true) : true
        }

        return true


    }

}