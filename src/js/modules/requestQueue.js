import { updateButtonStates } from './ui.js';

let pendingRequests = [];

function _requestsMatchForRemoval(pendingReq, incomingReq) {
  if (pendingReq.type !== incomingReq.type || pendingReq.floor !== incomingReq.floor) {
    return false;
  }
  // For panel requests, the elevator must match.
  if (pendingReq.type === 'panel') {
    return pendingReq.elevator === incomingReq.elevator;
  }
  // For call requests ('up' or 'down'), any elevator can satisfy the call.
  return true;
}

// For adding, we need an exact match to prevent duplicates.
function isRequestInQueue(request) {
  return pendingRequests.some(
    (r) => r.type === request.type && r.floor === request.floor && r.elevator === request.elevator
  );
}

function addRequest(request) {
  if (!isRequestInQueue(request)) {
    pendingRequests.push(request);
    updateButtonStates();
  }
}

function removeRequest(request) {
  const initialLength = pendingRequests.length;
  pendingRequests = pendingRequests.filter((r) => !_requestsMatchForRemoval(r, request));

  if (pendingRequests.length < initialLength) {
    updateButtonStates();
  }
}

export { pendingRequests, addRequest, removeRequest, isRequestInQueue };
