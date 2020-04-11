import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import {getCustomRepository} from "typeorm";

export function IsEmailAlreadyExist(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsEmailAlreadyExistConstraint
        });
    };
}

@ValidatorConstraint({ name: "IsEmailAlreadyExist" })
export class IsEmailAlreadyExistConstraint implements ValidatorConstraintInterface {

    validate(value: any, args: ValidationArguments) {
        return true
        // return userRepository.findOne({email: value}).then(user => {
        //     return !user;
        // });


    }

}