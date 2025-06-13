import { Elevator } from './elevator.js';
import { pendingRequests } from './requestQueue.js';

const MIN_DISTANCE_TO_STOP = 1; // The minimum number of floors away a call must be to be considered for an on-the-way pickup.

function _startElevatorIfNeeded(elevator) {
  if (!elevator.isMoving && !Elevator.isAnyElevatorMoving() && elevator.queue.length > 0) {
    elevator.moveTo(elevator.queue[0]);
  }
}

/**
 * Processes requests made from within an elevator panel.
 * It adds all pending panel requests for each elevator to its queue.
 * If the elevator is idle, it determines the initial direction based on the closest request
 * and starts moving.
 */
function _updateElevatorQueueFromPanel(elevator) {
  const allPanelFloors = pendingRequests
    .filter((r) => r.type === 'panel' && r.elevator === elevator.id)
    .map((r) => r.floor);

  let newRequestsAdded = false;
  allPanelFloors.forEach((floor) => {
    if (!elevator.queue.includes(floor) && elevator.currentFloor !== floor) {
      elevator.queue.push(floor);
      newRequestsAdded = true;
    }
  });
  return newRequestsAdded;
}

function _startIdleElevatorFromPanel(elevator) {
  if (elevator.queue.length === 0) return;

  const min = Math.min(...elevator.queue);
  const max = Math.max(...elevator.queue);
  const isUpCloser = Math.abs(elevator.currentFloor - min) <= Math.abs(elevator.currentFloor - max);

  elevator.direction = isUpCloser ? 'up' : 'down';
  elevator.queue.sort(isUpCloser ? (a, b) => a - b : (a, b) => b - a);

  _startElevatorIfNeeded(elevator);
}

function processPanelRequests() {
  Elevator.instances.forEach((elevator) => {
    const newRequestsAdded = _updateElevatorQueueFromPanel(elevator);
    if (elevator.isMoving) {
      if (newRequestsAdded) {
        elevator.updateTrip();
      }
    } else {
      _startIdleElevatorFromPanel(elevator);
    }
  });
}

/**
 * Processes up and down call requests from floors.
 * It assigns requests to an elevator that is already handling calls for that direction.
 * If no elevator is handling the direction, it assigns the call to the closest idle elevator.
 * An elevator with a `handlingDirection` lock will be prioritized for new calls of the same direction.
 */
function _getPendingDirectionalRequests(callType) {
  return pendingRequests.filter((r) => {
    if (r.type !== callType) return false;
    return !Elevator.instances.some((elevator) => elevator.queue.includes(r.floor));
  });
}

function _addRequestsAndSortQueue(elevator, requests) {
  let newRequestsAdded = false;
  requests.forEach((request) => {
    if (!elevator.queue.includes(request.floor) && elevator.currentFloor !== request.floor) {
      elevator.queue.push(request.floor);
      newRequestsAdded = true;
    }
  });

  if (newRequestsAdded) {
    elevator.queue.sort(elevator.direction === 'up' ? (a, b) => a - b : (a, b) => b - a);
  }
  return newRequestsAdded;
}

function _assignToHandlingElevator(requests, callType) {
  const handlingElevator = Elevator.instances.find((e) => e.handlingDirection === callType);
  if (!handlingElevator) return false;

  if (_addRequestsAndSortQueue(handlingElevator, requests)) {
    handlingElevator.updateTrip();
  }
  _startElevatorIfNeeded(handlingElevator);
  return true;
}

function _assignToOnTheWayElevator(requests, callType) {
  const onTheWayElevator = Elevator.instances.find((e) => e.isMoving && e.direction === callType);
  if (!onTheWayElevator || onTheWayElevator.queue.length === 0) return false;

  const ultimateDestination =
    onTheWayElevator.direction === 'up' ? Math.max(...onTheWayElevator.queue) : Math.min(...onTheWayElevator.queue);

  const onTheWayRequests = requests.filter((request) => {
    const isCorrectDirection =
      callType === 'up'
        ? request.floor > onTheWayElevator.currentVisualFloor && request.floor < ultimateDestination
        : request.floor < onTheWayElevator.currentVisualFloor && request.floor > ultimateDestination;

    if (!isCorrectDirection) return false;

    // It's in the right direction, now check if we're too close to make a graceful stop.
    const distanceToRequest = Math.abs(request.floor - onTheWayElevator.currentVisualFloor);
    return distanceToRequest >= MIN_DISTANCE_TO_STOP;
  });

  if (onTheWayRequests.length === 0) return false;

  if (_addRequestsAndSortQueue(onTheWayElevator, onTheWayRequests)) {
    onTheWayElevator.updateTrip();
  }
  return true;
}

function _findBestIdleElevator(requests) {
  const idleElevators = Elevator.instances.filter((e) => !e.isMoving && e.queue.length === 0 && !e.handlingDirection);
  if (idleElevators.length === 0) return null;

  let bestElevator = null;
  let bestDistance = Infinity;
  idleElevators.forEach((elevator) => {
    const distance = Math.abs(elevator.currentFloor - requests[0].floor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestElevator = elevator;
    }
  });
  return bestElevator;
}

function _assignToIdleElevator(requests, callType) {
  const bestElevator = _findBestIdleElevator(requests);
  if (!bestElevator) return false;

  bestElevator.direction = callType;
  bestElevator.handlingDirection = callType;
  _addRequestsAndSortQueue(bestElevator, requests);

  _startElevatorIfNeeded(bestElevator);
  return true;
}

function processDirectionRequests() {
  ['up', 'down'].forEach((callType) => {
    const requests = _getPendingDirectionalRequests(callType);
    if (requests.length === 0) return;

    if (_assignToHandlingElevator(requests, callType)) return;
    if (_assignToOnTheWayElevator(requests, callType)) return;
    _assignToIdleElevator(requests, callType);
  });
}

/**
 * Releases the direction lock on elevators that have completed their queue and are now idle.
 * This allows them to be assigned to new direction call requests.
 */
function releaseDirectionLocks() {
  Elevator.instances.forEach((elevator) => {
    if (!elevator.isMoving && elevator.queue.length === 0 && elevator.handlingDirection) {
      elevator.handlingDirection = null;
    }
  });
}

function processAllPendingRequests() {
  processPanelRequests();
  processDirectionRequests();
  releaseDirectionLocks();
}

export { processPanelRequests, processDirectionRequests, processAllPendingRequests };
