export const floors = [
  { num: 0, label: 'Ground', hasElevator: true },
  { num: 1, label: '1st Floor' },
  { num: 2, label: '2nd Floor' },
  { num: 3, label: '3rd Floor' },
  { num: 4, label: '4th Floor' },
  { num: 5, label: '5th Floor' },
  { num: 6, label: '6th Floor' },
  { num: 7, label: '7th Floor' },
];

export const elevators = [
  {
    id: 'elevator1',
    currentFloor: 0,
    isMoving: false,
    queue: [],
    element: null,
  },
  {
    id: 'elevator2',
    currentFloor: 0,
    isMoving: false,
    queue: [],
    element: null,
  },
];
