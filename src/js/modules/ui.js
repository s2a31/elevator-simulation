import { elevators } from './config.js';

export function createPanel(elevatorId) {
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

export function updateFloorIndicators() {
  document.querySelectorAll('.floor-indicator').forEach((span) => {
    const elevatorId = span.dataset.elevator;
    const elevator = elevators.find((e) => e.id === elevatorId);
    span.textContent = elevator.currentFloor === 0 ? 'G' : elevator.currentFloor;
  });
}

export function createFloorElements(floor) {
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
  return floorDiv;
}
