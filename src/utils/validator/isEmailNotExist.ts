import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import {getCustomRepository} from "typeorm";

export function IsEmailNotExist(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsEmailNotExistConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsEmailNotExist" })
export class IsEmailNotExistConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        return true;
        // return userRepository.findOne({email: value}).then(user => {
        //     return !!user;
        // });


    }

}