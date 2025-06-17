import { Elevator } from './elevator.js';
import { pendingRequests } from './requestQueue.js';

function createPanel(elevatorId) {
  const panel = document.createElement('div');
  panel.classList.add('panel');

  for (let i = 7; i >= 0; i--) {
    const btn = document.createElement('button');
    btn.classList.add('panel-btn');
    btn.dataset.floor = i;
    btn.dataset.elevator = elevatorId;
    btn.textContent = i === 0 ? 'G' : i;
    if (i === 0) {
      btn.style.color = 'green';
      btn.disabled = true;
    }
    panel.appendChild(btn);
  }

  return panel;
}

function _createShaft(elevatorId, floorNumber) {
  const shaft = document.createElement('div');
  shaft.classList.add('shaft');

  const h2 = document.createElement('h2');
  const indicator = document.createElement('span');
  indicator.classList.add('floor-indicator');
  indicator.dataset.elevator = elevatorId;
  h2.appendChild(indicator);

  const dirIndicator = document.createElement('span');
  dirIndicator.classList.add('direction-indicator');
  dirIndicator.dataset.elevator = elevatorId;
  h2.appendChild(dirIndicator);
  shaft.appendChild(h2);

  if (floorNumber === 0) {
    const elevator = document.createElement('div');
    elevator.classList.add('elevator', elevatorId);
    elevator.dataset.elevator = elevatorId;
    elevator.appendChild(createPanel(elevatorId));
    shaft.appendChild(elevator);
  }
  return shaft;
}

function _createControls(floor) {
  const controls = document.createElement('div');
  controls.className = 'controls';
  const label = document.createElement('p');
  label.classList.add('floor-label');
  label.textContent = floor.label;
  controls.appendChild(label);

  if (floor.num < 7) {
    const btnUp = document.createElement('button');
    btnUp.classList.add('btn', 'btn-up');
    btnUp.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    controls.appendChild(btnUp);
  }

  if (floor.num > 0) {
    const btnDown = document.createElement('button');
    btnDown.classList.add('btn', 'btn-down');
    btnDown.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
    controls.appendChild(btnDown);
  }
  return controls;
}

function updateFloorIndicators() {
  document.querySelectorAll('.floor-indicator').forEach((span) => {
    const elevatorId = span.dataset.elevator;
    const elevator = Elevator.instances.find((e) => e.id === elevatorId);
    span.textContent = elevator.currentFloor === 0 ? 'G' : elevator.currentFloor;
    const dirSpan = span.parentElement.querySelector('.direction-indicator[data-elevator="' + elevatorId + '"]');
    if (dirSpan) {
      if (elevator.direction === 'up') {
        dirSpan.textContent = '↑';
      } else if (elevator.direction === 'down') {
        dirSpan.textContent = '↓';
      } else {
        dirSpan.textContent = '';
      }
    }
  });
}

function createFloorElements(floor) {
  const floorDiv = document.createElement('div');
  floorDiv.classList.add('floor');
  floorDiv.dataset.floor = floor.num;

  const shaftLeft = _createShaft('elevator1', floor.num);
  const controls = _createControls(floor);
  const shaftRight = _createShaft('elevator2', floor.num);

  floorDiv.append(shaftLeft, controls, shaftRight);
  return floorDiv;
}

/**
 * A generic function to update the state of buttons (panel, up, down).
 * It iterates through buttons matching a selector and updates their color and disabled state
 * based on a set of provided functions.
 * @param {object} config - Configuration object.
 * @param {string} config.selector - CSS selector for the buttons.
 * @param {string} config.type - Type of button ('panel', 'up', 'down').
 * @param {function} config.getFloor - Function to get the floor number from a button element.
 * @param {function} [config.getElevatorId] - Function to get the elevator ID from a button element.
 * @param {function} config.isRequestedFn - Function to check if a request for this button exists.
 * @param {function} config.isDisabledFn - Function to determine if the button should be disabled.
 * @param {function} config.getColorFn - Function to determine the color of the button.
 */
function updateButtonState({ selector, getFloor, getElevatorId, isRequestedFn, isDisabledFn, getColorFn }) {
  document.querySelectorAll(selector).forEach((btn) => {
    const floor = getFloor(btn);
    const elevatorId = getElevatorId ? getElevatorId(btn) : undefined;
    const elevator = elevatorId ? Elevator.instances.find((e) => e.id === elevatorId) : undefined;

    const isRequested = isRequestedFn(floor, elevatorId, elevator);
    const disabled = isDisabledFn(floor, elevatorId, elevator);
    const currentColor = btn.style.color;
    const newColor = getColorFn(isRequested, floor, elevatorId, elevator);

    if (newColor !== currentColor) {
      btn.style.color = newColor;
    }

    btn.disabled = disabled;
  });
}

function _updatePanelButtons() {
  updateButtonState({
    selector: '.panel-btn',
    getFloor: (btn) => parseInt(btn.dataset.floor),
    getElevatorId: (btn) => btn.dataset.elevator,
    isRequestedFn: (floor, elevatorId) =>
      pendingRequests.some((r) => r.type === 'panel' && r.floor === floor && r.elevator === elevatorId),
    isDisabledFn: (floor, elevatorId, elevator) => {
      return elevator && elevator.currentFloor === floor;
    },
    getColorFn: (isRequested, floor, elevatorId, elevator) => {
      if (
        elevator &&
        (elevator.justArrivedFloor === floor || (elevator.currentFloor === floor && !elevator.isMoving))
      ) {
        return 'green';
      }
      return isRequested ? 'orange' : 'white';
    },
  });
}

function _updateCallButtons() {
  ['up', 'down'].forEach((type) => {
    updateButtonState({
      selector: `.btn-${type}`,
      getFloor: (btn) => parseInt(btn.closest('.floor').dataset.floor),
      getElevatorId: null,
      isRequestedFn: (floor) => pendingRequests.some((r) => r.type === type && r.floor === floor),
      isDisabledFn: (floor) => Elevator.instances.some((e) => e.currentFloor === floor && !e.isMoving),
      getColorFn: (isRequested) => (isRequested ? 'orange' : 'white'),
    });
  });
}

function updateButtonStates() {
  _updatePanelButtons();
  _updateCallButtons();
}

function playElevatorSound() {
  const audio = new Audio('/src/sounds/elevator-arrival.wav');
  audio.play();
}

export { createPanel, updateFloorIndicators, createFloorElements, updateButtonStates, playElevatorSound };
