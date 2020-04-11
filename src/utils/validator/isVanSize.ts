import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsVanSize(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsVanSizeConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsVanSize" })
export class IsVanSizeConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {

        if (value !== undefined && value !== null && value !== '') {
            return Number.isInteger(value) ? ((value >= 2 && value <= 17) ? true : false) : false
        }

        return true


    }

}