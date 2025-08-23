export type Direction = "across" | "down";

export type WordDef = {
  id: string;           // unique per word (e.g., "A1", "D2")
  number: number;       // clue number
  row: number;          // start row (0–9)
  col: number;          // start col (0–9)
  direction: Direction; // across | down
  answer: string;       // UPPERCASE
  clue: string;
};

export type Puzzle = {
  id: string;
  size: number;         // 10
  words: WordDef[];
  blocks?: [number, number][]; // optional manual black squares
};

export const PUZZLES: Puzzle[] = [
  {
    id: "puzzle_1",
    size: 10,
    words: [
      { id:"A1", number:1, row:0, col:0, direction:"across", answer:"CAT", clue:"Feline pet" },
      { id:"D2", number:2, row:0, col:2, direction:"down",   answer:"TREE", clue:"Has leaves" },
      { id:"A3", number:3, row:2, col:0, direction:"across", answer:"NOTE", clue:"Short memo" },
      { id:"D4", number:4, row:1, col:5, direction:"down",   answer:"RED",  clue:"Primary color" },
      { id:"A5", number:5, row:4, col:1, direction:"across", answer:"RIVER",clue:"Flows to sea" },
    ],
  },
  {
    id: "puzzle_2",
    size: 10,
    words: [
      { id:"A1", number:1, row:0, col:0, direction:"across", answer:"CAR",  clue:"Road vehicle" },
      { id:"D2", number:2, row:0, col:1, direction:"down",   answer:"AREA", clue:"Region" },
      { id:"A3", number:3, row:3, col:0, direction:"across", answer:"CODE", clue:"What devs write" },
      { id:"D4", number:4, row:0, col:7, direction:"down",   answer:"AI",   clue:"Smarts for machines" },
    ],
  },
  {
    id: "puzzle_3",
    size: 10,
    words: [
      { id:"A1", number:1, row:1, col:1, direction:"across", answer:"HOUSE", clue:"Place to live" },
      { id:"D2", number:2, row:1, col:1, direction:"down",   answer:"HAT",   clue:"Headwear" },
      { id:"A3", number:3, row:5, col:2, direction:"across", answer:"GAME",  clue:"This app is one" },
      { id:"D4", number:4, row:2, col:6, direction:"down",   answer:"NET",   clue:"Goal mesh" },
    ],
  },
];

export const getPuzzleById = (id: string) => PUZZLES.find(p => p.id === id);
