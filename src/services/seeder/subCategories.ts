interface ISubCategory {
    name: string,
    priority?: number,
    category: string,
    priceRate?: number,
    packages?: string,
    image?: string,
    description: string;
}

const subCategories: ISubCategory[] = [
    {
        name: 'Lightweight',
        priority: 3,
        category: 'motorcycle',
        description: 'Also called entry level, small or beginner bikes. Some two strokes in this class have dramatically higher performance than the four strokes, being likened to miniature superbikes. Sport bikes with engine displacements of up to about 500 cc (31 cu in) are usually in this class.',
        image: 'motorcycle Lightweight.jpg'
    },
    {
        name: 'Middleweight',
        priority: 2,
        category: 'motorcycle',
        description: 'Mid-sized, mid-level, or supersport. Some of the models in this range qualify for racing in the classes AMA Supersport Championship, British Supersport Championship and the Supersport World Championship, but many middleweights do not have a significant presence in racing. Displacements of 600–900 cc (37–55 cu in) are typical.',
        image: 'motorcycle Middleweight.jpg'
    },
    {
        name: 'Superbike',
        priority: 1,
        category: 'motorcycle',
        description: 'Liter-class, or literbike, i.e. 1,000 cc (61 cu in). As with supersport, many of the models in this class compete in superbike racing.',
        image: 'motorcycle Superbike.jpg'
    },
    {
        name: 'Ferrari',
        priority: 3,
        category: 'sport_cars',
        description: `Ferrari (/fəˈrɑːri/; Italian: [ferˈraːri]) is an Italian luxury sports car manufacturer based in Maranello. Founded by Enzo Ferrari in 1939 out of Alfa Romeo's race division as Auto Avio Costruzioni, the company built its first car in 1940. However, the company's inception as an auto manufacturer is usually recognized in 1947, when the first Ferrari-badged car was completed.`,
        image: 'Ferrari.jpg'
    },
    {
        name: 'McLaren',
        priority: 2,
        category: 'sport_cars',
        description: `McLaren Racing Limited is a British motor racing team based at the McLaren Technology Centre, Woking, Surrey, England. McLaren is best known as a Formula One constructor but has also competed in the Indianapolis 500 and has won the Canadian-American Challenge Cup (Can-Am). The team is the second oldest active Formula One team after Ferrari, where they compete as McLaren F1 Team. They are the second most successful team in Formula One history after Ferrari, having won 182 races, 12 Drivers' Championships and eight Constructors' Championships. The team is a wholly owned subsidiary of the McLaren Group.`,
        image: 'McLaren.jpg'
    },
    {
        name: 'Pagani',
        priority: 1,
        category: 'sport_cars',
        description: `Pagani Automobili S.p.A. (commonly referred to as Pagani) is an Italian manufacturer of sports cars and carbon fibre components. The company was founded in 1992 by Horacio Pagani and is based in San Cesario sul Panaro, near Modena, Italy.`,
        image: 'Pagani.jpg'
    }
];

export default subCategories