import { floors, elevators } from './modules/config.js';
import { moveElevator, findBestElevator } from './modules/elevator.js';
import { createFloorElements, updateFloorIndicators } from './modules/ui.js';

// Initialize the building
const container = document.querySelector('.container');

floors.forEach((floor) => {
  const floorDiv = createFloorElements(floor);
  container.appendChild(floorDiv);
});

// Initialize elevator elements
elevators.forEach((elevator) => {
  const el = document.querySelector(`.elevator[data-elevator="${elevator.id}"]`);
  elevator.element = el;
});

// Initial floor indicator update
updateFloorIndicators();

// Event Listeners
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

    const availableElevator = findBestElevator(elevators, floor);

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
