const floors = [
  { num: 0, label: 'Ground', hasElevator: true },
  { num: 1, label: '1st Floor' },
  { num: 2, label: '2nd Floor' },
  { num: 3, label: '3rd Floor' },
  { num: 4, label: '4th Floor' },
  { num: 5, label: '5th Floor' },
  { num: 6, label: '6th Floor' },
  { num: 7, label: '7th Floor' },
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
  const indicatorLeft = document.createElement('span');
  indicatorLeft.classList.add('floor-indicator');
  indicatorLeft.dataset.elevator = 'elevator1';
  indicatorLeft.textContent = '';
  h2Left.appendChild(indicatorLeft);
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
  const indicatorRight = document.createElement('span');
  indicatorRight.classList.add('floor-indicator');
  indicatorRight.dataset.elevator = 'elevator2';
  indicatorRight.textContent = '';
  h2Right.appendChild(indicatorRight);
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

function updateFloorIndicators() {
  document.querySelectorAll('.floor-indicator').forEach((span) => {
    const elevatorId = span.dataset.elevator;
    const elevator = elevators.find((e) => e.id === elevatorId);
    span.textContent = elevator.currentFloor === 0 ? 'G' : elevator.currentFloor;
  });
}
updateFloorIndicators();

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

    // Find the best elevator to answer the floor call
    // closest: The best elevator found so far as we look through the array.
    // elevator: The elevator we’re currently checking to see if it’s better than 'closest'.
    const availableElevator = elevators.reduce((closest, elevator) => {
      // distance: How many floors away is the current candidate 'elevator' from the requested floor?
      const distance = Math.abs(elevator.currentFloor - floor);
      // closestDistance: How many floors away is the current best so far from the requested floor?
      const closestDistance = Math.abs(closest.currentFloor - floor);

      // Is the candidate 'distance' elevator closer?
      const isCloser = distance < closestDistance;

      // elevatorAvailable: Is the candidate elevator available? (Not moving OR no queue.)
      const elevatorAvailable = !elevator.isMoving || elevator.queue.length === 0;
      // closestAvailable: Is the best-so-far elevator available?
      const closestAvailable = !closest.isMoving || closest.queue.length === 0;

      // Choose 'elevator' if it's closer and available
      if (isCloser && elevatorAvailable) return elevator;
      // or if the current best 'closest' is not available,
      // but candidate 'elevator' is available
      if (!closestAvailable && elevatorAvailable) return elevator;
      // Otherwise, stick with the best so far
      return closest;
    }, elevators[0]);

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

  const floorHeight = document.querySelector('.floor').getBoundingClientRect().height;
  elevator.element.style.transform = `translateY(${-targetFloor * floorHeight}px)`;

  elevator.currentFloor = targetFloor;
  updateFloorIndicators();
  elevator.isMoving = false;
  if (elevator.queue.length > 0) {
    const next = elevator.queue.shift();
    moveElevator(elevator, next);
  }
}
