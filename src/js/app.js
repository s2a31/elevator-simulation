import { floors, elevatorConfigs } from './modules/config.js';
import { createFloorElements, updateFloorIndicators } from './modules/ui.js';
import { processAllPendingRequests } from './modules/requestProcessor.js';
import { initializeEventListeners } from './modules/handlers.js';
import { Elevator } from './modules/elevator.js';

// Initialize elevator instances
elevatorConfigs.forEach((config) => new Elevator(config.id));

// Initialize the building
const container = document.querySelector('.container');

floors.forEach((floor) => {
  const floorDiv = createFloorElements(floor);
  container.appendChild(floorDiv);
});

// Initialize elevator elements
Elevator.instances.forEach((elevator) => {
  const el = document.querySelector(`.elevator[data-elevator="${elevator.id}"]`);
  elevator.element = el;
  elevator.onIdle = processAllPendingRequests;
});

// Initial floor indicator update
updateFloorIndicators();

// Set up event listeners
initializeEventListeners();
