import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsDescription(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsDescriptionConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsDescription" })
export class IsDescriptionConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {

        if (value !== undefined) {
            return value.length > 500 ? false : true
        }

        return true


    }

}