import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsLicensePlate(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsLicensePlateConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsLicensePlate" })
export class IsLicensePlateConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const licensePlateRegex = /^[a-zA-Z0-9- ]+$/;

        return !!licensePlateRegex.exec(value)


    }

}