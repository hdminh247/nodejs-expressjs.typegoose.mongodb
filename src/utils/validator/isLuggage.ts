import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsLuggage(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsLuggageConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsLuggage" })
export class IsLuggageConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {

        if (value !== undefined) {
            return !Number.isNaN(value) ? ((value >= 0 && value <= 150) ? true : false) : false
        }

        return true


    }

}