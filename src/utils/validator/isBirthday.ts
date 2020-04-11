import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsBirthdayFormat(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsBirthdayFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsBirthdayFormat" })
export class IsBirthdayFormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        if (value !== null && value !== undefined && value !== '') {
            const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|1\d|2\d|3[01])\/(19|20)\d{2}$/;
            return !!dateRegex.exec(value);
        }
        return true;
    }

}