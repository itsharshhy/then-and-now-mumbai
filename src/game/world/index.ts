import { datasets, itemById, pointAt, type City, type Dataset } from "@/lib/data";
import * as D from "../art/delhi";
import { Px } from "../art/px";
import * as V from "../art/vehicles";
import { DOORS_DELHI, delhiPlacements } from "./delhi";
import { INTERIORS_BY_CITY, type InteriorKind, type InteriorSpec } from "./interiors";
import { TALKERS, TALKERS_DELHI, WALKER_LOOKS, WALKER_LOOKS_DELHI, type Talker } from "./life";
import { DOORS, placements, type Door, type Placement } from "./mumbai";

// Everything the city scene needs to know about one city.

export interface CityWorld {
  id: City;
  name: string;
  ds: Dataset;
  placements: () => Placement[];
  doors: Door[];
  talkers: Talker[];
  walkerLooks: string[];
  /** Mumbai has the suburban railway crossing the main road on a bridge. */
  rail: boolean;
  /** The elevated metro over the main road: from which year, how far east it runs, and its train. */
  metro: { from: number; x1: number; train: () => Px };
  /** Price tags floating over the shops. */
  tags: (year: number) => [number, number, string][];
  vehicleTextures: () => Record<string, Px>;
  pickVehicle: (year: number) => string;
  interiors: Record<InteriorKind, InteriorSpec>;
  /** Something that hasn't been built yet: the door says so instead of letting you in. */
  closed?: (door: Door, year: number) => string | null;
}

const train3 = (coach: Px) => {
  const p = new Px(coach.w * 3 + 4, coach.h);
  for (let i = 0; i < 3; i++) p.draw(coach, i * (coach.w + 2), 0);
  return p;
};

const rs = (ds: Dataset, id: string, y: number) => `RS${Math.round(pointAt(itemById(id, ds), y).price)}`;

const MUMBAI: CityWorld = {
  id: "mumbai",
  name: "Mumbai",
  ds: datasets.mumbai,
  placements,
  doors: DOORS,
  talkers: TALKERS,
  walkerLooks: WALKER_LOOKS,
  rail: true,
  metro: { from: 2014, x1: 80 * 16, train: () => train3(V.metroCoach()) },
  tags: (y) => {
    const ds = datasets.mumbai;
    return [
      [358, 452, `CHAI ${rs(ds, "chai", y)}`],
      [680, 452, `VADA PAV ${rs(ds, "vadapav", y)}`],
      [855, 452, `ONION ${rs(ds, "onion", y)} MILK ${rs(ds, "milk", y)}`],
      [1168, 300, `TICKET ${rs(ds, "train", y)}`],
      [800, 660, `AUTO ${rs(ds, "auto", y)}  PETROL ${rs(ds, "petrol", y)}`],
    ];
  },
  vehicleTextures: () => {
    const t: Record<string, Px> = {
      "v:taxiOld": V.taxiOld(),
      "v:taxiNew": V.taxiNew(),
      "v:auto0": V.auto(false),
      "v:auto1": V.auto(true),
      "v:bus": V.bestBus(false),
      "v:bus2": V.bestBus(true),
      "v:bus:L": V.bestBus(false, true),
      "v:bus2:L": V.bestBus(true, true),
      "v:scooter": V.scooter(),
    };
    V.CAR_COLOURS.forEach((c, i) => (t[`v:car${i}`] = V.car(c, i % 2 === 0)));
    return t;
  },
  pickVehicle: (y) => {
    const t = (y - 1995) / 31;
    const r = Math.random();
    if (r < 0.1) return y < 2023 && Math.random() < 0.5 - t * 0.4 ? "v:bus2" : "v:bus";
    if (r < 0.1 + 0.12 + t * 0.3) return `v:car${Math.floor(Math.random() * V.CAR_COLOURS.length)}`;
    if (r < 0.22 + t * 0.3 + 0.05 + t * 0.12) return "v:scooter";
    if (r < 0.75) return y >= 2005 ? "v:auto1" : "v:auto0";
    const padminiShare = y >= 2023 ? 0 : y < 2008 ? 1 : 1 - (y - 2008) / 15;
    return Math.random() < padminiShare ? "v:taxiOld" : "v:taxiNew";
  },
  interiors: INTERIORS_BY_CITY.mumbai,
};

const DELHI: CityWorld = {
  id: "delhi",
  name: "Delhi",
  ds: datasets.delhi,
  placements: delhiPlacements,
  doors: DOORS_DELHI,
  talkers: TALKERS_DELHI,
  walkerLooks: WALKER_LOOKS_DELHI,
  rail: false,
  metro: { from: 2002, x1: 78 * 16, train: () => train3(D.delhiMetroCoach()) },
  tags: (y) => {
    const ds = datasets.delhi;
    return [
      [358, 452, `CHAI ${rs(ds, "chai", y)}`],
      [680, 452, `SAMOSA ${rs(ds, "samosa", y)}`],
      [855, 452, `ONION ${rs(ds, "onion", y)} MILK ${rs(ds, "milk", y)}`],
      ...(y >= 2002 ? ([[1168, 300, `METRO ${rs(ds, "metro", y)}`]] as [number, number, string][]) : []),
      [800, 660, `AUTO ${rs(ds, "auto", y)}  PETROL ${rs(ds, "petrol", y)}`],
    ];
  },
  vehicleTextures: () => {
    const t: Record<string, Px> = {
      "d:bus:blueline": D.delhiBus("blueline"),
      "d:bus:blueline:L": D.delhiBus("blueline", true),
      "d:bus:green": D.delhiBus("green"),
      "d:bus:green:L": D.delhiBus("green", true),
      "d:bus:red": D.delhiBus("red"),
      "d:bus:red:L": D.delhiBus("red", true),
      "d:auto0": D.delhiAuto(false),
      "d:auto1": D.delhiAuto(true),
      "d:rick": D.cycleRickshaw(),
      "v:scooter": V.scooter(),
    };
    V.CAR_COLOURS.forEach((c, i) => (t[`v:car${i}`] = V.car(c, i % 2 === 0)));
    return t;
  },
  pickVehicle: (y) => {
    const t = (y - 1995) / 31;
    const r = Math.random();
    if (r < 0.12) return y < 2011 ? (Math.random() < 0.6 ? "d:bus:blueline" : "d:bus:red") : Math.random() < 0.7 ? "d:bus:green" : "d:bus:red";
    if (r < 0.12 + 0.15 - t * 0.1) return "d:rick";
    if (r < 0.27 + 0.15 + t * 0.3) return `v:car${Math.floor(Math.random() * V.CAR_COLOURS.length)}`;
    if (r < 0.62 + t * 0.1) return y >= 2002 ? "d:auto1" : "d:auto0";
    return "v:scooter";
  },
  interiors: INTERIORS_BY_CITY.delhi,
  closed: (door, y) => (door.id === "station" && y < 2002 ? "The Delhi Metro isn't open yet. Its first stretch opens on 25 December 2002." : null),
};

export const WORLDS: Record<City, CityWorld> = { mumbai: MUMBAI, delhi: DELHI };
export const worldFor = (city: City) => WORLDS[city] ?? MUMBAI;
