import { updateFloorIndicators } from './ui.js';

export function moveElevator(elevator, targetFloor) {
  if (elevator.isMoving) return;
  elevator.isMoving = true;

  const shaft = elevator.element.closest('.shaft');
  const floorHeight = shaft.getBoundingClientRect().height;

  // Function to update floor based on current position
  const updateFloor = () => {
    const currentTransform = getComputedStyle(elevator.element).transform;
    const matrix = new DOMMatrix(currentTransform);
    const currentY = matrix.f;
    const currentFloor = Math.round(Math.abs(currentY) / floorHeight);

    elevator.currentFloor = currentFloor;
    updateFloorIndicators();
  };

  // Create an interval to update floor during movement
  const updateInterval = setInterval(updateFloor, 100);

  // Start the movement
  elevator.element.style.transform = `translateY(${-targetFloor * floorHeight}px)`;

  // Clean up and handle completion
  setTimeout(() => {
    clearInterval(updateInterval);
    elevator.currentFloor = targetFloor;
    updateFloorIndicators();
    elevator.isMoving = false;

    if (elevator.queue.length > 0) {
      const next = elevator.queue.shift();
      moveElevator(elevator, next);
    }
  }, 3000);
}

export function findBestElevator(elevators, targetFloor) {
  return elevators.reduce((closest, elevator) => {
    const distance = Math.abs(elevator.currentFloor - targetFloor);
    const closestDistance = Math.abs(closest.currentFloor - targetFloor);
    const isCloser = distance < closestDistance;
    const elevatorAvailable = !elevator.isMoving || elevator.queue.length === 0;
    const closestAvailable = !closest.isMoving || closest.queue.length === 0;

    if (isCloser && elevatorAvailable) return elevator;
    if (!closestAvailable && elevatorAvailable) return elevator;
    return closest;
  }, elevators[0]);
}
