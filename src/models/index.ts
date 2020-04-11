import 'reflect-metadata';

import { CompanyModel } from './company';
import { UserModel } from './user';
import { CodeModel } from './code';
import { BankModel } from './bank';
import { CompanyLicensesAndCertificationModel } from './companyLicensesAndCertification';
import { CompanyServiceAreaHourModel } from './companyServiceAreaHour';
import { ImageModel } from './image';
import { JobModel } from './job';
import { JobStatusModel } from './jobStatus';
import { LicensesAndCertificationModel } from './licensesAndCertification';
import { RatingAndReviewModel } from './ratingAndReview';
import { ServiceModel } from './service';
import { PaymentAccountModel } from './paymentAccount';
import { PayoutAccountModel } from './payoutAccount';
import { CardModel } from './card';
import { LocationModel } from './location';
import { JobRequestModel } from './jobRequest';
import { PromotionModel } from './promotion';
import { CouponModel } from './coupon';
import { CategoryModel } from './category';
import { SubCategoryModel } from './subCategory';
import { VehicleModel } from './vehicle';
import { TransactionModel } from './transaction';
import { EarningAndPaymentModel } from './earningAndPayment';
import { ActivityModel } from './activity';
import { ActivityCategoryModel } from './activityCategory';
import { CounterModel } from './counter';
import { CountryModel } from './country';
import { StateModel } from './state';
import { CityModel } from './city';
import { ContentModel } from './content'
import { SocialModel } from './social';
import { QuestionModel } from './question';
import { HelpMessageModel } from './helpMessage';
import { VehicleRequestModel } from './vehicleRequest';
import { NotificationModel } from './notification';
import { TokenModel } from './token';
import { RoleModel } from './role';
import { PermissionModel } from './permission';

export default (connection: any) => {
    return {
        company: CompanyModel(connection),
        user: UserModel(connection),
        code: CodeModel(connection),
        companyLicensesAndCertification: CompanyLicensesAndCertificationModel(connection),
        companyServiceAreaHour: CompanyServiceAreaHourModel(connection),
        image: ImageModel(connection),
        job: JobModel(connection),
        jobStatus: JobStatusModel(connection),
        jobRequest: JobRequestModel(connection),
        licensesAndCertification: LicensesAndCertificationModel(connection),
        ratingAndReview: RatingAndReviewModel(connection),
        service: ServiceModel(connection),
        location: LocationModel(connection),
        paymentAccount: PaymentAccountModel(connection),
        payoutAccount: PayoutAccountModel(connection),
        bank: BankModel(connection),
        card: CardModel(connection),
        promotion: PromotionModel(connection),
        coupon: CouponModel(connection),
        category: CategoryModel(connection),
        subCategory: SubCategoryModel(connection),
        vehicle: VehicleModel(connection),
        transaction: TransactionModel(connection),
        earningAndPayment: EarningAndPaymentModel(connection),
        activity: ActivityModel(connection),
        activityCategory: ActivityCategoryModel(connection),
        counter: CounterModel(connection),
        country: CountryModel(connection),
        state: StateModel(connection),
        city: CityModel(connection),
        social: SocialModel(connection),
        content: ContentModel(connection),
        question: QuestionModel(connection),
        vehicleRequest: VehicleRequestModel(connection),
        helpMessage: HelpMessageModel(connection),
        notification: NotificationModel(connection),
        token: TokenModel(connection),
        role: RoleModel(connection),
        permission: PermissionModel(connection)
    }
}