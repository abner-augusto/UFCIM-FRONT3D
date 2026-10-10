/**
 * Pure pointer-intent helpers for the viewer (MEL-002).
 *
 * Kept free of DOM and scene state so the pin-vs-building-vs-drag decision
 * can be unit tested without a renderer.
 */

/** Pointer travel (CSS px) at or beyond which a press counts as a drag. */
export const TAP_MAX_MOVE_PX = 4;

/**
 * True when a pointer displacement stays within the tap threshold.
 * Takes the deltas as numbers so pointermove checks allocate nothing.
 * @param {number} dx
 * @param {number} dy
 * @param {number} [maxMove]
 */
export function isTap(dx, dy, maxMove = TAP_MAX_MOVE_PX) {
    return dx * dx + dy * dy < maxMove * maxMove;
}

/**
 * Building id tagged on a hit mesh (or its nearest tagged ancestor) by
 * ModelManager._ensureLoaded.
 * @param {import('three').Object3D|null|undefined} object
 * @returns {string|null}
 */
export function findBuildingId(object) {
    let current = object;
    while (current) {
        const building = current.userData?.building;
        if (building) return building;
        current = current.parent;
    }
    return null;
}

/**
 * True when the nearest pin hit wins over the nearest building mesh hit on
 * the same ray: a wall only blocks a pin when it sits strictly in front.
 * @param {{distance:number}|null|undefined} pinHit
 * @param {{distance:number}|null|undefined} wallHit
 */
export function pinWins(pinHit, wallHit) {
    return !!pinHit && (!wallHit || pinHit.distance <= wallHit.distance);
}
