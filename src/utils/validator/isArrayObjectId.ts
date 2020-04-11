import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

export function IsArrayObjectId(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsArrayObjectIdFormatConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsArrayObjectId" })
export class IsArrayObjectIdFormatConstraint implements ValidatorConstraintInterface {

    validate(values: any, args: ValidationArguments) {
        for(let value of values){
            // Invalid
            if(!/^[a-f\d]{24}$/i.exec(value)){
                return false
            }
        }
        return true;
    }

}