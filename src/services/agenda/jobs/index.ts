import { default as auth } from './auth';
import { default as job } from './job';

export default agenda => {
    return {
        auth: auth(agenda),
        job: job(agenda)
    }
}