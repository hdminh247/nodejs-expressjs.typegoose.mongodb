import { createTransport } from 'nodemailer';
const hbs = require('nodemailer-express-handlebars');

import helpers from '../../utils/helpers';

interface ISendEmail {
    userId?: string,
    toEmail: string,
    name: string,
    code: string,
    role: string
}

export default class NodeMailerService {
    private smtpTransport: any;

    constructor() {
        const { email } = global.configs;

        this.smtpTransport = createTransport({
            service: email.serial,
            host: email.host,
            port: email.port,
            auth: {
                user: email.username,
                pass: email.password
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true
        });

        this.smtpTransport.use(
            'compile',
            hbs({
                viewEngine: {
                    extName: '.hbs',
                    partialsDir: 'src/views/email/',
                    layoutsDir: 'src/views/email/',
                    defaultLayout: false,
                },
                viewPath: 'src/views/email/',
                extName: '.hbs'
            })
        );
    }

    public async sendEmailTest(email: string, content: string): Promise<any> {

        const mailOptions = {
            from: 'Thai Mobility', // sender address
            to: email, // list of receivers
            subject: 'Test Email', // Subject line
            template: 'resetPassword',
            content
        };

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendEmailResetPassword(data: ISendEmail): Promise<any> {

        const { toEmail, name, code, role } = data;
        const resetPasswordUrl = await helpers.getPasswordUrl(code, 'reset-password', role);

        const mailOptions = {
            from: 'Thai Mobility', // sender address
            to: toEmail, // list of receivers
            subject: 'Thai Mobility Reset Password ( Not reply)', // Subject line
            template: 'resetPassword',
            context: {
                name,
                email: toEmail,
                basePath: `${global.env.protocol}:${global.env.basePath}`,
                url: resetPasswordUrl
            }
        };

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendEmailSetupPassword(data: ISendEmail): Promise<any> {

        const { toEmail, name, code, role } = data;
        const setupPasswordUrl = await helpers.getPasswordUrl(code, 'setup-password', role);
        const mailOptions = {
            from: 'Thai Mobility', // sender address
            to: toEmail, // list of receivers
            subject: 'Welcome to Thai Mobility system', // Subject line
            template: 'setupPassword',
            context: {
                name,
                email: toEmail,
                url: setupPasswordUrl,
                basePath: `${global.env.protocol}:${global.env.basePath}`
            }
        };

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendEmailVerifyDriver(toEmail: string, name: string): Promise<any> {

        const mailOptions = {
            from: 'Thai Mobility', // sender address
            to: toEmail, // list of receivers
            subject: 'Welome to Thai Mobility system', // Subject line
            template: 'verifyDriver',
            context: {
                name,
                email: toEmail,
                basePath: `${global.env.protocol}:${global.env.basePath}`
            }
        };

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendEmailChangePassword(toEmail: string, name: string): Promise<any> {

        const mailOptions = {
            from: 'Thai Mobility', // sender address
            to: toEmail, // list of receivers
            subject: 'Your password has been changed', // Subject line
            template: 'changePassword',
            context: {
                name,
                email: toEmail,
                basePath: `${global.env.protocol}:${global.env.basePath}`
            }
        };

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendEmailRemoveUser(toEmail: string, name: string): Promise<any> {

        const mailOptions = {
            from: 'Thai Mobility', // sender address
            to: toEmail, // list of receivers
            subject: 'Your account has been removed', // Subject line
            template: 'removeUser',
            context: {
                name,
                email: toEmail,
                basePath: `${global.env.protocol}:${global.env.basePath}`
            }
        };

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendEmailChangeStatusUser(toEmail: string, name: string, status: boolean): Promise<any> {

        let mailOptions;

        if (status.toString() === 'true') {
            mailOptions = {
                from: 'Thai Mobility', // sender address
                to: toEmail, // list of receivers
                subject: 'Your account has been activated', // Subject line
                template: 'activedUser',
                context: {
                    name,
                    email: toEmail,
                    basePath: `${global.env.protocol}:${global.env.basePath}`
                }
            };
        }
        else {
            mailOptions = {
                from: 'Thai Mobility', // sender address
                to: toEmail, // list of receivers
                subject: 'Your account has been deactivated', // Subject line
                template: 'deactivedUser',
                context: {
                    name,
                    email: toEmail,
                    basePath: `${global.env.protocol}:${global.env.basePath}`
                }
            };
        }

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendNotificationMail(toEmail: string, name: string, message: string, url?: string): Promise<any> {

        let mailOptions;
        if (url) {
            mailOptions = {
                from: 'Thai Mobility', // sender address
                to: toEmail, // list of receivers
                subject: 'Booking information', // Subject line
                template: 'notification',
                context: {
                    name,
                    email: toEmail,
                    basePath: `${global.env.protocol}:${global.env.basePath}`,
                    message,
                    url,
                }
            };
        }
        else {
            mailOptions = {
                from: 'Thai Mobility', // sender address
                to: toEmail, // list of receivers
                subject: 'Booking information', // Subject line
                template: 'notification',
                context: {
                    name,
                    email: toEmail,
                    basePath: `${global.env.protocol}:${global.env.basePath}`,
                    message
                }
            };
        }

        return await this.smtpTransport.sendMail(mailOptions);
    }

    public async sendHelpEmail(toEmail: string, name: string, message: string, userEmail: string, images: any): Promise<any> {

        //Models
        const { image: imageModel } = global.mongoModel;
        let attachments = [];

        //Init attachments
        for (let i = 0; i < images.length; i++) {
            const imageData = await imageModel.findOne({ _id: images[i] }).lean().exec();
            attachments.push({
                filename: imageData.fileName,
                path: helpers.getImageUrl(imageData)
            });
        }

        const mailOptions = {
            from: 'Thai Mobility', // sender address
            to: toEmail, // list of receivers
            subject: 'Help Center', // Subject line
            template: 'help',
            context: {
                name,
                email: toEmail,
                message: message,
                userEmail: userEmail,
                basePath: `${global.env.protocol}:${global.env.basePath}`
            },
            attachments: attachments
        };

        return await this.smtpTransport.sendMail(mailOptions);
    }
}