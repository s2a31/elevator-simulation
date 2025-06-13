import { addRequest } from './requestQueue.js';
import { processAllPendingRequests } from './requestProcessor.js';
import { Elevator } from './elevator.js';

function handlePanelButtonClick(event) {
  const btn = event.target.closest('.panel-btn');
  const floor = parseInt(btn.dataset.floor);
  const elevatorId = btn.dataset.elevator;
  const request = { type: 'panel', floor, elevator: elevatorId };
  addRequest(request);
  processAllPendingRequests();
}

function handleCallButtonClick(event) {
  const btn = event.target.closest('.btn-up, .btn-down');
  const floorDiv = btn.closest('.floor');
  const floor = parseInt(floorDiv.dataset.floor);
  // Do not add a request if an elevator is already at the floor.
  const elevatorOnFloor = Elevator.instances.some((e) => e.currentFloor === floor && !e.isMoving);
  if (elevatorOnFloor) return;
  const type = btn.classList.contains('btn-up') ? 'up' : 'down';
  const request = { type, floor };
  addRequest(request);
  processAllPendingRequests();
}

function initializeEventListeners() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('.panel-btn')) {
      handlePanelButtonClick(event);
      return;
    }

    if (event.target.closest('.btn-up') || event.target.closest('.btn-down')) {
      handleCallButtonClick(event);
      return;
    }
  });
}

export { initializeEventListeners };
