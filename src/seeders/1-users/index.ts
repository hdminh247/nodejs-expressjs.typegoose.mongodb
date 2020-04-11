import { helpers } from '../../utils';
import { Job } from '../../models/job'
interface IAdmin {
    firstName: string,
    lastName: string,
    role: string[];
    currentJob: string[];
    email: string;
    password: any;
    active: boolean;
    isVerified: boolean;
    signUpCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    dob?: Date;
    gender?: string;
}
const user: IAdmin[] = [
    {
        email: 'admin@thai.mobility.com',
        password: '12345678',
        firstName: 'Master',
        lastName: 'Account',
        role: ['master', 'content'],
        gender: 'male',
        dob: new Date('01/01/2019'),
        active: true,
        isVerified: true,
        signUpCompleted: true,
        currentJob: [],
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: 'content@thai.mobility.com',
        password: 'thaimobility',
        firstName: 'Content',
        lastName: 'Account',
        role: ['content'],
        gender: 'male',
        dob: new Date('01/01/2019'),
        active: true,
        isVerified: true,
        signUpCompleted: true,
        currentJob: [],
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

user.map(async user => user.password = await helpers.generateHashPassword(user.password));

export = user