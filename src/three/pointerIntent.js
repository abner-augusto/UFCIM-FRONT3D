/**
 * Pure pointer-intent helpers for the viewer (MEL-002).
 *
 * Kept free of DOM and scene state so the pin-vs-building-vs-drag decision
 * can be unit tested without a renderer.
 */

/** Pointer travel (CSS px) at or beyond which a press counts as a drag. */
export const TAP_MAX_MOVE_PX = 4;

/**
 * True when the pointer stayed within the tap threshold between two points.
 * @param {{x:number, y:number}|null|undefined} start
 * @param {{x:number, y:number}|null|undefined} end
 * @param {number} [maxMove]
 */
export function isTap(start, end, maxMove = TAP_MAX_MOVE_PX) {
    if (!start || !end) return false;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return dx * dx + dy * dy < maxMove * maxMove;
}

/**
 * Building id tagged on a hit mesh (or its nearest tagged ancestor) by
 * ModelManager._applyVisibility.
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
 * Decide what a press targets from the nearest pin hit and nearest building
 * mesh hit on the same ray. Pins win unless a building wall sits strictly in
 * front of them.
 * @param {{distance:number}|null|undefined} pinHit
 * @param {{distance:number, object:import('three').Object3D}|null|undefined} wallHit
 * @returns {{type:'pin'} | {type:'building', building:string} | null}
 */
export function resolvePointerTarget(pinHit, wallHit) {
    if (pinHit && (!wallHit || pinHit.distance <= wallHit.distance)) {
        return { type: 'pin' };
    }
    const building = wallHit ? findBuildingId(wallHit.object) : null;
    return building ? { type: 'building', building } : null;
}
