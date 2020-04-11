import { default as twillio } from './twillio';
import { default as uploadImage } from './uploadImage';
import { default as database } from './database';
import { default as email } from './email';
import { default as agenda } from './agenda';
import { default as i18n } from './i18n';
import { default as stripe } from './stripe';
import { default as paypal } from './paypal';
import { default as googleDistance } from './googleDistance';
import { default as currency } from './currency';
import { default as estimatePrice } from './estimatePrice';

export default () => {
    return {
        database: database(),
        twillio: twillio(),
        uploadImage: uploadImage(),
        email: email(),
        agenda: agenda(),
        i18n: i18n(),
        stripe: stripe(),
        paypal: paypal(),
        googleDistance: googleDistance(),
        currency: currency(),
        estimatePrice: estimatePrice()
    }
}