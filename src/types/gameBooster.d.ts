// Game booster interface
declare interface GameBooster{
    name: string;
    group: string;
}



// Available booster per round
declare interface AvailableBoosterPerRound{
    teamA: GameBooster;
    teamB: GameBooster;
    teamC: GameBooster;
    teamD: GameBooster;
}

// Booster to buy in shop
declare interface BoosterItem{
    id: string;
    count: any
}