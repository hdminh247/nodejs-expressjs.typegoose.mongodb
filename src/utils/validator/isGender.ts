import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsGender(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsGenderFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsGender" })
export class IsGenderFormatConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        const genderList = ['male', 'female', 'na'];

        return !!genderList.includes(value)


    }

}