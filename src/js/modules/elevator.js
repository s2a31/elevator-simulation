import { updateFloorIndicators, playElevatorSound, updateButtonStates } from './ui.js';
import { pendingRequests, removeRequest } from './requestQueue.js';

/**
 * A standard easing function that provides a smooth acceleration and deceleration.
 * @param {number} t - current time
 * @param {number} b - start value
 * @param {number} c - change in value
 * @param {number} d - duration
 * @returns {number} - the eased value
 */
function easeInOutQuad(t, b, c, d) {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t + b;
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
}

/**
 * Creates a cubic easing function for smoothly interrupting and rerouting an elevator.
 * The function defines a trajectory from a start point to an end point with a given
 * initial velocity, ensuring the final velocity is zero.
 * @param {number} p0 - The starting position of the interruption.
 * @param {number} pf - The new final position.
 * @param {number} v0 - The current velocity at the moment of interruption.
 * @param {number} T - The total duration for the new trajectory.
 * @returns {function(number, number): number} An easing function that takes elapsed time and a start value.
 */
function _createCubicEasingForInterrupt(p0, pf, v0, T) {
  if (T === 0) {
    return (t, start) => start;
  }
  // Coefficients for the cubic polynomial: a*t^3 + b*t^2 + c*t + d
  const a = (2 * (p0 - pf) + v0 * T) / (T * T * T);
  const b = (3 * (pf - p0) - 2 * v0 * T) / (T * T);
  const c = v0;
  // The returned function calculates position over time.
  // The 'd' coefficient is the start position, which is passed as the 'start' parameter.
  return (t, start) => a * t * t * t + b * t * t + c * t + start;
}

export class Elevator {
  static instances = [];
  static preArrivalTime = 200; // ms
  static MIN_INTERRUPT_DURATION = 800; // ms
  static MAX_INTERRUPT_DURATION = 2200; // ms
  static SINGLE_FLOOR_TRIP_DURATION = 2000; // ms
  static MULTI_FLOOR_TIME_PER_FLOOR = 1000; // ms
  static ARRIVAL_DISPLAY_DURATION = 1000; // ms
  static TIME_BEFORE_NEXT_MOVE = 400; // ms

