import * as lodash from 'lodash';
import countries from './countries';
import categories from './categories';
import subCategories from './subCategories';
import vehicles from './vehicles';
import contents from './contents';
import promotions from './promotions';
import PromotionController from '../../controllers/promotion';

import * as moment from 'moment';

interface ICountry {
    name: string,
    iso2: string,
    iso3: string,
    countryCode: string[],
    currency: string,
    states: object
    icon: string
}

const helpers = {

    seederContents: async (): Promise<boolean> => {
        const {
            user: userModel,
            image: imageModel,
            content: contentModel
        } = global.mongoModel;

        const owner = await userModel.findOne({ role: 'master' }).lean().exec();

        for (let i = 0; i < contents.length; i++) {

            const content = contents[i]

            const image = content.image ? await imageModel.findOneAndUpdate(
                { description: content.image },
                {
                    type: 'local',
                    fileName: content.image,
                    path: 'images/' + content.image,
                    description: content.image
                },
                { new: true, upsert: true }
            ).lean().exec() : undefined

            let insertData = {
                title: content.title,
                content: content.content,
                type: content.type,
                tags: content.tags,
                image,
                priority: 1
            };

            //Get master owner
            insertData['createdBy'] = owner._id;
            // Save country
            await contentModel.create(insertData);

        }

        return true;
    },

    seederCountries: async (): Promise<boolean> => {
        const { country: countryModel, state: stateModel, city: cityModel, image: imageModel } = global.mongoModel;

        await lodash.forEach(countries, async (country) => {
            // Save country
            const sCountry = await countryModel.create({
                name: country.name,
                iso2: country.iso2,
                iso3: country.iso3,
                countryCode: country.countryCode,
                currency: country.currency,
                icon: await imageModel.findOneAndUpdate(
                    { description: country.icon },
                    {
                        type: 'local',
                        fileName: country.icon,
                        path: 'images/flags/' + country.icon,
                        description: country.icon
                    },
                    { new: true, upsert: true }
                )
            });

            if (country.states) {
                await lodash.forEach(country.states, async (cities, state) => {
                    // Save state of country
                    const sState = await stateModel.create({
                        country: sCountry._id,
                        name: state,
                    });

                    // Set city list of state
                    let cityList = [];

                    lodash.forEach(cities, (city) => {
                        cityList.push({
                            country: sCountry._id,
                            state: sState._id,
                            name: city,
                        })
                    });

                    // Create cities of state
                    await cityModel.insertMany(cityList);
                })
            }
        });

        return true;
    },
    seederCategories: async (): Promise<boolean> => {
        const {
            category: categoryModel,
            image: imageModel
        } = global.mongoModel;

        for (let i = 0; i < categories.length; i++) {

            const category = categories[i];

            // Save subCategorie
            await categoryModel.create({
                name: category.name,
                key: category.key,
                priority: category.priority,
                allowSubCategory: category.allowSubCategory,
                icon: category.icon,
                path: await imageModel.findOneAndUpdate(
                    { description: category.image },
                    {
                        type: 'local',
                        fileName: category.image,
                        path: 'images/' + category.image,
                        description: category.image
                    },
                    { new: true, upsert: true }
                ),
                description: category.description
            });

        };

        return true;
    },
    seederSubCategories: async (): Promise<boolean> => {
        const {
            category: categoryModel,
            subCategory: subCategoryModel,
            image: imageModel
        } = global.mongoModel;

        for (let i = 0; i < subCategories.length; i++) {

            const category = await categoryModel.findOne({ key: subCategories[i].category }).lean().exec();

            // Save subCategorie
            await subCategoryModel.create({
                name: subCategories[i].name,
                priority: subCategories[i].priority,
                category: category._id,
                description: subCategories[i].description,
                image: await imageModel.findOneAndUpdate(
                    { description: subCategories[i].image },
                    {
                        type: 'local',
                        fileName: subCategories[i].image,
                        path: 'images/' + subCategories[i].image,
                        description: subCategories[i].image
                    },
                    { new: true, upsert: true }
                ),
            });

        };

        return true;
    },

    seederVehicles: async (): Promise<boolean> => {
        const {
            user: userModel,
            category: categoryModel,
            subCategory: subCategoryModel,
            vehicle: vehicleModel,
            licensesAndCertification: licensesAndCertificationModel,
            image: imageModel
        } = global.mongoModel;

        for (let i = 0; i < vehicles.length; i++) {

            const vehicle = vehicles[i]
            const category = await categoryModel.findOne({ key: vehicle.category }).lean().exec();

            let insertData = {
                name: vehicle.name,
                color: vehicle.color,
                category: category._id,
                licensePlate: vehicle.licensePlate,
                vanSize: vehicle.vanSize,
                driverLicense: await licensesAndCertificationModel.findOne({ name: vehicle.driverLicense }),
                description1: vehicle.description1,
                description2: vehicle.description2,
                luggage: Math.floor(Math.random() * 10 + 1),
                images: [await imageModel.findOneAndUpdate(
                    { description: vehicle.images },
                    {
                        type: 'local',
                        fileName: vehicle.images,
                        path: 'images/' + vehicle.images,
                        description: vehicle.images
                    },
                    { new: true, upsert: true }
                )]
                ,
                avgRating: {
                    rating: Math.floor(Math.random() * 5 + 1),
                    countRating: 1
                }
            };

            //Get master owner
            insertData['ownedBy'] = { firstName: 'Thai', lastName: 'Mobility' };

            if (vehicle.subCategory) {

                const subCategory = await subCategoryModel.findOne({ name: vehicle.subCategory }).lean().exec();
                if (subCategory) {
                    insertData['subCategory'] = subCategory._id;
                }
            }

            // Save country
            await vehicleModel.create(insertData);
        }

        return true;
    },

    seederPromotions: async (): Promise<boolean> => {
        const {
            coupon: couponModel,
            category: categoryModel,
            subCategory: subCategoryModel,
            promotion: promotionModel,
            image: imageModel
        } = global.mongoModel;

        for (let i = 0; i < promotions.length; i++) {

            const promotion = promotions[i]

            const category = await categoryModel.findOne({ key: promotion.category }).lean().exec();

            let dataCoupon = {
                code: await PromotionController.getRandomCode(6),
                usageLimit: 1
            }
            const couponData = await couponModel.create(dataCoupon);

            let insertData = {
                coupons: [couponData._id],
                priority: promotion.priority,
                title: promotion.title,
                discount: promotion.discount,
                maximumPrice: promotion.maximumPrice,
                content: promotion.content,
                category: category._id,
                type: promotion.type,
                startDate: moment(),
                endDate: moment().add(1, 'years'),
                image: await imageModel.findOneAndUpdate(
                    { description: promotion.image },
                    {
                        type: 'local',
                        fileName: promotion.image,
                        path: 'images/' + promotion.image,
                        description: promotion.image
                    },
                    { new: true, upsert: true }
                )
            };

            if (promotion.subCategory) {

                const subCategory = await subCategoryModel.findOne({ name: promotion.subCategory }).lean().exec();

                if (subCategory) {
                    insertData['subCategory'] = subCategory._id;
                }
            }

            // Save country
            await promotionModel.create(insertData);
        }

        return true;
    },
};

export default helpers;