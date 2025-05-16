const floors = [
  { num: 0, label: 'Ground', left: 'GL', right: 'GR', hasElevator: true },
  { num: 1, label: '1st Floor', left: '1L', right: '1R' },
  { num: 2, label: '2nd Floor', left: '2L', right: '2R' },
  { num: 3, label: '3rd Floor', left: '3L', right: '3R' },
  { num: 4, label: '4th Floor', left: '4L', right: '4R' },
  { num: 5, label: '5th Floor', left: '5L', right: '5R' },
  { num: 6, label: '6th Floor', left: '6L', right: '6R' },
  { num: 7, label: '7th Floor', left: '7L', right: '7R' },
];

const elevators = [
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

function createPanel(elevatorId) {
  const panel = document.createElement('div');
  panel.classList.add('panel');

  for (let i = 7; i >= 0; i--) {
    const btn = document.createElement('button');
    btn.classList.add('panel-btn');
    btn.dataset.floor = i;
    btn.dataset.elevator = elevatorId;
    btn.textContent = i === 0 ? 'G' : i;
    panel.appendChild(btn);
  }

  return panel;
}

const container = document.querySelector('.container');

floors.forEach((floor) => {
  const floorDiv = document.createElement('div');
  floorDiv.classList.add('floor');
  floorDiv.dataset.floor = floor.num;

  // Left shaft
  const shaftLeft = document.createElement('div');
  shaftLeft.classList.add('shaft', 'shaft-left');
  const h2Left = document.createElement('h2');
  h2Left.textContent = floor.left;
  shaftLeft.appendChild(h2Left);
  if (floor.hasElevator) {
    const elevator1 = document.createElement('div');
    elevator1.classList.add('elevator', 'elevator1');
    elevator1.dataset.elevator = 'elevator1';
    elevator1.appendChild(createPanel('elevator1'));
    shaftLeft.appendChild(elevator1);
  }

  // Controls
  const controls = document.createElement('div');
  controls.className = 'controls';
  const label = document.createElement('p');
  label.classList.add('floor-label');
  label.textContent = floor.label;
  const btnUp = document.createElement('button');
  btnUp.classList.add('btn', 'btn-up');
  btnUp.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  const btnDown = document.createElement('button');
  btnDown.classList.add('btn', 'btn-down');
  btnDown.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
  controls.append(label, btnUp, btnDown);

  // Right shaft
  const shaftRight = document.createElement('div');
  shaftRight.classList.add('shaft', 'shaft-right');
  const h2Right = document.createElement('h2');
  h2Right.textContent = floor.right;
  shaftRight.appendChild(h2Right);
  if (floor.hasElevator) {
    const elevator2 = document.createElement('div');
    elevator2.classList.add('elevator', 'elevator2');
    elevator2.dataset.elevator = 'elevator2';
    elevator2.appendChild(createPanel('elevator2'));
    shaftRight.appendChild(elevator2);
  }

  floorDiv.append(shaftLeft, controls, shaftRight);
  container.appendChild(floorDiv);
});

elevators.forEach((elevator) => {
  const el = document.querySelector(`.elevator[data-elevator="${elevator.id}"]`);
  elevator.element = el;
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.panel-btn')) {
    const btn = event.target.closest('.panel-btn');
    const floor = parseInt(btn.dataset.floor);
    const elevatorId = btn.dataset.elevator;
    const elevator = elevators.find((e) => e.id === elevatorId);

    if (floor === elevator.currentFloor || elevator.queue.includes(floor)) {
      return;
    }

    elevator.queue.push(floor);
    if (!elevator.isMoving) {
      const next = elevator.queue.shift();
      moveElevator(elevator, next);
    }
    return;
  }

  if (event.target.closest('.btn-up') || event.target.closest('.btn-down')) {
    const btn = event.target.closest('.btn-up, .btn-down');
    const floorDiv = btn.closest('.floor');
    const floor = parseInt(floorDiv.dataset.floor);

    const availableElevator = elevators.find(e => !e.isMoving) || elevators[0];

    if (floor === availableElevator.currentFloor || availableElevator.queue.includes(floor)) {
      return;
    }
    availableElevator.queue.push(floor);
    if (!availableElevator.isMoving) {
      const next = availableElevator.queue.shift();
      moveElevator(availableElevator, next);
    }
  }
});

function moveElevator(elevator, targetFloor) {
  if (elevator.isMoving) return;

  elevator.isMoving = true;

  const targetFloorElement = document.querySelector(`.floor[data-floor="${targetFloor}"]`);
  const targetShaft = targetFloorElement.querySelector(elevator.id === 'elevator1' ? '.shaft-left' : '.shaft-right');

  targetShaft.appendChild(elevator.element);

  elevator.currentFloor = targetFloor;
  elevator.isMoving = false;

  if (elevator.queue.length > 0) {
    const next = elevator.queue.shift();
    moveElevator(elevator, next);
  }
}