  static isAnyElevatorMoving() {
    // To allow both elevators to move simultaneously, uncomment the line below
    // return false;
    return Elevator.instances.some((elevator) => elevator.isMoving);
  }

  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.isMoving = false;
    this.queue = [];
    this.element = null;
    this.direction = null;
    this.handlingDirection = null;
    this.justArrivedFloor = null;
    this.destinationFloor = null;
    this.timePerFloor = null;
    this.onIdle = null;
    this.preArrivalTimeoutId = null;
    this.isArriving = false;
    this.animationFrameId = null;
    this.animationStartTime = null;
    this.animationDuration = 0;
    this.startPosition = 0;
    this.endPosition = 0;
    this.easingFunction = null;
    this.currentVisualFloor = 0;
    this.initialAnimationDuration = 0;
    this.pendingReroute = null;
    Elevator.instances.push(this);
  }

  moveTo(targetFloor) {
    if (this.isMoving || Elevator.isAnyElevatorMoving()) {
      return;
    }

    // A new move from an idle elevator must always start from its logical floor
    // to prevent any visual desynchronization from a previous, complex set of moves.
    const shaft = this.element.closest('.shaft');
    const floorHeight = shaft.getBoundingClientRect().height;
    this.startPosition = -this.currentFloor * floorHeight;
    this.element.style.transform = `translateY(${this.startPosition}px)`;
    this.currentVisualFloor = this.currentFloor;

    if (this.currentFloor === targetFloor) {
      return;
    }

    this.isArriving = false;
    this.isMoving = true;
    this.destinationFloor = targetFloor;
    this.easingFunction = easeInOutQuad;
    updateButtonStates();

    if (targetFloor > this.currentFloor) {
      this.direction = 'up';
    } else if (targetFloor < this.currentFloor) {
      this.direction = 'down';
    } else {
      this.direction = null;
    }

    if (this.direction === 'up') {
      this.queue.sort((a, b) => a - b);
    } else if (this.direction === 'down') {
      this.queue.sort((a, b) => b - a);
    }

    const distance = Math.abs(this.currentFloor - targetFloor);
    this.timePerFloor = distance === 1 ? Elevator.SINGLE_FLOOR_TRIP_DURATION : Elevator.MULTI_FLOOR_TIME_PER_FLOOR;
    this.animationDuration = distance * this.timePerFloor;
    this.initialAnimationDuration = this.animationDuration;

    this.endPosition = -targetFloor * floorHeight;

    if (this.animationDuration > Elevator.preArrivalTime) {
      this.preArrivalTimeoutId = setTimeout(() => {
        this.isArriving = true;
      }, this.animationDuration - Elevator.preArrivalTime);
    } else {
      this.isArriving = true;
    }

    this.animationStartTime = null;
    this.animationFrameId = requestAnimationFrame(this._animateMovement.bind(this));
  }

  _animateMovement(timestamp) {
    if (!this.animationStartTime) {
      this.animationStartTime = timestamp;
    }

    const elapsedTime = timestamp - this.animationStartTime;

    const newY = this.easingFunction(
      elapsedTime,
      this.startPosition,
      this.endPosition - this.startPosition,
      this.animationDuration
    );
    this.element.style.transform = `translateY(${newY}px)`;

    const shaft = this.element.closest('.shaft');
    const floorHeight = shaft.getBoundingClientRect().height;
    this.currentVisualFloor = Math.abs(newY) / floorHeight;

    const currentRoundedFloor = Math.round(this.currentVisualFloor);
    if (currentRoundedFloor !== this.currentFloor) {
      this.currentFloor = currentRoundedFloor;
      updateFloorIndicators();
    }

    if (this.pendingReroute !== null) {
      const distanceToTarget = Math.abs(this.pendingReroute - this.currentVisualFloor);
      const threshold = distanceToTarget < 3 ? 0.6 : 0.75;
      if (elapsedTime >= (this.initialAnimationDuration / 2) * threshold) {
        const newTarget = this.pendingReroute;
        this.pendingReroute = null;
        this._interruptAndMoveTo(newTarget);
        return; // Let the new animation frame take over
      }
    }

    if (elapsedTime < this.animationDuration) {
      this.animationFrameId = requestAnimationFrame(this._animateMovement.bind(this));
    } else {
      this.element.style.transform = `translateY(${this.endPosition}px)`;
      const finalFloor = this.destinationFloor;
      this.pendingReroute = null; // Clear any pending reroute on arrival
      this._processArrival(finalFloor);
    }
  }

  _processArrival(targetFloor) {
    this.animationFrameId = null;
    this.isArriving = true;
    clearTimeout(this.preArrivalTimeoutId);
    this.preArrivalTimeoutId = null;

    this.currentFloor = targetFloor;
    this.currentVisualFloor = targetFloor;
    this.isMoving = false;
    this.justArrivedFloor = targetFloor;
    this.destinationFloor = null;
    updateFloorIndicators();
    updateButtonStates();

    setTimeout(() => {
      this.justArrivedFloor = null;
      updateButtonStates();
    }, Elevator.ARRIVAL_DISPLAY_DURATION);

    if (pendingRequests.some((r) => r.floor === targetFloor)) {
      playElevatorSound();
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        this._cleanUpRequests(targetFloor);
        const next = this._findNextStop();

        if (next !== null) {
          this.queue = this.queue.filter((floor) => floor !== next);
          updateButtonStates();
          this.moveTo(next);
        } else {
          this.direction = null;
          updateFloorIndicators();
          this.isArriving = false;
          if (this.onIdle) {
            this.onIdle();
          }
        }
      }, Elevator.TIME_BEFORE_NEXT_MOVE);
    });
  }

  _cleanUpRequests(targetFloor) {
    removeRequest({ type: 'panel', floor: targetFloor, elevator: this.id });
    removeRequest({ type: 'up', floor: targetFloor });
    removeRequest({ type: 'down', floor: targetFloor });

    const hasPanelRequestForOtherElevator = pendingRequests.some((r) => r.type === 'panel' && r.floor === targetFloor);

    if (!hasPanelRequestForOtherElevator) {
      Elevator.instances.forEach((el) => {
        el.queue = el.queue.filter((floor) => floor !== targetFloor);
      });
    }

    this.queue = this.queue.filter((floor) =>
      pendingRequests.some(
        (r) =>
          (r.type === 'panel' && r.floor === floor && r.elevator === this.id) ||
          ((r.type === 'up' || r.type === 'down') && r.floor === floor)
      )
    );
  }

  _findNextStop() {
    if (this.queue.length === 0) {
      return null;
    }

    const ups = this.queue.filter((floor) => floor > this.currentFloor).sort((a, b) => a - b);
    const downs = this.queue.filter((floor) => floor < this.currentFloor).sort((a, b) => b - a);

    if (this.direction === 'up') {
      if (ups.length > 0) return ups[0];
      if (downs.length > 0) {
        this.direction = 'down';
        return downs[0];
      }
    } else if (this.direction === 'down') {
      if (downs.length > 0) return downs[0];
      if (ups.length > 0) {
        this.direction = 'up';
        return ups[0];
      }
    } else {
      const distUp = ups.length > 0 ? ups[0] - this.currentFloor : Infinity;
      const distDown = downs.length > 0 ? this.currentFloor - downs[0] : Infinity;

      if (distUp <= distDown && ups.length > 0) {
        this.direction = 'up';
        return ups[0];
      }
      if (downs.length > 0) {
        this.direction = 'down';
        return downs[0];
      }
    }
    return null;
  }

  updateTrip() {
    if (!this.isMoving || this.destinationFloor === null || this.isArriving) {
      return;
    }

    const shaft = this.element.closest('.shaft');
    const floorHeight = shaft.getBoundingClientRect().height;
    const currentTransform = getComputedStyle(this.element).transform;
    const matrix = new DOMMatrix(currentTransform);
    const currentY = matrix.f;
    const currentVisualFloor = Math.abs(currentY / floorHeight);

    let nextStop = this.destinationFloor;

    const isGoingUp = this.direction === 'up';
    const potentialStops = isGoingUp
      ? this.queue.filter((f) => f > currentVisualFloor)
      : this.queue.filter((f) => f < currentVisualFloor);

    if (potentialStops.length > 0) {
      const isHandlingOpposite =
        (isGoingUp && this.handlingDirection === 'down') || (!isGoingUp && this.handlingDirection === 'up');

      if (isHandlingOpposite) {
        nextStop = isGoingUp ? Math.max(...potentialStops) : Math.min(...potentialStops);
      } else {
        const intermediateStops = isGoingUp
          ? potentialStops.filter((f) => f < this.destinationFloor)
          : potentialStops.filter((f) => f > this.destinationFloor);

        if (intermediateStops.length > 0) {
          nextStop = isGoingUp ? Math.min(...intermediateStops) : Math.max(...intermediateStops);
        }
      }
    }

    if (nextStop === this.destinationFloor) {
      return;
    }

    // If the animation hasn't started, just update the parameters for the upcoming move.
    if (!this.animationStartTime) {
      this.destinationFloor = nextStop;

      const distance = Math.abs(this.currentFloor - this.destinationFloor);
      this.timePerFloor = distance === 1 ? Elevator.SINGLE_FLOOR_TRIP_DURATION : Elevator.MULTI_FLOOR_TIME_PER_FLOOR;
      this.animationDuration = distance * this.timePerFloor;
      this.initialAnimationDuration = this.animationDuration;
      this.endPosition = -this.destinationFloor * floorHeight;

      clearTimeout(this.preArrivalTimeoutId);
      if (this.animationDuration > Elevator.preArrivalTime) {
        this.preArrivalTimeoutId = setTimeout(() => {
          this.isArriving = true;
        }, this.animationDuration - Elevator.preArrivalTime);
      } else {
        this.isArriving = true;
      }
      return;
    }

    if (this.easingFunction === easeInOutQuad) {
      const elapsedTime = performance.now() - this.animationStartTime;
      if (elapsedTime < this.initialAnimationDuration / 2) {
        this.pendingReroute = nextStop;
        return;
      }
    }

    this._interruptAndMoveTo(nextStop);
  }

  _interruptAndMoveTo(newTargetFloor) {
    cancelAnimationFrame(this.animationFrameId);
    clearTimeout(this.preArrivalTimeoutId);

    const elapsedTime = performance.now() - this.animationStartTime;
    const shaft = this.element.closest('.shaft');
    const floorHeight = shaft.getBoundingClientRect().height;
    const newEndPosition = -newTargetFloor * floorHeight;

    const c_orig = this.endPosition - this.startPosition;
    const d_orig = this.initialAnimationDuration;
    let currentVelocity;
    if (this.easingFunction === easeInOutQuad) {
      if (elapsedTime < d_orig / 2) {
        currentVelocity = (4 * c_orig * elapsedTime) / (d_orig * d_orig);
      } else {
        currentVelocity = (4 * c_orig * (d_orig - elapsedTime)) / (d_orig * d_orig);
      }
    } else {
      currentVelocity = c_orig / d_orig;
    }

    const currentTransform = getComputedStyle(this.element).transform;
    const matrix = new DOMMatrix(currentTransform);
    const p0 = matrix.f;
    const pf = newEndPosition;
    const v0 = currentVelocity;
    const distanceToTravel = Math.abs(pf - p0);
    const maxNaturalSpeed = Math.abs((2 * c_orig) / d_orig);

    let T = (distanceToTravel / maxNaturalSpeed) * 2.5; // Proportional duration
    T = Math.max(Elevator.MIN_INTERRUPT_DURATION, Math.min(T, Elevator.MAX_INTERRUPT_DURATION)); // Clamp to a natural-feeling range.
    this.animationDuration = T;

    this.easingFunction = _createCubicEasingForInterrupt(p0, pf, v0, T);

    this.startPosition = p0;
    this.endPosition = pf;
    this.destinationFloor = newTargetFloor;
    this.pendingReroute = null;

    if (this.animationDuration > Elevator.preArrivalTime) {
      this.preArrivalTimeoutId = setTimeout(() => {
        this.isArriving = true;
      }, this.animationDuration - Elevator.preArrivalTime);
    } else {
      this.isArriving = true;
    }

    this.animationStartTime = null;
    this.animationFrameId = requestAnimationFrame(this._animateMovement.bind(this));
  }
}
