export function updatePinLabel(manager, pinId, statusText, statusColor) {
        const labelSprite = manager.labelsById.get(pinId);
        if (!labelSprite || !labelSprite.material?.map) return;
        const displayName = labelSprite.userData.baseDisplayName ?? labelSprite.userData.displayName;
        const params = { displayName, statusText: statusText ?? null, statusColor: statusColor ?? null };
        const key = manager.pinFactory._getLabelCacheKey(params);
        if (labelSprite.userData.labelKey === key) return;
        const { canvas, texture: newTexture } = manager.pinFactory.getLabelTexture(params);
        labelSprite.userData.labelKey = key;
        labelSprite.material.map.dispose();
        labelSprite.material.map = newTexture;
        labelSprite.material.needsUpdate = true; manager.onChange?.();

        const pixelToWorldScale = 0.05;
        labelSprite.scale.set(canvas.width * pixelToWorldScale, canvas.height * pixelToWorldScale, 1);
}
