import * as path from "path";
import { Seeder } from 'mongo-seeding';

import helpers from './helpers';

export default class SeederHelper {
    public async run(): Promise<void> {
        const { database } = global.configs;

        // Init seeder instance
        const seeder = new Seeder({
            database: database.general.dbUri,
            dropCollections: true,
        });

        // Read collections from seeder folder
        const collections = seeder.readCollectionsFromPath(
            path.resolve(process.env.NODE_ENV === 'development' ? './build/seeders' : (process.env.NODE_ENV === 'local' ? './src/seeders' : './seeders')),
            {
                extensions: ['ts']
            },
        );

        // Seeding normal data
        collections.map(async (seed) => {
            const collection = global.connections.currentTenantConnection.collection(seed.name);
            // Check if this collection has data
            const count = await collection.countDocuments();

            // Start to seed
            if (count === 0) {
                console.log(`Seed collection ${seed.name}`);
                await seeder.import([seed])
            }
        });

        // Seeding countries
        let countryCollection = global.connections.currentTenantConnection.collection('countries');

        // Check if this collection has data
        const count = await countryCollection.countDocuments();

        // Start to seed question
        if (count === 0) {
            console.log(`Seed collection countries, states and cities`);

            await helpers.seederCountries();
        }

        // Seeding categories
        let contentCollection = global.connections.currentTenantConnection.collection('contents');

        // Check if this collection has data
        const contentCount = await contentCollection.countDocuments();

        // Start to seed question
        if (contentCount === 0) {
            console.log(`Seed collection contents`);

            await helpers.seederContents();
        }

        // Seeding categories
        let categoryCollection = global.connections.currentTenantConnection.collection('categories');

        // Check if this collection has data
        const categoryCount = await categoryCollection.countDocuments();

        // Start to seed question
        if (categoryCount === 0) {
            console.log(`Seed collection categories`);

            await helpers.seederCategories();
        }


        // Seeding subCategories
        let subCategoryCollection = global.connections.currentTenantConnection.collection('subCategories');

        // Check if this collection has data
        const subCategoryCount = await subCategoryCollection.countDocuments();

        // Start to seed question
        if (subCategoryCount === 0) {
            console.log(`Seed collection subCategories`);

            await helpers.seederSubCategories();
        }

        // Seeding vehicles
        let vehicleCollection = global.connections.currentTenantConnection.collection('vehicles');

        // Check if this collection has data
        const vehiclesCount = await vehicleCollection.countDocuments();

        // Start to seed question
        if (vehiclesCount === 0) {
            console.log(`Seed collection vehicles`);

            await helpers.seederVehicles();
        }

        // Seeding promotion
        let promotionCollection = global.connections.currentTenantConnection.collection('promotions');

        // Check if this collection has data
        const promotionsCount = await promotionCollection.countDocuments();

        // Start to seed promotion
        if (promotionsCount === 0) {
            console.log(`Seed collection promotions`);

            await helpers.seederPromotions();
        }


    }
}